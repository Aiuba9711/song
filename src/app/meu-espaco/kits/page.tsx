import type { Metadata } from "next";
import { Download, FileText, Package } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatBytes } from "@/lib/utils";
import { listUserProducts } from "@/server/orders";

export const metadata: Metadata = { title: "Meus kits" };

export default async function MyKitsPage({ searchParams }: { searchParams: Promise<{ obtido?: string; erro?: string }> }) {
  const [user, { obtido, erro }] = await Promise.all([requireUser("/meu-espaco/kits"), searchParams]);
  const products = await listUserProducts(user.id);

  return (
    <>
      <PageHeader title="Meus kits" description="Os materiais que obteve ficam aqui para descarregar sempre que precisar." />
      {obtido && (
        <Alert tone="success" title="Pronto! O seu kit está disponível." className="mb-5">
          Obrigado. Descarregue os ficheiros abaixo.
        </Alert>
      )}
      {erro === "limite" && (
        <Alert tone="error" className="mb-5">
          Demasiados pedidos seguidos. Tente novamente mais tarde.
        </Alert>
      )}
      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="size-7" aria-hidden />}
          title="Ainda não tem kits"
          description="Comece pelo modelo gratuito de CV e carta de candidatura."
          action={<ButtonLink href="/kits">Ver kits</ButtonLink>}
        />
      ) : (
        <ul className="space-y-4">
          {products.map(({ product, order }) => (
            <li key={product!.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{product!.name}</h2>
                    <p className="text-sm text-slate-600">{product!.shortDescription}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pedido {order.number}
                    {order.paidAt && ` · ${formatDate(order.paidAt)}`}
                  </p>
                </div>
                {product!.files.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Os ficheiros deste kit estão a ser preparados. Receberá acesso aqui assim que estiverem disponíveis.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {product!.files.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center gap-3 p-3">
                        <FileText className="size-5 shrink-0 text-brand-700" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{f.name}</span>
                          <span className="text-xs text-slate-500">{formatBytes(f.sizeBytes)}</span>
                        </span>
                        <a href={`/api/files/${f.id}`} className={buttonClass("secondary", "sm")} download>
                          <Download className="size-4" aria-hidden /> Descarregar
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
