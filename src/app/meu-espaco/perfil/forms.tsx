"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "./actions";

const initial: ActionState = {};

export function ProfileForm({ defaults }: { defaults: { name: string; email: string; phone: string; headline: string; location: string; marketingConsent: boolean } }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Nome completo" error={state.fieldErrors?.name}>
          {(a) => <Input {...a} name="name" defaultValue={defaults.name} autoComplete="name" required />}
        </Field>
        <Field id="email" label="Email" hint="Para alterar o email, contacte o suporte.">
          {(a) => <Input {...a} value={defaults.email} readOnly disabled />}
        </Field>
        <Field id="phone" label="Telefone / WhatsApp" optional error={state.fieldErrors?.phone}>
          {(a) => <Input {...a} name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" />}
        </Field>
        <Field id="headline" label="Profissão" optional hint="Usada para pré-preencher novos CVs." error={state.fieldErrors?.headline}>
          {(a) => <Input {...a} name="headline" defaultValue={defaults.headline} maxLength={100} />}
        </Field>
        <Field id="location" label="Localização" optional error={state.fieldErrors?.location}>
          {(a) => <Input {...a} name="location" defaultValue={defaults.location} maxLength={100} />}
        </Field>
      </div>
      <Checkbox id="marketingConsent" name="marketingConsent" defaultChecked={defaults.marketingConsent} label="Quero receber dicas de carreira e novidades por email." />
      <SubmitButton pendingLabel="A guardar…">Guardar perfil</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field id="currentPassword" label="Senha atual" error={state.fieldErrors?.currentPassword}>
        {(a) => <Input {...a} name="currentPassword" type="password" autoComplete="current-password" required />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="newPassword" label="Nova senha" hint="Pelo menos 8 caracteres, com letras e números." error={state.fieldErrors?.password}>
          {(a) => <Input {...a} name="password" type="password" autoComplete="new-password" required />}
        </Field>
        <Field id="confirmPassword" label="Confirmar nova senha" error={state.fieldErrors?.confirmPassword}>
          {(a) => <Input {...a} name="confirmPassword" type="password" autoComplete="new-password" required />}
        </Field>
      </div>
      <SubmitButton variant="outline" pendingLabel="A alterar…">
        Alterar senha
      </SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="delete-password" label="Senha" error={state.fieldErrors?.password}>
          {(a) => <Input {...a} name="password" type="password" autoComplete="current-password" required />}
        </Field>
        <Field id="confirm" label="Escreva ELIMINAR para confirmar" error={state.fieldErrors?.confirm}>
          {(a) => <Input {...a} name="confirm" autoComplete="off" autoCapitalize="characters" required />}
        </Field>
      </div>
      <SubmitButton variant="danger" pendingLabel="A eliminar…">
        Eliminar a minha conta
      </SubmitButton>
    </form>
  );
}
