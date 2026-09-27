import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/** Imagem de fundo carregada no admin (conteúdo da plataforma, não é dado pessoal). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bg = await db.photoBackground.findUnique({ where: { id }, select: { imageKey: true, isActive: true } });
  if (!bg?.imageKey || !bg.isActive) return jsonError(404, "Fundo não encontrado.");
  const data = await storage().get(bg.imageKey);
  if (!data) return jsonError(404, "Fundo não encontrado.");
  return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
