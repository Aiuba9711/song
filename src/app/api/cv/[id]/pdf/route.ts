import { renderCvPdf } from "@/cv/pdf";
import { getCurrentUser } from "@/lib/auth/session";
import { attachment, jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { canDownloadCv } from "@/server/checkout";
import { exportFileName, getCvForExport, recordDownload } from "@/server/cv";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const limit = await rateLimit(`export:${user.id}`, LIMITS.export.limit, LIMITS.export.window);
  if (!limit.ok) return jsonError(429, "Demasiados downloads. Tente mais tarde.", { "Retry-After": String(limit.retryAfterSeconds) });

  const { id } = await params;
  const data = await getCvForExport(user.id, id);
  if (!data) return jsonError(404, "CV não encontrado.");
  // Download pago (quando ativado no admin): só depois de o pagamento ser confirmado.
  if (!(await canDownloadCv(user.id, id))) return jsonError(402, "O download deste CV requer pagamento confirmado.");

  const pdf = await renderCvPdf(data.content, data.design, data.photo);
  const fileName = exportFileName(data.content, "pdf");
  await recordDownload({ userId: user.id, kind: "CV_PDF", label: fileName, cvId: id });

  return new Response(new Uint8Array(pdf), {
    headers: {
      ...PRIVATE_FILE_HEADERS,
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": attachment(fileName),
    },
  });
}
