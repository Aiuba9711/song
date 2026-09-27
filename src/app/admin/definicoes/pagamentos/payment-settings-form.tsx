"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";
import { updatePaymentSettingsAction } from "./actions";

export type PaymentSettingsValues = {
  mpesaEnabled: boolean;
  mpesaNumber: string;
  emolaEnabled: boolean;
  emolaNumber: string;
  mkeshEnabled: boolean;
  mkeshNumber: string;
  accountHolderName: string;
  instructions: string;
  currency: string;
  defaultPrice: string;
  cvPaywallEnabled: boolean;
};

const METHODS = [
  { key: "mpesa", label: "M-Pesa", hint: "Vodacom — números 84 / 85" },
  { key: "emola", label: "e-Mola", hint: "Movitel — números 86 / 87" },
  { key: "mkesh", label: "mKesh", hint: "Tmcel — números 82 / 83" },
] as const;

export function PaymentSettingsForm({ defaults }: { defaults: PaymentSettingsValues }) {
  const [state, action] = useActionState(updatePaymentSettingsAction, {} as ActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {Object.keys(e).length > 0 && <Alert tone="error">Há campos por corrigir.</Alert>}

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Métodos de pagamento manual</h2>
          <p className="text-sm text-slate-600">
            O cliente transfere para o número indicado e informa a transação. O acesso só é libertado depois de um administrador confirmar em «Pagamentos pendentes».
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {METHODS.map((m) => (
            <fieldset key={m.key} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <legend className="px-1 font-semibold">{m.label}</legend>
              <Checkbox id={`${m.key}Enabled`} name={`${m.key}Enabled`} defaultChecked={defaults[`${m.key}Enabled`]} label="Método ativo" />
              <Field id={`${m.key}Number`} label={`Número ${m.label}`} hint={m.hint} error={e[`${m.key}Number`]}>
                {(a) => <Input {...a} name={`${m.key}Number`} type="tel" inputMode="tel" defaultValue={defaults[`${m.key}Number`]} placeholder="84 123 4567" />}
              </Field>
            </fieldset>
          ))}
        </div>
        <Field id="accountHolderName" label="Nome do titular" optional hint="Mostrado ao cliente para confirmar que transfere para a conta certa." error={e.accountHolderName}>
          {(a) => <Input {...a} name="accountHolderName" defaultValue={defaults.accountHolderName} maxLength={80} />}
        </Field>
        <Field id="instructions" label="Instruções de pagamento" hint="Uma instrução por linha. Aparecem no checkout, abaixo do número e do valor." error={e.instructions}>
          {(a) => <Textarea {...a} name="instructions" rows={6} defaultValue={defaults.instructions} maxLength={2000} />}
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Preço e moeda</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="currency" label="Moeda" hint="Os pagamentos por carteira móvel só funcionam em MZN." error={e.currency}>
            {(a) => (
              <Select {...a} name="currency" defaultValue={defaults.currency}>
                <option value="MZN">MZN (Meticais)</option>
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
                <option value="EUR">EUR</option>
              </Select>
            )}
          </Field>
          <Field id="defaultPrice" label="Valor padrão" hint="Preço do download de um CV (quando o download é pago). Ex.: 199" error={e.defaultPrice}>
            {(a) => <Input {...a} name="defaultPrice" inputMode="decimal" defaultValue={defaults.defaultPrice} />}
          </Field>
        </div>
        <Checkbox
          id="cvPaywallEnabled"
          name="cvPaywallEnabled"
          defaultChecked={defaults.cvPaywallEnabled}
          label="Cobrar o download de CVs (PDF e Word). Criar, editar e pré-visualizar continuam gratuitos."
        />
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">Cartão bancário</h2>
        <p className="mt-1 text-sm text-slate-600">
          Indisponível: requer integração com um gateway de pagamento oficial (ver PAYMENTS.md). Não pode ser ativado sem essa integração.
        </p>
        <Checkbox id="cardEnabled" disabled label="Pagamento por cartão (desativado)" className="mt-3 opacity-60" />
      </Card>

      <SubmitButton size="lg" pendingLabel="A guardar…">
        Guardar definições de pagamento
      </SubmitButton>
    </form>
  );
}
