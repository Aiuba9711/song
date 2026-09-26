import type { Metadata } from "next";
import Link from "next/link";
import { Pagination, Table, Td, Th } from "@/components/admin/table";
import { ORDER_STATUS, OrderStatusBadge, PAYMENT_LABELS } from "@/components/app/order-status";
import { PageHeader } from "@/components/ui/page-header";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { listOrders } from "@/server/admin";

export const metadata: Metadata = { title: "Pedidos" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ estado?: string; p?: string }> }) {
  await requirePermission("orders.view");
  const { estado, p } = await searchParams;
  const status = estado && estado in ORDER_STATUS ? (estado as OrderStatus) : undefined;
  const page = Math.max(1, Number(p) || 1);
  const { rows, total, pages } = await listOrders({ status, page });

  return (
    <>
      <PageHeader title="Pedidos" description={`${total} ${total === 1 ? "pedido" : "pedidos"}`} />
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {[{ key: undefined, label: "Todos" }, ...Object.entries(ORDER_STATUS).map(([key, v]) => ({ key, label: v.label }))].map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/admin/pedidos?estado=${f.key}` : "/admin/pedidos"}
            aria-current={status === f.key ? "page" : undefined}
            className={cn("rounded-full px-3 py-1.5 text-sm font-medium", status === f.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <Table className="min-w-[900px]">
        <thead>
          <tr>
            <Th>Número</Th>
            <Th>Cliente</Th>
            <Th>Produto</Th>
            <Th>Valor</Th>
            <Th>Estado</Th>
            <Th>Pagamento</Th>
            <Th>Data</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <Td className="font-mono text-xs">{o.number}</Td>
              <Td>
                <span className="block font-medium">{o.customerName}</span>
                <span className="text-xs text-slate-500">
                  {o.customerEmail}
                  {o.customerPhone && ` · +${o.customerPhone}`}
                </span>
              </Td>
              <Td>{o.items.map((i) => i.productName).join(", ")}</Td>
              <Td className="font-semibold whitespace-nowrap tabular-nums">{formatMoney(o.totalMinor, o.currency)}</Td>
              <Td>
                <OrderStatusBadge status={o.status} />
              </Td>
              <Td>{o.payments[0] ? PAYMENT_LABELS[o.payments[0].provider] : "—"}</Td>
              <Td className="whitespace-nowrap">{formatDateTime(o.createdAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <p className="mt-4 text-center text-slate-500">Sem pedidos.</p>}
      <Pagination page={page} pages={pages} hrefFor={(n) => `/admin/pedidos?${new URLSearchParams({ ...(status ? { estado: status } : {}), p: String(n) })}`} />
    </>
  );
}
