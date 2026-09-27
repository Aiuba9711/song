import "server-only";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseMoneyInput } from "@/lib/money";
import { buildStorageKey, storage } from "@/lib/storage";
import { detectFileType, IMAGE_TYPES } from "@/lib/storage/files";
import { BACKGROUND_PATTERNS, OUTFIT_TAGS } from "@/photo/types";
import { DomainError } from "@/server/users";

/**
 * Admin › Foto Profissional: fundos, roupas e preços.
 * Os fundos e as roupas são conteúdo da plataforma (não dados pessoais).
 */

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use o formato #rrggbb).");
const optionalHex = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .pipe(hex.nullable());
const checkbox = z.literal("on").optional().transform((v) => v === "on");
const sortOrder = z.coerce.number().int().min(0).max(100000).default(0);

export const backgroundSchema = z
  .object({
    name: z.string().trim().min(2, "Indique o nome.").max(60),
    category: z.enum(["NEUTRO", "CORPORATIVO", "GRADIENTE"]),
    kind: z.enum(["SOLID", "GRADIENT", "PATTERN", "IMAGE"]),
    color1: hex,
    color2: optionalHex,
    pattern: z
      .string()
      .optional()
      .transform((v) => v || null)
      .pipe(z.enum(BACKGROUND_PATTERNS).nullable()),
    passport: checkbox,
    isActive: checkbox,
    sortOrder,
  })
  .superRefine((d, ctx) => {
    if (d.kind === "GRADIENT" && !d.color2) ctx.addIssue({ code: "custom", path: ["color2"], message: "Um gradiente precisa da segunda cor." });
    if (d.kind === "PATTERN" && !d.pattern) ctx.addIssue({ code: "custom", path: ["pattern"], message: "Escolha o cenário." });
    if (d.passport && d.kind !== "SOLID") ctx.addIssue({ code: "custom", path: ["passport"], message: "Só fundos lisos podem ser recomendados para tipo passe." });
  });
export type BackgroundInput = z.infer<typeof backgroundSchema>;

export const outfitSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome.").max(80),
  gender: z.enum(["MASCULINO", "FEMININO"]),
  garment: z.enum(["BLAZER", "FATO", "CAMISA", "BLUSA"]),
  jacketColor: optionalHex,
  shirtColor: hex,
  tieColor: optionalHex,
  tags: z.array(z.enum(OUTFIT_TAGS)).max(OUTFIT_TAGS.length).default([]),
  isActive: checkbox,
  sortOrder,
});
export type OutfitInput = z.infer<typeof outfitSchema>;

/** Lê o formulário de roupa (as etiquetas vêm em várias caixas com o mesmo nome). */
export function outfitFormObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION") && k !== "tags") obj[k] = v;
  obj.tags = formData.getAll("tags").filter((v): v is string => typeof v === "string");
  return obj;
}

function normalizeOutfit(d: OutfitInput) {
  // Camisa/blusa sem casaco; gravata só em roupa masculina.
  const noJacket = d.garment === "CAMISA" || d.garment === "BLUSA";
  return { ...d, jacketColor: noJacket ? null : d.jacketColor, tieColor: d.gender === "FEMININO" ? null : d.tieColor };
}

// ─── Fundos ─────────────────────────────────────────────────

export const MAX_BACKGROUND_BYTES = 4 * 1024 * 1024; // abaixo do limite de corpo serverless (~4,5 MB)

/** Valida e normaliza a imagem de fundo (JPEG ≤ 1600 px, sem metadados). */
export async function normalizeBackgroundImage(data: Buffer): Promise<Buffer> {
  if (data.length === 0 || data.length > MAX_BACKGROUND_BYTES) throw new DomainError("A imagem deve ter no máximo 4 MB.", "TOO_LARGE");
  const type = detectFileType(data);
  if (!type || !IMAGE_TYPES.includes(type.mime)) throw new DomainError("Use uma imagem JPG, PNG ou WEBP.", "INVALID_TYPE");
  try {
    return await sharp(data, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new DomainError("Não foi possível ler a imagem.", "INVALID_IMAGE");
  }
}

export async function createBackground(input: BackgroundInput, image: Buffer | null) {
  if (input.kind === "IMAGE" && !image) throw new DomainError("Carregue a imagem do fundo.", "IMAGE_REQUIRED");
  let imageKey: string | null = null;
  if (input.kind === "IMAGE" && image) {
    imageKey = buildStorageKey("photo-backgrounds", "jpg");
    await storage().put({ key: imageKey, body: await normalizeBackgroundImage(image), contentType: "image/jpeg" });
  }
  return db.photoBackground.create({ data: { ...input, imageKey }, select: { id: true } });
}

export async function updateBackground(id: string, input: BackgroundInput, image: Buffer | null) {
  const existing = await db.photoBackground.findUnique({ where: { id } });
  if (!existing) throw new DomainError("Fundo não encontrado.", "NOT_FOUND");
  let imageKey = existing.imageKey;
  if (input.kind === "IMAGE" && image) {
    imageKey = buildStorageKey("photo-backgrounds", "jpg");
    await storage().put({ key: imageKey, body: await normalizeBackgroundImage(image), contentType: "image/jpeg" });
  }
  if (input.kind === "IMAGE" && !imageKey) throw new DomainError("Carregue a imagem do fundo.", "IMAGE_REQUIRED");
  if (input.kind !== "IMAGE") imageKey = null;
  await db.photoBackground.update({ where: { id }, data: { ...input, imageKey } });
  if (existing.imageKey && existing.imageKey !== imageKey) await storage().delete(existing.imageKey).catch(() => undefined);
}

export async function toggleBackground(id: string) {
  const b = await db.photoBackground.findUnique({ where: { id }, select: { isActive: true } });
  if (!b) throw new DomainError("Fundo não encontrado.", "NOT_FOUND");
  await db.photoBackground.update({ where: { id }, data: { isActive: !b.isActive } });
  return !b.isActive;
}

/** Remove o fundo. As fotografias já guardadas mantêm o resultado (o fundo fica desligado delas). */
export async function deleteBackground(id: string) {
  const b = await db.photoBackground.findUnique({ where: { id } });
  if (!b) throw new DomainError("Fundo não encontrado.", "NOT_FOUND");
  await db.photoBackground.delete({ where: { id } });
  if (b.imageKey) await storage().delete(b.imageKey).catch(() => undefined);
}

// ─── Roupas ─────────────────────────────────────────────────

export async function createOutfit(input: OutfitInput) {
  return db.photoOutfit.create({ data: normalizeOutfit(input), select: { id: true } });
}

export async function updateOutfit(id: string, input: OutfitInput) {
  const existing = await db.photoOutfit.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new DomainError("Roupa não encontrada.", "NOT_FOUND");
  await db.photoOutfit.update({ where: { id }, data: normalizeOutfit(input) });
}

export async function toggleOutfit(id: string) {
  const o = await db.photoOutfit.findUnique({ where: { id }, select: { isActive: true } });
  if (!o) throw new DomainError("Roupa não encontrada.", "NOT_FOUND");
  await db.photoOutfit.update({ where: { id }, data: { isActive: !o.isActive } });
  return !o.isActive;
}

export async function deleteOutfit(id: string) {
  const o = await db.photoOutfit.findUnique({ where: { id }, select: { id: true } });
  if (!o) throw new DomainError("Roupa não encontrada.", "NOT_FOUND");
  await db.photoOutfit.delete({ where: { id } });
}

// ─── Preços ─────────────────────────────────────────────────

const money = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const minor = parseMoneyInput(v);
      if (minor === null) {
        ctx.addIssue({ code: "custom", message: `Valor inválido para ${label}.` });
        return z.NEVER;
      }
      return minor;
    });

export const photoPricesSchema = z
  .object({
    /** Vazio ou 0 = foto profissional gratuita */
    photoPrice: money("o preço da foto"),
    photoPromoPrice: money("o preço promocional"),
    photoPromoEndsAt: z
      .string()
      .trim()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const d = new Date(`${v}T23:59:59`);
        if (Number.isNaN(d.getTime())) {
          ctx.addIssue({ code: "custom", message: "Data inválida." });
          return z.NEVER;
        }
        return d;
      }),
    /** Vazio = sem pacote CV + Foto */
    photoBundlePrice: money("o pacote"),
  })
  .superRefine((d, ctx) => {
    if (d.photoPromoPrice !== null && d.photoPromoPrice >= (d.photoPrice ?? 0))
      ctx.addIssue({ code: "custom", path: ["photoPromoPrice"], message: "O preço promocional deve ser menor que o preço normal." });
    if (d.photoPromoEndsAt && d.photoPromoPrice === null) ctx.addIssue({ code: "custom", path: ["photoPromoEndsAt"], message: "Indique o preço promocional." });
    if (d.photoBundlePrice !== null && d.photoBundlePrice <= 0) ctx.addIssue({ code: "custom", path: ["photoBundlePrice"], message: "O pacote deve ter um valor maior que zero." });
  });

export function photoPriceData(d: z.infer<typeof photoPricesSchema>) {
  return {
    photoPriceMinor: d.photoPrice ?? 0,
    photoPromoPriceMinor: d.photoPromoPrice,
    photoPromoEndsAt: d.photoPromoPrice === null ? null : d.photoPromoEndsAt,
    photoBundlePriceMinor: d.photoBundlePrice,
  };
}
