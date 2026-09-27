import { renderCvPdf } from "@/cv/pdf";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { canDownloadCv } from "@/server/checkout";
import { getCvForExport } from "@/server/cv";

export const runtime = "nodejs";

/**
 * Pré-visualização em PDF para o dono do CV. Antes da compra leva marca d'água discreta;
 * é mostrada no navegador (inline), não é o documento final.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const limit = await rateLimit(`preview:${user.id}`, LIMITS.export.limit, LIMITS.export.window);
  if (!limit.ok) return jsonError(429, "Demasiadas pré-visualizações. Tente mais tarde.", { "Retry-After": String(limit.retryAfterSeconds) });

  const { id } = await params;
  const data = await getCvForExport(user.id, id);
  if (!data) return jsonError(404, "CV não encontrado.");
  const purchased = await canDownloadCv(user.id, id);
  const pdf = await renderCvPdf(data.content, data.design, data.photo, { watermark: !purchased });
  return new Response(new Uint8Array(pdf), {
    headers: { ...PRIVATE_FILE_HEADERS, "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="pre-visualizacao.pdf"' },
  });
}
