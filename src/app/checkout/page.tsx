import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Info, TriangleAlert } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/whatsapp-button";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { METHOD_LABELS, PaymentError } from "@/lib/payments/types";
import { formatMzPhone } from "@/lib/pricing";
import { alreadyOwns, getCustomerOrder, resolveCheckoutItem, type CheckoutTarget } from "@/server/checkout";
import { getManualProvider, isManualMethod, listAvailableMethods } from "@/server/payments/registry";
import { getSiteSettings, whatsappLink } from "@/server/settings";
import { cancelOrderAction, changeMethodAction } from "./actions";
import { CopyButton } from "./copy-button";
import { MethodMark, PaymentReportForm, StartCheckoutForm } from "./forms";
import { CheckoutSteps } from "./steps";

export const metadata: Metadata = { title: "Pagamento" };

type Search = { produto?: string; cv?: string; pedido?: string };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const next = `/checkout?${new URLSearchParams(Object.entries(params).filter(([, v]) => typeof v === "string") as [string, string][])}`;
  const user = await requireUser(next);

  if (params.pedido) return <PayOrder userId={user.id} orderNumber={params.pedido} />;

  const target: CheckoutTarget | null = params.produto ? { productSlug: params.produto } : params.cv ? { cvId: params.cv } : null;
  if (!target) redirect("/kits");

  let item;
  try {
    item = await resolveCheckoutItem(user.id, target);
  } catch (error) {
    if (error instanceof PaymentError) {
      return (
        <Alert tone="error" title="Não é possível continuar">
          {error.message}{" "}
          <Link href="/kits" className="font-semibold underline">
            Ver kits
          </Link>
        </Alert>
      );
    }
    throw error;
  }
  if (await alreadyOwns(user.id, item)) redirect(item.kind === "PRODUCT" ? "/meu-espaco/kits" : `/meu-espaco/cvs/${item.cvId}`);

  const [methods, account, site] = await Promise.all([
    listAvailableMethods(),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, phone: true } }),
    getSiteSettings(),
  ]);

  return (
    <>
      <CheckoutSteps current={1} />
      <h1 className="text-2xl font-bold tracking-tight">Finalizar compra</h1>
      <Card className="mt-4 flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{item.name}</p>
          <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
        </div>
        <p className="shrink-0 text-xl font-extrabold text-ink">{formatMoney(item.unitPriceMinor, item.currency)}</p>
      </Card>

      <div className="mt-6">
        {methods.length === 0 || item.currency !== "MZN" ? (
          <Alert tone="warning" title="Pagamentos temporariamente indisponíveis">
            Não há métodos de pagamento ativos neste momento.
            {site.whatsappNumber && (
              <a href={whatsappLink(site.whatsappNumber, `Olá! Quero comprar: ${item.name}.`)} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md", "mt-3 w-full")}>
                <WhatsAppIcon className="size-5 text-[#128c4a]" /> Falar connosco no WhatsApp
              </a>
            )}
          </Alert>
        ) : (
          <StartCheckoutForm
            methods={methods}
            target={{ produto: params.produto, cv: params.cv }}
            defaults={{ name: account.name, email: account.email, phone: account.phone ? `+${account.phone}` : "" }}
          />
        )}
      </div>
    </>
  );
}

async function PayOrder({ userId, orderNumber }: { userId: string; orderNumber: string }) {
  const order = await getCustomerOrder(userId, orderNumber);
  if (!order) {
    return (
      <Alert tone="error" title="Pedido não encontrado">
        <Link href="/meu-espaco/compras" className="font-semibold underline">
          Ver as minhas compras
        </Link>
      </Alert>
    );
  }
  const q = `?pedido=${encodeURIComponent(order.number)}`;
  if (order.status === "PAID") redirect(`/checkout/success${q}`);
  if (order.status === "PENDING_VERIFICATION") redirect(`/checkout/pending${q}`);
  if (order.status !== "AWAITING_PAYMENT") redirect(`/checkout/failed${q}`);

  const payment = order.payments[0];
  if (!payment || !isManualMethod(payment.provider) || payment.status === "CANCELLED") {
    return (
      <Alert tone="error" title="Escolha novamente o método de pagamento">
        <Link href="/meu-espaco/compras" className="font-semibold underline">
          Ver as minhas compras
        </Link>
      </Alert>
    );
  }

  const provider = getManualProvider(payment.provider);
  let instructions;
  try {
    instructions = await provider.getPaymentInstructions(order);
  } catch (error) {
    if (!(error instanceof PaymentError)) throw error;
    instructions = null;
  }
  const methods = (await listAvailableMethods()).filter((m) => m.mode === "MANUAL" && m.id !== payment.provider);
  const amount = formatMoney(order.totalMinor, order.currency);

  return (
    <>
      <CheckoutSteps current={2} />
      <Link href="/meu-espaco/compras" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> As minhas compras
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Pagar com {METHOD_LABELS[payment.provider]}</h1>
      <p className="mt-1 text-slate-600">{order.items.map((i) => i.productName).join(", ")}</p>

      {payment.status === "RESUBMISSION_REQUESTED" && (
        <Alert tone="warning" title="Precisamos de um novo comprovativo" className="mt-4">
          {payment.reviewNote}
        </Alert>
      )}

      {!instructions ? (
        <Alert tone="error" className="mt-5" title={`${METHOD_LABELS[payment.provider]} está indisponível de momento`}>
          Escolha outro método abaixo.
        </Alert>
      ) : (
        <Card className="mt-5 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <MethodMark id={payment.provider} />
            <p className="font-semibold">Transfira para este número</p>
          </div>
          <dl className="divide-y divide-slate-100">
            <div className="px-4 py-4">
              <dt className="text-sm text-slate-500">Número {METHOD_LABELS[payment.provider]}</dt>
              <dd className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="block font-mono text-2xl font-bold tracking-wide text-ink">{formatMzPhone(instructions.payeeNumber)}</span>
                  {instructions.accountHolderName && <span className="block text-sm text-slate-600">Titular: {instructions.accountHolderName}</span>}
                </span>
                <CopyButton value={instructions.payeeNumber ?? ""} label="número" />
              </dd>
            </div>
            <div className="px-4 py-4">
              <dt className="text-sm text-slate-500">Valor exato</dt>
              <dd className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-2xl font-bold text-ink">{amount}</span>
                <CopyButton value={String(order.totalMinor / 100)} label="valor" />
              </dd>
            </div>
            <div className="px-4 py-4">
              <dt className="text-sm text-slate-500">Referência do pedido</dt>
              <dd className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-lg font-bold text-ink" data-testid="order-reference">
                  {order.number}
                </span>
                <CopyButton value={order.number} label="referência" />
              </dd>
            </div>
          </dl>
          {instructions.steps.length > 0 && (
            <div className="border-t border-slate-100 bg-brand-50/50 px-4 py-4">
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-brand-900">
                <Info className="size-4" aria-hidden /> Como pagar
              </p>
              <ol className="space-y-1.5 text-[15px] text-slate-700">
                {instructions.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      )}

      <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        Confirme o número e o valor antes de enviar. Nunca partilhe o seu PIN com ninguém.
      </p>

      <section className="mt-8" aria-labelledby="informar">
        <h2 id="informar" className="mb-1 text-xl font-bold">
          Já pagou? Informe o pagamento
        </h2>
        <p className="mb-4 text-sm text-slate-600">Depois de enviar, a nossa equipa verifica a transação e liberta o acesso.</p>
        <Card className="p-4 sm:p-5">
          <PaymentReportForm orderNumber={order.number} defaultName={order.customerName} defaultPhone={payment.payerPhone ? formatMzPhone(payment.payerPhone) : ""} />
        </Card>
      </section>

      {methods.length > 0 && (
        <section className="mt-8" aria-labelledby="outro-metodo">
          <h2 id="outro-metodo" className="mb-3 font-semibold">
            Prefere outro método?
          </h2>
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => (
              <form key={m.id} action={changeMethodAction}>
                <input type="hidden" name="pedido" value={order.number} />
                <input type="hidden" name="method" value={m.id} />
                <SubmitButton variant="outline">Pagar com {m.label}</SubmitButton>
              </form>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <form action={cancelOrderAction} id="cancel-order">
          <input type="hidden" name="pedido" value={order.number} />
        </form>
        <ConfirmButton
          form="cancel-order"
          variant="ghost"
          className="text-red-700"
          title="Cancelar este pedido?"
          description="Só deve cancelar se ainda não fez o pagamento."
          confirmLabel="Cancelar pedido"
        >
          Cancelar pedido
        </ConfirmButton>
      </div>
    </>
  );
}
