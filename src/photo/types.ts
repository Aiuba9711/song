import { z } from "zod";

/**
 * Foto Profissional — tipos, presets e estado do editor (partilhados por cliente e servidor).
 * Todo o processamento local é feito no navegador; o servidor valida e guarda o resultado.
 */

export const PHOTO_FORMATS = ["PASSE", "CV", "QUADRADA", "PERSONALIZADA"] as const;
export type PhotoFormatId = (typeof PHOTO_FORMATS)[number];

/** Proporções disponíveis para o formato personalizado (largura:altura). */
export const CUSTOM_RATIOS = ["3:4", "2:3", "4:5", "5:7", "1:1", "4:3"] as const;
export type CustomRatio = (typeof CUSTOM_RATIOS)[number];

export const FORMAT_PRESETS: Record<Exclude<PhotoFormatId, "PERSONALIZADA">, { label: string; description: string; width: number; height: number }> = {
  PASSE: { label: "Foto tipo passe", description: "Vertical 3,5 × 4,5 — cabeça e ombros, fundo claro.", width: 700, height: 900 },
  CV: { label: "Foto para CV", description: "Retrato vertical profissional (4:5).", width: 800, height: 1000 },
  QUADRADA: { label: "Foto quadrada", description: "Para perfil (LinkedIn, WhatsApp).", width: 1000, height: 1000 },
};

export const FORMAT_LABELS: Record<PhotoFormatId, string> = {
  PASSE: FORMAT_PRESETS.PASSE.label,
  CV: FORMAT_PRESETS.CV.label,
  QUADRADA: FORMAT_PRESETS.QUADRADA.label,
  PERSONALIZADA: "Foto personalizada",
};

/** Dimensões de saída (px) de um formato. */
export function outputSize(format: PhotoFormatId, ratio: CustomRatio = "4:5"): { width: number; height: number } {
  if (format !== "PERSONALIZADA") return { width: FORMAT_PRESETS[format].width, height: FORMAT_PRESETS[format].height };
  const [w, h] = ratio.split(":").map(Number) as [number, number];
  const long = 1000;
  return w >= h ? { width: long, height: Math.round((long * h) / w) } : { width: Math.round((long * w) / h), height: long };
}

export const PASSPORT_NOTICE =
  "Formato visual preparado para fotografia profissional. Confirme sempre os requisitos específicos da instituição onde irá utilizar a fotografia.";

export const CLOTHING_NOTICE = "Roupa digital: é uma ilustração sobreposta à fotografia (edição digital), não uma fotografia real da roupa.";

export const BG_REMOVAL_NOT_CONFIGURED = "Remoção automática de fundo ainda não configurada.";

// ─── Estado do editor ───────────────────────────────────────

const num = (min: number, max: number, def: number) => z.number().finite().min(min).max(max).default(def);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const adjustmentsSchema = z.object({
  brightness: num(-50, 50, 0),
  contrast: num(-50, 50, 0),
  /** Exposição em «stops» (−1 … +1) */
  exposure: num(-1, 1, 0),
  saturation: num(-100, 100, 0),
  sharpness: num(0, 100, 0),
});
export type Adjustments = z.infer<typeof adjustmentsSchema>;
export const NO_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, exposure: 0, saturation: 0, sharpness: 0 };

/** Caixa normalizada (0–1) em relação à imagem original. */
export const boxSchema = z.object({ x: num(0, 1, 0), y: num(0, 1, 0), w: num(0, 1, 0), h: num(0, 1, 0) });
export type Box = z.infer<typeof boxSchema>;

export const editorSettingsSchema = z.object({
  format: z.enum(PHOTO_FORMATS).default("CV"),
  ratio: z.enum(CUSTOM_RATIOS).default("4:5"),
  /** Rotação total em graus (voltas de 90° + ajuste fino) */
  rotation: num(-360, 360, 0),
  zoom: num(1, 4, 1),
  /** Deslocação em fração de metade da largura/altura de saída (−1 … 1) */
  offsetX: num(-1, 1, 0),
  offsetY: num(-1, 1, 0),
  adjust: adjustmentsSchema.default(NO_ADJUSTMENTS),
  /** null = manter o fundo original */
  backgroundId: z.string().max(40).nullable().default(null),
  /** Sensibilidade da deteção de fundo liso (maior = remove mais) */
  tolerance: num(10, 90, 40),
  outfitId: z.string().max(40).nullable().default(null),
  tie: z.boolean().default(false),
  tieColor: color.nullable().default(null),
  outfitScale: num(0.5, 2, 1),
  outfitX: num(-0.5, 0.5, 0),
  outfitY: num(-0.5, 0.5, 0),
  /** Posição do rosto (só a caixa; nenhuma outra informação) */
  face: boxSchema.nullable().default(null),
  /** A caixa do rosto veio do detetor do navegador (true) ou de uma estimativa (false) */
  faceDetected: z.boolean().default(false),
});
export type EditorSettings = z.infer<typeof editorSettingsSchema>;
export const DEFAULT_SETTINGS: EditorSettings = editorSettingsSchema.parse({});

// ─── Fundos e roupas (dados vindos da BD) ───────────────────

export type BackgroundDef = {
  id: string;
  name: string;
  category: "NEUTRO" | "CORPORATIVO" | "GRADIENTE";
  kind: "SOLID" | "GRADIENT" | "PATTERN" | "IMAGE";
  color1: string;
  color2: string | null;
  pattern: string | null;
  imageUrl: string | null;
  passport: boolean;
};

export const BACKGROUND_CATEGORY_LABELS: Record<BackgroundDef["category"], string> = { NEUTRO: "Neutros", CORPORATIVO: "Corporativos", GRADIENTE: "Gradientes" };
export const BACKGROUND_PATTERNS = ["office", "wall", "studio"] as const;
export const PATTERN_LABELS: Record<(typeof BACKGROUND_PATTERNS)[number], string> = { office: "Escritório desfocado", wall: "Parede corporativa", studio: "Ambiente profissional subtil" };

export type OutfitDef = {
  id: string;
  name: string;
  gender: "MASCULINO" | "FEMININO";
  garment: "BLAZER" | "FATO" | "CAMISA" | "BLUSA";
  jacketColor: string | null;
  shirtColor: string;
  tieColor: string | null;
  tags: string[];
};

export const OUTFIT_TAGS = ["CORPORATIVO", "EXECUTIVO", "PRIMEIRO_EMPREGO", "ENTREVISTA", "ACADEMICO", "FORMAL_CLASSICO", "EXECUTIVO_MODERNO", "CORPORATIVO_DISCRETO"] as const;
export const OUTFIT_TAG_LABELS: Record<(typeof OUTFIT_TAGS)[number], string> = {
  CORPORATIVO: "Corporativo",
  EXECUTIVO: "Executivo",
  PRIMEIRO_EMPREGO: "Primeiro emprego",
  ENTREVISTA: "Entrevista",
  ACADEMICO: "Académico",
  FORMAL_CLASSICO: "Formal clássico",
  EXECUTIVO_MODERNO: "Executivo moderno",
  CORPORATIVO_DISCRETO: "Corporativo discreto",
};

/** Filtros do passo «Roupa» (pedido: Homem, Mulher, Blazer, Fato, Camisa, Blusa, Gravata + estilos). */
export const OUTFIT_FILTERS = [
  { id: "MASCULINO", label: "Homem", test: (o: OutfitDef) => o.gender === "MASCULINO" },
  { id: "FEMININO", label: "Mulher", test: (o: OutfitDef) => o.gender === "FEMININO" },
  { id: "BLAZER", label: "Blazer", test: (o: OutfitDef) => o.garment === "BLAZER" },
  { id: "FATO", label: "Fato", test: (o: OutfitDef) => o.garment === "FATO" },
  { id: "CAMISA", label: "Camisa", test: (o: OutfitDef) => o.garment === "CAMISA" },
  { id: "BLUSA", label: "Blusa", test: (o: OutfitDef) => o.garment === "BLUSA" },
  { id: "GRAVATA", label: "Gravata", test: (o: OutfitDef) => !!o.tieColor },
  ...(["CORPORATIVO", "EXECUTIVO", "PRIMEIRO_EMPREGO", "ENTREVISTA", "ACADEMICO"] as const).map((t) => ({ id: t, label: OUTFIT_TAG_LABELS[t], test: (o: OutfitDef) => o.tags.includes(t) })),
] as const;

/** Recomendações — sugestões de estilo, nenhuma é «obrigatoriamente melhor». */
export const LOOK_RECOMMENDATIONS = [
  { tag: "FORMAL_CLASSICO", label: "Formal clássico", description: "Cores escuras e camisa branca — sóbrio e intemporal." },
  { tag: "EXECUTIVO_MODERNO", label: "Executivo moderno", description: "Tons de cinza e azul, sem exageros." },
  { tag: "CORPORATIVO_DISCRETO", label: "Corporativo discreto", description: "Neutro e simples, para qualquer área." },
  { tag: "PRIMEIRO_EMPREGO", label: "Primeiro emprego", description: "Camisa ou blusa clara, aparência cuidada." },
  { tag: "ACADEMICO", label: "Académico", description: "Tons terra e bege, ambiente de ensino e investigação." },
] as const;

export const TIE_COLORS = [
  { color: "#111827", label: "Preta" },
  { color: "#1e2a4a", label: "Azul-marinho" },
  { color: "#5b1a26", label: "Vinho escuro" },
  { color: "#6b7280", label: "Cinza" },
  { color: "#4a3426", label: "Castanho escuro" },
] as const;

/** Descrição curta do resultado (galeria: «modelo utilizado»). */
export function styleLabel(s: EditorSettings, background: BackgroundDef | null, outfit: OutfitDef | null): string {
  return [FORMAT_LABELS[s.format], background ? `Fundo ${background.name.toLowerCase()}` : "", outfit ? outfit.name : ""].filter(Boolean).join(" · ");
}

/** «Foto profissional» se tiver fundo ou roupa; «Foto editada» caso contrário. */
export function photoKindLabel(s: Pick<EditorSettings, "backgroundId" | "outfitId">): "Foto profissional" | "Foto editada" {
  return s.backgroundId || s.outfitId ? "Foto profissional" : "Foto editada";
}
