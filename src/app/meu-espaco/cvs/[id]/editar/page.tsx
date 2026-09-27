import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CvBuilder, type BuilderTemplate } from "@/cv/builder/cv-builder";
import { requireUser } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { canDownloadCv, getCvPrice } from "@/server/checkout";
import { designOf, getUserCv, toCvContent } from "@/server/cv";
import { getGalleryTemplates } from "@/server/gallery";

export const metadata: Metadata = { title: "Editar CV" };

export default async function EditCvPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ passo?: string; trocar?: string }> }) {
  const [{ id }, { passo, trocar }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/meu-espaco/cvs/${id}/editar`);
  const [cv, templates] = await Promise.all([getUserCv(user.id, id), getGalleryTemplates()]);
  if (!cv) notFound();
  const [unlocked, price] = await Promise.all([canDownloadCv(user.id, cv.id), getCvPrice(cv.template?.priceMinor)]);

  const builderTemplates: BuilderTemplate[] = [...templates];
  // Se o modelo deste CV foi desativado, mantém-no disponível para este CV.
  if (cv.template && !builderTemplates.some((t) => t.id === cv.template!.id)) {
    builderTemplates.unshift({
      id: cv.template.id,
      slug: cv.template.slug,
      name: cv.template.name,
      category: "INDISPONIVEL",
      categoryLabel: "Indisponível",
      style: cv.template.style,
      description: "",
      isAtsFriendly: cv.template.isAtsFriendly,
      previewImageUrl: null,
      design: designOf(cv),
      priceMinor: price.priceMinor,
      priceLabel: formatMoney(price.priceMinor, price.currency),
    });
  }

  const step = Number(passo) || cv.currentStep || 1;
  return (
    <CvBuilder
      cvId={cv.id}
      initial={toCvContent(cv)}
      initialStep={step}
      updatedAt={cv.updatedAt.toISOString()}
      templates={builderTemplates}
      initialPhotoVersion={cv.photoKey ? cv.updatedAt.getTime() : null}
      openTemplates={trocar === "1" && !cv.purchasedAt}
      purchase={{ unlocked, purchased: !!cv.purchasedAt, priceLabel: formatMoney(price.priceMinor, price.currency) }}
    />
  );
}
