"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { assertUser, AuthError } from "@/lib/auth/guards";
import { externalBackgroundRemoval } from "@/lib/image-editing";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { boxSchema, BG_REMOVAL_NOT_CONFIGURED } from "@/photo/types";
import { createPhoto, deletePhoto, getPhoto, listPhotos, savePhotoResult, applyPhotoToCv } from "@/server/photos";
import { DomainError } from "@/server/users";
import { logError } from "@/lib/log";

const id = z.string().min(1).max(40);
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; code?: string };

function failure(error: unknown, fallback: string): { ok: false; error: string; code?: string } {
  if (error instanceof AuthError) return { ok: false, error: error.message, code: "AUTH" };
  if (error instanceof DomainError) return { ok: false, error: error.message, code: error.code };
  logError("photo", error); // nunca registar a imagem
  return { ok: false, error: fallback };
}

/** Carregar fotografia (validada no servidor: extensão, MIME, conteúdo real e tamanho). */
export async function uploadProfessionalPhotoAction(formData: FormData): Promise<Result<{ id: string }>> {
  try {
    const user = await assertUser();
    const limit = await rateLimit(`upload:${user.id}`, LIMITS.upload.limit, LIMITS.upload.window);
    if (!limit.ok) return { ok: false, error: "Demasiados envios. Tente mais tarde.", code: "RATE_LIMITED" };
    const file = formData.get("photo");
    if (!(file instanceof File)) return { ok: false, error: "Escolha uma fotografia.", code: "EMPTY" };
    const photo = await createPhoto(user.id, { data: Buffer.from(await file.arrayBuffer()), fileName: file.name || "foto", mime: file.type });
    await audit({ actorId: user.id, action: "photo.upload", entityType: "ProfessionalPhoto", entityId: photo.id });
    revalidatePath("/meu-espaco/fotos");
    return { ok: true, id: photo.id };
  } catch (error) {
    return failure(error, "Não foi possível carregar a fotografia.");
  }
}

/** Guardar o resultado do editor (PNG gerado no navegador + definições para voltar a editar). */
export async function savePhotoResultAction(photoId: string, formData: FormData): Promise<Result> {
  try {
    const user = await assertUser();
    const limit = await rateLimit(`photo-save:${user.id}`, LIMITS.photoSave.limit, LIMITS.photoSave.window);
    if (!limit.ok) return { ok: false, error: "Demasiadas gravações seguidas. Tente mais tarde.", code: "RATE_LIMITED" };
    const file = formData.get("result");
    if (!(file instanceof Blob) || file.size === 0 || file.size > 8 * 1024 * 1024) return { ok: false, error: "Resultado inválido.", code: "INVALID_IMAGE" };
    let settings: unknown;
    let faceOut: unknown;
    try {
      settings = JSON.parse(String(formData.get("settings") ?? "{}"));
      faceOut = JSON.parse(String(formData.get("faceOut") ?? "null"));
    } catch {
      return { ok: false, error: "Definições inválidas.", code: "INVALID" };
    }
    const face = boxSchema.nullable().safeParse(faceOut);
    await savePhotoResult(user.id, id.parse(photoId), Buffer.from(await file.arrayBuffer()), settings, { faceOut: face.success ? face.data : null });
    await audit({ actorId: user.id, action: "photo.save", entityType: "ProfessionalPhoto", entityId: photoId });
    revalidatePath("/meu-espaco/fotos");
    return { ok: true };
  } catch (error) {
    return failure(error, "Não foi possível guardar a fotografia.");
  }
}

export async function deletePhotoAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const photoId = id.parse(formData.get("photoId"));
  try {
    await deletePhoto(user.id, photoId, { alsoFromCvs: formData.get("alsoFromCvs") === "on" });
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  await audit({ actorId: user.id, action: "photo.delete", entityType: "ProfessionalPhoto", entityId: photoId });
  revalidatePath("/meu-espaco/fotos");
  redirect("/meu-espaco/fotos?eliminada=1");
}

/** «Usar no meu CV»: a foto passa a aparecer no espaço de fotografia do modelo do CV. */
export async function applyPhotoToCvAction(photoId: string, cvId: string, variant: "result" | "original"): Promise<Result<{ cvId: string; framing: { zoom: number; offsetX: number; offsetY: number } }>> {
  try {
    const user = await assertUser();
    const framing = await applyPhotoToCv(user.id, id.parse(photoId), id.parse(cvId), variant === "original" ? "original" : "result");
    await audit({ actorId: user.id, action: "photo.use_in_cv", entityType: "CV", entityId: cvId, metadata: { photoId, variant } });
    revalidatePath(`/meu-espaco/cvs/${cvId}`);
    return { ok: true, cvId, framing };
  } catch (error) {
    return failure(error, "Não foi possível usar a fotografia no CV.");
  }
}

/** Remoção AUTOMÁTICA de fundo (serviço externo). Nenhum está configurado: devolve a mensagem. */
export async function requestAutoBackgroundRemovalAction(photoId: string): Promise<Result> {
  try {
    const user = await assertUser();
    if (!(await getPhoto(user.id, id.parse(photoId)))) return { ok: false, error: "Fotografia não encontrada.", code: "NOT_FOUND" };
    const ext = externalBackgroundRemoval();
    if (ext.state !== "CONFIGURADO") return { ok: false, error: BG_REMOVAL_NOT_CONFIGURED, code: "NOT_CONFIGURED" };
    // Quando existir um fornecedor externo: exigir User.imageAiConsentAt antes de enviar a imagem.
    return { ok: false, error: BG_REMOVAL_NOT_CONFIGURED, code: "NOT_CONFIGURED" };
  } catch (error) {
    return failure(error, BG_REMOVAL_NOT_CONFIGURED);
  }
}

/** Fotos do utilizador para escolher no editor de CV. */
export async function listMyPhotosAction(): Promise<Result<{ photos: { id: string; label: string; hasResult: boolean; createdAt: string }[] }>> {
  try {
    const user = await assertUser();
    const photos = await listPhotos(user.id);
    return { ok: true, photos: photos.map((p) => ({ id: p.id, label: p.styleLabel || "Foto carregada", hasResult: !!p.resultKey, createdAt: p.createdAt.toISOString() })) };
  } catch (error) {
    return failure(error, "Não foi possível carregar as fotografias.");
  }
}
