import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Table, Td, Th } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Produtos" };

const STATUS = { DRAFT: { label: "Rascunho", tone: "neutral" }, ACTIVE: { label: "Ativo", tone: "success" }, ARCHIVED: { label: "Arquivado", tone: "warning" } } as const;

export default async function AdminProductsPage() {
  await requirePermission("products.manage");
  const products = await db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { files: true, orderItems: true } } },
  });
  return (
    <>
      <PageHeader
        title="Produtos"
        description="Preços, conteúdos e ficheiros dos kits. Os preços não estão no código — altere-os aqui."
        actions={
          <ButtonLink href="/admin/produtos/novo" icon={<Plus className="size-4" aria-hidden />}>
            Novo produto
          </ButtonLink>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Produto</Th>
            <Th>Preço</Th>
            <Th>Estado</Th>
            <Th>Ficheiros</Th>
            <Th>Vendas</Th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/admin/produtos/${p.id}`} className="font-semibold text-brand-700 hover:underline">
                  {p.name}
                </Link>
                <span className="block text-xs text-slate-500">/kits/{p.slug}</span>
              </Td>
              <Td className="font-semibold tabular-nums">{p.priceMinor === 0 ? "Grátis" : formatMoney(p.priceMinor, p.currency)}</Td>
              <Td>
                <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                {p.isFeatured && <Badge tone="brand" className="ml-1">Destaque</Badge>}
              </Td>
              <Td className={p._count.files === 0 && p.status === "ACTIVE" ? "font-semibold text-amber-700" : ""}>{p._count.files}</Td>
              <Td className="tabular-nums">{p._count.orderItems}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-slate-500">Em âmbar: produtos ativos sem ficheiros para entregar.</p>
    </>
  );
}
