"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export type ProductFormValues = {
  name: string;
  slug: string;
  tier: string;
  shortDescription: string;
  description: string;
  type: string;
  status: string;
  price: string;
  compareAtPrice: string;
  currency: string;
  features: string;
  faq: string;
  isFeatured: boolean;
  sortOrder: number;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  tier: "",
  shortDescription: "",
  description: "",
  type: "KIT",
  status: "DRAFT",
  price: "",
  compareAtPrice: "",
  currency: "MZN",
  features: "",
  faq: "",
  isFeatured: false,
  sortOrder: 0,
};

export function ProductForm({ action, defaults, submitLabel }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; defaults: ProductFormValues; submitLabel: string }) {
  const [state, formAction] = useActionState(action, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {Object.keys(e).length > 0 && <Alert tone="error">Há campos por corrigir.</Alert>}

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Informação</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nome" error={e.name} required>
            {(a) => <Input {...a} name="name" defaultValue={defaults.name} maxLength={120} />}
          </Field>
          <Field id="slug" label="Endereço (slug)" hint="Ex.: kit-emprego-profissional → /kits/kit-emprego-profissional" error={e.slug} required>
            {(a) => <Input {...a} name="slug" defaultValue={defaults.slug} maxLength={80} />}
          </Field>
          <Field id="tier" label="Etiqueta comercial" optional hint="Ex.: BASIC, PROFISSIONAL, PREMIUM" error={e.tier}>
            {(a) => <Input {...a} name="tier" defaultValue={defaults.tier} maxLength={30} />}
          </Field>
          <Field id="type" label="Tipo" error={e.type}>
            {(a) => (
              <Select {...a} name="type" defaultValue={defaults.type}>
                <option value="KIT">Kit</option>
                <option value="TEMPLATE_PACK">Pacote de modelos</option>
                <option value="TOOL">Ferramenta</option>
                <option value="SUBSCRIPTION">Assinatura (futuro)</option>
              </Select>
            )}
          </Field>
        </div>
        <Field id="shortDescription" label="Descrição curta" hint="Aparece no catálogo (máx. 200 caracteres)." error={e.shortDescription} required>
          {(a) => <Input {...a} name="shortDescription" defaultValue={defaults.shortDescription} maxLength={200} />}
        </Field>
        <Field id="description" label="Descrição completa" hint="Separe parágrafos com uma linha em branco." error={e.description} required>
          {(a) => <Textarea {...a} name="description" rows={6} defaultValue={defaults.description} maxLength={5000} />}
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Preço e publicação</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="price" label="Preço" hint="0 = gratuito. Ex.: 399" error={e.price} required>
            {(a) => <Input {...a} name="price" inputMode="decimal" defaultValue={defaults.price} />}
          </Field>
          <Field id="compareAtPrice" label="Preço anterior" optional hint="Mostrado riscado." error={e.compareAtPrice}>
            {(a) => <Input {...a} name="compareAtPrice" inputMode="decimal" defaultValue={defaults.compareAtPrice} />}
          </Field>
          <Field id="currency" label="Moeda" error={e.currency}>
            {(a) => (
              <Select {...a} name="currency" defaultValue={defaults.currency}>
                <option value="MZN">MZN (MT)</option>
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
                <option value="BRL">BRL</option>
                <option value="EUR">EUR</option>
              </Select>
            )}
          </Field>
          <Field id="status" label="Estado" error={e.status}>
            {(a) => (
              <Select {...a} name="status" defaultValue={defaults.status}>
                <option value="DRAFT">Rascunho (oculto)</option>
                <option value="ACTIVE">Ativo (visível)</option>
                <option value="ARCHIVED">Arquivado</option>
              </Select>
            )}
          </Field>
          <Field id="sortOrder" label="Ordem" hint="Menor aparece primeiro." error={e.sortOrder}>
            {(a) => <Input {...a} name="sortOrder" type="number" min={0} defaultValue={defaults.sortOrder} />}
          </Field>
        </div>
        <Checkbox id="isFeatured" name="isFeatured" defaultChecked={defaults.isFeatured} label="Destacar («Mais escolhido») e usar no CTA da página inicial" />
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Conteúdo e FAQ</h2>
        <Field id="features" label="O que está incluído" hint="Um item por linha." error={e.features}>
          {(a) => <Textarea {...a} name="features" rows={6} defaultValue={defaults.features} />}
        </Field>
        <Field id="faq" label="Perguntas frequentes" hint="Uma pergunta por bloco: 1.ª linha = pergunta, linha seguinte = resposta. Separe blocos com uma linha em branco." error={e.faq}>
          {(a) => <Textarea {...a} name="faq" rows={8} defaultValue={defaults.faq} />}
        </Field>
      </Card>

      <SubmitButton size="lg" pendingLabel="A guardar…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
