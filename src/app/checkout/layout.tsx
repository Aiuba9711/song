import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: { default: "Pagamento", template: "%s | Emprego Fácil MZ" }, robots: { index: false, follow: false } };

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/checkout");
  return (
    <div className="min-h-dvh bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Logo />
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Lock className="size-4 text-go-700" aria-hidden /> Pagamento seguro
          </span>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-2xl px-4 pt-6">
        {children}
      </main>
      <p className="mx-auto mt-10 max-w-2xl px-4 text-center text-xs text-slate-500">
        Dúvidas? <Link href="/contactos" className="font-medium text-brand-700 underline">Fale connosco</Link>. Nunca lhe pediremos o PIN da sua conta.
      </p>
    </div>
  );
}
