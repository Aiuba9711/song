import { z } from "zod";

/**
 * Assistente de IA — contrato partilhado (cliente e servidor).
 * A IA só trabalha sobre o que o utilizador escreveu: melhora, corrige, reduz, reorganiza
 * e sugere — nunca acrescenta experiência, empresas, diplomas, certificações, competências,
 * resultados ou cargos. Nenhuma sugestão altera o CV sem o utilizador clicar «Aplicar sugestão».
 */

export const AI_LIMITS = {
  summary: 2000,
  objective: 600,
  experience_description: 2500,
  jobDescription: 8000,
  /** Texto total do CV enviado como contexto (sugestões de competências / análise da vaga) */
  cvSources: 12000,
} as const;

export const REWRITE_FIELDS = ["summary", "objective", "experience_description"] as const;
export type RewriteField = (typeof REWRITE_FIELDS)[number];

export const REWRITE_MODES = ["improve", "correct", "shorten", "objective"] as const;
export type RewriteMode = (typeof REWRITE_MODES)[number];

export const REWRITE_MODE_LABELS: Record<RewriteMode, string> = {
  improve: "Melhorar",
  correct: "Corrigir português",
  shorten: "Reduzir texto",
  objective: "Mais objetivo",
};

export const FIELD_LABELS: Record<RewriteField, string> = {
  summary: "Perfil profissional",
  objective: "Objetivo profissional",
  experience_description: "Descrição de funções",
};

const trimmed = (max: number) => z.string().max(max, `Texto demasiado longo (máximo ${max} caracteres).`);

/** Um bloco de texto do próprio CV usado como contexto/prova (ex.: «Experiência: Técnica de Suporte»). */
export const cvSourceSchema = z.object({ label: z.string().max(80), text: z.string().max(3000) });
export type CvSource = z.infer<typeof cvSourceSchema>;

export const aiRequestSchema = z.discriminatedUnion("task", [
  z.object({
    task: z.literal("rewrite"),
    field: z.enum(REWRITE_FIELDS),
    mode: z.enum(REWRITE_MODES).default("improve"),
    text: z.string(),
    /** Cargo pretendido / cargo desta experiência — só contexto */
    context: z.object({ jobTitle: trimmed(120).default(""), position: trimmed(120).default("") }).default({ jobTitle: "", position: "" }),
    /** Opcional: adaptar o texto à vaga (só resumo e objetivo) */
    jobDescription: trimmed(AI_LIMITS.jobDescription).default(""),
  }),
  z.object({
    task: z.literal("suggest_skills"),
    existingSkills: z.array(z.string().max(80)).max(60).default([]),
    sources: z.array(cvSourceSchema).max(60),
  }),
  z.object({
    task: z.literal("analyze_job"),
    jobDescription: trimmed(AI_LIMITS.jobDescription),
    sources: z.array(cvSourceSchema).max(60),
  }),
]);
export type AiRequest = z.input<typeof aiRequestSchema>;
export type AiRequestParsed = z.output<typeof aiRequestSchema>;

export type RewriteResult = { task: "rewrite"; suggestion: string; notes: string[] };
export type SkillSuggestion = { name: string; evidence: string };
export type SkillsResult = { task: "suggest_skills"; skills: SkillSuggestion[] };
export type JobHighlight = { tip: string; evidence: string };
export type JobMatch = { term: string; inCv: boolean };
export type JobAnalysisResult = {
  task: "analyze_job";
  jobTitle: string;
  skills: string[];
  requirements: string[];
  keywords: string[];
  experience: string;
  highlights: JobHighlight[];
  /** Calculado localmente: termos da vaga que aparecem (ou não) no CV */
  matches: JobMatch[];
};
export type AiResult = RewriteResult | SkillsResult | JobAnalysisResult;

export type AiErrorCode = "UNAVAILABLE" | "CONSENT_REQUIRED" | "EMPTY" | "TOO_LONG" | "INVALID" | "RATE_LIMITED" | "UNGROUNDED" | "NO_RESULT" | "AUTH";

export type AiResponse = { ok: true; result: AiResult; demo: boolean } | { ok: false; code: AiErrorCode; message: string };

/** Estado do assistente para a interface. */
export type AiStatus = {
  available: boolean;
  /** Nome do provedor mostrado no pedido de consentimento (ex.: «Anthropic») */
  providerLabel: string;
  /** O texto sai do nosso servidor para um provedor externo → exige consentimento */
  external: boolean;
  consentGiven: boolean;
  /** Provedor de demonstração (regras locais, sem IA real) */
  demo: boolean;
};

export const AI_UNAVAILABLE_MESSAGE = "Assistente de IA temporariamente indisponível.";
export const AI_REVIEW_WARNING = "Revise o conteúdo antes de utilizar. A IA não deve substituir informações verdadeiras sobre a sua experiência.";
