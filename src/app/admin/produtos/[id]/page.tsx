import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { faqToText } from "@/lib/admin-schemas";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatBytes } from "@/lib/utils";
import { parseFaq } from "@/server/catalog";
import { deleteProductAction, deleteProductFileAction, updateProductAction, uploadProductFileAction } from "../actions";
import { FileUploadForm } from "../file-upload";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Editar produto" };

const minorToInput = (v: number | null) => (v === null ? "" : (v / 100).toString().replace(".", ","));

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  await requirePermission("products.manage");
  const [{ id }, { criado }] = await Promise.all([params, searchParams]);
  const product = await db.product.findUnique({
    where: { id },
    include: { files: { orderBy: { sortOrder: "asc" } }, _count: { select: { orderItems: true } } },
  });
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Produtos
      </Link>
      <PageHeader
        title={product.name}
        actions={
          product.status === "ACTIVE" && (
            <Link href={`/kits/${product.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              Ver página <ExternalLink className="size-4" aria-hidden />
            </Link>
          )
        }
      />
      {criado && (
        <Alert tone="success" className="mb-4">
          Produto criado. Carregue os ficheiros e ative-o quando estiver pronto.
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <ProductForm
          action={updateProductAction.bind(null, product.id)}
          submitLabel="Guardar alterações"
          defaults={{
            name: product.name,
            slug: product.slug,
            tier: product.tier ?? "",
            shortDescription: product.shortDescription,
            description: product.description,
            type: product.type,
            status: product.status,
            price: minorToInput(product.priceMinor),
            compareAtPrice: minorToInput(product.compareAtPriceMinor),
            currency: product.currency,
            features: product.features.join("\n"),
            faq: faqToText(parseFaq(product.faq)),
            isFeatured: product.isFeatured,
            sortOrder: product.sortOrder,
          }}
        />
        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold">Ficheiros entregues</h2>
            <p className="mt-1 text-sm text-slate-600">Ficam disponíveis em «Meus kits» depois da confirmação do pedido. Guardados de forma privada.</p>
            {product.files.length === 0 ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ainda sem ficheiros.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {product.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 p-3 text-sm">
                    <FileText className="size-4 shrink-0 text-brand-700" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.name}</span>
                      <span className="text-xs text-slate-500">
                        {f.fileName} · {formatBytes(f.sizeBytes)}
                      </span>
                    </span>
                    <form action={deleteProductFileAction} id={`del-file-${f.id}`}>
                      <input type="hidden" name="fileId" value={f.id} />
                    </form>
                    <ConfirmButton
                      form={`del-file-${f.id}`}
                      variant="ghost"
                      size="sm"
                      className="text-red-700"
                      title="Remover ficheiro?"
                      description="Os clientes deixam de o poder descarregar."
                      confirmLabel="Remover"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only">Remover {f.name}</span>
                    </ConfirmButton>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 border-t border-slate-100 pt-5">
              <FileUploadForm action={uploadProductFileAction.bind(null, product.id)} />
            </div>
          </Card>
          <Card className="border-red-200 p-5">
            <h2 className="font-semibold text-red-700">{product._count.orderItems > 0 ? "Arquivar produto" : "Eliminar produto"}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {product._count.orderItems > 0
                ? "Este produto tem pedidos, por isso será arquivado (deixa de estar à venda, mas os clientes mantêm o acesso)."
                : "Remove o produto e os seus ficheiros."}
            </p>
            <form action={deleteProductAction} id="delete-product">
              <input type="hidden" name="productId" value={product.id} />
            </form>
            <ConfirmButton
              form="delete-product"
              className="mt-4"
              title={product._count.orderItems > 0 ? "Arquivar produto?" : "Eliminar produto?"}
              description="Esta ação é registada no histórico de auditoria."
              confirmLabel={product._count.orderItems > 0 ? "Arquivar" : "Eliminar"}
            >
              {product._count.orderItems > 0 ? "Arquivar" : "Eliminar"}
            </ConfirmButton>
          </Card>
        </aside>
      </div>
    </>
  );
}
