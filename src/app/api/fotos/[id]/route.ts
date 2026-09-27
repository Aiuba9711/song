import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { loadPhotoVariant, type PhotoVariant } from "@/server/photos";

export const runtime = "nodejs";

const VARIANTS: Record<string, PhotoVariant> = { original: "original", resultado: "result", miniatura: "thumb" };

/**
 * Fotografia profissional — SÓ para o dono (dados pessoais). Sem cache partilhada, sem indexação.
 * Cada pedido é autorizado de novo: o endereço não serve a mais ninguém.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  const { id } = await params;
  const variant = VARIANTS[new URL(request.url).searchParams.get("v") ?? "miniatura"];
  if (!variant) return jsonError(400, "Variante inválida.");
  const file = await loadPhotoVariant(user.id, id, variant);
  if (!file) return jsonError(404, "Fotografia não encontrada.");
  return new Response(new Uint8Array(file.data), { headers: { ...PRIVATE_FILE_HEADERS, "X-Robots-Tag": "noindex, nofollow, noimageindex", "Content-Type": file.mime } });
}
