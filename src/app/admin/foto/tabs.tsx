import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "geral", href: "/admin/foto", label: "Processadores" },
  { key: "fundos", href: "/admin/foto/fundos", label: "Fundos" },
  { key: "roupas", href: "/admin/foto/roupas", label: "Roupas" },
  { key: "precos", href: "/admin/foto/precos", label: "Preços" },
] as const;

export function PhotoAdminTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Secções da foto profissional" className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-slate-200 sm:inline-flex">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={cn("flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold whitespace-nowrap sm:flex-none", current === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
