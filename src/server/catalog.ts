import "server-only";
import { db } from "@/lib/db";
import { resolveDesign, type TemplateDesign } from "@/cv/design";
import type { CvLayoutId } from "@/cv/types";

export { CATEGORY_LABELS, CATEGORY_ORDER } from "@/cv/categories";

const templateSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: true,
  style: true,
  layout: true,
  accentColor: true,
  design: true,
  isAtsFriendly: true,
  isPremium: true,
  priceMinor: true,
  previewImageUrl: true,
  sortOrder: true,
} as const;

type TemplateRow = { layout: CvLayoutId; design: unknown; accentColor: string };

function withDesign<T extends TemplateRow>(t: T): T & { resolvedDesign: TemplateDesign } {
  return { ...t, resolvedDesign: resolveDesign(t) };
}

export async function listActiveTemplates() {
  const rows = await db.cVTemplate.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: templateSelect });
  return rows.map(withDesign);
}

export async function getActiveTemplateBySlug(slug: string) {
  const row = await db.cVTemplate.findFirst({ where: { slug, isActive: true }, select: templateSelect });
  return row ? withDesign(row) : null;
}

export type TemplateSummary = Awaited<ReturnType<typeof listActiveTemplates>>[number];

export async function listActiveProducts() {
  return db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      tier: true,
      shortDescription: true,
      priceMinor: true,
      compareAtPriceMinor: true,
      currency: true,
      features: true,
      isFeatured: true,
    },
  });
}

export async function getActiveProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { files: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, mimeType: true, sizeBytes: true } } },
  });
}

export type FaqItem = { q: string; a: string };

export function parseFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is FaqItem => typeof i === "object" && i !== null && typeof (i as FaqItem).q === "string" && typeof (i as FaqItem).a === "string",
  );
}

/** Produto em destaque para os CTAs da landing (ex.: "Kit Completo — 399 MT"). */
export async function getFeaturedProduct() {
  return db.product.findFirst({
    where: { status: "ACTIVE", isFeatured: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, priceMinor: true, currency: true },
  });
}
