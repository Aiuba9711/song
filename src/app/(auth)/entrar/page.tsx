import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/guards";
import { AuthCard } from "../auth-card";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "");
  if (await getCurrentUser()) redirect(next || "/meu-espaco");
  const registerHref = next ? `/registar?next=${encodeURIComponent(next)}` : "/registar";
  return (
    <AuthCard
      title="Entrar"
      description="Aceda aos seus CVs, documentos e kits."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href={registerHref} className="font-semibold text-brand-700 hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    >
      {params["senha-redefinida"] && (
        <Alert tone="success" className="mb-4">
          Senha alterada. Entre com a nova senha.
        </Alert>
      )}
      <LoginForm next={next} />
    </AuthCard>
  );
}
