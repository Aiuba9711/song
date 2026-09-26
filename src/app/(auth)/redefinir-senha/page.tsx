import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { AuthCard } from "../auth-card";
import { ResetPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Definir nova senha", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Definir nova senha" description="Escolha uma senha que não use noutros sites.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert tone="error">
          Link inválido.{" "}
          <Link href="/recuperar-senha" className="font-semibold underline">
            Pedir novo link
          </Link>
        </Alert>
      )}
    </AuthCard>
  );
}
