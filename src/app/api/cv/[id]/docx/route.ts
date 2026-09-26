import { renderCvDocx } from "@/cv/docx";
import { getCurrentUser } from "@/lib/auth/session";
import { attachment, jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
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

  const docx = await renderCvDocx(data.content, data.theme, data.photo);
  const fileName = exportFileName(data.content, "docx");
  await recordDownload({ userId: user.id, kind: "CV_DOCX", label: fileName, cvId: id });

  return new Response(new Uint8Array(docx), {
    headers: {
      ...PRIVATE_FILE_HEADERS,
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Length": String(docx.length),
      "Content-Disposition": attachment(fileName),
    },
  });
}
