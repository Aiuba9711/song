/**
 * Verificação da configuração de PRODUÇÃO (sem rede, sem inventar valores): indica o que falta
 * ou está inseguro antes de publicar. Usada por `npm run check:prod`.
 */
import { resolveAppUrl, resolveDatabaseUrl } from "./deploy-env";

export type CheckLevel = "ERRO" | "AVISO" | "OK";
export type CheckResult = { level: CheckLevel; key: string; message: string };

type Env = Record<string, string | undefined>;

export function checkProductionEnv(env: Env): CheckResult[] {
  const out: CheckResult[] = [];
  const add = (level: CheckLevel, key: string, message: string) => out.push({ level, key, message });
  const v = (k: string) => (env[k] ?? "").trim();

  // Base
  const url = v("APP_URL") || (v("VERCEL_URL") ? resolveAppUrl(env) : "");
  if (!url) add("ERRO", "APP_URL", "Em falta.");
  else if (!url.startsWith("https://")) add("ERRO", "APP_URL", "Tem de usar https:// em produção.");
  else if (/localhost|127\.0\.0\.1/.test(url)) add("ERRO", "APP_URL", "Aponta para localhost.");
  else add("OK", "APP_URL", url);

  const secret = v("APP_SECRET");
  if (secret.length < 32) add("ERRO", "APP_SECRET", "Tem de ter pelo menos 32 caracteres aleatórios.");
  else if (/^dev-only|change-me|example|exemplo/i.test(secret)) add("ERRO", "APP_SECRET", "Parece um valor de exemplo — gere um segredo novo (ex.: openssl rand -base64 48).");
  else add("OK", "APP_SECRET", "Definido.");

  const db = resolveDatabaseUrl(env);
  if (!db) add("ERRO", "DATABASE_URL", "Em falta.");
  else if (/localhost|127\.0\.0\.1/.test(db)) add("AVISO", "DATABASE_URL", "Aponta para uma base local.");
  else if (!/sslmode=(require|verify-full|verify-ca)/.test(db)) add("AVISO", "DATABASE_URL", "Sem sslmode=require — use ligação cifrada à base de dados.");
  else add("OK", "DATABASE_URL", "Definido com SSL.");

  // Armazenamento (fotografias, comprovativos, ficheiros dos kits)
  if (v("STORAGE_DRIVER") !== "s3") add("ERRO", "STORAGE_DRIVER", "Use «s3» em produção: o disco de plataformas serverless é efémero (os ficheiros perdem-se).");
  else {
    const missing = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((k) => !v(k));
    if (missing.length) add("ERRO", "S3_*", `Em falta: ${missing.join(", ")}.`);
    else add("OK", "STORAGE_DRIVER", "s3 configurado (confirme que o bucket é PRIVADO e tem versionamento).");
  }

  // Email (recuperação de senha, avisos de pagamento)
  if (v("EMAIL_DRIVER") !== "resend") add("ERRO", "EMAIL_DRIVER", "Use «resend»: com «console» os emails (recuperação de senha, pagamentos) não são enviados.");
  else if (!v("RESEND_API_KEY")) add("ERRO", "RESEND_API_KEY", "Em falta.");
  else if (!v("EMAIL_FROM")) add("AVISO", "EMAIL_FROM", "Em falta — será usado o remetente por omissão (domínio tem de estar verificado no Resend).");
  else add("OK", "EMAIL_DRIVER", "resend configurado.");

  // Limites
  const scale = v("RATE_LIMIT_SCALE");
  if (scale && scale !== "1") add("ERRO", "RATE_LIMIT_SCALE", `Está em ${scale}: os limites de pedidos ficam ${scale}× mais permissivos. Use 1.`);
  else add("OK", "RATE_LIMIT_SCALE", "1");

  // IA (opcional)
  const ai = v("AI_PROVIDER");
  if (!ai) add("OK", "AI_PROVIDER", "Desligado — o editor mostra «Assistente de IA temporariamente indisponível».");
  else if (ai === "mock") add("AVISO", "AI_PROVIDER", "«mock» é só para demonstração/testes (sem IA real). Deixe vazio ou use «anthropic».");
  else if (ai === "anthropic") {
    const missing = ["ANTHROPIC_API_KEY", "AI_MODEL"].filter((k) => !v(k));
    if (missing.length) add("ERRO", "AI_PROVIDER", `anthropic requer ${missing.join(" e ")}.`);
    else add("OK", "AI_PROVIDER", "anthropic configurado.");
  } else add("ERRO", "AI_PROVIDER", `Valor desconhecido «${ai}».`);
  if (v("AI_MOCK_EXTERNAL")) add("ERRO", "AI_MOCK_EXTERNAL", "Variável só para testes — remova em produção.");

  // Foto profissional
  for (const k of ["IMAGE_BG_PROVIDER", "IMAGE_CLOTHING_PROVIDER"]) {
    if (v(k)) add("ERRO", k, "Nenhuma integração externa está implementada — deixe vazio.");
  }
  const mb = Number(v("PHOTO_MAX_UPLOAD_MB") || "10");
  if (!Number.isFinite(mb) || mb < 1 || mb > 25) add("AVISO", "PHOTO_MAX_UPLOAD_MB", "Fora do intervalo 1–25; será usado 10.");
  const appEnv = v("APP_ENV");
  if (appEnv && appEnv !== "production") add("AVISO", "APP_ENV", `Está em «${appEnv}» — em produção use «production» (ou deixe vazio).`);

  // Variáveis que não devem ficar no ambiente de produção
  if (v("ADMIN_PASSWORD")) add("AVISO", "ADMIN_PASSWORD", "Remova do ambiente depois de criar o administrador.");
  return out;
}
