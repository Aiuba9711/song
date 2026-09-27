import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { getCustomerOrder } from "@/server/checkout";

export const metadata: Metadata = { title: "Pagamento confirmado" };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido } = await searchParams;
  const user = await requireUser(`/checkout/success?pedido=${pedido ?? ""}`);
  const order = pedido ? await getCustomerOrder(user.id, pedido) : null;
  if (!order) redirect("/meu-espaco/compras");
  // Só mostramos sucesso para pedidos realmente pagos (confirmados pelo administrador).
  if (order.status !== "PAID") redirect(`/checkout/pending?pedido=${encodeURIComponent(order.number)}`);

  const cvItem = order.items.find((i) => i.kind === "CV_UNLOCK" && i.cvId);
  const letterItem = order.items.find((i) => i.kind === "LETTER_UNLOCK" && i.letterId);
  const photoItem = order.items.find((i) => (i.kind === "PHOTO_UNLOCK" || i.kind === "CV_PHOTO_BUNDLE") && i.photoId);
  return (
    <div className="text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-go-50 text-go-700">
        <CheckCircle2 className="size-9" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Pagamento confirmado!</h1>
      <p className="mt-2 text-lg text-slate-600">Obrigado pela compra.</p>
      <Card className="mx-auto mt-6 max-w-md p-4 text-left">
        <p className="text-sm text-slate-500">Pedido {order.number}</p>
        <ul className="mt-2 space-y-1">
          {order.items.map((i) => (
            <li key={i.id} className="font-medium">
              {i.productName}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-semibold">{formatMoney(order.totalMinor, order.currency)}</p>
      </Card>
      {photoItem ? (
        <ButtonLink href={`/meu-espaco/fotos/${photoItem.photoId}`} size="lg" variant="success" className="mt-6 w-full max-w-md" icon={<Download className="size-5" aria-hidden />}>
          Abrir a minha foto profissional
        </ButtonLink>
      ) : letterItem ? (
        <ButtonLink href={`/meu-espaco/cartas/${letterItem.letterId}/editar`} size="lg" variant="success" className="mt-6 w-full max-w-md" icon={<Download className="size-5" aria-hidden />}>
          Descarregar a minha carta
        </ButtonLink>
      ) : cvItem ? (
        <ButtonLink href={`/meu-espaco/cvs/${cvItem.cvId}`} size="lg" variant="success" className="mt-6 w-full max-w-md" icon={<Download className="size-5" aria-hidden />}>
          Descarregar o meu CV
        </ButtonLink>
      ) : (
        <ButtonLink href="/meu-espaco/kits" size="lg" variant="success" className="mt-6 w-full max-w-md" icon={<Download className="size-5" aria-hidden />}>
          Aceder ao meu kit
        </ButtonLink>
      )}
    </div>
  );
}
