import type { OutfitDef } from "./types";

/**
 * Roupa digital — ilustração vetorial (SVG) desenhada sobre os ombros, por baixo do queixo.
 * Não é IA nem altera o rosto, o cabelo ou o corpo: é uma sobreposição que o utilizador
 * posiciona e redimensiona. Desenho em 400 × 300; a margem inferior é contínua para poder
 * prolongar-se até ao fundo da fotografia.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;
const safe = (c: string | null | undefined, fallback: string) => (c && HEX.test(c) ? c : fallback);

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
}

export type OutfitOptions = { tie: boolean; tieColor: string | null };

export function outfitSvg(o: Pick<OutfitDef, "gender" | "garment" | "jacketColor" | "shirtColor" | "tieColor">, opts: OutfitOptions): string {
  const shirt = safe(o.shirtColor, "#ffffff");
  const jacket = o.jacketColor && o.garment !== "CAMISA" && o.garment !== "BLUSA" ? safe(o.jacketColor, "#1f2937") : null;
  const female = o.gender === "FEMININO";
  const tieColor = safe(opts.tieColor ?? o.tieColor, "#1e2a4a");
  const withTie = opts.tie && !female;
  const line = shade(shirt, 0.18);

  const defs = `<defs>
<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shirt}"/><stop offset="1" stop-color="${shade(shirt, 0.08)}"/></linearGradient>
${jacket ? `<linearGradient id="gj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(jacket, -0.06)}"/><stop offset="1" stop-color="${shade(jacket, 0.12)}"/></linearGradient>` : ""}
</defs>`;

  // Corpo (camisa/blusa) com decote/colarinho
  const body = female
    ? `<path d="M0 300 L0 132 C8 94 66 70 146 44 Q200 108 254 44 C334 70 392 94 400 132 L400 300 Z" fill="url(#gs)"/>
<path d="M146 44 Q200 108 254 44" fill="none" stroke="${line}" stroke-width="3"/>`
    : `<path d="M0 300 L0 132 C8 94 66 70 146 42 Q200 62 254 42 C334 70 392 94 400 132 L400 300 Z" fill="url(#gs)"/>
<path d="M146 40 L200 74 L174 100 Z" fill="${shirt}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M254 40 L200 74 L226 100 Z" fill="${shirt}" stroke="${line}" stroke-width="2.5" stroke-linejoin="round"/>`;

  const tie = withTie
    ? `<path d="M189 74 L211 74 L206 94 L194 94 Z" fill="${shade(tieColor, 0.15)}"/>
<path d="M194 94 L206 94 L219 236 L200 262 L181 236 Z" fill="${tieColor}"/>`
    : !female && !jacket
      ? `<g fill="${line}"><circle cx="200" cy="130" r="3"/><circle cx="200" cy="185" r="3"/><circle cx="200" cy="240" r="3"/></g>`
      : "";

  const jacketSvg = jacket
    ? (() => {
        // Painel esquerdo com lapela; o direito é o espelho.
        const depth = female ? 250 : o.garment === "FATO" ? 232 : 240;
        const panel = `<path d="M0 300 L0 132 C8 94 64 70 142 42 L168 100 L${female ? 188 : 196} ${depth} L200 300 Z" fill="url(#gj)"/>
<path d="M142 42 L168 100 L146 122 L${female ? 186 : 194} ${depth - 6} L${female ? 178 : 186} ${depth - 6} L134 118 L154 96 Z" fill="${shade(jacket, 0.18)}"/>`;
        return `<g>${panel}</g><g transform="translate(400 0) scale(-1 1)">${panel}</g>
<path d="M200 ${depth} L200 300" stroke="${shade(jacket, 0.3)}" stroke-width="2"/>`;
      })()
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">${defs}${body}${tie}${jacketSvg}</svg>`;
}

export function outfitDataUrl(o: Parameters<typeof outfitSvg>[0], opts: OutfitOptions): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(outfitSvg(o, opts))}`;
}
