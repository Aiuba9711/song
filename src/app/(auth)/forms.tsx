"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type AuthState,
} from "./actions";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-slate-800"
        aria-label={visible ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

const initial: AuthState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required />}
      </Field>
      <Field id="password" label="Senha" error={state.fieldErrors?.password}>
        {(a) => <PasswordInput {...a} name="password" autoComplete="current-password" required />}
      </Field>
      <div className="text-right">
        <Link href="/recuperar-senha" className="text-sm font-medium text-brand-700 hover:underline">
          Esqueceu a senha?
        </Link>
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="A entrar…">
        Entrar
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="name" label="Nome completo" error={state.fieldErrors?.name}>
        {(a) => <Input {...a} name="name" autoComplete="name" defaultValue={state.values?.name} required />}
      </Field>
      <Field id="email" label="Email" error={state.fieldErrors?.email}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required />}
      </Field>
      <Field id="phone" label="Telefone / WhatsApp" optional hint="Ex.: 84 123 4567" error={state.fieldErrors?.phone}>
        {(a) => <Input {...a} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={state.values?.phone} />}
      </Field>
      <Field id="password" label="Senha" hint="Pelo menos 8 caracteres, com letras e números." error={state.fieldErrors?.password}>
        {(a) => <PasswordInput {...a} name="password" autoComplete="new-password" required />}
      </Field>
      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
        <Checkbox
          id="acceptTerms"
          name="acceptTerms"
          required
          aria-invalid={state.fieldErrors?.acceptTerms ? true : undefined}
          aria-describedby={state.fieldErrors?.acceptTerms ? "acceptTerms-error" : undefined}
          label={
            <>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="font-medium text-brand-700 underline">
                termos de utilização
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="font-medium text-brand-700 underline">
                política de privacidade
              </Link>
              .
            </>
          }
        />
        {state.fieldErrors?.acceptTerms && (
          <p id="acceptTerms-error" className="text-sm font-medium text-red-600">
            {state.fieldErrors.acceptTerms[0]}
          </p>
        )}
        <Checkbox id="marketingConsent" name="marketingConsent" label="Quero receber dicas de carreira e novidades por email (opcional)." />
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="A criar conta…">
        Criar conta grátis
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  if (state.ok) return <Alert tone="success" title="Pedido recebido">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field id="email" label="Email da conta" error={state.fieldErrors?.email}>
        {(a) => <Input {...a} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="A enviar…">
        Enviar link de recuperação
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && (
        <Alert tone="error">
          {state.error}{" "}
          <Link href="/recuperar-senha" className="font-semibold underline">
            Pedir novo link
          </Link>
        </Alert>
      )}
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="Nova senha" hint="Pelo menos 8 caracteres, com letras e números." error={state.fieldErrors?.password}>
        {(a) => <PasswordInput {...a} name="password" autoComplete="new-password" required />}
      </Field>
      <Field id="confirmPassword" label="Confirmar nova senha" error={state.fieldErrors?.confirmPassword}>
        {(a) => <PasswordInput {...a} name="confirmPassword" autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="w-full" size="lg" pendingLabel="A guardar…">
        Guardar nova senha
      </SubmitButton>
    </form>
  );
}
