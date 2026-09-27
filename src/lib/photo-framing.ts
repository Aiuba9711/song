/**
 * Enquadramento da fotografia — fórmula partilhada pelo servidor (recorte com sharp) e pelo
 * editor (CSS), para que o que o utilizador vê seja exatamente o que sai no PDF/DOCX.
 */
export type Framing = { zoom: number; offsetX: number; offsetY: number };

export function cropBox(width: number, height: number, f: Framing) {
  const zoom = Math.min(3, Math.max(1, f.zoom || 1));
  const side = Math.max(1, Math.floor(Math.min(width, height) / zoom));
  const cx = width / 2 + (Math.max(-1, Math.min(1, f.offsetX)) * (width - side)) / 2;
  const cy = height / 2 + (Math.max(-1, Math.min(1, f.offsetY)) * (height - side)) / 2;
  const left = Math.round(Math.min(width - side, Math.max(0, cx - side / 2)));
  const top = Math.round(Math.min(height - side, Math.max(0, cy - side / 2)));
  return { left, top, width: side, height: side };
}

/** Estilo CSS de fundo que mostra o mesmo recorte numa caixa quadrada de `viewport` px. */
export function framingToCss(naturalWidth: number, naturalHeight: number, f: Framing, viewport: number) {
  const box = cropBox(naturalWidth, naturalHeight, f);
  const scale = viewport / box.width;
  return {
    backgroundSize: `${naturalWidth * scale}px ${naturalHeight * scale}px`,
    backgroundPosition: `${-box.left * scale}px ${-box.top * scale}px`,
  };
}
