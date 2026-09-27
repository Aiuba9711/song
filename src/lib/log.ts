/**
 * Registo de erros SEM dados pessoais: só o tipo, o código e a origem do erro.
 * Mensagens de erro da base de dados podem conter o conteúdo enviado (textos do CV, emails);
 * por isso a mensagem só é incluída fora de produção.
 */
export function logError(tag: string, error: unknown, extra?: Record<string, string | number | boolean | null>): void {
  const e = error as { name?: string; code?: unknown; message?: string } | null;
  const info: Record<string, unknown> = {
    type: e?.name ?? typeof error,
    ...(typeof e?.code === "string" || typeof e?.code === "number" ? { code: e.code } : {}),
    ...extra,
  };
  if (process.env.NODE_ENV !== "production" && e?.message) info.message = e.message.slice(0, 300);
  console.error(`[${tag}]`, JSON.stringify(info));
}
