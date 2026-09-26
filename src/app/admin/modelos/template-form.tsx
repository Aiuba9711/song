"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export type TemplateFormValues = {
  name: string;
  slug: string;
  description: string;
  category: string;
  layout: string;
  accentColor: string;
  sortOrder: number;
  isActive: boolean;
  isPremium: boolean;
};

export function TemplateForm({
  action,
  defaults,
  categories,
  layouts,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: TemplateFormValues;
  categories: Array<{ value: string; label: string }>;
  layouts: Array<{ value: string; label: string }>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [color, setColor] = useState(defaults.accentColor);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate>
      <Card className="space-y-4 p-5">
        {state.ok && <Alert tone="success">{state.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nome" error={e.name} required>
            {(a) => <Input {...a} name="name" defaultValue={defaults.name} maxLength={60} />}
          </Field>
          <Field id="slug" label="Slug" hint="Usado no link «Usar este modelo»." error={e.slug} required>
            {(a) => <Input {...a} name="slug" defaultValue={defaults.slug} maxLength={60} />}
          </Field>
          <Field id="category" label="Categoria" error={e.category}>
            {(a) => (
              <Select {...a} name="category" defaultValue={defaults.category}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="layout" label="Layout" hint="Estrutura visual implementada (HTML, PDF e Word)." error={e.layout}>
            {(a) => (
              <Select {...a} name="layout" defaultValue={defaults.layout}>
                {layouts.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="accentColor" label="Cor de destaque" error={e.accentColor}>
            {(a) => (
              <div className="flex gap-2">
                <input type="color" value={color} onChange={(ev) => setColor(ev.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300" aria-label="Escolher cor" />
                <Input {...a} name="accentColor" value={color} onChange={(ev) => setColor(ev.target.value)} maxLength={7} />
              </div>
            )}
          </Field>
          <Field id="sortOrder" label="Ordem" error={e.sortOrder}>
            {(a) => <Input {...a} name="sortOrder" type="number" min={0} defaultValue={defaults.sortOrder} />}
          </Field>
        </div>
        <Field id="description" label="Descrição" error={e.description} required>
          {(a) => <Textarea {...a} name="description" rows={3} defaultValue={defaults.description} maxLength={300} />}
        </Field>
        <div className="flex flex-wrap gap-6">
          <Checkbox id="isActive" name="isActive" defaultChecked={defaults.isActive} label="Ativo (visível para os utilizadores)" />
          <Checkbox id="isPremium" name="isPremium" defaultChecked={defaults.isPremium} label="Premium (reservado para planos futuros)" />
        </div>
        <SubmitButton pendingLabel="A guardar…">{submitLabel}</SubmitButton>
      </Card>
    </form>
  );
}
