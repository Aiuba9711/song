import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { OrderStatusBadge, PAYMENT_LABELS } from "@/components/app/order-status";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listUserOrders } from "@/server/orders";

export const metadata: Metadata = { title: "Compras" };

export default async function PurchasesPage() {
  const user = await requireUser("/meu-espaco/compras");
  const orders = await listUserOrders(user.id);
  return (
    <>
      <PageHeader title="As minhas compras" />
      {orders.length === 0 ? (
        <EmptyState icon={<Receipt className="size-7" aria-hidden />} title="Ainda não fez pedidos" description="Os seus pedidos e respetivos estados aparecem aqui." action={<ButtonLink href="/kits">Ver kits</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{o.items.map((i) => i.productName).join(", ")}</p>
                  <p className="text-sm text-slate-500">
                    {o.number} · {formatDate(o.createdAt)}
                    {o.payments[0] && ` · ${PAYMENT_LABELS[o.payments[0].provider]}`}
                  </p>
                </div>
                <p className="font-semibold">{formatMoney(o.totalMinor, o.currency)}</p>
                <OrderStatusBadge status={o.status} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
