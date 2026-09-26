"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";

export function FileUploadForm({ action }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3" encType="multipart/form-data">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="file-name" label="Nome apresentado" optional>
          {(a) => <Input {...a} name="name" maxLength={120} placeholder="Ex.: 10 modelos de CV (Word)" />}
        </Field>
        <Field id="file" label="Ficheiro" hint="PDF, DOCX, XLSX, PPTX ou ZIP — máx. 4 MB." error={state.fieldErrors?.file}>
          {(a) => <Input {...a} name="file" type="file" accept=".pdf,.docx,.xlsx,.pptx,.zip" className="py-2" required />}
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="A carregar…" icon={<Upload className="size-4" aria-hidden />}>
        Carregar ficheiro
      </SubmitButton>
    </form>
  );
}
