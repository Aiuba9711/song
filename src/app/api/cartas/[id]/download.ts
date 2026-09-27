import { renderLetterDocx } from "@/letters/docx";
import { letterFileName } from "@/letters/compose";
import { renderLetterPdf } from "@/letters/pdf";
import { getCurrentUser } from "@/lib/auth/session";
import { attachment, jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { canDownloadLetter } from "@/server/checkout";
import { recordDownload } from "@/server/cv";
import { getUserLetter, toLetterContent } from "@/server/letters";

const TYPES = {
  pdf: { mime: "application/pdf", kind: "LETTER_PDF" as const, render: renderLetterPdf },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "LETTER_DOCX" as const, render: renderLetterDocx },
};

/** Download de uma carta do próprio utilizador (PDF ou DOCX). Pago só quando o admin define um preço. */
export async function downloadLetter(id: string, format: keyof typeof TYPES): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const limit = await rateLimit(`export:${user.id}`, LIMITS.export.limit, LIMITS.export.window);
  if (!limit.ok) return jsonError(429, "Demasiados downloads. Tente mais tarde.", { "Retry-After": String(limit.retryAfterSeconds) });

  const letter = await getUserLetter(user.id, id);
  if (!letter) return jsonError(404, "Carta não encontrada.");
  if (!(await canDownloadLetter(user.id, id))) return jsonError(402, "O download desta carta requer pagamento confirmado.");

  const content = toLetterContent(letter);
  const t = TYPES[format];
  const data = await t.render(content, letter.updatedAt);
  const fileName = letterFileName(content, format);
  await recordDownload({ userId: user.id, kind: t.kind, label: fileName, letterId: id });
  return new Response(new Uint8Array(data), {
    headers: { ...PRIVATE_FILE_HEADERS, "Content-Type": t.mime, "Content-Length": String(data.length), "Content-Disposition": attachment(fileName) },
  });
}
