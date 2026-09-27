import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3 } from "lucide-react";
import { OrderStatusBadge } from "@/components/app/order-status";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { METHOD_LABELS } from "@/lib/payments/types";
import { getCustomerOrder } from "@/server/checkout";
import { AutoRefresh } from "../auto-refresh";
import { CheckoutSteps } from "../steps";

export const metadata: Metadata = { title: "Pagamento em verificação" };

export default async function PendingPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const user = await requireUser(`/checkout/pending?pedido=${pedido ?? ""}`);
  const order = pedido ? await getCustomerOrder(user.id, pedido) : null;
  if (!order) redirect("/meu-espaco/compras");
  const q = `?pedido=${encodeURIComponent(order.number)}`;
  if (order.status === "PAID") redirect(`/checkout/success${q}`);
  if (order.status === "AWAITING_PAYMENT") redirect(`/checkout${q}`);
  if (order.status !== "PENDING_VERIFICATION") redirect(`/checkout/failed${q}`);
  const payment = order.payments[0];

  return (
    <>
      <AutoRefresh seconds={30} />
      <CheckoutSteps current={3} />
      <div className="text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Clock3 className="size-8" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Pagamento em verificação</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Recebemos os dados do seu pagamento. A nossa equipa vai confirmar a transação junto do operador — normalmente em poucas horas, em horário de expediente.
          Enviaremos um email quando o acesso estiver disponível.
        </p>
      </div>
      <Card className="mt-6 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">Pedido</dt>
          <dd className="text-right font-mono font-semibold">{order.number}</dd>
          <dt className="text-slate-500">Estado</dt>
          <dd className="text-right">
            <OrderStatusBadge status={order.status} />
          </dd>
          <dt className="text-slate-500">Valor</dt>
          <dd className="text-right font-semibold">{formatMoney(order.totalMinor, order.currency)}</dd>
          {payment && (
            <>
              <dt className="text-slate-500">Método</dt>
              <dd className="text-right">{METHOD_LABELS[payment.provider]}</dd>
              {payment.transactionId && (
                <>
                  <dt className="text-slate-500">Código da transação</dt>
                  <dd className="text-right font-mono">{payment.transactionId}</dd>
                </>
              )}
              {payment.submittedAt && (
                <>
                  <dt className="text-slate-500">Enviado em</dt>
                  <dd className="text-right">{formatDateTime(payment.submittedAt)}</dd>
                </>
              )}
            </>
          )}
        </dl>
      </Card>
      <Alert tone="info" className="mt-4">
        Esta página atualiza-se sozinha. Pode fechá-la — o estado fica também em{" "}
        <Link href="/meu-espaco/compras" className="font-semibold underline">
          As minhas compras
        </Link>
        .
      </Alert>
      <ButtonLink href="/meu-espaco" variant="outline" className="mt-6 w-full">
        Voltar ao Meu Espaço
      </ButtonLink>
    </>
  );
}
