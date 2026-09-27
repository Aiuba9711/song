import Anthropic from "@anthropic-ai/sdk";
import { AiProviderError, type AIProvider } from "../provider";

/** Parte do SDK oficial usada aqui (permite substituir o cliente nos testes). */
export type MessagesClient = Pick<Anthropic, "messages">;

/**
 * Provedor Anthropic (SDK oficial `@anthropic-ai/sdk`, Messages API).
 * A chave e o modelo vêm SEMPRE do ambiente (ANTHROPIC_API_KEY, AI_MODEL) — nunca do código.
 * A resposta é pedida através de uma ferramenta com esquema JSON obrigatório.
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
      const res = await this.client.messages.create(
        {
          model: this.opts.model,
          max_tokens: 1500,
          temperature: 0.2,
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
          tools: [{ name: prompt.tool.name, description: prompt.tool.description, input_schema: prompt.tool.schema as Anthropic.Tool.InputSchema }],
          tool_choice: { type: "tool", name: prompt.tool.name },
        },
        { signal, timeout: this.opts.timeoutMs },
      );
      const block = res.content.find((b) => b.type === "tool_use");
      if (!block || block.type !== "tool_use") throw new AiProviderError("Resposta sem conteúdo estruturado.", "bad_response");
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
