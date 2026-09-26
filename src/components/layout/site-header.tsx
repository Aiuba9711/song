import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";

const NAV = [
  { href: "/cv-modelos", label: "Modelos" },
  { href: "/kits", label: "Kits" },
  { href: "/conselhos", label: "Conselhos" },
  { href: "/contactos", label: "Contactos" },
];

/**
 * Cabeçalho público. Não depende da sessão para permitir que as páginas públicas
 * sejam estáticas (rápidas e em cache). "Meu Espaço" leva ao login quando necessário.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Navegação principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-[15px] font-medium text-slate-700 hover:bg-slate-100 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/meu-espaco" variant="ghost" className="hidden sm:inline-flex" icon={<UserRound className="size-4" aria-hidden />}>
            Meu Espaço
          </ButtonLink>
          <ButtonLink href="/meu-espaco/cvs/novo" prefetch={false} className="hidden sm:inline-flex">
            Criar CV
          </ButtonLink>
          <details className="group relative md:hidden">
            <summary className="grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100" aria-label="Abrir menu">
              <Menu className="size-6" aria-hidden />
            </summary>
            <nav
              aria-label="Menu"
              className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift animate-slide-up"
            >
              {[{ href: "/", label: "Início" }, ...NAV, { href: "/meu-espaco", label: "Meu Espaço" }].map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-xl px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50">
                  {item.label}
                </Link>
              ))}
              <ButtonLink href="/meu-espaco/cvs/novo" prefetch={false} className="mt-2 w-full">
                Criar meu CV
              </ButtonLink>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
