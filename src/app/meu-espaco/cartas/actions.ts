"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { letterSchema, LETTER_TYPES, type LetterInput } from "@/letters/types";
import { audit } from "@/lib/audit";
import { assertUser, AuthError } from "@/lib/auth/guards";
import { createLetter, deleteLetter, duplicateLetter, saveLetter } from "@/server/letters";
import { DomainError } from "@/server/users";
import { logError } from "@/lib/log";

const id = z.string().min(1).max(40);

export async function createLetterAction(formData: FormData): Promise<void> {
  const user = await assertUser().catch(() => null);
  if (!user) redirect("/entrar?next=/meu-espaco/cartas");
  const type = z.enum(LETTER_TYPES).catch("CANDIDATURA").parse(formData.get("type"));
  let letterId: string;
  try {
    letterId = (await createLetter(user.id, type)).id;
  } catch (error) {
    if (error instanceof DomainError) redirect(`/meu-espaco/cartas?erro=${error.code}`);
    throw error;
  }
  await audit({ actorId: user.id, action: "letter.create", entityType: "CoverLetter", entityId: letterId, metadata: { type } });
  redirect(`/meu-espaco/cartas/${letterId}/editar`);
}

export type LetterSaveResult = { ok: true; savedAt: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveLetterAction(letterId: string, content: LetterInput): Promise<LetterSaveResult> {
  try {
    const user = await assertUser();
    const parsedId = id.safeParse(letterId);
    if (!parsedId.success) return { ok: false, error: "Carta inválida." };
    const parsed = letterSchema.safeParse(content);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Há campos por corrigir antes de guardar.", fieldErrors };
    }
    const { savedAt } = await saveLetter(user.id, parsedId.data, parsed.data);
    revalidatePath("/meu-espaco/cartas");
    return { ok: true, savedAt: savedAt.toISOString() };
  } catch (error) {
    if (error instanceof AuthError || error instanceof DomainError) return { ok: false, error: error.message };
    logError("letter.save", error);
    return { ok: false, error: "Não foi possível guardar. Verifique a ligação e tente novamente." };
  }
}

export async function duplicateLetterAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const letterId = id.parse(formData.get("letterId"));
  try {
    await duplicateLetter(user.id, letterId);
  } catch (error) {
    if (error instanceof DomainError) redirect(`/meu-espaco/cartas?erro=${error.code}`);
    throw error;
  }
  revalidatePath("/meu-espaco/cartas");
  redirect("/meu-espaco/cartas?duplicada=1");
}

export async function deleteLetterAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const letterId = id.parse(formData.get("letterId"));
  try {
    await deleteLetter(user.id, letterId);
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
  }
  await audit({ actorId: user.id, action: "letter.delete", entityType: "CoverLetter", entityId: letterId });
  revalidatePath("/meu-espaco/cartas");
  redirect("/meu-espaco/cartas?eliminada=1");
}
