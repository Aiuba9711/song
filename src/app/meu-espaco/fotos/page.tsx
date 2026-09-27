import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Download, Pencil, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { FORMAT_LABELS, photoKindLabel } from "@/photo/types";
import { getPhotoPricing, listPhotos } from "@/server/photos";
import { DeletePhotoButton } from "./delete-button";

export const metadata: Metadata = { title: "Minhas fotos profissionais", robots: { index: false } };

export default async function PhotosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [user, params] = await Promise.all([requireUser("/meu-espaco/fotos"), searchParams]);
  const [photos, pricing] = await Promise.all([listPhotos(user.id), getPhotoPricing()]);

  return (
    <>
      <PageHeader
        title="Minhas Fotos Profissionais"
        description="Prepare a sua fotografia para uma candidatura profissional e use-a nos seus CVs."
        actions={
          <ButtonLink href="/meu-espaco/fotos/nova" size="lg" icon={<Camera className="size-5" aria-hidden />}>
            Nova foto profissional
          </ButtonLink>
        }
      />
      {params.eliminada && <Alert tone="success">Fotografia eliminada.</Alert>}

      {photos.length === 0 ? (
        <EmptyState
          icon={<Camera className="size-7" aria-hidden />}
          title="Ainda não tem fotos profissionais"
          description="Carregue uma fotografia: ajuste o enquadramento, escolha o fundo e, se quiser, uma roupa formal digital."
          action={
            <ButtonLink href="/meu-espaco/fotos/nova" size="lg" icon={<Camera className="size-5" aria-hidden />}>
              Carregar fotografia
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-label="As suas fotografias">
          {photos.map((p) => {
            const unlocked = !pricing.paid || !!p.purchasedAt;
            const kind = p.resultKey ? photoKindLabel(p) : "Foto original (por editar)";
            return (
              <li key={p.id}>
                <Card className="flex h-full flex-col overflow-hidden">
                  <Link href={`/meu-espaco/fotos/${p.id}`} className="block bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura privada servida com autorização */}
                    <img src={`/api/fotos/${p.id}?v=miniatura&t=${p.updatedAt.getTime()}`} alt={`Fotografia de ${formatDate(p.createdAt)}`} className="aspect-[4/5] w-full object-contain" loading="lazy" />
                  </Link>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="font-semibold">{kind}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(p.createdAt)} · {FORMAT_LABELS[p.format]}
                    </p>
                    {p.styleLabel && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{p.styleLabel}</p>}
                    {p._count.cvs > 0 && <p className="mt-1 text-xs font-medium text-go-700">Usada em {p._count.cvs === 1 ? "1 CV" : `${p._count.cvs} CVs`}</p>}
                    <div className="mt-3 grid flex-1 content-end gap-2">
                      <ButtonLink href={`/meu-espaco/fotos/${p.id}/editar?passo=usar`} size="sm">
                        Usar no CV
                      </ButtonLink>
                      <div className="grid grid-cols-2 gap-2">
                        <ButtonLink href={`/meu-espaco/fotos/${p.id}/editar`} variant="outline" size="sm" icon={<Pencil className="size-4" aria-hidden />}>
                          Editar
                        </ButtonLink>
                        {p.resultKey && unlocked ? (
                          <a href={`/api/fotos/${p.id}/download?formato=jpg&tipo=final`} download className={buttonClass("outline", "sm")}>
                            <Download className="size-4" aria-hidden /> Baixar
                          </a>
                        ) : (
                          <ButtonLink href={`/meu-espaco/fotos/${p.id}`} variant="outline" size="sm" icon={<Download className="size-4" aria-hidden />}>
                            Baixar
                          </ButtonLink>
                        )}
                      </div>
                      <DeletePhotoButton photoId={p.id} usedInCvs={p._count.cvs} />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 flex gap-2 text-sm text-slate-600">
        <ShieldCheck className="size-5 shrink-0 text-go-700" aria-hidden />
        As fotografias são privadas: só o utilizador as vê, não são publicadas nem usadas para treinar modelos de IA. Pode eliminá-las a qualquer momento.
      </p>
      {pricing.paid && (
        <p className="mt-2 text-xs text-slate-500">
          Editar é gratuito. Download e utilização nos CVs: {formatMoney(pricing.priceMinor, pricing.currency)} por fotografia
          {pricing.bundleMinor ? ` · Pacote CV + Foto: ${formatMoney(pricing.bundleMinor, pricing.currency)}` : ""}.
        </p>
      )}
    </>
  );
}
