import Anthropic from "@anthropic-ai/sdk";
import { AiProviderError, type AIProvider } from "../provider";

/** Parte do SDK oficial usada aqui (permite substituir o cliente nos testes). */
export type MessagesClient = Pick<Anthropic, "messages" | "beta">;

/**
 * Modelos em que o servidor pode, se o modelo recusar o pedido, repeti-lo automaticamente noutro
 * modelo adequado («fallbacks: default», beta server-side-fallback-2026-07-01, só na API da Anthropic).
 */
const SERVER_FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

/**
 * Provedor Anthropic (SDK oficial `@anthropic-ai/sdk`, Messages API).
 * A chave e o modelo vêm SEMPRE do ambiente (ANTHROPIC_API_KEY, AI_MODEL) — nunca do código.
 * A resposta é pedida através de uma ferramenta com esquema JSON (validada depois com zod).
 * Compatível com os modelos atuais: sem «temperature» (recusada pelos modelos recentes) e com
 * tool_choice «auto» + instrução explícita (o uso forçado de ferramenta é recusado por alguns).
 */
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly label = "Anthropic";
  readonly external = true;
  readonly demo = false;
  private readonly client: MessagesClient;

  constructor(private readonly opts: { apiKey: string; model: string; timeoutMs: number; client?: MessagesClient }) {
    this.client = opts.client ?? new Anthropic({ apiKey: opts.apiKey, maxRetries: 1 });
  }

  async complete({ prompt, signal }: Parameters<AIProvider["complete"]>[0]): Promise<unknown> {
    try {
      const toolName = prompt.tool.name;
      const body = {
        model: this.opts.model,
        max_tokens: 8000, // inclui o raciocínio dos modelos atuais; a resposta em si é curta
        system: `${prompt.system}\n\nResponde sempre e só através da ferramenta «${toolName}», chamando-a uma única vez.`,
        messages: [{ role: "user" as const, content: prompt.user }],
        tools: [{ name: toolName, description: prompt.tool.description, input_schema: prompt.tool.schema as Anthropic.Tool.InputSchema }],
        tool_choice: { type: "auto" as const },
      };
      const requestOptions = { signal, timeout: this.opts.timeoutMs };
      const res = SERVER_FALLBACK_MODELS.has(this.opts.model)
        ? await this.client.beta.messages.create({ ...body, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }, requestOptions)
        : await this.client.messages.create(body, requestOptions);
      if (res.stop_reason === "refusal") throw new AiProviderError("Pedido recusado pelo provedor.", "unavailable");
      const blocks = res.content as Array<{ type: string; name?: string; input?: unknown }>;
      const block = blocks.find((b) => b.type === "tool_use" && b.name === toolName);
      if (!block) throw new AiProviderError("Resposta sem conteúdo estruturado.", "bad_response");
      return block.input;
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof Anthropic.APIConnectionTimeoutError || (error instanceof Error && error.name === "AbortError")) throw new AiProviderError("Tempo esgotado.", "timeout");
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new AiProviderError("Credenciais do provedor inválidas.", "auth");
      if (error instanceof Anthropic.RateLimitError) throw new AiProviderError("Limite do provedor atingido.", "rate_limit");
      throw new AiProviderError("Provedor indisponível.", "unavailable");
    }
  }
}
