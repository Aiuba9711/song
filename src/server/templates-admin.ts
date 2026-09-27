import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { CvLayout } from "@/generated/prisma/enums";
import { designSchema, isAtsCompatible, type TemplateDesign } from "@/cv/design";
import type { templateSchema } from "@/lib/admin-schemas";
import { db } from "@/lib/db";
import { buildStorageKey, storage } from "@/lib/storage";
import { DomainError } from "@/server/users";

/**
 * Gestão de modelos de CV (admin). O selo «Compatível com ATS» é calculado a partir do
 * design (uma coluna, sem tabelas nem elementos gráficos) — não é uma escolha manual.
 */

export type TemplateInput = z.output<typeof templateSchema> & { design: TemplateDesign };

/** Família de base (compatibilidade com dados antigos), derivada do design. */
export function layoutFor(design: TemplateDesign): CvLayout {
  if (design.structure === "sidebar-left" || design.structure === "sidebar-right") return "MODERNO";
  if (design.header === "band") return "EXECUTIVO";
  return "CLASSICO";
}

/** Lê os campos de design do formulário (valores inválidos → erro por campo). */
export function parseDesignForm(formData: FormData, accentColor: string) {
  const raw = {
    structure: formData.get("structure") ?? undefined,
    header: formData.get("header") ?? undefined,
    headingStyle: formData.get("headingStyle") ?? undefined,
    font: formData.get("font") ?? undefined,
    accent: accentColor,
    palette: formData.get("palette") ?? undefined,
    sidebarTone: formData.get("sidebarTone") ?? undefined,
    density: formData.get("density") ?? undefined,
    entryStyle: formData.get("entryStyle") ?? undefined,
    skillsStyle: formData.get("skillsStyle") ?? undefined,
    photoShape: formData.get("photoShape") ?? undefined,
    photoPosition: formData.get("photoPosition") ?? undefined,
    pairs: formData.get("pairs") === "on",
    photo: formData.get("photo") !== "off", // ausente = com fotografia (compatível com formulários antigos)
    sidebarSections: formData.getAll("sidebarSections").filter((v): v is string => typeof v === "string"),
  };
  return designSchema.safeParse(raw);
}

function toData(input: TemplateInput) {
  const { price, design, ...rest } = input;
  return {
    ...rest,
    priceMinor: price,
    design: design as unknown as Prisma.InputJsonValue,
    layout: layoutFor(design),
    isAtsFriendly: isAtsCompatible(design),
  };
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createTemplate(input: TemplateInput) {
  try {
    return await db.cVTemplate.create({ data: toData(input), select: { id: true } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("Já existe um modelo com este slug.", "SLUG_TAKEN");
    throw error;
  }
}

export async function updateTemplate(id: string, input: TemplateInput) {
  try {
    await db.cVTemplate.update({ where: { id }, data: toData(input) });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("Já existe um modelo com este slug.", "SLUG_TAKEN");
    throw error;
  }
}

/** Duplica um modelo (inativo, para ajustar antes de publicar). */
export async function duplicateTemplate(id: string) {
  const t = await db.cVTemplate.findUnique({ where: { id } });
  if (!t) throw new DomainError("Modelo não encontrado.", "NOT_FOUND");
  const base = `${t.slug}-copia`.slice(0, 54);
  let slug = base;
  for (let n = 2; await db.cVTemplate.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  return db.cVTemplate.create({
    data: {
      slug,
      name: `${t.name} (cópia)`.slice(0, 60),
      description: t.description,
      category: t.category,
      style: t.style,
      layout: t.layout,
      accentColor: t.accentColor,
      design: t.design ?? Prisma.JsonNull,
      isAtsFriendly: t.isAtsFriendly,
      isPremium: t.isPremium,
      priceMinor: t.priceMinor,
      sortOrder: t.sortOrder + 1,
      isActive: false,
      previewImageUrl: null,
      previewImageKey: null,
    },
    select: { id: true },
  });
}

/** Sobe/desce um modelo na ordem da galeria (renumera de 10 em 10). */
export async function moveTemplate(id: string, direction: "up" | "down") {
  const all = await db.cVTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const i = all.findIndex((t) => t.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j]!, all[i]!];
  await db.$transaction(all.map((t, index) => db.cVTemplate.update({ where: { id: t.id }, data: { sortOrder: (index + 1) * 10 } })));
}

export async function toggleTemplate(id: string) {
  const t = await db.cVTemplate.findUnique({ where: { id }, select: { isActive: true } });
  if (!t) throw new DomainError("Modelo não encontrado.", "NOT_FOUND");
  await db.cVTemplate.update({ where: { id }, data: { isActive: !t.isActive } });
  return !t.isActive;
}

export const MAX_PREVIEW_BYTES = 3 * 1024 * 1024;

/** Imagem de pré-visualização carregada no admin: normalizada (sem metadados) e reduzida a 400 px. */
export async function setTemplatePreviewImage(id: string, raw: Buffer) {
  const t = await db.cVTemplate.findUnique({ where: { id }, select: { previewImageKey: true } });
  if (!t) throw new DomainError("Modelo não encontrado.", "NOT_FOUND");
  let data: Buffer;
  try {
    const img = sharp(raw, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
    const meta = await img.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new Error("formato");
    data = await img.resize({ width: 400, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  } catch {
    throw new DomainError("Não foi possível ler a imagem. Use JPG, PNG ou WEBP.", "INVALID_IMAGE");
  }
  const key = buildStorageKey(`templates/${id}`, "jpg");
  await storage().put({ key, body: data, contentType: "image/jpeg" });
  await db.cVTemplate.update({ where: { id }, data: { previewImageKey: key, previewImageUrl: `/api/templates/${id}/preview?v=${Date.now()}` } });
  if (t.previewImageKey) await storage().delete(t.previewImageKey).catch(() => undefined);
}

/** Remove a imagem carregada: volta à imagem gerada (public/templates) ou à renderização ao vivo. */
export async function removeTemplatePreviewImage(id: string) {
  const t = await db.cVTemplate.findUnique({ where: { id }, select: { slug: true, previewImageKey: true } });
  if (!t) throw new DomainError("Modelo não encontrado.", "NOT_FOUND");
  const generated = existsSync(path.join(process.cwd(), "public", "templates", `${t.slug}.jpg`)) ? `/templates/${t.slug}.jpg` : null;
  await db.cVTemplate.update({ where: { id }, data: { previewImageKey: null, previewImageUrl: generated } });
  if (t.previewImageKey) await storage().delete(t.previewImageKey).catch(() => undefined);
}

export async function loadTemplatePreviewImage(id: string): Promise<Buffer | null> {
  const t = await db.cVTemplate.findUnique({ where: { id }, select: { previewImageKey: true } });
  if (!t?.previewImageKey) return null;
  return storage().get(t.previewImageKey);
}
