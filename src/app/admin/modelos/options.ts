import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/cv/categories";
import { resolveDesign } from "@/cv/design";

/** Categorias no formulário (inclui «Geral»; a categoria legada Vendas/Marketing só aparece se já estiver em uso). */
export function categoryOptions(current?: string) {
  const keys = [...CATEGORY_ORDER, "GERAL" as const];
  if (current && !keys.includes(current as (typeof keys)[number])) keys.push(current as (typeof keys)[number]);
  return keys.map((value) => ({ value, label: CATEGORY_LABELS[value] }));
}

export const NEW_TEMPLATE_DESIGN = resolveDesign({ layout: "CLASSICO", design: { structure: "single", header: "left", headingStyle: "rule", entryStyle: "classic", skillsStyle: "list", pairs: false }, accentColor: "#1d40d8" });
