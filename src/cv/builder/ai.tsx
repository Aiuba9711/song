"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, CheckCircle2, CircleDashed, Info, RefreshCw, Target, X } from "lucide-react";
import { aiAssistAction, aiConsentAction } from "@/app/meu-espaco/cvs/ai-actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AI_LIMITS,
  AI_REVIEW_WARNING,
  AI_UNAVAILABLE_MESSAGE,
  REWRITE_MODE_LABELS,
  REWRITE_MODES,
  type AiRequest,
  type AiResponse,
  type AiStatus,
  type CvSource,
  type JobAnalysisResult,
  type RewriteField,
  type RewriteMode,
  type SkillSuggestion,
} from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import type { CvContent } from "../types";

// ─── Contexto (estado do assistente, vaga colada, consentimento) ─────────────

type Ctx = {
  status: AiStatus;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  /** Faz o pedido; trata o consentimento (pergunta e repete o pedido se o utilizador aceitar). */
  run: (req: AiRequest) => Promise<AiResponse>;
};

const AiContext = createContext<Ctx | null>(null);

const UNAVAILABLE: AiStatus = { available: false, providerLabel: "", external: false, consentGiven: false, demo: false };

export function useAi(): Ctx {
  return (
    useContext(AiContext) ?? {
      status: UNAVAILABLE,
      jobDescription: "",
      setJobDescription: () => undefined,
      run: async () => ({ ok: false, code: "UNAVAILABLE", message: AI_UNAVAILABLE_MESSAGE }),
    }
  );
}

export function AiAssistantProvider({ cvId, initialStatus, children }: { cvId: string; initialStatus: AiStatus; children: ReactNode }) {
  const [status, setStatus] = useState(initialStatus);
  const [jobDescription, setJob] = useState("");
  const consentRef = useRef<HTMLDialogElement>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const key = `efmz-vaga-${cvId}`;

  // A vaga fica só neste separador do navegador (não é guardada no servidor).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      // Sincronização com armazenamento do navegador após a hidratação.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setJob(saved);
    } catch {
      /* indisponível */
    }
  }, [key]);

  const setJobDescription = useCallback(
    (v: string) => {
      setJob(v);
      try {
        if (v) sessionStorage.setItem(key, v);
        else sessionStorage.removeItem(key);
      } catch {
        /* indisponível */
      }
    },
    [key],
  );

  const askConsent = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        pending.current = resolve;
        consentRef.current?.showModal();
      }),
    [],
  );

  const close = (accepted: boolean) => {
    consentRef.current?.close();
    pending.current?.(accepted);
    pending.current = null;
  };

  const run = useCallback(
    async (req: AiRequest): Promise<AiResponse> => {
      if (!status.available) return { ok: false, code: "UNAVAILABLE", message: AI_UNAVAILABLE_MESSAGE };
      try {
        if (status.external && !status.consentGiven) {
          if (!(await askConsent())) return { ok: false, code: "CONSENT_REQUIRED", message: "Sem o seu consentimento, o texto não é enviado ao assistente de IA." };
          setStatus(await aiConsentAction());
        }
        const res = await aiAssistAction(req);
        if (!res.ok && res.code === "CONSENT_REQUIRED") {
          if (!(await askConsent())) return res;
          setStatus(await aiConsentAction());
          return await aiAssistAction(req);
        }
        return res;
      } catch {
        return { ok: false, code: "UNAVAILABLE", message: AI_UNAVAILABLE_MESSAGE };
      }
    },
    [status, askConsent],
  );

  const value = useMemo(() => ({ status, jobDescription, setJobDescription, run }), [status, jobDescription, setJobDescription, run]);
  const titleId = useId();

  return (
    <AiContext.Provider value={value}>
      {children}
      <dialog
        ref={consentRef}
        aria-labelledby={titleId}
        onCancel={() => close(false)}
        className="m-auto w-[min(92vw,30rem)] rounded-2xl p-0 shadow-lift backdrop:bg-slate-900/50"
      >
        <div className="space-y-3 p-6 text-sm text-slate-700">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            Usar o assistente de IA?
          </h2>
          <p>
            Para sugerir melhorias, o texto que escolher (e, se a colar, a descrição da vaga) é enviado para <strong>{status.providerLabel}</strong>, um serviço
            externo de inteligência artificial.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Não enviamos a sua fotografia nem o seu nome; emails, telefones e links são substituídos antes do envio.</li>
            <li>Não guardamos o texto enviado nem as sugestões.</li>
            <li>Nada é alterado no seu CV sem clicar em «Aplicar sugestão».</li>
            <li>Pode retirar este consentimento a qualquer momento no Perfil.</li>
          </ul>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass("outline")} onClick={() => close(false)}>
              Agora não
            </button>
            <button type="button" className={buttonClass("primary")} onClick={() => close(true)}>
              Aceito e continuar
            </button>
          </div>
        </div>
      </dialog>
    </AiContext.Provider>
  );
}

// ─── Blocos do CV enviados como contexto (só o necessário, sem contactos) ───

export function cvSources(cv: CvContent): CvSource[] {
  const out: CvSource[] = [];
  const add = (label: string, text: string) => text.trim() && out.push({ label, text: text.trim().slice(0, 3000) });
  add("Cargo pretendido", cv.personal.jobTitle);
  add("Perfil profissional", cv.summary);
  add("Objetivo profissional", cv.objective);
  cv.experiences.forEach((e) => add("Experiência", [e.position, e.description].filter((t) => t.trim()).join("\n")));
  cv.educations.forEach((e) => add("Formação", [e.degree, e.description].filter((t) => t.trim()).join("\n")));
  add("Competências", cv.skills.map((s) => s.name).join("; "));
  add("Cursos", cv.courses.map((c) => c.name).join("; "));
  add("Certificações", cv.certifications.map((c) => c.name).join("; "));
  cv.customSections.forEach((s) => add(s.title || "Outras informações", s.content));
  return out.slice(0, 60);
}

// ─── Peças comuns ─────────────────────────────────────────

function Sparkle() {
  return <span aria-hidden>✨</span>;
}

function DemoNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-500">
      <Info className="size-3.5" aria-hidden /> Modo de demonstração: correções automáticas simples, sem IA real.
    </p>
  );
}

function ReviewWarning() {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
      {AI_REVIEW_WARNING}
    </p>
  );
}

function Unavailable() {
  return (
    <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
      {AI_UNAVAILABLE_MESSAGE} Pode continuar a preencher o CV normalmente.
    </p>
  );
}

// ─── ✨ Melhorar com IA (resumo, objetivo, descrição de funções) ─────────────

export function AiImprove({
  field,
  text,
  onApply,
  context,
  id,
}: {
  field: RewriteField;
  text: string;
  onApply: (value: string) => void;
  context?: { jobTitle?: string; position?: string; facts?: string };
  id: string;
}) {
  const { status, jobDescription, run } = useAi();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RewriteMode>("improve");
  const canUseJob = (field === "summary" || field === "objective" || field === "letter_body") && jobDescription.trim().length > 0;
  const [useJob, setUseJob] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ suggestion: string; notes: string[]; demo: boolean; from: string } | null>(null);
  const panelId = `${id}-ai`;

  const generate = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await run({
      task: "rewrite",
      field,
      mode,
      text,
      context: { jobTitle: context?.jobTitle ?? "", position: context?.position ?? "", facts: (context?.facts ?? "").slice(0, AI_LIMITS.facts) },
      jobDescription: canUseJob && useJob ? jobDescription.slice(0, AI_LIMITS.jobDescription) : "",
    });
    setBusy(false);
    if (res.ok && res.result.task === "rewrite") setResult({ suggestion: res.result.suggestion, notes: res.result.notes, demo: res.demo, from: text });
    else if (!res.ok) setError(res.message);
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50"
      >
        <Sparkle /> Melhorar com IA
      </button>
      {open && (
        <div id={panelId} role="region" aria-label="Assistente de IA" className="mt-2 space-y-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
          {!status.available ? (
            <Unavailable />
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="O que fazer com o texto">
                {REWRITE_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={cn("rounded-full px-3 py-1 text-sm font-medium", mode === m ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}
                  >
                    {REWRITE_MODE_LABELS[m]}
                  </button>
                ))}
              </div>
              {canUseJob && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={useJob} onChange={(e) => setUseJob(e.target.checked)} className="size-4 accent-brand-700" />
                  Adaptar à vaga colada (só destaca o que já escreveu)
                </label>
              )}
              <Button size="sm" onClick={generate} disabled={busy} icon={busy ? <Spinner /> : <Sparkle />}>
                {busy ? "A gerar sugestão…" : result ? "Gerar outra sugestão" : "Gerar sugestão"}
              </Button>
              {error && <Alert tone="error">{error}</Alert>}
              {result && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Sugestão</p>
                  <p className="text-sm whitespace-pre-wrap text-ink" data-testid="ai-suggestion">
                    {result.suggestion}
                  </p>
                  {result.notes.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                      {result.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {result.from !== text && <p className="text-xs text-amber-800">O texto do campo mudou depois desta sugestão — confirme antes de aplicar.</p>}
                  <ReviewWarning />
                  {result.demo && <DemoNote />}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      icon={<Check className="size-4" aria-hidden />}
                      onClick={() => {
                        onApply(result.suggestion);
                        setResult(null);
                        setOpen(false);
                      }}
                    >
                      Aplicar sugestão
                    </Button>
                    <Button size="sm" variant="ghost" icon={<X className="size-4" aria-hidden />} onClick={() => setResult(null)}>
                      Descartar
                    </Button>
                  </div>
                </div>
              )}
              {!result && <ReviewWarning />}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Competências sugeridas (só com prova no texto do CV) ────────────────────

export function AiSkillSuggestions({ cv, onApply }: { cv: CvContent; onApply: (names: string[]) => void }) {
  const { status, run } = useAi();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<(SkillSuggestion & { selected: boolean })[] | null>(null);
  const [demo, setDemo] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setItems(null);
    const res = await run({ task: "suggest_skills", existingSkills: cv.skills.map((s) => s.name), sources: cvSources(cv) });
    setBusy(false);
    if (res.ok && res.result.task === "suggest_skills") {
      setItems(res.result.skills.map((s) => ({ ...s, selected: true })));
      setDemo(res.demo);
    } else if (!res.ok) setError(res.message);
  };

  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
        <Sparkle /> Sugerir competências com IA
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {!status.available ? (
            <Unavailable />
          ) : (
            <>
              <p className="text-sm text-slate-600">A IA procura competências que já demonstra no que escreveu (experiência, formação, cursos). Cada sugestão mostra onde a encontrou.</p>
              <Button size="sm" onClick={generate} disabled={busy} icon={busy ? <Spinner /> : <Sparkle />}>
                {busy ? "A analisar…" : "Gerar sugestões"}
              </Button>
              {error && <Alert tone="error">{error}</Alert>}
              {items && items.length === 0 && <p className="text-sm text-slate-600">Não encontrámos competências novas no que escreveu.</p>}
              {items && items.length > 0 && (
                <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <legend className="px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Sugestões</legend>
                  {items.map((s, i) => (
                    <label key={s.name} className="flex items-start gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={(e) => setItems((prev) => prev!.map((x, j) => (j === i ? { ...x, selected: e.target.checked } : x)))}
                        className="mt-0.5 size-4.5 accent-brand-700"
                      />
                      <span>
                        <span className="font-semibold text-ink">{s.name}</span>
                        <span className="block text-xs text-slate-500">Com base em: «{s.evidence}»</span>
                      </span>
                    </label>
                  ))}
                  <ReviewWarning />
                  {demo && <DemoNote />}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={!items.some((s) => s.selected)}
                      icon={<Check className="size-4" aria-hidden />}
                      onClick={() => {
                        onApply(items.filter((s) => s.selected).map((s) => s.name));
                        setItems(null);
                        setOpen(false);
                      }}
                    >
                      Aplicar sugestão
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setItems(null)}>
                      Descartar
                    </Button>
                  </div>
                </fieldset>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Descrição da vaga (opcional) ────────────────────────────────────────────

export function AiJobPanel({ cv, onAddSkill }: { cv: CvContent; onAddSkill: (name: string) => void }) {
  const { status, jobDescription, setJobDescription, run } = useAi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<(JobAnalysisResult & { demo: boolean }) | null>(null);
  const skillSet = new Set(cv.skills.map((s) => s.name.toLowerCase()));

  const analyze = async () => {
    setBusy(true);
    setError(null);
    setAnalysis(null);
    const res = await run({ task: "analyze_job", jobDescription, sources: cvSources(cv) });
    setBusy(false);
    if (res.ok && res.result.task === "analyze_job") setAnalysis({ ...res.result, demo: res.demo });
    else if (!res.ok) setError(res.message);
  };

  return (
    <details className="group mb-5 rounded-2xl border border-slate-200 bg-white" open={jobDescription.length > 0 ? true : undefined}>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold text-ink">
        <Target className="size-5 text-brand-700" aria-hidden /> Adaptar o CV a uma vaga <span className="font-normal text-slate-500">(opcional)</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 p-4">
        <label htmlFor="job-description" className="block text-sm font-medium text-slate-800">
          Descrição da vaga
        </label>
        <textarea
          id="job-description"
          rows={5}
          maxLength={AI_LIMITS.jobDescription}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Cole aqui a descrição da vaga."
          aria-describedby="job-description-hint"
          className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] shadow-sm focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
        />
        <p id="job-description-hint" className="text-xs text-slate-500">
          Fica só neste navegador. Serve para a IA indicar o que destacar — nunca para acrescentar requisitos que não tem. {jobDescription.length}/{AI_LIMITS.jobDescription}
        </p>
        {!status.available ? (
          <Unavailable />
        ) : (
          <Button size="sm" onClick={analyze} disabled={busy || jobDescription.trim().length < 20} icon={busy ? <Spinner /> : <Sparkle />}>
            {busy ? "A analisar a vaga…" : "Analisar vaga com IA"}
          </Button>
        )}
        {error && <Alert tone="error">{error}</Alert>}
        {analysis && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" aria-live="polite">
            {analysis.jobTitle && (
              <p>
                <span className="font-semibold">Cargo:</span> {analysis.jobTitle}
              </p>
            )}
            {analysis.experience && (
              <p>
                <span className="font-semibold">Experiência solicitada:</span> {analysis.experience}
              </p>
            )}
            {analysis.matches.length > 0 && (
              <div>
                <p className="font-semibold">Competências e palavras-chave da vaga</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {analysis.matches.map((m) => (
                    <li key={m.term} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", m.inCv ? "bg-go-50 text-go-700" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
                      {m.inCv ? <CheckCircle2 className="size-3.5" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
                      {m.term}
                      <span className="sr-only">{m.inCv ? " — consta do seu CV" : " — não consta do seu CV"}</span>
                      {m.inCv && !skillSet.has(m.term.toLowerCase()) && (
                        <button type="button" onClick={() => onAddSkill(m.term)} className="ml-1 rounded-full bg-white px-1.5 text-[11px] font-semibold text-go-700 ring-1 ring-go-100 hover:bg-go-50">
                          + competência
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="inline size-3.5 text-go-700" aria-hidden /> já consta do seu CV · <CircleDashed className="inline size-3.5" aria-hidden /> não
                  consta — só acrescente se for verdade.
                </p>
              </div>
            )}
            {analysis.requirements.length > 0 && (
              <div>
                <p className="font-semibold">Requisitos</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {analysis.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.highlights.length > 0 && (
              <div>
                <p className="font-semibold">Como destacar o que já tem</p>
                <ul className="mt-1 space-y-2">
                  {analysis.highlights.map((h, i) => (
                    <li key={i} className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
                      {h.tip}
                      <span className="block text-xs text-slate-500">No seu CV: «{h.evidence}»</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-slate-600">
              Com a vaga colada, o «✨ Melhorar com IA» do resumo e do objetivo pode adaptar a ênfase à vaga.
            </p>
            <ReviewWarning />
            {analysis.demo && <DemoNote />}
            <button type="button" onClick={analyze} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              <RefreshCw className="size-3.5" aria-hidden /> Analisar de novo
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
