"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";
import { updateSettingsAction } from "./actions";

type Values = Record<"whatsappNumber" | "whatsappMessage" | "contactEmail" | "contactPhone" | "supportHours" | "facebookUrl" | "instagramUrl" | "tiktokUrl" | "linkedinUrl", string>;

export function SettingsForm({ defaults }: { defaults: Values }) {
  const [state, action] = useActionState(updateSettingsAction, {} as ActionState);
  const e = state.fieldErrors ?? {};
  const text = (id: keyof Values, label: string, hint?: string, type = "text") => (
    <Field id={id} label={label} hint={hint} error={e[id]} optional>
      {(a) => <Input {...a} name={id} type={type} defaultValue={defaults[id]} />}
    </Field>
  );
  return (
    <form action={action} className="space-y-6" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {Object.keys(e).length > 0 && <Alert tone="error">Há campos por corrigir.</Alert>}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">WhatsApp</h2>
        <p className="text-sm text-slate-600">Usado no botão flutuante «Falar connosco», na página de contactos e nas encomendas.</p>
        {text("whatsappNumber", "Número de WhatsApp", "Formato internacional, sem +. Ex.: 258841234567", "tel")}
        <Field id="whatsappMessage" label="Mensagem inicial" optional error={e.whatsappMessage}>
          {(a) => <Textarea {...a} name="whatsappMessage" rows={2} defaultValue={defaults.whatsappMessage} maxLength={300} />}
        </Field>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Contactos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("contactEmail", "Email de contacto", undefined, "email")}
          {text("contactPhone", "Telefone", undefined, "tel")}
          {text("supportHours", "Horário de atendimento", "Ex.: Segunda a sexta, 8h–17h")}
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Redes sociais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("facebookUrl", "Facebook", "https://facebook.com/…", "url")}
          {text("instagramUrl", "Instagram", "https://instagram.com/…", "url")}
          {text("tiktokUrl", "TikTok", "https://tiktok.com/@…", "url")}
          {text("linkedinUrl", "LinkedIn", "https://linkedin.com/company/…", "url")}
        </div>
      </Card>
      <SubmitButton size="lg" pendingLabel="A guardar…">
        Guardar definições
      </SubmitButton>
    </form>
  );
}
