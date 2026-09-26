import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/** Foto do CV — só o dono pode ver (nunca pública). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const { id } = await params;
  const cv = await db.cV.findFirst({ where: { id, userId: user.id }, select: { photoKey: true } });
  if (!cv?.photoKey) return jsonError(404, "Sem fotografia.");
  const data = await storage().get(cv.photoKey);
  if (!data) return jsonError(404, "Sem fotografia.");
  return new Response(new Uint8Array(data), {
    headers: { ...PRIVATE_FILE_HEADERS, "Content-Type": cv.photoKey.endsWith(".png") ? "image/png" : "image/jpeg" },
  });
}
