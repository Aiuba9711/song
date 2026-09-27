import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, Download, LayoutTemplate, Pencil, ShoppingCart } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { CvPreview } from "@/cv/preview";
import { ScaledSheet } from "@/cv/preview/scaled";
import { requireUser } from "@/lib/auth/guards";
import { t } from "@/lib/i18n/messages";
import { formatMoney } from "@/lib/money";
import { canDownloadCv, getCvPrice } from "@/server/checkout";
import { designOf, getUserCv, toCvContent } from "@/server/cv";
import { duplicateCvAction } from "../actions";

export const metadata: Metadata = { title: "Pré-visualizar CV" };

export default async function CvPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-espaco/cvs/${id}`);
  const cv = await getUserCv(user.id, id);
  if (!cv) notFound();
  const [unlocked, price] = await Promise.all([canDownloadCv(user.id, cv.id), getCvPrice(cv.template?.priceMinor)]);
  const content = toCvContent(cv);
  const design = designOf(cv);
  const photoUrl = cv.photoKey ? `/api/cv/${cv.id}/photo?v=${cv.updatedAt.getTime()}` : null;
  const incomplete = !content.personal.fullName || (!content.experiences.length && !content.educations.length);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <Link href="/meu-espaco/cvs" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-brand-700">
          <ArrowLeft className="size-4" aria-hidden /> Meus CVs
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{cv.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Modelo {cv.template?.name ?? "—"}
          {cv.purchasedAt ? " · Comprado" : ""}
        </p>
        {incomplete && (
          <Alert tone="warning" className="mt-4">
            O CV ainda está incompleto. <Link href={`/meu-espaco/cvs/${cv.id}/editar`} className="font-semibold underline">Continuar a preencher</Link>
          </Alert>
        )}
        <div className="mt-5 rounded-2xl bg-slate-200/60 p-3 sm:p-6">
          <ScaledSheet label={`Pré-visualização do CV ${cv.title}`}>
            <CvPreview cv={content} design={design} photoUrl={photoUrl} watermark={!unlocked} />
          </ScaledSheet>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Descarregar</h2>
          {!unlocked ? (
            <>
              <p className="text-sm text-slate-600">
                Pode editar e pré-visualizar à vontade. O PDF sem marca d&apos;água e o Word editável ficam disponíveis depois do pagamento confirmado.
              </p>
              <ButtonLink href={`/checkout?cv=${cv.id}`} prefetch={false} variant="success" size="lg" className="w-full" icon={<ShoppingCart className="size-5" aria-hidden />}>
                Comprar CV — {formatMoney(price.priceMinor, price.currency)}
              </ButtonLink>
            </>
          ) : (
            <>
              <a href={`/api/cv/${cv.id}/pdf`} className={buttonClass("primary", "lg", "w-full")} download>
                <Download className="size-5" aria-hidden /> Baixar PDF
              </a>
              <a href={`/api/cv/${cv.id}/docx`} className={buttonClass("outline", "lg", "w-full")} download>
                <Download className="size-5" aria-hidden /> Baixar Word
              </a>
            </>
          )}
          <p className="text-xs text-slate-500">PDF para enviar por email e portais de emprego. Word para editar no computador.</p>
          <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">{t("disclaimer.review")}</p>
        </Card>
        <Card className="space-y-2 p-5">
          <ButtonLink href={`/meu-espaco/cvs/${cv.id}/editar`} variant="secondary" className="w-full" icon={<Pencil className="size-4" aria-hidden />}>
            Editar CV
          </ButtonLink>
          <form action={duplicateCvAction}>
            <input type="hidden" name="cvId" value={cv.id} />
            <SubmitButton variant="ghost" className="w-full" pendingLabel="A duplicar…" icon={<Copy className="size-4" aria-hidden />}>
              Duplicar CV
            </SubmitButton>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Modelo</h2>
          <p className="mt-1 text-sm text-slate-600">
            {cv.template?.name ?? "—"}
            {cv.template?.isAtsFriendly ? " · Compatível com ATS" : ""}
          </p>
          {cv.purchasedAt ? (
            <p className="mt-2 text-xs text-slate-500">Este CV foi comprado com este modelo. Para outro modelo, crie um novo CV.</p>
          ) : (
            <ButtonLink href={`/meu-espaco/cvs/${cv.id}/editar?trocar=1`} variant="outline" size="sm" className="mt-3 w-full" icon={<LayoutTemplate className="size-4" aria-hidden />}>
              Trocar modelo
            </ButtonLink>
          )}
        </Card>
      </aside>
    </div>
  );
}
