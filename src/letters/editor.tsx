"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Check, Download, RefreshCw, Save, ShoppingCart, Wand2 } from "lucide-react";
import { saveLetterAction } from "@/app/meu-espaco/cartas/actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { AiAssistantProvider, AiImprove } from "@/cv/builder/ai";
import { TextAreaField, TextField } from "@/cv/builder/fields";
import { ScaledSheet } from "@/cv/preview/scaled";
import type { AiStatus } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { generateLetter, letterPlainText } from "./compose";
import { LetterPreview } from "./preview";
import { LETTER_LIMITS, LETTER_TYPE_LABELS, LETTER_TYPES, type LetterContent } from "./types";

type Props = {
  letterId: string;
  initial: LetterContent;
  /** Data mostrada na carta (última gravação) */
  date: string;
  aiStatus: AiStatus;
  /** Download de PDF/DOCX disponível (grátis ou já comprado) */
  unlocked: boolean;
  priceLabel: string;
};

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; message: string };

export function LetterEditor(props: Props) {
  return (
    <AiAssistantProvider cvId={`carta-${props.letterId}`} initialStatus={props.aiStatus}>
      <Editor {...props} />
    </AiAssistantProvider>
  );
}

function Editor({ letterId, initial, date, unlocked, priceLabel }: Props) {
  const [c, setC] = useState<LetterContent>(initial);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Último texto gerado: se o utilizador não o alterou, voltar a gerar não pede confirmação.
  const [lastGenerated, setLastGenerated] = useState(() => generateLetter(initial).body);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const confirmTitle = useId();
  const router = useRouter();
  const letterDate = new Date(date);

  const set = <K extends keyof LetterContent>(key: K, value: LetterContent[K]) => {
    setC((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(async (): Promise<boolean> => {
    setStatus({ kind: "saving" });
    try {
      const res = await saveLetterAction(letterId, c);
      if (res.ok) {
        setStatus({ kind: "saved", at: new Date(res.savedAt) });
        setErrors({});
        setDirty(false);
        return true;
      }
      setErrors(res.fieldErrors ?? {});
      setStatus({ kind: "error", message: res.error });
      return false;
    } catch {
      setStatus({ kind: "error", message: "Sem ligação ao servidor. Tente guardar novamente." });
      return false;
    }
  }, [c, letterId]);

  const applyGenerated = () => {
    const g = generateLetter(c);
    setC((prev) => ({ ...prev, ...g }));
    setDirty(true);
    setLastGenerated(g.body);
    confirmRef.current?.close();
  };

  const generate = () => {
    // Não apagar texto editado pelo utilizador sem confirmação.
    if (c.body.trim() && c.body !== lastGenerated) confirmRef.current?.showModal();
    else applyGenerated();
  };

  const download = async (kind: "pdf" | "docx") => {
    if (dirty && !(await save())) return;
    const a = document.createElement("a");
    a.href = `/api/cartas/${letterId}/${kind}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const buy = async () => {
    if (dirty && !(await save())) return;
    router.push(`/checkout?carta=${letterId}`);
  };

  const facts = [
    c.senderName && `Nome: ${c.senderName}`,
    c.senderContact && `Contacto: ${c.senderContact}`,
    c.company && `Empresa: ${c.company}`,
    c.position && `Cargo: ${c.position}`,
    c.recipientName && `Destinatário: ${c.recipientName}`,
    c.city && `Cidade: ${c.city}`,
    c.education && `Formação: ${c.education}`,
    c.experience && `Experiência: ${c.experience}`,
    c.skills && `Competências: ${c.skills}`,
    c.motivation && `Motivação: ${c.motivation}`,
  ]
    .filter(Boolean)
    .join("\n");

  const field = (key: "senderName" | "senderContact" | "company" | "position" | "recipientName" | "city", label: string, extra: { optional?: boolean; placeholder?: string; hint?: string } = {}) => (
    <TextField id={`letter-${key}`} label={label} value={c[key]} onChange={(v) => set(key, v)} maxLength={LETTER_LIMITS[key]} error={errors[key]} {...extra} />
  );
  const area = (key: "education" | "experience" | "skills" | "motivation", label: string, placeholder: string, rows = 3) => (
    <TextAreaField id={`letter-${key}`} label={label} optional rows={rows} value={c[key]} onChange={(v) => set(key, v)} maxLength={LETTER_LIMITS[key]} placeholder={placeholder} error={errors[key]} />
  );

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm">
        <Link href="/meu-espaco/cartas" className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-700">
          <ArrowLeft className="size-4" aria-hidden /> Minhas cartas
        </Link>
        <p className="flex items-center gap-1.5 text-slate-500" role="status" aria-live="polite">
          {status.kind === "saving" ? (
            <>
              <Spinner /> A guardar…
            </>
          ) : dirty ? (
            "Alterações por guardar"
          ) : status.kind === "saved" ? (
            <>
              <Check className="size-4 text-go-600" aria-hidden /> Guardado
            </>
          ) : null}
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft sm:p-4 lg:flex-row lg:items-center">
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">{c.title || LETTER_TYPE_LABELS[c.type]}</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" onClick={save} disabled={!dirty || status.kind === "saving"} icon={<Save className="size-4" aria-hidden />}>
            Salvar
          </Button>
          <CopyButton variant="outline" label="Copiar carta" getText={() => letterPlainText(c, letterDate)} disabled={!c.body.trim()} />
          {unlocked ? (
            <>
              <Button onClick={() => download("pdf")} icon={<Download className="size-4" aria-hidden />}>
                Baixar PDF
              </Button>
              <Button variant="secondary" onClick={() => download("docx")} icon={<Download className="size-4" aria-hidden />}>
                Baixar Word
              </Button>
            </>
          ) : (
            <Button variant="success" className="col-span-2" onClick={buy} icon={<ShoppingCart className="size-4" aria-hidden />}>
              Comprar carta — {priceLabel}
            </Button>
          )}
        </div>
      </div>

      {status.kind === "error" && (
        <Alert tone="error" className="mb-4">
          {status.message}
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="letter-data" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 id="letter-data" className="text-lg font-semibold">
              1. Dados da carta
            </h2>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-800">Tipo de carta</legend>
              <div className="grid grid-cols-2 gap-2">
                {LETTER_TYPES.map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-200"
                  >
                    <input type="radio" name="letter-type" value={t} checked={c.type === t} onChange={() => set("type", t)} className="sr-only" />
                    {LETTER_TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
            </fieldset>
            <TextField id="letter-title" label="Nome da carta (só para si)" value={c.title} onChange={(v) => set("title", v)} maxLength={LETTER_LIMITS.title} error={errors.title} required />
            <div className="grid gap-4 sm:grid-cols-2">
              {field("senderName", "Nome")}
              {field("senderContact", "Contacto", { placeholder: "+258 84 000 0000 | email@exemplo.co.mz", hint: "Separe vários contactos com «|»." })}
              {field("company", "Empresa", { placeholder: "Ex.: Banco Exemplo, S.A." })}
              {field("position", "Cargo", { placeholder: "Ex.: Técnico de Contabilidade" })}
              {field("recipientName", "Nome do recrutador", { optional: true, placeholder: "Ex.: Dra. Maria Sitoe" })}
              {field("city", "Cidade", { optional: true, placeholder: "Ex.: Maputo" })}
            </div>
            {area("education", "Formação", "Ex.: Licenciatura em Contabilidade e Auditoria (2020)")}
            {area("experience", "Experiência", "Ex.: 4 anos como assistente de contabilidade; reconciliações bancárias mensais", 4)}
            {area("skills", "Competências", "Ex.: Primavera; Excel; atendimento ao cliente")}
            {area("motivation", "Motivação", "Porque quer trabalhar nesta empresa / nesta função? Escreva com as suas palavras.", 4)}
            <Button onClick={generate} icon={<Wand2 className="size-4" aria-hidden />}>
              Gerar carta
            </Button>
            <p className="text-xs text-slate-500">A carta é montada apenas com os dados acima. Campos vazios não aparecem — nada é inventado.</p>
          </section>

          <section aria-labelledby="letter-text" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 id="letter-text" className="text-lg font-semibold">
              2. Texto da carta
            </h2>
            <TextField id="letter-subject" label="Assunto" value={c.subject} onChange={(v) => set("subject", v)} maxLength={LETTER_LIMITS.subject} error={errors.subject} />
            <TextAreaField
              id="letter-body"
              label="Carta"
              hint="Pode editar livremente. Deixe uma linha em branco entre parágrafos."
              rows={16}
              value={c.body}
              onChange={(v) => set("body", v)}
              maxLength={LETTER_LIMITS.body}
              error={errors.body}
            />
            <AiImprove id="letter-body" field="letter_body" text={c.body} context={{ jobTitle: c.position, facts }} onApply={(v) => set("body", v)} />
          </section>
        </div>

        <section aria-labelledby="letter-preview-title" className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <h2 id="letter-preview-title" className="mb-2 text-sm font-semibold text-slate-700">
              Pré-visualização
            </h2>
            <div tabIndex={0} aria-labelledby="letter-preview-title" className="rounded-2xl bg-slate-200/60 p-2 outline-none focus-visible:ring-3 focus-visible:ring-brand-200 sm:p-3 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
              <ScaledSheet label="Pré-visualização da carta">
                <LetterPreview content={c} date={letterDate} />
              </ScaledSheet>
            </div>
          </div>
        </section>
      </div>

      <dialog ref={confirmRef} aria-labelledby={confirmTitle} className="m-auto w-[min(92vw,26rem)] rounded-2xl p-0 shadow-lift backdrop:bg-slate-900/50">
        <div className="p-6">
          <h2 id={confirmTitle} className="text-lg font-semibold">
            Substituir o texto da carta?
          </h2>
          <p className="mt-2 text-sm text-slate-600">O texto que editou será trocado por uma nova versão gerada a partir dos dados. Pode copiar o texto atual antes.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass("outline")} onClick={() => confirmRef.current?.close()}>
              Cancelar
            </button>
            <button type="button" className={cn(buttonClass("primary"))} onClick={applyGenerated}>
              <RefreshCw className="size-4" aria-hidden /> Substituir
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
