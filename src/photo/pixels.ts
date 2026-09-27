import type { Adjustments } from "./types";

/**
 * Correções de imagem (funções puras sobre píxeis RGBA): brilho, contraste, exposição, saturação
 * e nitidez, e a «Melhoria automática» com limites baixos — sem filtros de beleza, sem alterar
 * a aparência real da pessoa.
 */

export type Pixels = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function isNeutral(a: Adjustments): boolean {
  return a.brightness === 0 && a.contrast === 0 && a.exposure === 0 && a.saturation === 0 && a.sharpness === 0;
}

/** Aplica os ajustes no próprio buffer (exceto nitidez, que precisa de uma cópia). */
export function applyAdjustments(img: Pixels, a: Adjustments): Pixels {
  if (isNeutral(a)) return img;
  const d = img.data;
  const exp = 2 ** a.exposure;
  const bright = a.brightness * 1.5;
  const contrast = (100 + a.contrast) / 100;
  const sat = (100 + a.saturation) / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]! * exp + bright;
    let g = d[i + 1]! * exp + bright;
    let b = d[i + 2]! * exp + bright;
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    if (sat !== 1) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
    }
    d[i] = clamp255(r);
    d[i + 1] = clamp255(g);
    d[i + 2] = clamp255(b);
  }
  if (a.sharpness > 0) sharpen(img, a.sharpness);
  return img;
}

/** Máscara de nitidez (unsharp) 3×3 suave. `amount` 0–100. */
export function sharpen(img: Pixels, amount: number): Pixels {
  const { width: w, height: h, data: d } = img;
  if (w < 3 || h < 3 || amount <= 0) return img;
  const src = new Uint8ClampedArray(d);
  const k = (amount / 100) * 0.8;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const blur =
          (src[i - 4 + c]! + src[i + 4 + c]! + src[i - w * 4 + c]! + src[i + w * 4 + c]! + src[i - (w + 1) * 4 + c]! + src[i - (w - 1) * 4 + c]! + src[i + (w - 1) * 4 + c]! + src[i + (w + 1) * 4 + c]! + src[i + c]!) /
          9;
        d[i + c] = clamp255(src[i + c]! + k * (src[i + c]! - blur));
      }
    }
  }
  return img;
}

export type ImageStats = { mean: number; p2: number; p98: number; saturation: number };

export function imageStats(img: Pixels, step = 4): ImageStats {
  const hist = new Uint32Array(256);
  let sum = 0;
  let satSum = 0;
  let n = 0;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4 * step) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    hist[l]!++;
    sum += l;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    satSum += max === 0 ? 0 : (max - min) / max;
    n++;
  }
  const pct = (p: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v]!;
      if (acc >= n * p) return v;
    }
    return 255;
  };
  return { mean: n ? sum / n : 128, p2: pct(0.02), p98: pct(0.98), saturation: n ? satSum / n : 0 };
}

/** Limites da melhoria automática (pequenos de propósito). */
export const AUTO_LIMITS = { brightness: 15, contrast: 15, saturation: 8, sharpness: 20 } as const;

/** «Melhoria automática»: corrige exposição e contraste de forma moderada. */
export function autoEnhance(stats: ImageStats): Adjustments {
  const brightness = Math.max(-AUTO_LIMITS.brightness, Math.min(AUTO_LIMITS.brightness, Math.round(((128 - stats.mean) / 1.5) * 0.4)));
  const range = stats.p98 - stats.p2;
  const contrast = range < 200 ? Math.min(AUTO_LIMITS.contrast, Math.round((200 - range) / 8)) : 0;
  const saturation = stats.saturation < 0.18 ? AUTO_LIMITS.saturation : 0;
  return { brightness, contrast, exposure: 0, saturation, sharpness: AUTO_LIMITS.sharpness };
}
