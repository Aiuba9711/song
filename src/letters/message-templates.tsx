"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { AiAssistantProvider, AiImprove } from "@/cv/builder/ai";
import { TextAreaField, TextField } from "@/cv/builder/fields";
import type { AiStatus } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink, WHATSAPP_MAX_TEXT } from "@/lib/whatsapp";
import { EMAIL_TEMPLATES, VAR_LABELS, VAR_MAX, VAR_PLACEHOLDERS, WHATSAPP_TEMPLATES, type MessageVars, type VarKey } from "./messages";

type Props = {
  kind: "email" | "whatsapp";
  defaults: MessageVars;
  aiStatus: AiStatus;
  whatsapp: { countryCode: string; linksEnabled: boolean };
};

export function MessageTemplates(props: Props) {
  return (
    <AiAssistantProvider cvId={`mensagens-${props.kind}`} initialStatus={props.aiStatus}>
      {props.kind === "email" ? <EmailComposer {...props} /> : <WhatsAppComposer {...props} />}
    </AiAssistantProvider>
  );
}

function Categories({ items, value, onChange, label }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap">
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          role="radio"
          aria-checked={value === i.id}
          onClick={() => onChange(i.id)}
          className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap", value === i.id ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

function VarsForm({ fields, vars, setVar }: { fields: VarKey[]; vars: MessageVars; setVar: (k: VarKey, v: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["name", "phone", "email"] as VarKey[]).concat(fields).map((k) => (
        <TextField key={k} id={`var-${k}`} label={VAR_LABELS[k]} optional={!["name"].includes(k)} value={vars[k]} onChange={(v) => setVar(k, v)} maxLength={VAR_MAX} placeholder={VAR_PLACEHOLDERS[k]} />
      ))}
    </div>
  );
}

/** Texto derivado do modelo até o utilizador o editar; depois fica o texto dele (com opção de repor). */
function useEditableText(generated: string) {
  const [edited, setEdited] = useState<string | null>(null);
  return { value: edited ?? generated, edited: edited !== null, set: (v: string) => setEdited(v), reset: () => setEdited(null) };
}

const factsOf = (v: MessageVars) =>
  (Object.keys(v) as VarKey[])
    .filter((k) => v[k].trim())
    .map((k) => `${VAR_LABELS[k]}: ${v[k].trim()}`)
    .join("\n");

function EmailComposer({ defaults }: Props) {
  const [id, setId] = useState(EMAIL_TEMPLATES[0]!.id);
  const [vars, setVars] = useState(defaults);
  const tpl = EMAIL_TEMPLATES.find((x) => x.id === id)!;
  const subject = useEditableText(tpl.subject(vars));
  const body = useEditableText(tpl.body(vars));
  const setVar = (k: VarKey, v: string) => setVars((p) => ({ ...p, [k]: v }));

  const choose = (next: string) => {
    setId(next);
    subject.reset();
    body.reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <Categories items={EMAIL_TEMPLATES} value={id} onChange={choose} label="Tipo de email" />
        <p className="text-sm text-slate-600">{tpl.description}</p>
        <VarsForm fields={tpl.fields} vars={vars} setVar={setVar} />
      </div>
      <section aria-labelledby="email-result" className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="email-result" className="text-lg font-semibold">
          O seu email
        </h2>
        <TextField id="email-subject" label="Assunto" value={subject.value} onChange={subject.set} maxLength={200} />
        <TextAreaField id="email-body" label="Mensagem" rows={14} value={body.value} onChange={body.set} maxLength={3000} />
        <AiImprove id="email-body" field="email_body" text={body.value} context={{ jobTitle: vars.position, facts: factsOf(vars) }} onApply={body.set} />
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton label="Copiar email" getText={() => `Assunto: ${subject.value.trim()}\n\n${body.value.trim()}`} disabled={!body.value.trim()} />
          {(subject.edited || body.edited) && (
            <button
              type="button"
              className={buttonClass("ghost", "md")}
              onClick={() => {
                subject.reset();
                body.reset();
              }}
            >
              <RotateCcw className="size-4" aria-hidden /> Repor texto do modelo
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">Cole no seu email (Gmail, Outlook…), anexe o CV e reveja antes de enviar.</p>
      </section>
    </div>
  );
}

function WhatsAppComposer({ defaults, whatsapp }: Props) {
  const [id, setId] = useState(WHATSAPP_TEMPLATES[0]!.id);
  const [vars, setVars] = useState(defaults);
  const [to, setTo] = useState("");
  // A hora local só é conhecida no navegador (evita diferenças entre servidor e cliente).
  const [hour, setHour] = useState(9);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização com o relógio do dispositivo
    setHour(new Date().getHours());
  }, []);
  const tpl = WHATSAPP_TEMPLATES.find((x) => x.id === id)!;
  const message = useEditableText(tpl.message(vars, hour));
  const setVar = (k: VarKey, v: string) => setVars((p) => ({ ...p, [k]: v }));
  const link = useMemo(() => buildWhatsAppLink({ phone: to, text: message.value, countryCode: whatsapp.countryCode }), [to, message.value, whatsapp.countryCode]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <Categories
          items={WHATSAPP_TEMPLATES}
          value={id}
          onChange={(next) => {
            setId(next);
            message.reset();
          }}
          label="Tipo de mensagem"
        />
        <VarsForm fields={tpl.fields} vars={vars} setVar={setVar} />
      </div>
      <section aria-labelledby="wa-result" className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="wa-result" className="text-lg font-semibold">
          A sua mensagem
        </h2>
        <TextAreaField id="wa-message" label="Mensagem" hint="Curta e educada — sem emojis nem abreviaturas." rows={7} value={message.value} onChange={message.set} maxLength={WHATSAPP_MAX_TEXT} />
        <AiImprove id="wa-message" field="whatsapp_message" text={message.value} context={{ jobTitle: vars.position, facts: factsOf(vars) }} onApply={message.set} />
        {whatsapp.linksEnabled && (
          <TextField
            id="wa-to"
            label="Número de WhatsApp do recrutador"
            optional
            type="tel"
            inputMode="tel"
            placeholder="Ex.: 84 123 4567"
            hint={`Sem indicativo, usamos +${whatsapp.countryCode}. Vazio: escolhe o contacto no WhatsApp.`}
            value={to}
            onChange={setTo}
            maxLength={25}
            error={to.trim() && !link.ok ? link.error : undefined}
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton label="Copiar mensagem" getText={() => message.value.trim()} disabled={!message.value.trim()} />
          {whatsapp.linksEnabled &&
            (link.ok ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonClass("success", "md")}>
                <ExternalLink className="size-4" aria-hidden /> Abrir WhatsApp
              </a>
            ) : (
              <button type="button" disabled className={buttonClass("success", "md")}>
                <ExternalLink className="size-4" aria-hidden /> Abrir WhatsApp
              </button>
            ))}
          {message.edited && (
            <button type="button" className={buttonClass("ghost", "md")} onClick={message.reset}>
              <RotateCcw className="size-4" aria-hidden /> Repor texto do modelo
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
