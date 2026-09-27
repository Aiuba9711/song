import type { TemplateDesign } from "./design";
import type { SectionKey } from "./types";

/**
 * Tema dos modelos (cores e medidas) e ordem das secções — funções puras, SEM zod, para que as
 * páginas públicas (galeria, página inicial) não carreguem a biblioteca de validação no telemóvel.
 */

export type Theme = {
  accent: string;
  ink: string; // títulos
  text: string;
  muted: string;
  rule: string;
  soft: string; // fundo suave (tint)
  sidebar: { bg: string; text: string; muted: string; heading: string } | null;
  band: { bg: string; text: string; muted: string } | null;
  /** Tamanhos em pontos (pt) */
  size: { base: number; small: number; name: number; title: number; heading: number };
  /** Espaçamentos em pontos */
  space: { section: number; entry: number; pageX: number; pageY: number };
  serifHeadings: boolean;
  serifBody: boolean;
  sidebarWidthPt: number;
};

export function tintHex(hexColor: string, amount: number): string {
  const n = parseInt(hexColor.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, "0")).join("")}`;
}

export function shadeHex(hexColor: string, amount: number): string {
  const n = parseInt(hexColor.slice(1), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, "0")).join("")}`;
}

export function buildTheme(d: TemplateDesign): Theme {
  const mono = d.palette === "mono";
  const accent = mono ? "#111827" : d.accent;
  const dens = { compact: 0.92, normal: 1, airy: 1.06 }[d.density];
  const spacing = { compact: 0.8, normal: 1, airy: 1.25 }[d.density];

  const sidebarStructure = d.structure === "sidebar-left" || d.structure === "sidebar-right";
  let sidebar: Theme["sidebar"] = null;
  if (sidebarStructure) {
    sidebar =
      d.sidebarTone === "accent"
        ? { bg: accent, text: "#ffffff", muted: tintHex(accent, 0.7), heading: tintHex(accent, 0.82) }
        : d.sidebarTone === "dark"
          ? { bg: "#1f2937", text: "#ffffff", muted: "#cbd5e1", heading: "#e5e7eb" }
          : d.sidebarTone === "tint"
            ? { bg: mono ? "#f3f4f6" : tintHex(accent, 0.9), text: "#1e293b", muted: "#475569", heading: accent }
            : { bg: "#f1f5f9", text: "#1e293b", muted: "#475569", heading: accent };
  }
  const band = d.header === "band" ? (mono ? { bg: "#111827", text: "#ffffff", muted: "#d1d5db" } : { bg: accent, text: "#ffffff", muted: tintHex(accent, 0.75) }) : null;

  return {
    accent,
    ink: "#0f172a",
    text: "#1e293b",
    muted: "#475569",
    rule: mono ? "#9ca3af" : tintHex(accent, 0.55),
    soft: mono ? "#f3f4f6" : tintHex(accent, 0.92),
    sidebar,
    band,
    size: { base: 10 * dens, small: 8.8 * dens, name: 22 * dens, title: 11 * dens, heading: d.headingStyle === "serif-line" ? 12 * dens : 9.8 * dens },
    space: { section: 13 * spacing, entry: 7 * spacing, pageX: d.structure === "single" || d.structure === "split" ? 44 : 26, pageY: 36 * spacing },
    serifHeadings: d.font !== "sans",
    serifBody: d.font === "serif",
    sidebarWidthPt: 185,
  };
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = ["summary", "objective", "experience", "education", "skills", "languages", "courses", "certifications", "custom", "references"];
