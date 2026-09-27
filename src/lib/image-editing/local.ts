import "server-only";
import sharp from "sharp";
import { plainBackgroundMask } from "@/photo/background";
import { outfitRect } from "@/photo/geometry";
import { outfitSvg } from "@/photo/outfit";
import { applyAdjustments, autoEnhance, imageStats } from "@/photo/pixels";
import type { Box } from "@/photo/types";
import type { ClothingSpec, ImageData, ImageEditingProvider } from "./types";

/**
 * Implementação LOCAL (servidor, com sharp) — processamento real, mas NÃO é inteligência artificial:
 * - removeBackground: só fundos lisos (mesmo algoritmo do editor no navegador);
 * - applyClothing: ilustração vetorial sobreposta (edição digital identificada como tal);
 * - improveLighting: correção moderada de exposição/contraste;
 * - cropPortrait: recorte com a proporção pedida centrado no rosto.
 * Nenhuma imagem sai do servidor.
 */
export class LocalImageEditingProvider implements ImageEditingProvider {
  readonly id = "local";
  readonly label = "Processamento local (sem IA)";
  readonly external = false;

  private async raw(image: ImageData, maxSide?: number) {
    let pipeline = sharp(image.data).ensureAlpha();
    if (maxSide) pipeline = pipeline.resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true });
    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  }

  async removeBackground(image: ImageData, options: { tolerance?: number } = {}) {
    const full = await this.raw(image);
    const small = await this.raw(image, 360);
    const m = plainBackgroundMask(small, options.tolerance ?? 40);
    const alpha = await sharp(Buffer.from(m.mask), { raw: { width: m.width, height: m.height, channels: 1 } }).resize(full.width, full.height).raw().toBuffer();
    for (let i = 0; i < full.width * full.height; i++) full.data[i * 4 + 3] = alpha[i]!;
    const data = await sharp(full.data, { raw: { width: full.width, height: full.height, channels: 4 } }).png().toBuffer();
    return { data, mime: "image/png" as const, reliable: m.reliable };
  }

  async applyClothing(image: ImageData, clothing: ClothingSpec, face: Box | null) {
    const meta = await sharp(image.data).metadata();
    const W = meta.width ?? 800;
    const H = meta.height ?? 1000;
    const faceOut = face ? { cx: (face.x + face.w / 2) * W, cy: (face.y + face.h / 2) * H, w: face.w * W, h: face.h * H } : null;
    const r = outfitRect(W, H, faceOut, { outfitScale: 1, outfitX: 0, outfitY: 0 });
    const svg = outfitSvg(clothing, { tie: clothing.tie, tieColor: clothing.tieColor });
    const w = Math.max(1, Math.round(r.w));
    const garment = await sharp(Buffer.from(svg)).resize(w).png().toBuffer();
    const gh = (await sharp(garment).metadata()).height ?? 1;
    // Prolonga a última linha do desenho até ao fundo da fotografia.
    const top = Math.round(r.y);
    const extra = Math.max(0, H - (top + gh));
    const extended = extra > 0 ? await sharp(garment).extend({ bottom: extra, extendWith: "copy" }).png().toBuffer() : garment;
    // A roupa pode ser mais larga do que a fotografia (ombros): recorta a parte visível.
    const eh = gh + extra;
    const left = Math.round(r.x);
    const cut = { left: Math.max(0, -left), top: Math.max(0, -top) };
    const visW = Math.min(w - cut.left, W - Math.max(0, left));
    const visH = Math.min(eh - cut.top, H - Math.max(0, top));
    const composites =
      visW > 0 && visH > 0
        ? [{ input: await sharp(extended).extract({ left: cut.left, top: cut.top, width: visW, height: visH }).png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) }]
        : [];
    const layer = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(composites)
      .png()
      .toBuffer();
    const data = await sharp(image.data).composite([{ input: layer }]).png().toBuffer();
    return { data, mime: "image/png" as const };
  }

  async improveLighting(image: ImageData) {
    const px = await this.raw(image);
    applyAdjustments(px, autoEnhance(imageStats(px)));
    const data = await sharp(px.data, { raw: { width: px.width, height: px.height, channels: 4 } }).png().toBuffer();
    return { data, mime: "image/png" as const };
  }

  async cropPortrait(image: ImageData, o: { width: number; height: number; face: Box | null; headroom?: number }) {
    const meta = await sharp(image.data).metadata();
    const W = meta.width ?? o.width;
    const H = meta.height ?? o.height;
    const ratio = o.width / o.height;
    // Maior retângulo com a proporção pedida que cabe na imagem, centrado no rosto.
    let cw = W;
    let ch = Math.round(W / ratio);
    if (ch > H) {
      ch = H;
      cw = Math.round(H * ratio);
    }
    const fx = o.face ? (o.face.x + o.face.w / 2) * W : W / 2;
    const fy = o.face ? (o.face.y + o.face.h / 2) * H : H * 0.42;
    const left = Math.round(Math.min(W - cw, Math.max(0, fx - cw / 2)));
    const top = Math.round(Math.min(H - ch, Math.max(0, fy - ch * (o.headroom ?? 0.42))));
    const data = await sharp(image.data).extract({ left, top, width: cw, height: ch }).resize(o.width, o.height).png().toBuffer();
    return { data, mime: "image/png" as const };
  }
}
