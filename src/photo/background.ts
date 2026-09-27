import type { Pixels } from "./pixels";

/**
 * Substituição de FUNDO LISO — algoritmo local (sem IA, sem serviços externos).
 *
 * Parte das margens superior e laterais da fotografia (o fundo) e alastra por píxeis de cor
 * parecida. Tudo o que não é alcançado é considerado a pessoa. Funciona bem com fotografias
 * tiradas contra uma parede lisa; com fundos complexos avisa o utilizador — nesses casos é
 * necessária a remoção automática de fundo (BackgroundRemovalProvider), ainda não configurada.
 */

export type MaskResult = {
  /** 0 = fundo, 255 = pessoa (mesmas dimensões da imagem analisada) */
  mask: Uint8Array;
  width: number;
  height: number;
  /** Fração da imagem classificada como fundo */
  backgroundRatio: number;
  /** As margens têm cor uniforme (fundo liso)? */
  uniform: boolean;
  /** Pode usar-se com confiança razoável */
  reliable: boolean;
};

function dist(d: Uint8ClampedArray | Uint8Array, i: number, r: number, g: number, b: number): number {
  const dr = d[i]! - r;
  const dg = d[i + 1]! - g;
  const db = d[i + 2]! - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function plainBackgroundMask(img: Pixels, tolerance = 40): MaskResult {
  const { width: w, height: h, data: d } = img;
  const n = w * h;
  // Pontos de partida: linha superior e as duas colunas laterais (até 85% da altura).
  const seeds: number[] = [];
  for (let x = 0; x < w; x++) seeds.push(x);
  for (let y = 0; y < Math.floor(h * 0.85); y++) seeds.push(y * w, y * w + w - 1);

  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of seeds) {
    r += d[p * 4]!;
    g += d[p * 4 + 1]!;
    b += d[p * 4 + 2]!;
  }
  r /= seeds.length;
  g /= seeds.length;
  b /= seeds.length;
  let spread = 0;
  for (const p of seeds) spread += dist(d, p * 4, r, g, b);
  spread /= seeds.length;
  const uniform = spread < 28;

  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seedLimit = tolerance * 1.2;
  for (const p of seeds) {
    if (!visited[p] && dist(d, p * 4, r, g, b) < seedLimit) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  }
  const step = tolerance * 0.55;
  while (head < tail) {
    const p = queue[head++]!;
    const x = p % w;
    const y = (p - x) / w;
    const pi = p * 4;
    const neighbours = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const q of neighbours) {
      if (q < 0 || visited[q]) continue;
      const qi = q * 4;
      // Cor próxima do fundo E transição suave em relação ao vizinho (não atravessa contornos).
      if (dist(d, qi, r, g, b) < tolerance && dist(d, qi, d[pi]!, d[pi + 1]!, d[pi + 2]!) < step) {
        visited[q] = 1;
        queue[tail++] = q;
      }
    }
  }

  const mask = new Uint8Array(n);
  let bg = 0;
  for (let p = 0; p < n; p++) {
    if (visited[p]) bg++;
    else mask[p] = 255;
  }
  const backgroundRatio = bg / n;
  return { mask: featherMask(mask, w, h, 2), width: w, height: h, backgroundRatio, uniform, reliable: uniform && backgroundRatio > 0.15 && backgroundRatio < 0.85 };
}

/** Suaviza a transição pessoa/fundo (média em caixa, duas passagens). */
export function featherMask(mask: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  if (radius <= 0) return mask;
  const tmp = new Float32Array(w * h);
  const out = new Uint8Array(w * h);
  const size = radius * 2 + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -radius; x <= radius; x++) acc += mask[y * w + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / size;
      acc += mask[y * w + Math.min(w - 1, x + radius + 1)]! - mask[y * w + Math.max(0, x - radius)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -radius; y <= radius; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(acc / size);
      acc += tmp[Math.min(h - 1, y + radius + 1) * w + x]! - tmp[Math.max(0, y - radius) * w + x]!;
    }
  }
  return out;
}

/** Paragens do gradiente de um fundo (vertical). */
export function gradientStops(color1: string, color2: string | null): [string, string] {
  return [color1, color2 ?? color1];
}
