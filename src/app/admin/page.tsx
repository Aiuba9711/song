import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Package, Receipt, Users, Wallet } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge } from "@/components/app/order-status";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getDashboardStats } from "@/server/admin";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const user = await requirePermission("admin.access");
  const s = await getDashboardStats();
  const n = (v: number) => new Intl.NumberFormat("pt-MZ").format(v);
  const showSales = can(user.role, "orders.view");

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da plataforma." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {showSales && <StatCard label="Receita (pedidos pagos)" value={formatMoney(s.revenueMinor, "MZN")} icon={<Wallet className="size-5" aria-hidden />} />}
        {showSales && <StatCard label="Vendas" value={n(s.paidOrders)} hint="Pedidos pagos (inclui gratuitos)" icon={<Receipt className="size-5" aria-hidden />} />}
        <StatCard label="Utilizadores" value={n(s.users)} hint={`+${n(s.users30)} nos últimos 30 dias`} icon={<Users className="size-5" aria-hidden />} />
        <StatCard label="CVs criados" value={n(s.cvs)} hint={`+${n(s.cvs30)} nos últimos 30 dias`} icon={<FileText className="size-5" aria-hidden />} />
        <StatCard label="Downloads" value={n(s.downloads)} hint={`${n(s.downloads30)} nos últimos 30 dias`} icon={<Download className="size-5" aria-hidden />} />
        <StatCard label="Produtos ativos" value={n(s.activeProducts)} icon={<Package className="size-5" aria-hidden />} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {showSales && (
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Pedidos recentes</h2>
              <Link href="/admin/pedidos" className="text-sm font-semibold text-brand-700 hover:underline">
                Ver todos
              </Link>
            </div>
            {s.recentOrders.length === 0 ? (
              <p className="text-sm text-slate-500">Ainda não há pedidos.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {s.recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{o.customerName}</span>
                      <span className="text-slate-500">
                        {o.number} · {formatDate(o.createdAt)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatMoney(o.totalMinor, o.currency)}</span>
                    <OrderStatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Novos utilizadores</h2>
          {s.recentUsers.length === 0 ? (
            <p className="text-sm text-slate-500">Ainda não há utilizadores.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {s.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="block truncate text-slate-500">{u.email}</span>
                  </span>
                  <span className="text-slate-500">{formatDate(u.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
