import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/whatsapp-button";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { getCustomerOrder } from "@/server/checkout";
import { getSiteSettings, whatsappLink } from "@/server/settings";

export const metadata: Metadata = { title: "Pagamento não confirmado" };

export default async function FailedPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const user = await requireUser(`/checkout/failed?pedido=${pedido ?? ""}`);
  const order = pedido ? await getCustomerOrder(user.id, pedido) : null;
  if (!order) redirect("/meu-espaco/compras");
  const q = `?pedido=${encodeURIComponent(order.number)}`;
  if (order.status === "PAID") redirect(`/checkout/success${q}`);
  if (order.status === "PENDING_VERIFICATION") redirect(`/checkout/pending${q}`);
  if (order.status === "AWAITING_PAYMENT") redirect(`/checkout${q}`);

  const site = await getSiteSettings();
  const cancelled = order.status === "CANCELLED";
  const reason = order.payments[0]?.reviewNote;
  const item = order.items[0];
  const retryHref =
    item?.kind === "CV_UNLOCK" && item.cvId
      ? `/checkout?cv=${item.cvId}`
      : item?.kind === "PHOTO_UNLOCK" && item.photoId
        ? `/checkout?foto=${item.photoId}`
        : item?.kind === "CV_PHOTO_BUNDLE" && item.cvId && item.photoId
          ? `/checkout?pacote=${item.cvId}.${item.photoId}`
          : item?.kind === "LETTER_UNLOCK" && item.letterId
        ? `/checkout?carta=${item.letterId}`
        : item?.product?.slug
          ? `/checkout?produto=${item.product.slug}`
          : "/kits";

  return (
    <div className="text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-700">
        <XCircle className="size-9" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{cancelled ? "Pedido cancelado" : "Não foi possível confirmar o pagamento"}</h1>
      <p className="mx-auto mt-2 max-w-md text-slate-600">
        {cancelled ? "Este pedido foi cancelado. Nenhum acesso foi libertado." : "A nossa equipa não conseguiu confirmar a transação indicada. Nenhum acesso foi libertado."}
      </p>
      {reason && !cancelled && (
        <Card className="mx-auto mt-5 max-w-md p-4 text-left">
          <p className="text-sm font-semibold text-slate-700">Motivo</p>
          <p className="mt-1 text-slate-700">{reason}</p>
        </Card>
      )}
      <p className="mt-4 text-sm text-slate-500">Pedido {order.number}</p>
      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
        <ButtonLink href={retryHref} size="lg">
          Fazer novo pedido
        </ButtonLink>
        {site.whatsappNumber && (
          <a href={whatsappLink(site.whatsappNumber, `Olá! Tenho uma dúvida sobre o pedido ${order.number}.`)} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg")}>
            <WhatsAppIcon className="size-5 text-[#128c4a]" /> Falar connosco no WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
