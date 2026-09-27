import type { Metadata } from "next";
import { ArrowRight, Info } from "lucide-react";
import { ChooseTemplateButton } from "@/components/templates/choose-button";
import { AtsBadge, TemplateGallery, TemplatePreview } from "@/components/templates/gallery";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/guards";
import { getGalleryTemplates, getUserTemplateState } from "@/server/gallery";

export const metadata: Metadata = { title: "Escolher modelo de CV" };

/**
 * Criar CV = escolher UM modelo. O modelo escolhido fica como modelo atual da conta
 * e abre o editor. Com o CV pago, existe no máximo um CV em preparação: escolher outro
 * modelo troca o modelo desse CV (os dados mantêm-se).
 */
export default async function NewCvPage({ searchParams }: { searchParams: Promise<{ modelo?: string; area?: string }> }) {
  const [{ modelo, area }, user] = await Promise.all([searchParams, requireUser("/meu-espaco/cvs/novo")]);
  const [templates, state] = await Promise.all([getGalleryTemplates(), getUserTemplateState(user.id)]);
  const picked = modelo ? templates.find((t) => t.slug === modelo) : undefined;

  return (
    <>
      <PageHeader
        title="Escolha o modelo do seu CV"
        description="Veja os modelos, escolha um e preencha o CV com pré-visualização em tempo real. Pode trocar de modelo até concluir a compra."
      />

      {picked && (
        <Card className="mb-6 grid gap-5 border-brand-200 p-5 sm:grid-cols-[160px_1fr] sm:items-center">
          <div className="mx-auto w-40 overflow-hidden rounded-lg bg-slate-100 p-1.5 ring-1 ring-slate-200 sm:mx-0">
            <TemplatePreview t={picked} withPhoto width={160} />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-700">Modelo escolhido</p>
            <h2 className="text-xl font-bold">{picked.name}</h2>
            <p className="text-sm text-slate-600">
              {picked.categoryLabel} · {picked.style}
            </p>
            {picked.isAtsFriendly && <AtsBadge className="mt-2" />}
            <p className="mt-2 text-sm text-slate-600">{picked.description}</p>
            <div className="mt-4 max-w-xs">
              <ChooseTemplateButton slug={picked.slug} label={state.draft ? "Usar no meu CV em preparação" : "Começar com este modelo"} />
            </div>
          </div>
        </Card>
      )}

      {state.draft && (
        <div role="note" className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center">
          <Info className="size-5 shrink-0 text-amber-700" aria-hidden />
          <p className="flex-1">
            Tem um CV em preparação: <strong>{state.draft.title}</strong>
            {state.draft.template ? <> (modelo {state.draft.template.name})</> : null}. Ao escolher outro modelo, o modelo desse CV é trocado — os dados que já preencheu mantêm-se.
          </p>
          <ButtonLink href={`/meu-espaco/cvs/${state.draft.id}/editar`} variant="outline" size="sm" icon={<ArrowRight className="size-4" aria-hidden />}>
            Continuar a editar
          </ButtonLink>
        </div>
      )}

      <TemplateGallery templates={templates} initialCategory={area} currentSlug={state.draft?.template?.slug ?? state.currentSlug} />
    </>
  );
}
