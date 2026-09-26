import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { createProductAction } from "../actions";
import { EMPTY_PRODUCT, ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requirePermission("products.manage");
  return (
    <>
      <PageHeader title="Novo produto" description="Crie como rascunho, carregue os ficheiros e depois ative." />
      <ProductForm action={createProductAction} defaults={EMPTY_PRODUCT} submitLabel="Criar produto" />
    </>
  );
}
