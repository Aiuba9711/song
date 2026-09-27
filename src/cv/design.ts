import { z } from "zod";
import type { CvLayoutId, SectionKey } from "./types";

/**
 * TemplateDesign — descrição declarativa do aspeto de um modelo de CV.
 * Um único motor interpreta este objeto para gerar a pré-visualização (HTML), o PDF e o DOCX,
 * garantindo que a pré-visualização corresponde ao documento final.
 */
export const STRUCTURES = ["single", "sidebar-left", "sidebar-right", "split"] as const;
export const HEADERS = ["left", "center", "band", "split", "stacked"] as const;
export const HEADING_STYLES = ["rule", "caps", "bar", "box", "serif-line", "dot", "underline"] as const;
export const FONTS = ["sans", "serif", "mixed"] as const;
export const SIDEBAR_TONES = ["accent", "dark", "tint", "light"] as const;
export const DENSITIES = ["compact", "normal", "airy"] as const;
export const ENTRY_STYLES = ["classic", "date-left", "timeline", "stacked"] as const;
export const SKILL_STYLES = ["list", "columns", "inline", "tags"] as const;
export const PHOTO_SHAPES = ["circle", "rounded", "square"] as const;
export const PHOTO_POSITIONS = ["left", "right", "center"] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const designSchema = z.object({
  structure: z.enum(STRUCTURES).default("single"),
  header: z.enum(HEADERS).default("left"),
  headingStyle: z.enum(HEADING_STYLES).default("rule"),
  font: z.enum(FONTS).default("sans"),
  accent: hex.default("#1d40d8"),
  /** "mono" = preto e branco (a cor de destaque é ignorada) */
  palette: z.enum(["color", "mono"]).default("color"),
  sidebarTone: z.enum(SIDEBAR_TONES).default("accent"),
  density: z.enum(DENSITIES).default("normal"),
  entryStyle: z.enum(ENTRY_STYLES).default("classic"),
  skillsStyle: z.enum(SKILL_STYLES).default("list"),
  photoShape: z.enum(PHOTO_SHAPES).default("circle"),
  photoPosition: z.enum(PHOTO_POSITIONS).default("left"),
  /** Numa coluna: competências e idiomas lado a lado */
  pairs: z.boolean().default(false),
  /** Secções na coluna lateral (estruturas sidebar/split) */
  sidebarSections: z.array(z.enum(["skills", "languages", "courses", "certifications", "references"])).default(["skills", "languages", "certifications"]),
});

export type TemplateDesign = z.infer<typeof designSchema>;
export type TemplateDesignInput = z.input<typeof designSchema>;

export type Structure = TemplateDesign["structure"];

/** Predefinições das famílias originais (compatibilidade com modelos sem `design`). */
export const LAYOUT_PRESETS: Record<CvLayoutId, TemplateDesignInput> = {
  CLASSICO: { structure: "single", header: "center", headingStyle: "rule", font: "sans", entryStyle: "classic", skillsStyle: "list", pairs: true, photoShape: "circle", photoPosition: "left" },
  MODERNO: { structure: "sidebar-left", header: "left", headingStyle: "bar", font: "sans", sidebarTone: "accent", entryStyle: "timeline", skillsStyle: "list", photoShape: "circle", photoPosition: "center" },
  EXECUTIVO: { structure: "single", header: "band", headingStyle: "serif-line", font: "mixed", entryStyle: "date-left", skillsStyle: "columns", pairs: true, photoShape: "rounded", photoPosition: "left" },
};

/** Design final de um modelo: predefinição da família + design guardado + cor do modelo. */
export function resolveDesign(template: { layout: CvLayoutId; design?: unknown; accentColor?: string | null } | null | undefined): TemplateDesign {
  if (!template) return designSchema.parse({ ...LAYOUT_PRESETS.CLASSICO });
  const preset = LAYOUT_PRESETS[template.layout] ?? LAYOUT_PRESETS.CLASSICO;
  const raw = template.design && typeof template.design === "object" && !Array.isArray(template.design) ? (template.design as Record<string, unknown>) : {};
  // Só chaves conhecidas; valores inválidos fazem cair para a predefinição.
  const known = Object.fromEntries(Object.entries(raw).filter(([k, v]) => k in designSchema.shape && v !== undefined && v !== null));
  const accent = template.accentColor && /^#[0-9a-fA-F]{6}$/.test(template.accentColor) ? { accent: template.accentColor } : {};
  const parsed = designSchema.safeParse({ ...preset, ...known, ...accent });
  return parsed.success ? parsed.data : designSchema.parse({ ...preset, ...accent });
}

/**
 * Compatível com ATS (sistemas de recrutamento): uma coluna, sem faixas coloridas, sem tabelas,
 * sem etiquetas decorativas nem linhas de tempo gráficas.
 */
export function isAtsCompatible(d: TemplateDesign): boolean {
  return (
    d.structure === "single" &&
    (d.header === "left" || d.header === "center" || d.header === "stacked") &&
    (d.headingStyle === "rule" || d.headingStyle === "caps" || d.headingStyle === "underline") &&
    (d.entryStyle === "classic" || d.entryStyle === "stacked") &&
    (d.skillsStyle === "list" || d.skillsStyle === "inline") &&
    !d.pairs
  );
}

// ─── Tema (cores e medidas partilhadas pelos 3 renderizadores) ─────────────

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

/** Rótulos para o admin e para a galeria */
export const STRUCTURE_LABELS: Record<Structure, string> = {
  single: "Uma coluna",
  "sidebar-left": "Barra lateral à esquerda",
  "sidebar-right": "Barra lateral à direita",
  split: "Duas colunas",
};
export const HEADER_LABELS: Record<TemplateDesign["header"], string> = {
  left: "Alinhado à esquerda",
  center: "Centrado",
  band: "Faixa de cor",
  split: "Nome à esquerda, contactos à direita",
  stacked: "Contactos em lista",
};
export const HEADING_LABELS: Record<TemplateDesign["headingStyle"], string> = {
  rule: "Linha inferior",
  caps: "Maiúsculas simples",
  bar: "Barra de cor",
  box: "Caixa de cor",
  "serif-line": "Serifa com linha",
  dot: "Ponto de cor",
  underline: "Sublinhado curto",
};
export const ENTRY_LABELS: Record<TemplateDesign["entryStyle"], string> = {
  classic: "Clássico (data à direita)",
  "date-left": "Datas à esquerda",
  timeline: "Linha do tempo",
  stacked: "Empilhado (ATS)",
};
export const SKILL_LABELS: Record<TemplateDesign["skillsStyle"], string> = {
  list: "Lista",
  columns: "Duas colunas",
  inline: "Numa linha (ATS)",
  tags: "Etiquetas",
};

export const DEFAULT_SECTION_ORDER: SectionKey[] = ["summary", "objective", "experience", "education", "skills", "languages", "courses", "certifications", "custom", "references"];
