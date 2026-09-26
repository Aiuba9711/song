import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CvBuilder, type BuilderTemplate } from "@/cv/builder/cv-builder";
import { requireUser } from "@/lib/auth/guards";
import { CATEGORY_LABELS, listActiveTemplates } from "@/server/catalog";
import { getUserCv, toCvContent } from "@/server/cv";

export const metadata: Metadata = { title: "Editar CV" };

export default async function EditCvPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ passo?: string }> }) {
  const [{ id }, { passo }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/meu-espaco/cvs/${id}/editar`);
  const [cv, templates] = await Promise.all([getUserCv(user.id, id), listActiveTemplates()]);
  if (!cv) notFound();

  const builderTemplates: BuilderTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    layout: t.layout,
    accentColor: t.accentColor,
    categoryLabel: CATEGORY_LABELS[t.category],
  }));
  // Se o modelo atual foi desativado, mantém-no visível para este CV.
  if (cv.template && !builderTemplates.some((t) => t.id === cv.template!.id)) {
    builderTemplates.unshift({ id: cv.template.id, name: cv.template.name, layout: cv.template.layout, accentColor: cv.template.accentColor, categoryLabel: "Indisponível" });
  }

  const step = Number(passo) || cv.currentStep || 1;
  return (
    <CvBuilder
      cvId={cv.id}
      initial={toCvContent(cv)}
      initialStep={step}
      updatedAt={cv.updatedAt.toISOString()}
      templates={builderTemplates}
      initialPhotoUrl={cv.photoKey ? `/api/cv/${cv.id}/photo?v=${cv.updatedAt.getTime()}` : null}
    />
  );
}
