import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, Download, Lock, Pencil } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { CvPreview } from "@/cv/preview";
import { ScaledSheet } from "@/cv/preview/scaled";
import { LAYOUTS } from "@/cv/layouts";
import { requireUser } from "@/lib/auth/guards";
import { t } from "@/lib/i18n/messages";
import { listActiveTemplates } from "@/server/catalog";
import { formatMoney } from "@/lib/money";
import { getCvDownloadAccess } from "@/server/checkout";
import { getUserCv, themeOf, toCvContent } from "@/server/cv";
import { duplicateCvAction, setTemplateAction } from "../actions";

export const metadata: Metadata = { title: "Pré-visualizar CV" };

export default async function CvPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-espaco/cvs/${id}`);
  const [cv, templates, access] = await Promise.all([getUserCv(user.id, id), listActiveTemplates(), getCvDownloadAccess(user.id)]);
  if (!cv) notFound();
  const content = toCvContent(cv);
  const theme = themeOf(cv);
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
          Modelo {cv.template?.name ?? LAYOUTS[theme.layout].name} · {LAYOUTS[theme.layout].name}
        </p>
        {incomplete && (
          <Alert tone="warning" className="mt-4">
            O CV ainda está incompleto. <Link href={`/meu-espaco/cvs/${cv.id}/editar`} className="font-semibold underline">Continuar a preencher</Link>
          </Alert>
        )}
        <div className="mt-5 rounded-2xl bg-slate-200/60 p-3 sm:p-6">
          <ScaledSheet label={`Pré-visualização do CV ${cv.title}`}>
            <CvPreview cv={content} theme={theme} photoUrl={photoUrl} />
          </ScaledSheet>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Descarregar</h2>
          {access.paywall && !access.unlocked.has(cv.id) ? (
            <>
              <p className="text-sm text-slate-600">Pode editar e pré-visualizar à vontade. O download em PDF e Word fica disponível depois do pagamento confirmado.</p>
              <ButtonLink href={`/checkout?cv=${cv.id}`} prefetch={false} variant="success" size="lg" className="w-full" icon={<Lock className="size-5" aria-hidden />}>
                Desbloquear download · {formatMoney(access.priceMinor, access.currency)}
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
          <h2 className="font-semibold">Trocar de modelo</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <form action={setTemplateAction}>
                  <input type="hidden" name="cvId" value={cv.id} />
                  <input type="hidden" name="templateId" value={tpl.id} />
                  <button
                    type="submit"
                    aria-pressed={tpl.id === cv.templateId}
                    className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-2 text-left text-sm hover:bg-slate-50 aria-pressed:border-brand-600 aria-pressed:bg-brand-50 aria-pressed:font-semibold"
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ background: tpl.accentColor }} aria-hidden />
                    <span className="truncate">{tpl.name}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
