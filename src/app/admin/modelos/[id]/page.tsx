import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Trash2 } from "lucide-react";
import { TemplateThumb } from "@/components/cv/template-thumb";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { resolveDesign } from "@/cv/design";
import type { CvLayoutId } from "@/cv/types";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatMoney, fromMinor } from "@/lib/money";
import { getPaymentSettings } from "@/server/payments/settings";
import { duplicateTemplateAction, removeTemplatePreviewAction, toggleTemplateAction, updateTemplateAction, uploadTemplatePreviewAction } from "../actions";
import { categoryOptions } from "../options";
import { TemplateForm } from "../template-form";
import { PreviewImageForm } from "./preview-image-form";

export const metadata: Metadata = { title: "Editar modelo" };

export default async function EditTemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string; duplicado?: string }> }) {
  await requirePermission("templates.manage");
  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const [t, settings] = await Promise.all([db.cVTemplate.findUnique({ where: { id }, include: { _count: { select: { cvs: true } } } }), getPaymentSettings()]);
  if (!t) notFound();
  const design = resolveDesign({ layout: t.layout as CvLayoutId, design: t.design, accentColor: t.accentColor });
  const price = t.priceMinor === null ? "" : String(fromMinor(t.priceMinor)).replace(".", ",");

  return (
    <>
      <Link href="/admin/modelos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Modelos
      </Link>
      <PageHeader
        title={t.name}
        description={`${t.isActive ? "Ativo" : "Inativo"} · usado em ${t._count.cvs} CV(s) · preço ${formatMoney(t.priceMinor ?? settings.defaultPriceMinor, settings.currency)}${t.priceMinor === null ? " (padrão)" : ""}`}
        actions={
          <>
            {t.isActive && (
              <Link href={`/cv-modelos/${t.slug}`} target="_blank" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                <ExternalLink className="size-4" aria-hidden /> Ver na galeria
              </Link>
            )}
            <form action={duplicateTemplateAction}>
              <input type="hidden" name="templateId" value={t.id} />
              <SubmitButton variant="outline" size="sm" pendingLabel="A duplicar…" icon={<Copy className="size-4" aria-hidden />}>
                Duplicar
              </SubmitButton>
            </form>
            <form action={toggleTemplateAction}>
              <input type="hidden" name="templateId" value={t.id} />
              <SubmitButton variant={t.isActive ? "ghost" : "success"} size="sm">
                {t.isActive ? "Desativar" : "Ativar"}
              </SubmitButton>
            </form>
          </>
        }
      />
      {flags.criado && (
        <Alert tone="success" className="mb-4">
          Modelo criado. Reveja o design e ative-o quando estiver pronto.
        </Alert>
      )}
      {flags.duplicado && (
        <Alert tone="success" className="mb-4">
          Cópia criada (inativa). Altere o nome, o slug e o design antes de a ativar.
        </Alert>
      )}

      <TemplateForm
        action={updateTemplateAction.bind(null, t.id)}
        categories={categoryOptions(t.category)}
        submitLabel="Guardar alterações"
        defaultPriceLabel={formatMoney(settings.defaultPriceMinor, settings.currency)}
        defaults={{
          name: t.name,
          slug: t.slug,
          description: t.description,
          category: t.category,
          style: t.style,
          accentColor: t.accentColor,
          sortOrder: t.sortOrder,
          isActive: t.isActive,
          isPremium: t.isPremium,
          price,
          design,
        }}
      />

      <Card className="mt-6 grid gap-5 p-5 sm:grid-cols-[180px_1fr]">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Imagem na galeria</p>
          <TemplateThumb design={design} width={180} imageUrl={t.previewImageUrl} label={`Pré-visualização do modelo ${t.name}`} />
        </div>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {t.previewImageKey
              ? "Está a ser usada uma imagem carregada manualmente."
              : t.previewImageUrl
                ? "Está a ser usada a imagem gerada automaticamente (npm run templates:previews)."
                : "Sem imagem: a galeria mostra o modelo desenhado ao vivo (mais pesado em dados móveis)."}
          </p>
          <PreviewImageForm action={uploadTemplatePreviewAction.bind(null, t.id)} />
          {t.previewImageKey && (
            <form action={removeTemplatePreviewAction}>
              <input type="hidden" name="templateId" value={t.id} />
              <SubmitButton variant="ghost" size="sm" className="text-red-700" icon={<Trash2 className="size-4" aria-hidden />}>
                Remover imagem carregada
              </SubmitButton>
            </form>
          )}
        </div>
      </Card>
    </>
  );
}
