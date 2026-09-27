import "server-only";
import { z } from "zod";
import type { AIProvider } from "./provider";
import { AnthropicProvider } from "./providers/anthropic";
import { MockAiProvider } from "./providers/mock";

/**
 * Escolha do provedor de IA — só por variáveis de ambiente (.env), nunca no código:
 *   AI_PROVIDER="anthropic"  + ANTHROPIC_API_KEY + AI_MODEL   → provedor externo (pede consentimento)
 *   AI_PROVIDER="mock"                                       → demonstração/testes, regras locais
 *   vazio / "none" / configuração incompleta                  → assistente indisponível
 * Lido a cada pedido (não em cache) para que desligar a IA não exija novo deploy de código.
 */
const configSchema = z.object({
  AI_PROVIDER: z.enum(["", "none", "anthropic", "mock"]).catch("none").default("none"),
  ANTHROPIC_API_KEY: z.string().trim().optional(),
  AI_MODEL: z.string().trim().optional(),
  /** Só testes: o provedor de demonstração pede consentimento como se fosse externo */
  AI_MOCK_EXTERNAL: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).catch(20_000).default(20_000),
});

export type AiConfig = z.infer<typeof configSchema>;

export function aiConfig(source: Record<string, string | undefined> = process.env): AiConfig {
  return configSchema.parse(source);
}

let override: AIProvider | null | undefined;

/** Apenas para testes: força um provedor (null = indisponível; undefined = usar o ambiente). */
export function setAiProviderForTests(provider: AIProvider | null | undefined) {
  if (process.env.NODE_ENV !== "test") throw new Error("setAiProviderForTests só pode ser usado em testes");
  override = provider;
}

export function getAiProvider(source: Record<string, string | undefined> = process.env): AIProvider | null {
  if (override !== undefined) return override;
  const c = aiConfig(source);
  switch (c.AI_PROVIDER) {
    case "anthropic":
      if (!c.ANTHROPIC_API_KEY || !c.AI_MODEL) return null;
      return new AnthropicProvider({ apiKey: c.ANTHROPIC_API_KEY, model: c.AI_MODEL, timeoutMs: c.AI_TIMEOUT_MS });
    case "mock":
      return new MockAiProvider({ simulateExternal: c.AI_MOCK_EXTERNAL === "1" });
    default:
      return null;
  }
}

export function aiTimeoutMs(): number {
  return aiConfig().AI_TIMEOUT_MS;
}
