import type { Prompt } from "./prompts";
import type { AiRequestParsed } from "./types";

/**
 * AIProvider — camada que permite trocar de provedor de IA sem mexer no resto da aplicação.
 * O provedor recebe o pedido já validado e minimizado (dados pessoais substituídos por
 * marcadores) e devolve JSON; a validação e as verificações anti-invenção são feitas depois,
 * no servidor, da mesma forma para qualquer provedor.
 */
export interface AIProvider {
  /** Identificador interno (ex.: "anthropic", "mock") */
  readonly id: string;
  /** Nome mostrado ao utilizador no pedido de consentimento */
  readonly label: string;
  /** true = o texto sai do nosso servidor para um serviço externo (exige consentimento) */
  readonly external: boolean;
  /** true = provedor de demonstração/testes (regras locais, sem IA real) */
  readonly demo: boolean;
  complete(input: { request: AiRequestParsed; prompt: Prompt; signal: AbortSignal }): Promise<unknown>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "auth" | "rate_limit" | "unavailable" | "bad_response",
  ) {
    super(message);
  }
}
