import "server-only";
import { db } from "@/lib/db";
import type { TemplateCategory } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  GERAL: "Geral",
  PRIMEIRO_EMPREGO: "Primeiro emprego",
  ADMINISTRATIVO: "Administrativo",
  CONTABILIDADE: "Contabilidade",
  RECURSOS_HUMANOS: "Recursos Humanos",
  SAUDE: "Saúde",
  EDUCACAO: "Educação",
  INFORMATICA: "Informática",
  ENGENHARIA: "Engenharia",
  VENDAS_MARKETING: "Vendas / Marketing",
  EXECUTIVO: "Executivo",
};

export async function listActiveTemplates() {
  return db.cVTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, description: true, category: true, layout: true, accentColor: true, isPremium: true },
  });
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
