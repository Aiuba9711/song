"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";
import { startCheckoutAction, submitPaymentAction } from "./actions";

type Method = { id: string; label: string };

const METHOD_STYLE: Record<string, { bg: string; fg: string; short: string }> = {
  MPESA: { bg: "#e60000", fg: "#ffffff", short: "M" },
  EMOLA: { bg: "#f58220", fg: "#ffffff", short: "e" },
  MKESH: { bg: "#0b4ea2", fg: "#ffffff", short: "mK" },
  CARD: { bg: "#334155", fg: "#ffffff", short: "💳" },
};

export function MethodMark({ id }: { id: string }) {
  const s = METHOD_STYLE[id] ?? METHOD_STYLE.CARD!;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold" style={{ background: s.bg, color: s.fg }} aria-hidden>
      {s.short}
    </span>
  );
}

export function StartCheckoutForm({
  methods,
  target,
  defaults,
}: {
  methods: Method[];
  target: { produto?: string; cv?: string; carta?: string };
  defaults: { name: string; email: string; phone: string };
}) {
  const [state, action] = useActionState(startCheckoutAction, {} as ActionState);
  const [method, setMethod] = useState(methods[0]?.id ?? "");
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {target.produto && <input type="hidden" name="produto" value={target.produto} />}
      {target.cv && <input type="hidden" name="cv" value={target.cv} />}
      {target.carta && <input type="hidden" name="carta" value={target.carta} />}

      <fieldset>
        <legend className="mb-3 text-lg font-semibold text-ink">Como quer pagar?</legend>
        <div className="grid gap-3">
          {methods.map((m) => (
            <label
              key={m.id}
              className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3.5 transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-200"
            >
              <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="size-5 accent-brand-700" />
              <MethodMark id={m.id} />
              <span className="font-semibold text-slate-900">{m.label}</span>
            </label>
          ))}
        </div>
        {e.method && <p className="mt-2 text-sm font-medium text-red-600">{e.method[0]}</p>}
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <legend className="px-1 text-lg font-semibold text-ink">Os seus dados</legend>
        <Field id="name" label="Nome completo" error={e.name}>
          {(a) => <Input {...a} name="name" defaultValue={defaults.name} autoComplete="name" required />}
        </Field>
        <Field id="email" label="Email" hint="Enviamos a confirmação para este email." error={e.email}>
          {(a) => <Input {...a} name="email" type="email" inputMode="email" defaultValue={defaults.email} autoComplete="email" required />}
        </Field>
        <Field id="phone" label="Telefone / WhatsApp" optional error={e.phone}>
          {(a) => <Input {...a} name="phone" type="tel" inputMode="tel" defaultValue={defaults.phone} autoComplete="tel" />}
        </Field>
      </fieldset>

      <SubmitButton size="lg" className="w-full" pendingLabel="A preparar…" disabled={!method}>
        Continuar para o pagamento <ArrowRight className="size-5" aria-hidden />
      </SubmitButton>
    </form>
  );
}

function nowInMaputo(): string {
  // Valor inicial do campo datetime-local na hora de Moçambique (UTC+2).
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function PaymentReportForm({ orderNumber, defaultName, defaultPhone }: { orderNumber: string; defaultName: string; defaultPhone: string }) {
  const [state, action] = useActionState(submitPaymentAction.bind(null, orderNumber), {} as ActionState);
  const [now] = useState(nowInMaputo);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate encType="multipart/form-data">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {Object.keys(e).length > 0 && !state.error && <Alert tone="error">Verifique os campos assinalados.</Alert>}
      <Field id="payerName" label="Nome do titular da conta" hint="Como aparece na sua conta M-Pesa / e-Mola / mKesh." error={e.payerName}>
        {(a) => <Input {...a} name="payerName" defaultValue={defaultName} autoComplete="name" required />}
      </Field>
      <Field id="payerPhone" label="Número usado para pagar" error={e.payerPhone}>
        {(a) => <Input {...a} name="payerPhone" type="tel" inputMode="tel" defaultValue={defaultPhone} placeholder="84 123 4567" autoComplete="tel" required />}
      </Field>
      <Field id="transactionId" label="Código / ID da transação" hint="Está no SMS de confirmação do operador." error={e.transactionId}>
        {(a) => <Input {...a} name="transactionId" autoCapitalize="characters" autoComplete="off" spellCheck={false} required className="font-mono uppercase" />}
      </Field>
      <Field id="reportedPaidAt" label="Data e hora aproximadas do pagamento" error={e.reportedPaidAt}>
        {(a) => <Input {...a} name="reportedPaidAt" type="datetime-local" defaultValue={now} max={now} required />}
      </Field>
      <Field id="proof" label="Comprovativo" optional hint="Captura de ecrã do SMS ou recibo (JPG, PNG ou PDF, até 3 MB)." error={e.proof}>
        {(a) => <Input {...a} name="proof" type="file" accept="image/jpeg,image/png,application/pdf" className="py-2" />}
      </Field>
      <Checkbox
        id="confirmTruth"
        name="confirmTruth"
        aria-invalid={e.confirmTruth ? true : undefined}
        label="Confirmo que fiz o pagamento e que os dados indicados são verdadeiros."
      />
      {e.confirmTruth && <p className="text-sm font-medium text-red-600">{e.confirmTruth[0]}</p>}
      <SubmitButton size="lg" variant="success" className="w-full" pendingLabel="A enviar…" icon={<Send className="size-5" aria-hidden />}>
        Enviar dados do pagamento
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">O acesso é libertado depois de a equipa confirmar a transação.</p>
    </form>
  );
}
