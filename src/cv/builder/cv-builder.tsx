"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CloudOff, Download, Eye, Save, X } from "lucide-react";
import { saveCvAction } from "@/app/meu-espaco/cvs/actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { LAYOUTS } from "../layouts";
import { CvPreview } from "../preview";
import { ScaledSheet } from "../preview/scaled";
import type { CvContent, CvLayoutId, CvTheme } from "../types";
import {
  CoursesStep,
  EducationStep,
  ExperienceStep,
  LanguagesStep,
  PersonalStep,
  ReferencesStep,
  SectionVisibility,
  SkillsStep,
  SummaryStep,
} from "./steps";

export type BuilderTemplate = { id: string; name: string; layout: CvLayoutId; accentColor: string; categoryLabel: string };

const STEPS = [
  { n: 1, title: "Dados pessoais", short: "Dados" },
  { n: 2, title: "Resumo profissional", short: "Resumo" },
  { n: 3, title: "Experiência", short: "Experiência" },
  { n: 4, title: "Formação", short: "Formação" },
  { n: 5, title: "Competências", short: "Competências" },
  { n: 6, title: "Idiomas", short: "Idiomas" },
  { n: 7, title: "Cursos e certificações", short: "Cursos" },
  { n: 8, title: "Referências", short: "Referências" },
  { n: 9, title: "Escolha do modelo", short: "Modelo" },
  { n: 10, title: "Pré-visualização", short: "Ver" },
] as const;

/** Etapa onde cada campo é editado (para levar o utilizador ao erro). */
function stepOfPath(path: string): number {
  if (path.startsWith("personal") || path === "title") return 1;
  if (path.startsWith("summary")) return 2;
  if (path.startsWith("experiences")) return 3;
  if (path.startsWith("educations")) return 4;
  if (path.startsWith("skills")) return 5;
  if (path.startsWith("languages")) return 6;
  if (path.startsWith("courses") || path.startsWith("customSections")) return 7;
  if (path.startsWith("references")) return 8;
  if (path.startsWith("templateId")) return 9;
  return 10;
}

const isBlank = (o: object) => Object.values(o).every((v) => typeof v !== "string" || v.trim() === "");

/** Remove entradas totalmente vazias antes de guardar. */
function clean(cv: CvContent): CvContent {
  return {
    ...cv,
    experiences: cv.experiences.filter((e) => !isBlank(e)),
    educations: cv.educations.filter((e) => !isBlank(e)),
    languages: cv.languages.filter((l) => l.name.trim() !== ""),
    courses: cv.courses.filter((c) => !isBlank(c)),
    references: cv.references.filter((r) => !isBlank(r)),
    customSections: cv.customSections.filter((s) => !isBlank(s)),
  };
}

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "offline" } | { kind: "error"; message: string };

type Props = {
  cvId: string;
  initial: CvContent;
  initialStep: number;
  updatedAt: string;
  templates: BuilderTemplate[];
  initialPhotoUrl: string | null;
};

export function CvBuilder({ cvId, initial, initialStep, updatedAt, templates, initialPhotoUrl }: Props) {
  const [cv, setCv] = useState<CvContent>(initial);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 10));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [showPreview, setShowPreview] = useState(false);
  const [draft, setDraft] = useState<{ content: CvContent; at: number } | null>(null);
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftKey = `efmz-cv-draft-${cvId}`;

  const theme: CvTheme = useMemo(() => {
    const t = templates.find((x) => x.id === cv.templateId) ?? templates[0];
    return t ? { layout: t.layout, accentColor: t.accentColor } : { layout: "CLASSICO", accentColor: "#1d40d8" };
  }, [cv.templateId, templates]);

  // Rascunho local: recupera alterações não guardadas (ex.: internet caiu).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { content: CvContent; at: number };
      // Sincronização com um sistema externo (localStorage) após a hidratação.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed.at > new Date(updatedAt).getTime() && JSON.stringify(parsed.content) !== JSON.stringify(initial)) setDraft(parsed);
      else localStorage.removeItem(draftKey);
    } catch {
      /* armazenamento indisponível */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ content: cv, at: Date.now() }));
      } catch {
        /* ignorar */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [cv, dirty, draftKey]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = useCallback((updater: (c: CvContent) => CvContent) => {
    setCv((c) => updater(c));
    setDirty(true);
  }, []);

  const save = useCallback(
    async (nextStep: number): Promise<"ok" | "invalid" | "failed"> => {
      setStatus({ kind: "saving" });
      try {
        const res = await saveCvAction(cvId, clean(cv), nextStep);
        if (res.ok) {
          setStatus({ kind: "saved", at: new Date(res.savedAt) });
          setErrors({});
          setDirty(false);
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* ignorar */
          }
          return "ok";
        }
        setErrors(res.fieldErrors ?? {});
        setStatus({ kind: "error", message: res.error });
        const first = Object.keys(res.fieldErrors ?? {})[0];
        if (first) setStep(stepOfPath(first));
        return res.fieldErrors ? "invalid" : "failed";
      } catch {
        // Sem ligação: o rascunho fica guardado neste dispositivo.
        setStatus({ kind: "offline" });
        return "failed";
      }
    },
    [cv, cvId, draftKey],
  );

  const goTo = async (n: number) => {
    if (n === step) return;
    if (dirty) {
      const res = await save(n);
      if (res === "invalid") return;
    }
    setStep(n);
    setShowPreview(false);
    const url = new URL(window.location.href);
    url.searchParams.set("passo", String(n));
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const download = async (kind: "pdf" | "docx") => {
    if (dirty) {
      const res = await save(step);
      if (res !== "ok") return;
    }
    // Download via link temporário (rota protegida da API, não uma página).
    const a = document.createElement("a");
    a.href = `/api/cv/${cvId}/${kind}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const current = STEPS[step - 1]!;
  const stepProps = { cv, set, errors };
  const progress = Math.round((step / STEPS.length) * 100);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <div className="min-w-0 pb-28 md:pb-0">
        {/* Progresso */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-sm">
            <Link href="/meu-espaco/cvs" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-700">
              <ArrowLeft className="size-4" aria-hidden /> Meus CVs
            </Link>
            <SaveIndicator status={status} dirty={dirty} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={1} aria-valuemax={10} aria-valuenow={step} aria-label="Progresso">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <nav aria-label="Etapas do CV" className="-mx-1 mt-3 overflow-x-auto pb-1">
            <ol className="flex gap-1.5 px-1">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <button
                    type="button"
                    onClick={() => goTo(s.n)}
                    aria-current={s.n === step ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                      s.n === step ? "bg-brand-700 text-white" : s.n < step ? "bg-brand-50 text-brand-800 hover:bg-brand-100" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {s.n < step ? <Check className="size-3.5" aria-hidden /> : <span aria-hidden>{s.n}</span>}
                    {s.short}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {draft && (
          <Alert tone="warning" title="Tem alterações não guardadas neste dispositivo" className="mb-4">
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setCv(draft.content);
                  setDirty(true);
                  setDraft(null);
                }}
              >
                Recuperar alterações
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(draftKey);
                  setDraft(null);
                }}
              >
                Descartar
              </Button>
            </div>
          </Alert>
        )}

        <p className="text-sm font-semibold text-brand-700">Etapa {step} de 10</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 mb-5 text-2xl font-bold tracking-tight outline-none sm:text-3xl">
          {current.title}
        </h1>

        {status.kind === "error" && (
          <Alert tone="error" className="mb-4">
            {status.message}
          </Alert>
        )}
        {status.kind === "offline" && (
          <Alert tone="warning" className="mb-4">
            Sem ligação ao servidor. As alterações ficaram guardadas neste dispositivo — tente guardar novamente quando tiver internet.
          </Alert>
        )}

        <div key={step} className="animate-slide-up">
          {step === 1 && <PersonalStep {...stepProps} cvId={cvId} photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />}
          {step === 2 && <SummaryStep {...stepProps} />}
          {step === 3 && <ExperienceStep {...stepProps} />}
          {step === 4 && <EducationStep {...stepProps} />}
          {step === 5 && <SkillsStep {...stepProps} />}
          {step === 6 && <LanguagesStep {...stepProps} />}
          {step === 7 && <CoursesStep {...stepProps} />}
          {step === 8 && <ReferencesStep {...stepProps} />}
          {step === 9 && <TemplatePicker templates={templates} value={cv.templateId ?? templates[0]?.id ?? null} onChange={(id) => set((c) => ({ ...c, templateId: id }))} />}
          {step === 10 && (
            <div className="space-y-6">
              <Alert tone="info">Revise todas as informações antes de enviar a candidatura.</Alert>
              <div className="rounded-2xl bg-slate-200/60 p-3 xl:hidden">
                <ScaledSheet>
                  <CvPreview cv={cv} theme={theme} photoUrl={photoUrl} />
                </ScaledSheet>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" onClick={() => download("pdf")} icon={<Download className="size-5" aria-hidden />}>
                  Baixar PDF
                </Button>
                <Button size="lg" variant="outline" onClick={() => download("docx")} icon={<Download className="size-5" aria-hidden />}>
                  Baixar Word
                </Button>
              </div>
              <SectionVisibility cv={cv} set={set} />
              <Link href={`/meu-espaco/cvs/${cvId}`} className={buttonClass("ghost", "md", "w-full")} onClick={(e) => {
                  if (!dirty) return;
                  e.preventDefault();
                  void save(10).then((r) => r === "ok" && router.push(`/meu-espaco/cvs/${cvId}`));
                }}>
                Concluir e ver o CV
              </Link>
            </div>
          )}
        </div>

        {/* Barra de ações (fixa no telemóvel) */}
        <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" className="px-4" onClick={() => goTo(step - 1)} disabled={step === 1 || status.kind === "saving"} aria-label="Etapa anterior">
              <ArrowLeft className="size-5" aria-hidden />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <Button variant="ghost" size="lg" className="px-4 xl:hidden" onClick={() => setShowPreview(true)} aria-label="Pré-visualizar CV">
              <Eye className="size-5" aria-hidden />
            </Button>
            <Button variant="ghost" size="lg" className="hidden px-4 md:inline-flex" onClick={() => save(step)} disabled={!dirty || status.kind === "saving"} icon={<Save className="size-5" aria-hidden />}>
              Guardar
            </Button>
            {step < 10 ? (
              <Button size="lg" className="flex-1 md:ml-auto md:flex-none" onClick={() => goTo(step + 1)} disabled={status.kind === "saving"}>
                {status.kind === "saving" ? <Spinner /> : null}
                {step === 9 ? "Pré-visualizar" : "Guardar e continuar"}
                <ArrowRight className="size-5" aria-hidden />
              </Button>
            ) : (
              <Button size="lg" variant="success" className="flex-1 md:ml-auto md:flex-none" onClick={() => save(10)} disabled={!dirty || status.kind === "saving"} icon={<Save className="size-5" aria-hidden />}>
                {dirty ? "Guardar alterações" : "Tudo guardado"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pré-visualização ao vivo (desktop) */}
      <aside className="hidden xl:block" aria-label="Pré-visualização ao vivo">
        <div className="sticky top-24">
          <p className="mb-2 text-sm font-medium text-slate-600">
            Pré-visualização · {LAYOUTS[theme.layout].name}
          </p>
          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl bg-slate-200/60 p-3">
            <ScaledSheet>
              <CvPreview cv={cv} theme={theme} photoUrl={photoUrl} />
            </ScaledSheet>
          </div>
        </div>
      </aside>

      {/* Pré-visualização em ecrã inteiro (telemóvel) */}
      {showPreview && (
        <div role="dialog" aria-modal="true" aria-label="Pré-visualização do CV" className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 xl:hidden">
          <div className="flex items-center justify-between p-3 text-white">
            <p className="font-semibold">Pré-visualização</p>
            <button type="button" onClick={() => setShowPreview(false)} className="grid size-11 place-items-center rounded-xl hover:bg-white/10" aria-label="Fechar pré-visualização" autoFocus>
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <ScaledSheet>
              <CvPreview cv={cv} theme={theme} photoUrl={photoUrl} />
            </ScaledSheet>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status, dirty }: { status: Status; dirty: boolean }) {
  let content: React.ReactNode = null;
  if (status.kind === "saving")
    content = (
      <>
        <Spinner /> A guardar…
      </>
    );
  else if (status.kind === "offline")
    content = (
      <>
        <CloudOff className="size-4" aria-hidden /> Guardado só neste dispositivo
      </>
    );
  else if (dirty) content = <>Alterações por guardar</>;
  else if (status.kind === "saved")
    content = (
      <>
        <Check className="size-4 text-go-600" aria-hidden /> Guardado às {status.at.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}
      </>
    );
  return (
    <p className="flex items-center gap-1.5 text-slate-500" role="status" aria-live="polite">
      {content}
    </p>
  );
}

function TemplatePicker({ templates, value, onChange }: { templates: BuilderTemplate[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-slate-600">Pode trocar de modelo a qualquer momento — os seus dados mantêm-se.</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-200"
          >
            <input type="radio" name="template" value={t.id} checked={value === t.id} onChange={() => onChange(t.id)} className="size-5 accent-brand-700" />
            <span className="size-8 shrink-0 rounded-lg" style={{ background: t.accentColor }} aria-hidden />
            <span className="min-w-0">
              <span className="block font-semibold">{t.name}</span>
              <span className="block text-sm text-slate-500">
                {LAYOUTS[t.layout].name} · {t.categoryLabel}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
