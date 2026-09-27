import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { loadFramedPhoto, loadRawPhoto } from "@/server/cv";

export const runtime = "nodejs";

/**
 * Fotografia do CV — só o dono pode ver (nunca pública).
 * Por omissão devolve a imagem ENQUADRADA (a mesma do PDF/DOCX); ?raw=1 devolve a imagem
 * inteira, usada apenas no editor de enquadramento.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const { id } = await params;
  const cv = await db.cV.findFirst({ where: { id, userId: user.id }, select: { photoKey: true, photoZoom: true, photoOffsetX: true, photoOffsetY: true } });
  if (!cv?.photoKey) return jsonError(404, "Sem fotografia.");
  const raw = new URL(request.url).searchParams.get("raw") === "1";
  const data = raw ? await loadRawPhoto(cv.photoKey) : (await loadFramedPhoto(cv))?.data;
  if (!data) return jsonError(404, "Sem fotografia.");
  return new Response(new Uint8Array(data), { headers: { ...PRIVATE_FILE_HEADERS, "Content-Type": "image/jpeg" } });
}
