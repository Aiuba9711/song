import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/app/order-status";
import { Alert } from "@/components/ui/alert";
import { Badge, Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { METHOD_LABELS } from "@/lib/payments/types";
import { formatMzPhone } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { listPaymentsForReview, type ReviewPayment, type ReviewTab } from "@/server/payments/review";
import { ProofLink, ReviewActions } from "./review-card";

export const metadata: Metadata = { title: "Pagamentos pendentes" };

const TABS: Array<{ key: ReviewTab; label: string }> = [
  { key: "verificar", label: "Por verificar" },
  { key: "aguardar", label: "A aguardar cliente" },
  { key: "historico", label: "Histórico" },
];

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn("text-right font-medium text-slate-900", mono && "font-mono")}>{children}</dd>
    </div>
  );
}

function PaymentCard({ p, tab }: { p: ReviewPayment; tab: ReviewTab }) {
  const amount = formatMoney(p.order.totalMinor, p.order.currency);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold">{p.order.number}</p>
          <p className="text-lg font-bold text-ink">{amount}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="neutral">{METHOD_LABELS[p.provider]}</Badge>
          <PaymentStatusBadge status={p.status} />
          <OrderStatusBadge status={p.order.status} />
        </div>
      </div>

      {p.duplicateOf.length > 0 && (
        <p className="mt-3 flex gap-2 rounded-lg bg-red-50 p-2.5 text-sm font-medium text-red-800" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Código de transação também usado em: {p.duplicateOf.join(", ")}
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <dl className="divide-y divide-slate-100">
          <Row label="Cliente">{p.order.customerName}</Row>
          <Row label="Email">{p.order.customerEmail}</Row>
          {p.order.customerPhone && <Row label="Telefone da conta">+{p.order.customerPhone}</Row>}
          <Row label="Produto">{p.order.items.map((i) => i.productName).join(", ")}</Row>
          <Row label="Número de destino">{formatMzPhone(p.payeeNumber)}</Row>
          <Row label="Pedido criado">{formatDateTime(p.order.createdAt)}</Row>
        </dl>
        <dl className="divide-y divide-slate-100">
          <Row label="Titular informado">{p.payerName ?? "—"}</Row>
          <Row label="Número informado">{p.payerPhone ? formatMzPhone(p.payerPhone) : "—"}</Row>
          <Row label="Transaction ID" mono>
            {p.transactionId ?? "—"}
          </Row>
          <Row label="Pago (segundo o cliente)">{p.reportedPaidAt ? formatDateTime(p.reportedPaidAt) : "—"}</Row>
          <Row label="Enviado em">{p.submittedAt ? formatDateTime(p.submittedAt) : "—"}</Row>
          <Row label="Comprovativo">{p.proofKey ? <ProofLink paymentId={p.id} /> : <span className="text-slate-500">Não enviado</span>}</Row>
        </dl>
      </div>

      {p.reviewNote && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <strong>Nota:</strong> {p.reviewNote}
        </p>
      )}
      {p.reviewedAt && (
        <p className="mt-2 text-xs text-slate-500">
          Revisto por {p.reviewedBy?.name ?? "—"} em {formatDateTime(p.reviewedAt)}
        </p>
      )}

      {tab === "verificar" && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <ReviewActions paymentId={p.id} orderNumber={p.order.number} amount={amount} />
        </div>
      )}
    </Card>
  );
}

const DONE_MESSAGES: Record<string, string> = {
  CONFIRM: "Pagamento confirmado. O acesso foi libertado e o cliente foi notificado.",
  REJECT: "Pagamento rejeitado. O cliente foi notificado.",
  REQUEST_NEW_PROOF: "Pedido de novo comprovativo enviado ao cliente.",
};

export default async function PendingPaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; feito?: string; pedido?: string }> }) {
  await requirePermission("payments.verify");
  const { tab: raw, feito, pedido } = await searchParams;
  const tab: ReviewTab = TABS.some((t) => t.key === raw) ? (raw as ReviewTab) : "verificar";
  const payments = await listPaymentsForReview(tab);

  return (
    <>
      <PageHeader
        title="Pagamentos pendentes"
        description="Confirme cada transação no extrato M-Pesa / e-Mola / mKesh antes de libertar o acesso. Um código informado pelo cliente não é prova de pagamento."
        actions={
          <Link href="/admin/pedidos" className="text-sm font-semibold text-brand-700 hover:underline">
            Todos os pedidos
          </Link>
        }
      />
      {feito && DONE_MESSAGES[feito] && pedido && (
        <Alert tone="success" className="mb-4">
          {/^EF-[\w-]+$/.test(pedido) ? `${pedido}: ` : ""}
          {DONE_MESSAGES[feito]}
        </Alert>
      )}
      <nav aria-label="Filtro" className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/pedidos/pendentes?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", tab === t.key ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {payments.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="size-7" aria-hidden />}
          title={tab === "verificar" ? "Nenhum pagamento por verificar" : "Sem registos"}
          description={tab === "verificar" ? "Quando um cliente informar um pagamento, aparece aqui." : "Nada para mostrar neste filtro."}
        />
      ) : (
        <ul className="space-y-4">
          {payments.map((p) => (
            <li key={p.id}>
              <PaymentCard p={p} tab={tab} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
