import type { CvLayoutId } from "../types";

export type LayoutMeta = {
  id: CvLayoutId;
  name: string;
  description: string;
};

/** Layouts implementados (HTML + PDF + DOCX). Novos layouts: adicionar aqui e nos 3 renderizadores. */
export const LAYOUTS: Record<CvLayoutId, LayoutMeta> = {
  CLASSICO: {
    id: "CLASSICO",
    name: "Clássico",
    description: "Uma coluna, títulos claros. Fácil de ler e adequado a sistemas de recrutamento (ATS).",
  },
  MODERNO: {
    id: "MODERNO",
    name: "Moderno",
    description: "Barra lateral com contactos, competências e idiomas. Visual atual e organizado.",
  },
  EXECUTIVO: {
    id: "EXECUTIVO",
    name: "Executivo",
    description: "Cabeçalho forte e tipografia sóbria. Indicado para cargos de gestão e experiência sénior.",
  },
};
