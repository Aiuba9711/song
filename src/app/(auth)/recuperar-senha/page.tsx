import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { ForgotPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar senha"
      description="Indique o email da sua conta. Vamos enviar um link para definir uma nova senha."
      footer={
        <Link href="/entrar" className="font-semibold text-brand-700 hover:underline">
          Voltar para entrar
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
