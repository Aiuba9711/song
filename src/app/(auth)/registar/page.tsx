import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/guards";
import { AuthCard } from "../auth-card";
import { RegisterForm } from "../forms";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie uma conta grátis para criar CVs profissionais e descarregar em PDF e Word.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "");
  if (await getCurrentUser()) redirect(next || "/meu-espaco");
  const loginHref = next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar";
  return (
    <AuthCard
      title="Criar conta grátis"
      description="Crie e guarde os seus CVs, e descarregue em PDF e Word."
      footer={
        <>
          Já tem conta?{" "}
          <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}
