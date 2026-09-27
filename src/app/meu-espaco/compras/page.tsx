import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { Alert } from "@/components/ui/alert";
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

const NEXT_STEP: Partial<Record<string, { label: string; path: string }>> = {
  AWAITING_PAYMENT: { label: "Continuar pagamento", path: "/checkout" },
  PENDING_VERIFICATION: { label: "Ver estado", path: "/checkout/pending" },
  PAID: { label: "Aceder", path: "/checkout/success" },
  FAILED: { label: "Ver detalhes", path: "/checkout/failed" },
};

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ cancelado?: string }> }) {
  const [user, { cancelado }] = await Promise.all([requireUser("/meu-espaco/compras"), searchParams]);
  const orders = await listUserOrders(user.id);
  return (
    <>
      <PageHeader title="As minhas compras" />
      {cancelado && (
        <Alert tone="success" className="mb-4">
          Pedido cancelado.
        </Alert>
      )}
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
                {NEXT_STEP[o.status] && o.totalMinor > 0 && (
                  <ButtonLink href={`${NEXT_STEP[o.status]!.path}?pedido=${encodeURIComponent(o.number)}`} size="sm" variant={o.status === "AWAITING_PAYMENT" ? "primary" : "outline"} className="w-full sm:w-auto">
                    {NEXT_STEP[o.status]!.label}
                  </ButtonLink>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
