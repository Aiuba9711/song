import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";

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
    console.error("[sitemap] produtos indisponíveis", error);
  }
  return [...staticPages, ...products];
}
