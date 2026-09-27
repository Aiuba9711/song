import type { Box, EditorSettings, PhotoFormatId } from "./types";

/**
 * Geometria do recorte (funções puras): onde e com que escala/rotação a fotografia original é
 * desenhada na área de saída. A mesma conta é usada no ecrã e nos testes.
 */

export type Placement = { cx: number; cy: number; scale: number; rotation: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Escala mínima para a imagem rodada cobrir toda a área de saída (sem cantos vazios). */
export function coverScale(sw: number, sh: number, W: number, H: number, rotationDeg: number): number {
  const c = Math.abs(Math.cos(rad(rotationDeg)));
  const s = Math.abs(Math.sin(rad(rotationDeg)));
  return Math.max((W * c + H * s) / sw, (W * s + H * c) / sh);
}

export function placement(sw: number, sh: number, W: number, H: number, st: Pick<EditorSettings, "zoom" | "offsetX" | "offsetY" | "rotation">): Placement {
  return {
    cx: W / 2 + (st.offsetX * W) / 2,
    cy: H / 2 + (st.offsetY * H) / 2,
    scale: coverScale(sw, sh, W, H, st.rotation) * st.zoom,
    rotation: rad(st.rotation),
  };
}

/** Ponto da imagem original (px) → ponto na saída (px). */
export function toOutput(p: { x: number; y: number }, sw: number, sh: number, pl: Placement): { x: number; y: number } {
  const dx = (p.x - sw / 2) * pl.scale;
  const dy = (p.y - sh / 2) * pl.scale;
  const c = Math.cos(pl.rotation);
  const s = Math.sin(pl.rotation);
  return { x: pl.cx + dx * c - dy * s, y: pl.cy + dx * s + dy * c };
}

/** Caixa do rosto (normalizada) → retângulo aproximado na saída. */
export function faceOnOutput(face: Box, sw: number, sh: number, pl: Placement) {
  const center = toOutput({ x: (face.x + face.w / 2) * sw, y: (face.y + face.h / 2) * sh }, sw, sh, pl);
  return { cx: center.x, cy: center.y, w: face.w * sw * pl.scale, h: face.h * sh * pl.scale };
}

/**
 * Estimativa quando o navegador não deteta o rosto: fotografia de retrato típica, rosto
 * centrado na horizontal e no terço superior. É só um ponto de partida — o utilizador ajusta.
 */
export function estimatedFace(sw: number, sh: number): Box {
  const w = Math.min(0.38, (0.3 * Math.min(sw, sh)) / sw);
  const h = Math.min(0.4, (0.36 * Math.min(sw, sh)) / sh);
  return { x: 0.5 - w / 2, y: Math.max(0, 0.34 - h / 2), w, h };
}

/** Altura do rosto e posição vertical do centro do rosto pretendidas, por formato (fração da altura). */
const TARGET: Record<PhotoFormatId, { faceH: number; centerY: number }> = {
  PASSE: { faceH: 0.46, centerY: 0.44 }, // mais espaço acima da cabeça e ombros visíveis
  CV: { faceH: 0.36, centerY: 0.4 },
  QUADRADA: { faceH: 0.4, centerY: 0.42 },
  PERSONALIZADA: { faceH: 0.38, centerY: 0.41 },
};

/** «Centralizar automaticamente»: zoom e deslocação para o rosto ficar bem enquadrado. */
export function autoCenter(face: Box, sw: number, sh: number, W: number, H: number, st: Pick<EditorSettings, "rotation" | "format">): { zoom: number; offsetX: number; offsetY: number } {
  const target = TARGET[st.format];
  const base = coverScale(sw, sh, W, H, st.rotation);
  const faceHpx = face.h * sh;
  const zoom = Math.min(4, Math.max(1, (target.faceH * H) / (faceHpx * base)));
  const pl = placement(sw, sh, W, H, { zoom, offsetX: 0, offsetY: 0, rotation: st.rotation });
  const f = faceOnOutput(face, sw, sh, pl);
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return { zoom, offsetX: clamp(((W / 2 - f.cx) * 2) / W), offsetY: clamp(((target.centerY * H - f.cy) * 2) / H) };
}

/**
 * Retângulo da roupa digital na saída: por baixo do queixo, com largura proporcional ao rosto
 * (ou à imagem, se não houver rosto), mais os ajustes do utilizador.
 */
export function outfitRect(W: number, H: number, face: { cx: number; cy: number; w: number; h: number } | null, st: Pick<EditorSettings, "outfitScale" | "outfitX" | "outfitY">) {
  const baseW = face ? Math.min(W * 1.4, face.w * 3.4) : W * 0.95;
  const w = baseW * st.outfitScale;
  const h = w * 0.75; // proporção do desenho (400 × 300)
  const top = face ? face.cy + face.h * 0.5 + face.h * 0.02 : H * 0.64;
  const cx = face ? face.cx : W / 2;
  return { x: cx - w / 2 + st.outfitX * W, y: top + st.outfitY * H, w, h };
}
