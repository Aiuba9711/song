import "server-only";
import sharp, { type Metadata } from "sharp";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getImageEditingProvider } from "@/lib/image-editing";
import { buildStorageKey, storage } from "@/lib/storage";
import { detectFileType } from "@/lib/storage/files";
import { editorSettingsSchema, FORMAT_PRESETS, outputSize, styleLabel, type BackgroundDef, type Box, type EditorSettings, type OutfitDef } from "@/photo/types";
import { getPaymentSettings } from "@/server/payments/settings";
import { DomainError } from "@/server/users";
import { removeCvPhoto, setCvPhoto } from "@/server/cv";
import { resolveDesign } from "@/cv/design";
import type { CvLayoutId } from "@/cv/types";

/**
 * Foto Profissional — servidor.
 * Fotografias são dados pessoais: armazenamento privado, acesso só do dono, metadados (EXIF/GPS)
 * removidos, eliminação a pedido. Nunca usadas para treinar modelos; nada é enviado para fora.
 */

export const PHOTO_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const PHOTO_MAX_SIDE = 2000;
export const PHOTO_MIN_SIDE = 200;
export const MAX_PHOTOS_PER_USER = 30;

/** Tamanho máximo do envio, configurável por PHOTO_MAX_UPLOAD_MB (1–25; predefinição 10). */
export function maxUploadBytes(env: Record<string, string | undefined> = process.env): number {
  const mb = Number(env.PHOTO_MAX_UPLOAD_MB);
  return Math.round((Number.isFinite(mb) && mb >= 1 && mb <= 25 ? mb : 10) * 1024 * 1024);
}

const FAMILY: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Valida nome, MIME declarado, conteúdo real (magic bytes) e tamanho. Lança DomainError. */
export function validatePhotoUpload(data: Buffer, fileName: string, declaredMime: string): "image/jpeg" | "image/png" | "image/webp" {
  if (data.length === 0) throw new DomainError("Escolha uma fotografia.", "EMPTY");
  if (data.length > maxUploadBytes()) throw new DomainError(`A fotografia é demasiado grande (máximo ${Math.round(maxUploadBytes() / 1024 / 1024)} MB).`, "TOO_LARGE");
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (!(PHOTO_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) throw new DomainError("Formato não suportado. Use JPG, JPEG, PNG ou WEBP.", "INVALID_EXTENSION");
  if (declaredMime && !Object.values(FAMILY).includes(declaredMime)) throw new DomainError("Formato não suportado. Use JPG, JPEG, PNG ou WEBP.", "INVALID_TYPE");
  const real = detectFileType(data);
  if (!real || !Object.values(FAMILY).includes(real.mime)) throw new DomainError("O ficheiro não é uma imagem válida.", "INVALID_TYPE");
  if (FAMILY[ext] !== real.mime) throw new DomainError("A extensão do ficheiro não corresponde ao conteúdo.", "MISMATCH");
  return real.mime as "image/jpeg" | "image/png" | "image/webp";
}

/** Normaliza: aplica a orientação EXIF, remove TODOS os metadados, reduz para ≤ 2000 px, JPEG. */
export async function normalizeOriginal(data: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  try {
    const img = sharp(data, { failOn: "error", limitInputPixels: 60_000_000 }).rotate();
    const meta = await img.metadata();
    const side = Math.min(meta.autoOrient?.width ?? meta.width ?? 0, meta.autoOrient?.height ?? meta.height ?? 0);
    if (side < PHOTO_MIN_SIDE) throw new DomainError(`A fotografia é demasiado pequena (mínimo ${PHOTO_MIN_SIDE} px).`, "TOO_SMALL");
    const { data: out, info } = await img
      .resize({ width: PHOTO_MAX_SIDE, height: PHOTO_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { data: out, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("Não foi possível ler a imagem.", "INVALID_IMAGE");
  }
}

export async function createPhoto(userId: string, input: { data: Buffer; fileName: string; mime: string }) {
  validatePhotoUpload(input.data, input.fileName, input.mime);
  const count = await db.professionalPhoto.count({ where: { userId } });
  if (count >= MAX_PHOTOS_PER_USER) throw new DomainError(`Atingiu o limite de ${MAX_PHOTOS_PER_USER} fotografias. Elimine uma para carregar outra.`, "LIMIT");
  const normalized = await normalizeOriginal(input.data);
  const originalKey = buildStorageKey(`photos/${userId}`, "jpg");
  await storage().put({ key: originalKey, body: normalized.data, contentType: "image/jpeg" });
  const thumb = await sharp(normalized.data).resize({ width: 320, height: 320, fit: "inside" }).jpeg({ quality: 78 }).toBuffer();
  const thumbKey = buildStorageKey(`photos/${userId}`, "jpg");
  await storage().put({ key: thumbKey, body: thumb, contentType: "image/jpeg" });
  return db.professionalPhoto.create({
    data: { userId, originalKey, thumbKey, settings: editorSettingsSchema.parse({}) as unknown as Prisma.InputJsonValue },
    select: { id: true },
  });
}

export async function listPhotos(userId: string) {
  return db.professionalPhoto.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, format: true, styleLabel: true, resultKey: true, backgroundId: true, outfitId: true, createdAt: true, updatedAt: true, purchasedAt: true, _count: { select: { cvs: true } } },
  });
}

export async function getPhoto(userId: string, id: string) {
  return db.professionalPhoto.findFirst({ where: { id, userId } });
}

export type PhotoVariant = "original" | "result" | "thumb";

/** Bytes de uma variante (só do dono). */
export async function loadPhotoVariant(userId: string, id: string, variant: PhotoVariant): Promise<{ data: Buffer; mime: string } | null> {
  const p = await getPhoto(userId, id);
  if (!p) return null;
  const key = variant === "original" ? p.originalKey : variant === "result" ? p.resultKey : p.thumbKey;
  if (!key) return null;
  const data = await storage().get(key);
  return data ? { data, mime: variant === "result" ? "image/png" : "image/jpeg" } : null;
}

export function settingsOf(p: { settings: unknown }): EditorSettings {
  const parsed = editorSettingsSchema.safeParse(p.settings ?? {});
  return parsed.success ? parsed.data : editorSettingsSchema.parse({});
}

export type SaveMeta = { faceOut: Box | null };

/**
 * Guarda o resultado do editor (PNG gerado no navegador). O servidor valida o formato, as
 * dimensões e a proporção, volta a codificar (sem metadados) e gera a miniatura.
 */
export async function savePhotoResult(userId: string, id: string, png: Buffer, rawSettings: unknown, meta: SaveMeta) {
  const p = await getPhoto(userId, id);
  if (!p) throw new DomainError("Fotografia não encontrada.", "NOT_FOUND");
  const parsed = editorSettingsSchema.safeParse(rawSettings);
  if (!parsed.success) throw new DomainError("Definições inválidas.", "INVALID");
  const settings = parsed.data;
  if (detectFileType(png)?.mime !== "image/png") throw new DomainError("Resultado inválido.", "INVALID_IMAGE");
  let info: Metadata;
  try {
    info = await sharp(png, { failOn: "error", limitInputPixels: 10_000_000 }).metadata();
  } catch {
    throw new DomainError("Resultado inválido.", "INVALID_IMAGE");
  }
  const w = info.width ?? 0;
  const h = info.height ?? 0;
  if (w > PHOTO_MAX_SIDE || h > PHOTO_MAX_SIDE || w < PHOTO_MIN_SIDE || h < PHOTO_MIN_SIDE) throw new DomainError("Dimensões do resultado inválidas.", "INVALID_IMAGE");
  const expected = outputSize(settings.format, settings.ratio);
  if (Math.abs(w / h - expected.width / expected.height) > 0.02) throw new DomainError("A proporção do resultado não corresponde ao formato.", "INVALID_IMAGE");

  const [background, outfit] = await Promise.all([
    settings.backgroundId ? db.photoBackground.findUnique({ where: { id: settings.backgroundId } }) : null,
    settings.outfitId ? db.photoOutfit.findUnique({ where: { id: settings.outfitId } }) : null,
  ]);
  if (settings.backgroundId && !background) throw new DomainError("Fundo indisponível.", "INVALID");
  if (settings.outfitId && !outfit) throw new DomainError("Roupa indisponível.", "INVALID");

  const clean = await sharp(png).png({ compressionLevel: 8 }).toBuffer(); // sem metadados
  const thumb = await sharp(clean).resize({ width: 320, height: 320, fit: "inside" }).flatten({ background: "#ffffff" }).jpeg({ quality: 78 }).toBuffer();
  const resultKey = buildStorageKey(`photos/${userId}`, "png");
  const thumbKey = buildStorageKey(`photos/${userId}`, "jpg");
  await storage().put({ key: resultKey, body: clean, contentType: "image/png" });
  await storage().put({ key: thumbKey, body: thumb, contentType: "image/jpeg" });

  const label = styleLabel(settings, background ? (background as unknown as BackgroundDef) : null, outfit ? (outfit as unknown as OutfitDef) : null);
  await db.professionalPhoto.update({
    where: { id },
    data: {
      resultKey,
      thumbKey,
      format: settings.format,
      width: w,
      height: h,
      settings: { ...settings, faceOut: meta.faceOut } as unknown as Prisma.InputJsonValue,
      backgroundId: background?.id ?? null,
      outfitId: outfit?.id ?? null,
      styleLabel: label,
    },
  });
  await Promise.all([p.resultKey, p.thumbKey].filter((k): k is string => !!k).map((k) => storage().delete(k).catch(() => undefined)));
  return { width: w, height: h };
}

/** Elimina a fotografia (ficheiros e registo). Opcionalmente retira-a também dos CVs que a usam. */
export async function deletePhoto(userId: string, id: string, options: { alsoFromCvs?: boolean } = {}) {
  const p = await getPhoto(userId, id);
  if (!p) throw new DomainError("Fotografia não encontrada.", "NOT_FOUND");
  if (options.alsoFromCvs) {
    const cvs = await db.cV.findMany({ where: { userId, professionalPhotoId: id }, select: { id: true } });
    for (const cv of cvs) await removeCvPhoto(userId, cv.id);
  }
  await db.professionalPhoto.delete({ where: { id } });
  await Promise.all([p.originalKey, p.resultKey, p.thumbKey].filter((k): k is string => !!k).map((k) => storage().delete(k).catch(() => undefined)));
}

// ─── Preço e acesso ─────────────────────────────────────────

export async function getPhotoPricing(now = new Date()) {
  const s = await getPaymentSettings();
  const promoActive = s.photoPromoPriceMinor !== null && s.photoPromoPriceMinor < s.photoPriceMinor && (!s.photoPromoEndsAt || s.photoPromoEndsAt > now);
  const priceMinor = promoActive ? s.photoPromoPriceMinor! : s.photoPriceMinor;
  return {
    priceMinor,
    regularMinor: s.photoPriceMinor,
    promoActive,
    promoEndsAt: promoActive ? s.photoPromoEndsAt : null,
    bundleMinor: s.photoBundlePriceMinor && s.photoBundlePriceMinor > 0 ? s.photoBundlePriceMinor : null,
    currency: s.currency,
    paid: priceMinor > 0,
  };
}

/** Pode descarregar / usar no CV? Grátis quando o preço é 0; senão, depois do pagamento confirmado. */
export async function canUsePhoto(userId: string, id: string): Promise<boolean> {
  const p = await db.professionalPhoto.findFirst({ where: { id, userId }, select: { purchasedAt: true } });
  if (!p) return false;
  if (p.purchasedAt) return true;
  if (!(await getPhotoPricing()).paid) return true;
  return !!(await db.orderItem.findFirst({ where: { photoId: id, kind: { in: ["PHOTO_UNLOCK", "CV_PHOTO_BUNDLE"] }, order: { userId, status: "PAID" } }, select: { id: true } }));
}

// ─── Download ───────────────────────────────────────────────

export type ExportKind = "final" | "passe" | "cv";

export async function exportPhoto(userId: string, id: string, fileFormat: "jpg" | "png", kind: ExportKind) {
  const p = await getPhoto(userId, id);
  if (!p?.resultKey) throw new DomainError("Guarde primeiro a fotografia no editor.", "NOT_FOUND");
  if (!(await canUsePhoto(userId, id))) throw new DomainError("O download desta fotografia requer pagamento confirmado.", "PAYMENT_REQUIRED");
  const stored = await storage().get(p.resultKey);
  if (!stored) throw new DomainError("Fotografia não encontrada.", "NOT_FOUND");
  let data = stored;
  const settings = p.settings as { faceOut?: Box | null } | null;
  if (kind !== "final") {
    const target = kind === "passe" ? FORMAT_PRESETS.PASSE : FORMAT_PRESETS.CV;
    data = (await getImageEditingProvider().cropPortrait({ data, mime: "image/png" }, { width: target.width, height: target.height, face: settings?.faceOut ?? null })).data;
  }
  const out = fileFormat === "png" ? await sharp(data).png().toBuffer() : await sharp(data).flatten({ background: "#ffffff" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  const suffix = kind === "passe" ? "tipo-passe" : kind === "cv" ? "cv" : "profissional";
  return { data: out, mime: fileFormat === "png" ? "image/png" : "image/jpeg", fileName: `Foto-${suffix}.${fileFormat}` };
}

// ─── Dados do editor ────────────────────────────────────────

/** Fundos ativos no formato usado pelo editor (as imagens carregadas no admin têm endereço próprio). */
export async function activeBackgrounds(): Promise<BackgroundDef[]> {
  const rows = await db.photoBackground.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    kind: b.kind,
    color1: b.color1,
    color2: b.color2,
    pattern: b.pattern,
    imageUrl: b.kind === "IMAGE" && b.imageKey ? `/api/foto-fundos/${b.id}` : null,
    passport: b.passport,
  }));
}

export async function activeOutfits(): Promise<OutfitDef[]> {
  const rows = await db.photoOutfit.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map((o) => ({ id: o.id, name: o.name, gender: o.gender, garment: o.garment, jacketColor: o.jacketColor, shirtColor: o.shirtColor, tieColor: o.tieColor, tags: o.tags }));
}

/** CVs do utilizador para «Usar no meu CV» (com indicação se o modelo mostra fotografia). */
export async function cvsForPhoto(userId: string) {
  const cvs = await db.cV.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, professionalPhotoId: true, template: { select: { name: true, layout: true, design: true, accentColor: true } } },
  });
  return cvs.map((cv) => ({
    id: cv.id,
    title: cv.title,
    professionalPhotoId: cv.professionalPhotoId,
    templateName: cv.template?.name ?? "Clássico",
    supportsPhoto: resolveDesign(cv.template ? { layout: cv.template.layout as CvLayoutId, design: cv.template.design, accentColor: cv.template.accentColor } : null).photo,
  }));
}

// ─── Usar no CV ─────────────────────────────────────────────

/** Coloca a fotografia no espaço de foto do CV (cópia própria do CV, enquadrada no rosto). */
export async function applyPhotoToCv(userId: string, photoId: string, cvId: string, variant: "result" | "original") {
  const [p, cv] = await Promise.all([getPhoto(userId, photoId), db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true } })]);
  if (!p || !cv) throw new DomainError("Fotografia ou CV não encontrado.", "NOT_FOUND");
  if (variant === "result" && !p.resultKey) throw new DomainError("Guarde primeiro a fotografia no editor.", "NOT_FOUND");
  if (!(await canUsePhoto(userId, photoId))) throw new DomainError("Para usar esta fotografia no CV é necessário concluir a compra.", "PAYMENT_REQUIRED");
  const data = await storage().get(variant === "result" ? p.resultKey! : p.originalKey);
  if (!data) throw new DomainError("Fotografia não encontrada.", "NOT_FOUND");
  await setCvPhoto(userId, cvId, data);

  // Os modelos usam uma área quadrada: enquadra na zona do rosto (fotos verticais).
  const meta = await sharp(data).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const face = variant === "result" ? ((p.settings as { faceOut?: Box | null } | null)?.faceOut ?? null) : (settingsOf(p).face ?? null);
  let offsetY = 0;
  if (h > w) {
    const cy = face ? (face.y + face.h / 2) * h : h * 0.4;
    offsetY = Math.max(-1, Math.min(1, ((cy - h / 2) * 2) / (h - w)));
  }
  await db.cV.update({ where: { id: cvId }, data: { professionalPhotoId: photoId, showPhoto: true, photoOffsetY: offsetY, photoOffsetX: 0, photoZoom: 1 } });
  return { zoom: 1, offsetX: 0, offsetY };
}
