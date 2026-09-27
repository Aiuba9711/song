import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { PhotoEditor } from "@/photo/editor";
import { activeBackgrounds, activeOutfits, canUsePhoto, cvsForPhoto, getPhoto, getPhotoPricing, settingsOf } from "@/server/photos";

export const metadata: Metadata = { title: "Editar foto profissional", robots: { index: false } };

export default async function EditPhotoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ passo?: string }> }) {
  const [{ id }, { passo }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/meu-espaco/fotos/${id}/editar`);
  const photo = await getPhoto(user.id, id);
  if (!photo) notFound();
  const [backgrounds, outfits, cvs, pricing, unlocked] = await Promise.all([activeBackgrounds(), activeOutfits(), cvsForPhoto(user.id), getPhotoPricing(), canUsePhoto(user.id, id)]);
  const settings = settingsOf(photo);
  // Um fundo ou roupa desativados pelo administrador deixam de estar disponíveis.
  if (settings.backgroundId && !backgrounds.some((b) => b.id === settings.backgroundId)) settings.backgroundId = null;
  if (settings.outfitId && !outfits.some((o) => o.id === settings.outfitId)) settings.outfitId = null;
  return (
    <PhotoEditor
      photoId={photo.id}
      initialSettings={settings}
      backgrounds={backgrounds}
      outfits={outfits}
      cvs={cvs.map(({ id: cvId, title, templateName, supportsPhoto }) => ({ id: cvId, title, templateName, supportsPhoto }))}
      hasResult={!!photo.resultKey}
      unlocked={unlocked}
      pricing={{
        paid: pricing.paid,
        priceLabel: formatMoney(pricing.priceMinor, pricing.currency),
        bundleLabel: pricing.bundleMinor ? formatMoney(pricing.bundleMinor, pricing.currency) : null,
      }}
      initialStep={passo ?? (photo.resultKey ? "ver" : "ajustar")}
    />
  );
}
