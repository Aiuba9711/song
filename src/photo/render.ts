"use client";

import { plainBackgroundMask, type MaskResult } from "./background";
import { estimatedFace, faceOnOutput, outfitRect, placement } from "./geometry";
import { applyAdjustments, isNeutral } from "./pixels";
import type { Adjustments, BackgroundDef, Box, EditorSettings } from "./types";
import { outputSize } from "./types";

/**
 * Renderização no navegador (canvas). A lógica de píxeis e de geometria vive em funções puras
 * (pixels.ts, geometry.ts, background.ts); aqui só se desenha.
 */

export const WORK_MAX_SIDE = 1400;

export type Source = { canvas: HTMLCanvasElement; width: number; height: number };

/** Carrega a fotografia original (endereço privado do próprio utilizador) e reduz para ≤ 1400 px. */
export async function loadSource(url: string): Promise<Source> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Não foi possível carregar a fotografia.");
  const bitmap = await createImageBitmap(await res.blob());
  const scale = Math.min(1, WORK_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { canvas, width: canvas.width, height: canvas.height };
}

/** Cópia da fotografia com os ajustes (brilho, contraste…). */
export function adjustedCopy(src: Source, adjust: Adjustments): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src.canvas, 0, 0);
  if (!isNeutral(adjust)) {
    const img = ctx.getImageData(0, 0, out.width, out.height);
    applyAdjustments(img, adjust);
    ctx.putImageData(img, 0, 0);
  }
  return out;
}

/** Píxeis reduzidos (para estatísticas e para a máscara do fundo). */
export function smallPixels(src: Source, maxSide: number): ImageData {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src.canvas, 0, 0, c.width, c.height);
  return ctx.getImageData(0, 0, c.width, c.height);
}

export type Mask = { canvas: HTMLCanvasElement; result: MaskResult };

/** Máscara do fundo liso (algoritmo local). */
export function computeMask(src: Source, tolerance: number): Mask {
  const px = smallPixels(src, 360);
  const result = plainBackgroundMask(px, tolerance);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(result.width, result.height);
  for (let i = 0; i < result.mask.length; i++) {
    img.data[i * 4 + 3] = result.mask[i]!;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, result };
}

/** Deteção de rosto do próprio navegador (Shape Detection API), quando existe. Só a POSIÇÃO. */
export async function detectFace(src: Source): Promise<Box | null> {
  const FD = (globalThis as unknown as { FaceDetector?: new (o: object) => { detect(i: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> } }).FaceDetector;
  if (!FD) return null;
  try {
    const faces = await new FD({ fastMode: true, maxDetectedFaces: 1 }).detect(src.canvas);
    const b = faces[0]?.boundingBox;
    if (!b) return null;
    return { x: b.x / src.width, y: b.y / src.height, w: b.width / src.width, h: b.height / src.height };
  } catch {
    return null;
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagem"));
    img.src = url;
  });
}

/** Cenários «corporativos» desenhados em baixa resolução e ampliados (desfocados). */
function drawPattern(ctx: CanvasRenderingContext2D, W: number, H: number, bg: BackgroundDef) {
  const small = document.createElement("canvas");
  small.width = 48;
  small.height = Math.max(1, Math.round((48 * H) / W));
  const s = small.getContext("2d")!;
  const g = s.createLinearGradient(0, 0, 0, small.height);
  g.addColorStop(0, bg.color1);
  g.addColorStop(1, bg.color2 ?? bg.color1);
  s.fillStyle = g;
  s.fillRect(0, 0, small.width, small.height);
  const w = small.width;
  const h = small.height;
  if (bg.pattern === "office") {
    s.fillStyle = "rgba(255,255,255,0.55)";
    for (const x of [3, 17, 31]) s.fillRect(x, h * 0.1, 11, h * 0.42); // janelas
    s.fillStyle = "rgba(90,100,110,0.18)";
    s.fillRect(0, h * 0.62, w, h * 0.06); // secretária/linha
    s.fillStyle = "rgba(255,255,255,0.35)";
    for (const [x, y] of [[8, 0.7], [40, 0.25], [26, 0.78]] as const) {
      s.beginPath();
      s.arc(x, h * y, 3, 0, Math.PI * 2);
      s.fill();
    }
  } else if (bg.pattern === "wall") {
    s.fillStyle = "rgba(0,0,0,0.05)";
    for (let x = 0; x < w; x += 8) s.fillRect(x, 0, 1, h); // painéis
    s.fillStyle = "rgba(255,255,255,0.25)";
    s.fillRect(0, 0, w, h * 0.35);
  } else {
    const r = s.createRadialGradient(w * 0.5, h * 0.35, 1, w * 0.5, h * 0.35, Math.max(w, h) * 0.7);
    r.addColorStop(0, "rgba(255,255,255,0.7)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    s.fillStyle = r;
    s.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, W, H);
}

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, bg: BackgroundDef | null, image: HTMLImageElement | null) {
  if (!bg) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (bg.kind === "SOLID") {
    ctx.fillStyle = bg.color1;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.kind === "GRADIENT") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bg.color1);
    g.addColorStop(1, bg.color2 ?? bg.color1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.kind === "PATTERN") {
    drawPattern(ctx, W, H, bg);
  } else if (image) {
    const s = Math.max(W / image.width, H / image.height);
    ctx.drawImage(image, (W - image.width * s) / 2, (H - image.height * s) / 2, image.width * s, image.height * s);
  } else {
    ctx.fillStyle = bg.color1;
    ctx.fillRect(0, 0, W, H);
  }
}

export type RenderAssets = {
  source: Source;
  adjusted: HTMLCanvasElement;
  mask: Mask | null;
  background: BackgroundDef | null;
  backgroundImage: HTMLImageElement | null;
  outfitImage: HTMLImageElement | null;
};

/**
 * Desenha a fotografia final num canvas com as dimensões do formato.
 * Devolve a caixa do rosto na saída (normalizada) — usada para recortes e para o CV.
 */
export function renderPhoto(canvas: HTMLCanvasElement, a: RenderAssets, st: EditorSettings, scale = 1): Box | null {
  const size = outputSize(st.format, st.ratio);
  const W = Math.round(size.width * scale);
  const H = Math.round(size.height * scale);
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const useBackground = !!st.backgroundId && !!a.background;
  drawBackground(ctx, W, H, useBackground ? a.background : null, a.backgroundImage);

  // Pessoa: fotografia ajustada (e recortada do fundo, se foi escolhido um fundo).
  let person: CanvasImageSource = a.adjusted;
  if (useBackground && a.mask) {
    const layer = document.createElement("canvas");
    layer.width = a.source.width;
    layer.height = a.source.height;
    const l = layer.getContext("2d")!;
    l.drawImage(a.adjusted, 0, 0);
    l.globalCompositeOperation = "destination-in";
    l.imageSmoothingQuality = "high";
    l.drawImage(a.mask.canvas, 0, 0, layer.width, layer.height);
    person = layer;
  }
  const pl = placement(a.source.width, a.source.height, W, H, st);
  ctx.translate(pl.cx, pl.cy);
  ctx.rotate(pl.rotation);
  ctx.scale(pl.scale, pl.scale);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(person, -a.source.width / 2, -a.source.height / 2);
  ctx.restore();

  const faceBox = st.face ?? estimatedFace(a.source.width, a.source.height);
  const f = faceOnOutput(faceBox, a.source.width, a.source.height, pl);

  // Roupa digital: ilustração por baixo do queixo; a última linha prolonga-se até ao fundo.
  if (st.outfitId && a.outfitImage) {
    const r = outfitRect(W, H, f, st);
    ctx.drawImage(a.outfitImage, r.x, r.y, r.w, r.h);
    const bottom = r.y + r.h;
    if (bottom < H) ctx.drawImage(a.outfitImage, 0, a.outfitImage.height - 2, a.outfitImage.width, 2, r.x, bottom - 1, r.w, H - bottom + 1);
  }
  return {
    x: Math.max(0, (f.cx - f.w / 2) / W),
    y: Math.max(0, (f.cy - f.h / 2) / H),
    w: Math.min(1, f.w / W),
    h: Math.min(1, f.h / H),
  };
}
