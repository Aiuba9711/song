import "server-only";
import { LocalImageEditingProvider } from "./local";
import type { ImageEditingProvider, ProviderStatus } from "./types";

/**
 * Registo dos fornecedores de imagem, configurado só por variáveis de ambiente:
 *   APP_ENV                  development | staging | production (predefinição: NODE_ENV)
 *   IMAGE_BG_PROVIDER        fornecedor externo de remoção de fundo (vazio = não configurado)
 *   IMAGE_CLOTHING_PROVIDER  fornecedor externo de roupa (vazio = não configurado)
 * Ainda NÃO existe nenhuma integração externa implementada: qualquer valor preenchido aparece
 * como ERRO no admin até ser implementado um fornecedor com documentação oficial.
 */
export type AppEnvironment = "development" | "staging" | "production";

export function appEnvironment(env: Record<string, string | undefined> = process.env): AppEnvironment {
  const v = (env.APP_ENV ?? "").trim().toLowerCase();
  if (v === "development" || v === "staging" || v === "production") return v;
  return env.NODE_ENV === "production" ? "production" : "development";
}

/** Fornecedores externos implementados (nenhum por agora). */
const EXTERNAL_BG: Record<string, never> = {};
const EXTERNAL_CLOTHING: Record<string, never> = {};

export function externalBackgroundRemoval(env: Record<string, string | undefined> = process.env) {
  const value = (env.IMAGE_BG_PROVIDER ?? "").trim();
  if (!value) return { state: "NAO_CONFIGURADO" as const, value, provider: null };
  return value in EXTERNAL_BG ? { state: "CONFIGURADO" as const, value, provider: null } : { state: "ERRO" as const, value, provider: null };
}

export function externalClothing(env: Record<string, string | undefined> = process.env) {
  const value = (env.IMAGE_CLOTHING_PROVIDER ?? "").trim();
  if (!value) return { state: "NAO_CONFIGURADO" as const, value, provider: null };
  return value in EXTERNAL_CLOTHING ? { state: "CONFIGURADO" as const, value, provider: null } : { state: "ERRO" as const, value, provider: null };
}

let local: LocalImageEditingProvider | null = null;

/** Fornecedor usado pelo servidor (hoje sempre o local). */
export function getImageEditingProvider(): ImageEditingProvider {
  local ??= new LocalImageEditingProvider();
  return local;
}

export function providerStatuses(env: Record<string, string | undefined> = process.env): ProviderStatus[] {
  const bg = externalBackgroundRemoval(env);
  const cl = externalClothing(env);
  const ext = (s: { state: ProviderStatus["external"]["state"]; value: string }, what: string) => ({
    state: s.state,
    value: s.value,
    description:
      s.state === "NAO_CONFIGURADO"
        ? `Nenhum serviço externo de ${what} configurado.`
        : s.state === "ERRO"
          ? `Fornecedor «${s.value}» desconhecido — não existe integração implementada.`
          : `Fornecedor «${s.value}» ativo.`,
  });
  return [
    {
      name: "BackgroundRemovalProvider",
      local: { state: "CONFIGURADO", description: "Substituição de fundos lisos (algoritmo local, sem IA)." },
      external: ext(bg, "remoção automática de fundo"),
    },
    {
      name: "ClothingProvider",
      local: { state: "CONFIGURADO", description: "Roupa digital por sobreposição de ilustração (sem IA)." },
      external: ext(cl, "edição de roupa"),
    },
    {
      name: "ImageEditingProvider",
      local: { state: "CONFIGURADO", description: "Recorte, iluminação, fundo liso e roupa — processamento local." },
      external: { state: "NAO_CONFIGURADO", value: "", description: "Sem serviço externo de edição de imagem." },
    },
  ];
}
