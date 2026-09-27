import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { can, ROLE_LABELS } from "@/lib/auth/roles";
import { countPendingVerification } from "@/server/payments/review";

export const metadata: Metadata = { title: { default: "Administração", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("admin.access");
  const items: AdminNavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    ...(can(user.role, "products.manage") ? [{ href: "/admin/produtos", label: "Produtos", icon: "products" } as const] : []),
    ...(can(user.role, "payments.verify") ? [{ href: "/admin/pedidos/pendentes", label: "Pagamentos pendentes", icon: "payments", count: await countPendingVerification() } as const] : []),
    ...(can(user.role, "orders.view") ? [{ href: "/admin/pedidos", label: "Pedidos", icon: "orders" } as const] : []),
    ...(can(user.role, "users.manage") ? [{ href: "/admin/utilizadores", label: "Utilizadores", icon: "users" } as const] : []),
    ...(can(user.role, "templates.manage") ? [{ href: "/admin/modelos", label: "Modelos de CV", icon: "templates" } as const] : []),
    ...(can(user.role, "photos.manage") ? [{ href: "/admin/foto", label: "Foto Profissional", icon: "photos" } as const] : []),
    ...(can(user.role, "settings.manage") ? [{ href: "/admin/definicoes", label: "Definições", icon: "settings" } as const] : []),
    ...(can(user.role, "users.manage") ? [{ href: "/admin/auditoria", label: "Auditoria", icon: "audit" } as const] : []),
  ];
  return (
    <div className="min-h-dvh bg-slate-100/70 pb-16">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <Badge tone="neutral" className="hidden sm:inline-flex">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden text-sm font-medium text-slate-600 hover:text-brand-700 sm:block">
              Ver site
            </Link>
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <div className="container-page flex flex-col gap-6 pt-6 md:flex-row md:gap-8">
        <AdminNav items={items} />
        <main id="conteudo" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
