"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

/** Carregar uma imagem de pré-visualização própria (substitui a imagem gerada). */
export function PreviewImageForm({ action }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <Field id="image" label="Carregar imagem" hint="JPG, PNG ou WEBP até 3 MB. É reduzida para 400 px e os metadados são removidos." error={state.fieldErrors?.image}>
        {(a) => <input {...a} type="file" name="image" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-800" />}
      </Field>
      <SubmitButton size="sm" variant="secondary" pendingLabel="A enviar…">
        Enviar imagem
      </SubmitButton>
    </form>
  );
}
