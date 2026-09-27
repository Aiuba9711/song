"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AiRequest, AiResponse, AiStatus } from "@/lib/ai/types";
import { assertUser, AuthError } from "@/lib/auth/guards";
import { getAiStatus, giveAiConsent, revokeAiConsent, runAiTask } from "@/server/ai";

/** Pedido ao assistente. Devolve uma sugestão — NUNCA grava nada no CV. */
export async function aiAssistAction(input: AiRequest): Promise<AiResponse> {
  try {
    const user = await assertUser();
    return await runAiTask(user.id, input);
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, code: "AUTH", message: error.message };
    console.error("[ai] erro inesperado:", error instanceof Error ? error.name : "erro");
    return { ok: false, code: "UNAVAILABLE", message: "Assistente de IA temporariamente indisponível." };
  }
}

/** O utilizador aceita que o texto seja enviado ao provedor de IA. */
export async function aiConsentAction(): Promise<AiStatus> {
  const user = await assertUser();
  await giveAiConsent(user.id);
  return getAiStatus(user.id);
}

export async function revokeAiConsentAction(): Promise<void> {
  const user = await assertUser();
  await revokeAiConsent(user.id);
  revalidatePath("/meu-espaco/perfil");
  redirect("/meu-espaco/perfil?ia=retirado");
}
