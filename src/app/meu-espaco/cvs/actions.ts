"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cvContentSchema, type CvContentInput } from "@/cv/schema";
import { audit } from "@/lib/audit";
import { assertUser, AuthError } from "@/lib/auth/guards";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { detectFileType, MAX_PHOTO_BYTES } from "@/lib/storage/files";
import { createCv, deleteCv, duplicateCv, removeCvPhoto, saveCv, setCvPhoto, setCvTemplate } from "@/server/cv";
import { DomainError } from "@/server/users";

const id = z.string().min(1).max(40);

export async function createCvAction(formData: FormData): Promise<void> {
  const user = await assertUser().catch(() => null);
  if (!user) redirect("/entrar?next=/meu-espaco/cvs/novo");
  const title = z.string().trim().max(80).optional().parse(formData.get("title") ?? undefined);
  const modelo = z.string().trim().max(60).optional().parse(formData.get("modelo") ?? undefined);
  let cvId: string;
  try {
    const cv = await createCv(user.id, { title, templateSlug: modelo });
    cvId = cv.id;
  } catch (error) {
    if (error instanceof DomainError) redirect(`/meu-espaco/cvs?erro=${error.code}`);
    throw error;
  }
  await audit({ actorId: user.id, action: "cv.create", entityType: "CV", entityId: cvId });
  redirect(`/meu-espaco/cvs/${cvId}/editar`);
}

export type SaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveCvAction(cvId: string, content: CvContentInput, step?: number): Promise<SaveResult> {
  try {
    const user = await assertUser();
    const parsedId = id.safeParse(cvId);
    if (!parsedId.success) return { ok: false, error: "CV inválido." };
    const parsed = cvContentSchema.safeParse(content);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Há campos por corrigir antes de guardar.", fieldErrors };
    }
    const { savedAt } = await saveCv(user.id, parsedId.data, parsed.data, step);
    revalidatePath(`/meu-espaco/cvs/${parsedId.data}`);
    return { ok: true, savedAt: savedAt.toISOString() };
  } catch (error) {
    if (error instanceof AuthError || error instanceof DomainError) return { ok: false, error: error.message };
    console.error("[cv.save]", error);
    return { ok: false, error: "Não foi possível guardar. Verifique a ligação e tente novamente." };
  }
}

export async function duplicateCvAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const cvId = id.parse(formData.get("cvId"));
  let copyId: string;
  try {
    copyId = (await duplicateCv(user.id, cvId)).id;
  } catch (error) {
    if (error instanceof DomainError) redirect(`/meu-espaco/cvs?erro=${error.code}`);
    throw error;
  }
  await audit({ actorId: user.id, action: "cv.duplicate", entityType: "CV", entityId: copyId, metadata: { from: cvId } });
  revalidatePath("/meu-espaco/cvs");
  redirect(`/meu-espaco/cvs?duplicado=${copyId}`);
}

export async function deleteCvAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const cvId = id.parse(formData.get("cvId"));
  try {
    await deleteCv(user.id, cvId);
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  await audit({ actorId: user.id, action: "cv.delete", entityType: "CV", entityId: cvId });
  revalidatePath("/meu-espaco/cvs");
  redirect("/meu-espaco/cvs?eliminado=1");
}

export async function setTemplateAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const cvId = id.parse(formData.get("cvId"));
  const templateId = id.parse(formData.get("templateId"));
  await setCvTemplate(user.id, cvId, templateId);
  revalidatePath(`/meu-espaco/cvs/${cvId}`);
  redirect(`/meu-espaco/cvs/${cvId}`);
}

export type PhotoResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadPhotoAction(cvId: string, formData: FormData): Promise<PhotoResult> {
  try {
    const user = await assertUser();
    const parsedId = id.parse(cvId);
    const limit = await rateLimit(`upload:${user.id}`, LIMITS.upload.limit, LIMITS.upload.window);
    if (!limit.ok) return { ok: false, error: "Demasiados envios. Tente mais tarde." };

    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Escolha uma fotografia." };
    if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "A fotografia deve ter no máximo 1,5 MB." };
    const data = Buffer.from(await file.arrayBuffer());
    const type = detectFileType(data);
    if (!type || (type.mime !== "image/jpeg" && type.mime !== "image/png")) {
      return { ok: false, error: "Formato não suportado. Use JPG ou PNG." };
    }
    await setCvPhoto(user.id, parsedId, data, type.mime);
    return { ok: true, url: `/api/cv/${parsedId}/photo?v=${Date.now()}` };
  } catch (error) {
    if (error instanceof AuthError || error instanceof DomainError) return { ok: false, error: error.message };
    console.error("[cv.photo]", error);
    return { ok: false, error: "Não foi possível enviar a fotografia." };
  }
}

export async function removePhotoAction(cvId: string): Promise<PhotoResult | { ok: true; url: null }> {
  try {
    const user = await assertUser();
    await removeCvPhoto(user.id, id.parse(cvId));
    return { ok: true, url: null };
  } catch (error) {
    if (error instanceof AuthError || error instanceof DomainError) return { ok: false, error: error.message };
    return { ok: false, error: "Não foi possível remover a fotografia." };
  }
}
