import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TemplateThumb } from "@/components/cv/template-thumb";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { updateTemplateAction } from "../actions";
import { CATEGORY_OPTIONS, LAYOUT_OPTIONS } from "../options";
import { TemplateForm } from "../template-form";

export const metadata: Metadata = { title: "Editar modelo" };

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("templates.manage");
  const { id } = await params;
  const t = await db.cVTemplate.findUnique({ where: { id } });
  if (!t) notFound();
  return (
    <>
      <Link href="/admin/modelos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Modelos
      </Link>
      <PageHeader title={t.name} />
      <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
        <TemplateForm
          action={updateTemplateAction.bind(null, t.id)}
          categories={CATEGORY_OPTIONS}
          layouts={LAYOUT_OPTIONS}
          submitLabel="Guardar"
          defaults={{ name: t.name, slug: t.slug, description: t.description, category: t.category, layout: t.layout, accentColor: t.accentColor, sortOrder: t.sortOrder, isActive: t.isActive, isPremium: t.isPremium }}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Pré-visualização (dados de exemplo)</p>
          <TemplateThumb layout={t.layout} accentColor={t.accentColor} width={260} />
        </div>
      </div>
    </>
  );
}
