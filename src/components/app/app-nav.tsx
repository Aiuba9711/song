"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, History, Home, Package, Receipt, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/meu-espaco", label: "Início", icon: Home, exact: true, mobile: true },
  { href: "/meu-espaco/cvs", label: "Meus CVs", icon: FileText, mobile: true },
  { href: "/meu-espaco/kits", label: "Meus kits", icon: Package, mobile: true },
  { href: "/meu-espaco/downloads", label: "Downloads", icon: History },
  { href: "/meu-espaco/compras", label: "Compras", icon: Receipt },
  { href: "/meu-espaco/perfil", label: "Perfil", icon: UserRound, mobile: true },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const pathname = usePathname();
  // No editor de CV o espaço horizontal é usado pelo formulário e pela pré-visualização.
  if (pathname.endsWith("/editar")) return null;
  return (
    <nav aria-label="Meu Espaço" className="hidden w-56 shrink-0 md:block">
      <ul className="sticky top-24 space-y-1">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Navegação inferior no telemóvel — alvos grandes, sempre visível. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden print:hidden">
      <ul className="grid grid-cols-4">
        {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium", active ? "text-brand-700" : "text-slate-600")}
              >
                <Icon className={cn("size-6", active && "stroke-[2.4]")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
