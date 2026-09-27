import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Info, Pencil, ShoppingCart } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { FORMAT_LABELS, PASSPORT_NOTICE, photoKindLabel } from "@/photo/types";
import { canUsePhoto, cvsForPhoto, getPhoto, getPhotoPricing } from "@/server/photos";
import { DeletePhotoButton } from "../delete-button";

export const metadata: Metadata = { title: "Foto profissional", robots: { index: false } };

const DOWNLOADS = [
  ["jpg", "final", "JPG", "Fotografia final"],
  ["png", "final", "PNG", "Fotografia final (sem perdas)"],
  ["jpg", "passe", "Tipo passe", "Recorte 7 × 9, centrado no rosto"],
  ["jpg", "cv", "Para CV", "Recorte vertical 4 × 5"],
] as const;

export default async function PhotoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-espaco/fotos/${id}`);
  const photo = await getPhoto(user.id, id);
  if (!photo) notFound();
  const [pricing, unlocked, cvs] = await Promise.all([getPhotoPricing(), canUsePhoto(user.id, id), cvsForPhoto(user.id)]);
  const usedIn = cvs.filter((c) => c.professionalPhotoId === id);
  const price = formatMoney(pricing.priceMinor, pricing.currency);

  return (
    <>
      <Link href="/meu-espaco/fotos" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
        <ArrowLeft className="size-4" aria-hidden /> Minhas fotos
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Card className="overflow-hidden bg-slate-100 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- fotografia privada servida com autorização */}
          <img
            src={`/api/fotos/${photo.id}?v=${photo.resultKey ? "resultado" : "original"}&t=${photo.updatedAt.getTime()}`}
            alt="A sua fotografia"
            className="mx-auto max-h-[60vh] w-auto rounded-lg object-contain"
          />
        </Card>
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{photo.resultKey ? photoKindLabel(photo) : "Foto original"}</h1>
            <p className="text-sm text-slate-600">
              {FORMAT_LABELS[photo.format]} · criada {formatDate(photo.createdAt)}
              {photo.styleLabel ? ` · ${photo.styleLabel}` : ""}
            </p>
            {usedIn.length > 0 && <p className="mt-1 text-sm font-medium text-go-700">Usada em: {usedIn.map((c) => c.title).join(", ")}</p>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink href={`/meu-espaco/fotos/${photo.id}/editar`} size="lg" variant="outline" icon={<Pencil className="size-5" aria-hidden />}>
              Editar
            </ButtonLink>
            <ButtonLink href={`/meu-espaco/fotos/${photo.id}/editar?passo=usar`} size="lg" icon={<FileText className="size-5" aria-hidden />}>
              Usar no meu CV
            </ButtonLink>
          </div>

          {!photo.resultKey ? (
            <Alert tone="info">Abra o editor e guarde a fotografia para a poder baixar.</Alert>
          ) : unlocked ? (
            <Card className="p-4">
              <h2 className="font-semibold">Baixar</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {DOWNLOADS.map(([fmt, tipo, label, hint]) => (
                  <li key={label}>
                    <a href={`/api/fotos/${photo.id}/download?formato=${fmt}&tipo=${tipo}`} download className={buttonClass("outline", "lg", "w-full justify-start")}>
                      <Download className="size-5" aria-hidden />
                      <span className="text-left">
                        <span className="block">{label}</span>
                        <span className="block text-xs font-normal text-slate-500">{hint}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex gap-2 text-xs text-slate-600">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {PASSPORT_NOTICE}
              </p>
            </Card>
          ) : (
            <Card className="space-y-3 p-4">
              <h2 className="font-semibold">Foto profissional — {price}</h2>
              {pricing.promoActive && (
                <p className="text-sm text-go-700">
                  Promoção: antes {formatMoney(pricing.regularMinor, pricing.currency)}
                  {pricing.promoEndsAt ? ` · até ${formatDate(pricing.promoEndsAt)}` : ""}
                </p>
              )}
              <p className="text-sm text-slate-600">Editar e pré-visualizar é gratuito. A compra liberta o download (JPG, PNG, tipo passe, para CV) sem marca de água e o uso nos seus CVs.</p>
              <ButtonLink href={`/checkout?foto=${photo.id}`} prefetch={false} variant="success" size="lg" className="w-full" icon={<ShoppingCart className="size-5" aria-hidden />}>
                Comprar foto — {price}
              </ButtonLink>
              {pricing.bundleMinor && cvs.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-sm font-medium">Pacote CV + Foto — {formatMoney(pricing.bundleMinor, pricing.currency)}</p>
                  <ul className="mt-2 space-y-2">
                    {cvs.slice(0, 5).map((cv) => (
                      <li key={cv.id}>
                        <ButtonLink href={`/checkout?pacote=${cv.id}.${photo.id}`} prefetch={false} variant="outline" size="md" className="w-full justify-between">
                          <span className="truncate">{cv.title}</span> <span aria-hidden>→</span>
                        </ButtonLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <div className="border-t border-slate-200 pt-3">
            <DeletePhotoButton photoId={photo.id} usedInCvs={usedIn.length} size="md" />
          </div>
        </div>
      </div>
    </>
  );
}
