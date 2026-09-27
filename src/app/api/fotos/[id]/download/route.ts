import { getCurrentUser } from "@/lib/auth/session";
import { attachment, jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { recordDownload } from "@/server/cv";
import { exportPhoto, type ExportKind } from "@/server/photos";
import { DomainError } from "@/server/users";

export const runtime = "nodejs";

/** Download da foto final: ?formato=jpg|png&tipo=final|passe|cv. Sem marca d'água. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const limit = await rateLimit(`export:${user.id}`, LIMITS.export.limit, LIMITS.export.window);
  if (!limit.ok) return jsonError(429, "Demasiados downloads. Tente mais tarde.", { "Retry-After": String(limit.retryAfterSeconds) });
  const { id } = await params;
  const q = new URL(request.url).searchParams;
  const format = q.get("formato") === "png" ? "png" : "jpg";
  const tipo = (["final", "passe", "cv"] as const).find((t) => t === q.get("tipo")) ?? "final";
  try {
    const file = await exportPhoto(user.id, id, format, tipo as ExportKind);
    await recordDownload({ userId: user.id, kind: format === "png" ? "PHOTO_PNG" : "PHOTO_JPG", label: file.fileName, photoId: id });
    return new Response(new Uint8Array(file.data), {
      headers: { ...PRIVATE_FILE_HEADERS, "X-Robots-Tag": "noindex, nofollow, noimageindex", "Content-Type": file.mime, "Content-Disposition": attachment(file.fileName) },
    });
  } catch (error) {
    if (error instanceof DomainError) return jsonError(error.code === "PAYMENT_REQUIRED" ? 402 : 404, error.message);
    throw error;
  }
}
