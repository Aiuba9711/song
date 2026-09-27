import { jsonError } from "@/lib/http";
import { loadTemplatePreviewImage } from "@/server/templates-admin";

export const runtime = "nodejs";

/** Imagem de pré-visualização de um modelo (conteúdo público do catálogo, com dados fictícios). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{1,40}$/i.test(id)) return jsonError(404, "Imagem não encontrada.");
  const data = await loadTemplatePreviewImage(id);
  if (!data) return jsonError(404, "Imagem não encontrada.");
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
