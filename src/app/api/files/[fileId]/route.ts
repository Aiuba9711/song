import { getCurrentUser } from "@/lib/auth/session";
import { attachment, jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { storage } from "@/lib/storage";
import { recordDownload } from "@/server/cv";
import { getEntitledFile } from "@/server/orders";

export const runtime = "nodejs";

/**
 * Download de ficheiro de produto: exige sessão e pedido pago.
 * Com S3, redireciona para um URL assinado e temporário (5 min); em local, serve o ficheiro.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const limit = await rateLimit(`export:${user.id}`, LIMITS.export.limit, LIMITS.export.window);
  if (!limit.ok) return jsonError(429, "Demasiados downloads. Tente mais tarde.", { "Retry-After": String(limit.retryAfterSeconds) });

  const { fileId } = await params;
  const file = await getEntitledFile(user.id, fileId);
  if (!file) return jsonError(404, "Ficheiro não encontrado ou sem acesso.");

  await recordDownload({ userId: user.id, kind: "PRODUCT_FILE", label: file.name, productFileId: file.id });

  const signed = await storage().getSignedDownloadUrl(file.storageKey, file.fileName, 300);
  if (signed) return Response.redirect(signed, 302);

  const data = await storage().get(file.storageKey);
  if (!data) return jsonError(404, "Ficheiro indisponível. Contacte o suporte.");
  return new Response(new Uint8Array(data), {
    headers: {
      ...PRIVATE_FILE_HEADERS,
      "Content-Type": file.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": attachment(file.fileName),
    },
  });
}
