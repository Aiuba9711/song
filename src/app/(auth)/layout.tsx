import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-slate-50">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:pt-10">
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </main>
      <footer className="pb-6 text-center text-xs text-slate-500">
        <Link href="/privacidade" className="hover:text-brand-700">Privacidade</Link>
        <span aria-hidden> · </span>
        <Link href="/termos" className="hover:text-brand-700">Termos</Link>
      </footer>
    </div>
  );
}
