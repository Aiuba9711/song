import Link from "next/link";
import { cn } from "@/lib/utils";

export function SettingsTabs({ current }: { current: "site" | "pagamentos" }) {
  const tabs = [
    { key: "site", href: "/admin/definicoes", label: "Site e contactos" },
    { key: "pagamentos", href: "/admin/definicoes/pagamentos", label: "Pagamentos" },
  ] as const;
  return (
    <nav aria-label="Secções das definições" className="mb-6 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200 sm:inline-flex">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={cn("flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold sm:flex-none", current === t.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
