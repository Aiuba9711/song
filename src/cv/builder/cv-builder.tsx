"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CloudOff, Download, Eye, FileText, LayoutTemplate, Lock, Save, ShoppingCart, X } from "lucide-react";
import { saveCvAction } from "@/app/meu-espaco/cvs/actions";
import { AtsBadge, TemplatePreview, type GalleryTemplate } from "@/components/templates/gallery";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { resolveDesign } from "../design";
import { CvPreview, type PhotoCrop } from "../preview";
import { ScaledSheet } from "../preview/scaled";
import type { CvContent } from "../types";
import { PhotoEditor, usePhoto } from "./photo-editor";
import {
  CertificationsStep,
  CoursesStep,
  EducationStep,
  ExperienceStep,
  LanguagesStep,
  MoreStep,
  PersonalStep,
  ReferencesStep,
  SkillsStep,
  SummaryStep,
} from "./steps";

export type BuilderTemplate = GalleryTemplate;

export const STEPS = [
  { n: 1, title: "Dados pessoais", short: "Dados" },
  { n: 2, title: "Fotografia", short: "Foto" },
  { n: 3, title: "Resumo profissional", short: "Resumo" },
  { n: 4, title: "Experiência profissional", short: "Experiência" },
  { n: 5, title: "Formação académica", short: "Formação" },
  { n: 6, title: "Competências", short: "Competências" },
  { n: 7, title: "Idiomas", short: "Idiomas" },
  { n: 8, title: "Cursos", short: "Cursos" },
  { n: 9, title: "Certificações", short: "Certificações" },
  { n: 10, title: "Referências", short: "Referências" },
  { n: 11, title: "Mais secções", short: "Mais" },
] as const;
const LAST = STEPS.length;

/** Secção onde cada campo é editado (para levar o utilizador ao erro). */
export function stepOfPath(path: string): number {
  if (path.startsWith("photoSettings")) return 2;
  if (path.startsWith("summary")) return 3;
  if (path.startsWith("experiences")) return 4;
  if (path.startsWith("educations")) return 5;
  if (path.startsWith("skills")) return 6;
  if (path.startsWith("languages")) return 7;
  if (path.startsWith("courses")) return 8;
  if (path.startsWith("certifications")) return 9;
  if (path.startsWith("references")) return 10;
  if (path.startsWith("customSections") || path.startsWith("hiddenSections")) return 11;
  return 1;
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
    certifications: cv.certifications.filter((c) => !isBlank(c)),
    references: cv.references.filter((r) => !isBlank(r)),
    customSections: cv.customSections.filter((s) => !isBlank(s)),
  };
}

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "offline" } | { kind: "error"; message: string };

export type PurchaseState = {
  /** Download disponível (CV comprado ou download livre) */
  unlocked: boolean;
  /** O CV foi comprado: modelo fixo */
  purchased: boolean;
  priceLabel: string;
};

type Props = {
  cvId: string;
  initial: CvContent;
  initialStep: number;
  updatedAt: string;
  templates: BuilderTemplate[];
  /** Versão da fotografia guardada (null = sem fotografia) */
  initialPhotoVersion: number | null;
  purchase: PurchaseState;
  /** Abrir logo a escolha de modelo (vindo de «Trocar modelo») */
  openTemplates?: boolean;
};

export function CvBuilder({ cvId, initial, initialStep, updatedAt, templates, initialPhotoVersion, purchase, openTemplates }: Props) {
  const [cv, setCv] = useState<CvContent>(initial);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), LAST));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [draft, setDraft] = useState<{ content: CvContent; at: number } | null>(null);
  const { photo, hasPhoto, setVersion } = usePhoto(cvId, initialPhotoVersion);
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const templateDialog = useRef<HTMLDialogElement>(null);
  const draftKey = `efmz-cv-draft-${cvId}`;

  const template = templates.find((x) => x.id === cv.templateId) ?? null;
  const design = useMemo(() => template?.design ?? resolveDesign(null), [template]);
  const watermark = !purchase.unlocked;
  // O preço acompanha o modelo escolhido (definido na base de dados, por modelo ou valor padrão).
  const priceLabel = template?.priceLabel && template.priceLabel !== "Download grátis" ? template.priceLabel : purchase.priceLabel;
  const crop: PhotoCrop | null = photo ? { naturalWidth: photo.naturalWidth, naturalHeight: photo.naturalHeight, framing: cv.photoSettings } : null;
  const previewProps = { cv, design, photoUrl: photo?.rawUrl ?? null, photoCrop: crop, watermark };

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
    if (openTemplates && !purchase.purchased) templateDialog.current?.showModal();
  }, [openTemplates, purchase.purchased]);

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
    if (n === step || n < 1 || n > LAST) return;
    if (dirty) {
      const res = await save(n);
      if (res === "invalid") return;
    }
    setStep(n);
    const url = new URL(window.location.href);
    url.searchParams.set("passo", String(n));
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const download = async (kind: "pdf" | "docx") => {
    if (dirty && (await save(step)) !== "ok") return;
    // Download via link temporário (rota protegida da API, não uma página).
    const a = document.createElement("a");
    a.href = `/api/cv/${cvId}/${kind}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const buy = async () => {
    if (dirty && (await save(step)) !== "ok") return;
    router.push(`/checkout?cv=${cvId}`);
  };

  const openPdfPreview = async () => {
    if (dirty && (await save(step)) !== "ok") return;
    window.open(`/api/cv/${cvId}/preview?v=${Date.now()}`, "_blank", "noopener");
  };

  const current = STEPS[step - 1]!;
  const stepProps = { cv, set, errors };
  const saving = status.kind === "saving";

  return (
    <div className="pb-28 lg:pb-0">
      {/* Cabeçalho do editor */}
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <Link href="/meu-espaco/cvs" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-700">
          <ArrowLeft className="size-4" aria-hidden /> Meus CVs
        </Link>
        <SaveIndicator status={status} dirty={dirty} />
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft sm:p-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{cv.title || "O meu CV"}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
              <span>Modelo {template?.name ?? "—"}</span>
              {template?.isAtsFriendly && <AtsBadge />}
              {purchase.purchased ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Lock className="size-3.5" aria-hidden /> Modelo fixo (CV comprado)
                </span>
              ) : (
                <button type="button" onClick={() => templateDialog.current?.showModal()} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                  <LayoutTemplate className="size-4" aria-hidden /> Trocar modelo
                </button>
              )}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" onClick={() => save(step)} disabled={!dirty || saving} icon={saving ? <Spinner /> : <Save className="size-4" aria-hidden />}>
            Salvar
          </Button>
          <Button variant="outline" onClick={() => setFullPreview(true)} icon={<Eye className="size-4" aria-hidden />}>
            Pré-visualizar
          </Button>
          {purchase.unlocked ? (
            <>
              <Button onClick={() => download("pdf")} icon={<Download className="size-4" aria-hidden />}>
                Baixar PDF
              </Button>
              <Button variant="secondary" onClick={() => download("docx")} icon={<Download className="size-4" aria-hidden />}>
                Baixar Word
              </Button>
            </>
          ) : (
            <Button variant="success" className="col-span-2" onClick={buy} disabled={saving} icon={<ShoppingCart className="size-4" aria-hidden />}>
              Comprar CV — {priceLabel}
            </Button>
          )}
        </div>
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
                try {
                  localStorage.removeItem(draftKey);
                } catch {
                  /* ignorar */
                }
                setDraft(null);
              }}
            >
              Descartar
            </Button>
          </div>
        </Alert>
      )}

      {/* ESQUERDA: formulário · DIREITA: pré-visualização (no telemóvel: formulário ↓ pré-visualização) */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div className="min-w-0">
          <nav aria-label="Secções do CV" className="-mx-1 overflow-x-auto pb-1">
            <ol className="flex gap-1.5 px-1 lg:flex-wrap">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <button
                    type="button"
                    onClick={() => goTo(s.n)}
                    aria-current={s.n === step ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                      s.n === step ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {s.short}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <p className="mt-5 text-sm font-semibold text-brand-700">
            Secção {step} de {LAST}
          </p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-1 mb-5 scroll-mt-24 text-2xl font-bold tracking-tight outline-none sm:text-3xl">
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
            {step === 1 && <PersonalStep {...stepProps} />}
            {step === 2 && (
              <PhotoEditor
                cvId={cvId}
                photo={photo}
                hasPhoto={hasPhoto}
                onUploaded={setVersion}
                onRemoved={() => setVersion(null)}
                settings={cv.photoSettings}
                onSettings={(photoSettings) => set((c) => ({ ...c, photoSettings }))}
                showPhoto={cv.personal.showPhoto}
                setShowPhoto={(showPhoto) => set((c) => ({ ...c, personal: { ...c.personal, showPhoto } }))}
                design={design}
              />
            )}
            {step === 3 && <SummaryStep {...stepProps} />}
            {step === 4 && <ExperienceStep {...stepProps} />}
            {step === 5 && <EducationStep {...stepProps} />}
            {step === 6 && <SkillsStep {...stepProps} />}
            {step === 7 && <LanguagesStep {...stepProps} />}
            {step === 8 && <CoursesStep {...stepProps} />}
            {step === 9 && <CertificationsStep {...stepProps} />}
            {step === 10 && <ReferencesStep {...stepProps} />}
            {step === 11 && <MoreStep {...stepProps} />}
          </div>

          {/* Navegação entre secções (fixa no telemóvel) */}
          <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="px-4" onClick={() => goTo(step - 1)} disabled={step === 1 || saving} aria-label="Secção anterior">
                <ArrowLeft className="size-5" aria-hidden />
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <Button variant="ghost" size="lg" className="px-4 lg:hidden" onClick={() => setFullPreview(true)} aria-label="Pré-visualizar CV">
                <Eye className="size-5" aria-hidden />
              </Button>
              {step < LAST ? (
                <Button size="lg" className="flex-1 lg:ml-auto lg:flex-none" onClick={() => goTo(step + 1)} disabled={saving}>
                  {saving ? <Spinner /> : null}
                  Guardar e continuar
                  <ArrowRight className="size-5" aria-hidden />
                </Button>
              ) : purchase.unlocked ? (
                <Button size="lg" variant="success" className="flex-1 lg:ml-auto lg:flex-none" onClick={() => save(step)} disabled={!dirty || saving} icon={<Save className="size-5" aria-hidden />}>
                  {dirty ? "Salvar alterações" : "Tudo guardado"}
                </Button>
              ) : (
                <Button size="lg" variant="success" className="flex-1 lg:ml-auto lg:flex-none" onClick={buy} disabled={saving} icon={<ShoppingCart className="size-5" aria-hidden />}>
                  Comprar CV — {priceLabel}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Pré-visualização em tempo real */}
        <section aria-labelledby="live-preview-title" className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 id="live-preview-title" className="text-sm font-semibold text-slate-700">
                Pré-visualização em tempo real
              </h2>
              {watermark && <span className="text-xs text-slate-500">Marca d&apos;água removida após o pagamento</span>}
            </div>
            {/* Focável para poder ser percorrida com o teclado quando tem barra de scroll */}
            <div tabIndex={0} aria-labelledby="live-preview-title" className="rounded-2xl bg-slate-200/60 p-2 outline-none focus-visible:ring-3 focus-visible:ring-brand-200 sm:p-3 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
              <ScaledSheet label="Pré-visualização do CV">
                <CvPreview {...previewProps} />
              </ScaledSheet>
            </div>
          </div>
        </section>
      </div>

      <TemplateDialog
        ref={templateDialog}
        templates={templates}
        value={cv.templateId}
        onChange={(id) => {
          set((c) => ({ ...c, templateId: id }));
          templateDialog.current?.close();
        }}
      />

      {/* Pré-visualização em ecrã inteiro */}
      {fullPreview && (
        <div role="dialog" aria-modal="true" aria-label="Pré-visualização do CV" className="fixed inset-0 z-50 flex flex-col bg-slate-900/95">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-white">
            <p className="font-semibold">Pré-visualização{watermark ? " (com marca d'água)" : ""}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={openPdfPreview} className="rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-white/30 hover:bg-white/10">
                Ver em PDF
              </button>
              <button type="button" onClick={() => setFullPreview(false)} className="grid size-11 place-items-center rounded-xl hover:bg-white/10" aria-label="Fechar pré-visualização" autoFocus>
                <X className="size-6" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mx-auto max-w-[794px]">
              <ScaledSheet label="Pré-visualização do CV em ecrã inteiro">
                <CvPreview {...previewProps} />
              </ScaledSheet>
            </div>
          </div>
          {!purchase.unlocked && (
            <div className="safe-bottom border-t border-white/10 p-3">
              <Button variant="success" size="lg" className="mx-auto flex w-full max-w-md" onClick={buy} icon={<ShoppingCart className="size-5" aria-hidden />}>
                Comprar CV — {priceLabel}
              </Button>
            </div>
          )}
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

/** Troca de modelo (só antes da compra). Os dados do CV mantêm-se. */
function TemplateDialog({ ref, templates, value, onChange }: { ref: React.Ref<HTMLDialogElement>; templates: BuilderTemplate[]; value: string | null; onChange: (id: string) => void }) {
  const titleId = useId();
  const [category, setCategory] = useState("ALL");
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of templates) if (!seen.has(t.category)) seen.set(t.category, t.categoryLabel);
    return [...seen.entries()];
  }, [templates]);
  const visible = templates.filter((t) => category === "ALL" || t.category === category);

  return (
    <dialog ref={ref} aria-labelledby={titleId} className="m-auto h-[min(92dvh,56rem)] w-[min(96vw,64rem)] rounded-2xl p-0 shadow-lift backdrop:bg-slate-900/50">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Trocar modelo
            </h2>
            <p className="text-sm text-slate-600">Os dados que preencheu mantêm-se. Pode trocar até concluir a compra.</p>
          </div>
          <form method="dialog">
            <button type="submit" className="grid size-10 place-items-center rounded-xl hover:bg-slate-100" aria-label="Fechar">
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto border-b border-slate-100 px-5 py-2" role="group" aria-label="Filtrar por área">
          {[["ALL", "Todos"] as const, ...categories].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
              className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap", category === key ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
            >
              {label}
            </button>
          ))}
        </div>
        <ul className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onChange(t.id)}
                aria-pressed={value === t.id}
                aria-label={`Modelo ${t.name} — ${t.categoryLabel}, ${t.style}${t.isAtsFriendly ? ", compatível com ATS" : ""}`}
                className={cn("w-full rounded-xl border-2 bg-white p-2 text-left transition-colors hover:border-brand-400", value === t.id ? "border-brand-600 bg-brand-50" : "border-slate-200")}
              >
                <TemplatePreview t={t} withPhoto width={200} />
                <span className="mt-1.5 block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-slate-500">
                  {t.categoryLabel} · {t.style}
                </span>
                {t.isAtsFriendly && <AtsBadge className="mt-1" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-200 p-3 text-right">
          <form method="dialog">
            <button type="submit" className={buttonClass("outline")}>
              Fechar
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
