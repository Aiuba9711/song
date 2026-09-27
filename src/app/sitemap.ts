import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { logError } from "@/lib/log";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "/cv-modelos", "/kits", "/conselhos", "/contactos", "/privacidade", "/termos"].map((path) => ({
    url: appUrl(path || "/"),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  let products: MetadataRoute.Sitemap = [];
  try {
    const rows = await db.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } });
    products = rows.map((p) => ({ url: appUrl(`/kits/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.8 }));
  } catch (error) {
    logError("sitemap", error);
  }
  let templates: MetadataRoute.Sitemap = [];
  try {
    const rows = await db.cVTemplate.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { sortOrder: "asc" } });
    templates = rows.map((t) => ({ url: appUrl(`/cv-modelos/${t.slug}`), lastModified: t.updatedAt, changeFrequency: "monthly", priority: 0.6 }));
  } catch (error) {
    logError("sitemap", error);
  }
  return [...staticPages, ...products, ...templates];
}
