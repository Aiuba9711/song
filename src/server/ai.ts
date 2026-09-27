import "server-only";
import { z } from "zod";
import { aiTimeoutMs, getAiProvider } from "@/lib/ai";
import { cleanOutput, describeUngrounded, findUngrounded, isGrounded, normalize, quoteFound, redact, restore, sharesStem, stemCoverage } from "@/lib/ai/guard";
import { buildPrompt } from "@/lib/ai/prompts";
import { AiProviderError, type AIProvider } from "@/lib/ai/provider";
import {
  AI_LIMITS,
  AI_UNAVAILABLE_MESSAGE,
  aiRequestSchema,
  type AiErrorCode,
  type AiRequestParsed,
  type AiResponse,
  type AiResult,
  type AiStatus,
  type CvSource,
  type JobMatch,
} from "@/lib/ai/types";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";

/**
 * Assistente de IA do CV.
 * - Não altera nada na base de dados: devolve SUGESTÕES; só o utilizador as aplica.
 * - Só envia texto para um provedor externo com consentimento explícito do utilizador.
 * - Envia apenas o necessário, com emails/telefones/links substituídos por marcadores.
 * - Rejeita sugestões com números, nomes, siglas, emails ou links que o utilizador não escreveu.
 * - Não guarda o texto enviado nem a resposta (só um registo técnico sem conteúdo).
 */

const fail = (code: AiErrorCode, message: string): AiResponse => ({ ok: false, code, message });

export async function getAiStatus(userId: string, provider: AIProvider | null = getAiProvider()): Promise<AiStatus> {
  if (!provider) return { available: false, providerLabel: "", external: false, consentGiven: false, demo: false };
  const user = await db.user.findUnique({ where: { id: userId }, select: { aiConsentAt: true } });
  return { available: true, providerLabel: provider.label, external: provider.external, consentGiven: !!user?.aiConsentAt, demo: provider.demo };
}

export async function giveAiConsent(userId: string) {
  await db.user.update({ where: { id: userId }, data: { aiConsentAt: new Date() } });
  await audit({ actorId: userId, action: "ai.consent.give", entityType: "User", entityId: userId });
}

export async function revokeAiConsent(userId: string) {
  await db.user.update({ where: { id: userId }, data: { aiConsentAt: null } });
  await audit({ actorId: userId, action: "ai.consent.revoke", entityType: "User", entityId: userId });
}

// ─── Formato esperado das respostas do provedor ────────────

const rewriteOut = z.object({ suggestion: z.string(), notes: z.array(z.string()).default([]) });
const skillsOut = z.object({ skills: z.array(z.object({ name: z.string(), evidence: z.string() })).default([]) });
const jobOut = z.object({
  jobTitle: z.string().default(""),
  skills: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  experience: z.string().default(""),
  highlights: z.array(z.object({ tip: z.string(), evidence: z.string() })).default([]),
});

/** Limita o contexto do CV enviado (ordem mantida) e remove blocos vazios. */
function trimSources(sources: CvSource[]): CvSource[] {
  const out: CvSource[] = [];
  let total = 0;
  for (const s of sources) {
    const text = s.text.trim();
    if (!text) continue;
    if (total + text.length > AI_LIMITS.cvSources) break;
    total += text.length;
    out.push({ label: s.label, text });
  }
  return out;
}

function precheck(req: AiRequestParsed): AiResponse | null {
  switch (req.task) {
    case "rewrite": {
      const text = req.text.trim();
      if (!text) return fail("EMPTY", "Escreva primeiro o texto. A IA só melhora o que já escreveu — não cria conteúdo novo.");
      if (text.length > AI_LIMITS[req.field]) return fail("TOO_LONG", `Texto demasiado longo para o assistente (máximo ${AI_LIMITS[req.field]} caracteres).`);
      return null;
    }
    case "suggest_skills":
      if (trimSources(req.sources).length === 0) return fail("EMPTY", "Preencha primeiro a experiência, a formação ou o resumo — as sugestões baseiam-se apenas no que escreveu.");
      return null;
    case "analyze_job":
      if (req.jobDescription.trim().length < 20) return fail("EMPTY", "Cole primeiro a descrição da vaga (pelo menos algumas frases).");
      return null;
  }
}

/** Substitui dados pessoais por marcadores em todos os textos do pedido. */
function redactRequest(req: AiRequestParsed): { req: AiRequestParsed; map: Map<string, string> } {
  const map = new Map<string, string>();
  const r = (t: string) => redact(t, map).text;
  switch (req.task) {
    case "rewrite":
      return {
        req: { ...req, text: r(req.text), jobDescription: r(req.jobDescription), context: { jobTitle: r(req.context.jobTitle), position: r(req.context.position), facts: r(req.context.facts) } },
        map,
      };
    case "suggest_skills":
      return { req: { ...req, sources: req.sources.map((s) => ({ ...s, text: r(s.text) })) }, map };
    case "analyze_job":
      return { req: { ...req, jobDescription: r(req.jobDescription), sources: req.sources.map((s) => ({ ...s, text: r(s.text) })) }, map };
  }
}

type Checked = { ok: true; result: AiResult } | { ok: false; code: AiErrorCode; message: string };

/** Validação e verificações anti-invenção da resposta (iguais para qualquer provedor). */
export function checkResult(req: AiRequestParsed, raw: unknown, map: Map<string, string> = new Map()): Checked {
  const fix = (t: string, max: number) => cleanOutput(restore(t, map), max);
  switch (req.task) {
    case "rewrite": {
      const parsed = rewriteOut.safeParse(raw);
      if (!parsed.success) return { ok: false, code: "NO_RESULT", message: "Não foi possível gerar uma sugestão. Tente novamente." };
      const original = req.text.trim();
      const suggestion = fix(parsed.data.suggestion, AI_LIMITS[req.field]);
      if (!suggestion) return { ok: false, code: "NO_RESULT", message: "Não foi possível gerar uma sugestão. Tente novamente." };
      const u = findUngrounded(suggestion, [original, req.context.jobTitle, req.context.position, req.context.facts]);
      if (!isGrounded(u)) {
        return {
          ok: false,
          code: "UNGROUNDED",
          message: `A sugestão foi descartada porque incluía informação que não consta do seu texto (${describeUngrounded(u).map((t) => `«${t}»`).join(", ")}). Tente novamente ou edite manualmente.`,
        };
      }
      if (suggestion.length > original.length * 1.6 + 200) {
        return { ok: false, code: "UNGROUNDED", message: "A sugestão acrescentava demasiado texto novo e foi descartada. A IA só pode trabalhar com o que escreveu." };
      }
      if (req.mode === "shorten" && suggestion.length >= original.length) {
        return { ok: false, code: "NO_RESULT", message: "Não foi possível reduzir mais este texto." };
      }
      const notes = parsed.data.notes.map((n) => fix(n, 200)).filter((n) => n && isGrounded(findUngrounded(n, [original]))).slice(0, 3);
      if (normalize(suggestion) === normalize(original)) notes.unshift("O texto já está correto — não há alterações a sugerir.");
      return { ok: true, result: { task: "rewrite", suggestion, notes } };
    }
    case "suggest_skills": {
      const parsed = skillsOut.safeParse(raw);
      if (!parsed.success) return { ok: false, code: "NO_RESULT", message: "Não foi possível gerar sugestões. Tente novamente." };
      const sources = req.sources.map((s) => s.text);
      const existing = new Set(req.existingSkills.map(normalize));
      const seen = new Set<string>();
      const skills = parsed.data.skills
        .map((s) => ({ name: fix(s.name, 60).replace(/[.;]+$/, ""), evidence: fix(s.evidence, 300) }))
        .filter((s) => {
          const key = normalize(s.name);
          if (!key || existing.has(key) || seen.has(key)) return false;
          // Prova: citação real do CV, relacionada com a competência, sem nomes/siglas novos.
          const ok = quoteFound(s.evidence, sources) && sharesStem(s.name, s.evidence) && isGrounded(findUngrounded(s.name, sources));
          if (ok) seen.add(key);
          return ok;
        })
        .slice(0, 8);
      return { ok: true, result: { task: "suggest_skills", skills } };
    }
    case "analyze_job": {
      const parsed = jobOut.safeParse(raw);
      if (!parsed.success) return { ok: false, code: "NO_RESULT", message: "Não foi possível analisar a vaga. Tente novamente." };
      const job = req.jobDescription;
      const cv = req.sources.map((s) => s.text);
      const cvText = cv.join("\n");
      // Tudo o que é «da vaga» tem de estar mesmo na vaga.
      const fromJob = (t: string) => stemCoverage(t, job) >= 0.6 && findUngrounded(t, [job]).numbers.length === 0;
      const list = (items: string[], max: number) => [...new Set(items.map((t) => fix(t, 120)).filter((t) => t && fromJob(t)))].slice(0, max);
      const skills = list(parsed.data.skills, 12);
      const keywords = list(parsed.data.keywords, 15);
      const terms = [...new Map([...skills, ...keywords].map((t) => [normalize(t), t])).values()].slice(0, 20);
      const matches: JobMatch[] = terms.map((term) => ({ term, inCv: normalize(cvText).includes(normalize(term)) || stemCoverage(term, cvText) >= 0.75 }));
      const highlights = parsed.data.highlights
        .map((h) => ({ tip: fix(h.tip, 300), evidence: fix(h.evidence, 300) }))
        .filter((h) => h.tip && quoteFound(h.evidence, cv) && isGrounded(findUngrounded(h.tip, [...cv, job])))
        .slice(0, 5);
      const jobTitle = fix(parsed.data.jobTitle, 120);
      const experience = fix(parsed.data.experience, 200);
      return {
        ok: true,
        result: {
          task: "analyze_job",
          jobTitle: jobTitle && fromJob(jobTitle) ? jobTitle : "",
          skills,
          requirements: list(parsed.data.requirements, 10),
          keywords,
          experience: experience && fromJob(experience) ? experience : "",
          highlights,
          matches,
        },
      };
    }
  }
}

function issueMessage(error: z.ZodError): AiResponse {
  const tooBig = error.issues.find((i) => i.code === "too_big");
  if (tooBig) return fail("TOO_LONG", tooBig.message.startsWith("Texto") ? tooBig.message : "Texto demasiado longo para o assistente.");
  return fail("INVALID", "Pedido inválido.");
}

/**
 * Executa um pedido ao assistente. `provider` só é passado nos testes; por omissão vem do ambiente.
 */
export async function runAiTask(userId: string, raw: unknown, provider: AIProvider | null = getAiProvider()): Promise<AiResponse> {
  const parsed = aiRequestSchema.safeParse(raw);
  if (!parsed.success) return issueMessage(parsed.error);
  const req: AiRequestParsed = parsed.data.task === "rewrite" ? parsed.data : { ...parsed.data, sources: trimSources(parsed.data.sources) };

  const pre = precheck(req);
  if (pre) return pre;
  if (!provider) return fail("UNAVAILABLE", AI_UNAVAILABLE_MESSAGE);

  if (provider.external) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { aiConsentAt: true } });
    if (!user?.aiConsentAt) return fail("CONSENT_REQUIRED", "Para usar o assistente, confirme que aceita enviar este texto ao provedor de IA.");
  }

  const limit = await rateLimit(`ai:${userId}`, LIMITS.ai.limit, LIMITS.ai.window);
  if (!limit.ok) return fail("RATE_LIMITED", "Usou o assistente muitas vezes seguidas. Tente novamente mais tarde.");

  const { req: safeReq, map } = redactRequest(req);
  let raw_: unknown;
  try {
    raw_ = await provider.complete({ request: safeReq, prompt: buildPrompt(safeReq), signal: AbortSignal.timeout(aiTimeoutMs()) });
  } catch (error) {
    // Nunca registar o texto do utilizador — apenas o tipo de falha.
    console.error("[ai] provedor falhou:", error instanceof AiProviderError ? error.kind : error instanceof Error ? error.name : "erro");
    await audit({ actorId: userId, action: "ai.request", entityType: "User", entityId: userId, metadata: { task: req.task, provider: provider.id, outcome: "provider_error" } });
    return fail("UNAVAILABLE", AI_UNAVAILABLE_MESSAGE);
  }

  const checked = checkResult(req, raw_, map);
  await audit({
    actorId: userId,
    action: "ai.request",
    entityType: "User",
    entityId: userId,
    metadata: { task: req.task, provider: provider.id, outcome: checked.ok ? "ok" : checked.code },
  });
  return checked.ok ? { ok: true, result: checked.result, demo: provider.demo } : checked;
}
