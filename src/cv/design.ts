import { z } from "zod";
import type { CvLayoutId } from "./types";

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
  /** false = modelo sem espaço para fotografia (filtro «Sem fotografia» da galeria) */
  photo: z.boolean().default(true),
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

// Tema e ordem das secções vivem em ./theme (sem zod: usados na pré-visualização pública).
export { buildTheme, DEFAULT_SECTION_ORDER, shadeHex, tintHex, type Theme } from "./theme";

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

