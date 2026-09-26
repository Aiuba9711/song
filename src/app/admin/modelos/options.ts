import { LAYOUTS } from "@/cv/layouts";
import { CATEGORY_LABELS } from "@/server/catalog";

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
export const LAYOUT_OPTIONS = Object.values(LAYOUTS).map((l) => ({ value: l.id, label: l.name }));
