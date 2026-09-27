import sharp from "sharp";
import { cropBox, type Framing } from "./photo-framing";

export type { Framing } from "./photo-framing";

/**
 * Processamento de fotografias de CV (servidor).
 * - aceita JPG/JPEG, PNG e WEBP;
 * - corrige a orientação (EXIF) e REMOVE todos os metadados (ex.: localização GPS);
 * - redimensiona (máx. 1200 px) e comprime em JPEG.
 */
export const MAX_PHOTO_SOURCE_BYTES = 8 * 1024 * 1024;
export const PHOTO_MAX_SIDE = 1200;

export async function normalizePhoto(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const image = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).rotate(); // aplica EXIF e descarta-o
  const meta = await image.metadata();
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new Error("Formato de imagem não suportado");
  const { data, info } = await image
    .resize({ width: PHOTO_MAX_SIDE, height: PHOTO_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Fotografia enquadrada (quadrada, 600 px, JPEG) usada na pré-visualização, no PDF e no DOCX. */
export async function framePhoto(normalized: Buffer, f: Framing, size = 600): Promise<Buffer> {
  const meta = await sharp(normalized).metadata();
  const box = cropBox(meta.width ?? size, meta.height ?? size, f);
  return sharp(normalized).extract(box).resize(size, size).jpeg({ quality: 85 }).toBuffer();
}

/** Versão PNG com a forma do modelo (círculo/cantos arredondados) — o Word não recorta imagens. */
export async function maskPhoto(square: Buffer, shape: "circle" | "rounded" | "square", size = 400): Promise<Buffer> {
  const base = sharp(square).resize(size, size).ensureAlpha();
  if (shape === "square") return base.png().toBuffer();
  const radius = shape === "circle" ? size / 2 : Math.round(size * 0.09);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
  return base
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}
