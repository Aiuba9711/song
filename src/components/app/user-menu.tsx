import Link from "next/link";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { can } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { initials } from "@/cv/format";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <details className="relative">
      <summary className="flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-slate-100" aria-label="Menu da conta">
        <span className="grid size-9 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white" aria-hidden>
          {initials(user.name) || "EU"}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium text-slate-800 sm:block">{user.name}</span>
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift animate-slide-up">
        <div className="border-b border-slate-100 px-3 py-2">
          <p className="truncate font-semibold text-ink">{user.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
        <Link href="/meu-espaco/perfil" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-50">
          <UserRound className="size-4" aria-hidden /> Perfil
        </Link>
        {can(user.role, "admin.access") && (
          <Link href="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-slate-700 hover:bg-slate-50">
            <LayoutDashboard className="size-4" aria-hidden /> Painel administrativo
          </Link>
        )}
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-red-700 hover:bg-red-50">
            <LogOut className="size-4" aria-hidden /> Sair
          </button>
        </form>
      </div>
    </details>
  );
}
