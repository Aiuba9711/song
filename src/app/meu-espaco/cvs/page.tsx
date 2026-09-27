import type { Metadata } from "next";
import Link from "next/link";
import { Copy, Download, Eye, FilePlus2, FileText, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getCvDownloadAccess } from "@/server/checkout";
import { listUserCvs } from "@/server/cv";
import { deleteCvAction, duplicateCvAction } from "./actions";

export const metadata: Metadata = { title: "Meus CVs" };

/** Mensagens por código (não mostramos texto arbitrário vindo do URL). */
const ERRORS: Record<string, string> = {
  LIMIT: "Atingiu o limite de CVs. Elimine um CV antigo para criar outro.",
  NOT_FOUND: "CV não encontrado.",
  DRAFT_EXISTS: "Já tem um CV em preparação. Conclua a compra desse CV (ou elimine-o) antes de começar outro.",
  LOCKED: "Este CV já foi comprado com este modelo. Para usar outro modelo, crie um novo CV.",
  INVALID_IMAGE: "Não foi possível ler a imagem.",
};

export default async function CvListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [user, params] = await Promise.all([requireUser("/meu-espaco/cvs"), searchParams]);
  const [cvs, access] = await Promise.all([listUserCvs(user.id), getCvDownloadAccess(user.id)]);
  // Com o CV pago há no máximo um CV em preparação: «Criar novo CV» continua esse CV.
  const draft = access.paywall ? cvs.find((cv) => !cv.purchasedAt && !access.unlocked.has(cv.id)) : undefined;

  return (
    <>
      <PageHeader
        title="Meus CVs"
        description="Crie versões diferentes do CV para cada tipo de vaga."
        actions={
          draft ? (
            <ButtonLink href={`/meu-espaco/cvs/${draft.id}/editar`} icon={<Pencil className="size-5" aria-hidden />}>
              Continuar CV em preparação
            </ButtonLink>
          ) : (
            <ButtonLink href="/meu-espaco/cvs/novo" icon={<FilePlus2 className="size-5" aria-hidden />}>
              Criar novo CV
            </ButtonLink>
          )
        }
      />
      <div className="space-y-3">
        {params.erro && <Alert tone="error">{ERRORS[params.erro] ?? "Não foi possível concluir a ação."}</Alert>}
        {params.duplicado && <Alert tone="success">CV duplicado. Pode agora adaptar a cópia a outra vaga.</Alert>}
        {params.eliminado && <Alert tone="success">CV eliminado.</Alert>}
        {draft && cvs.length > 0 && (
          <Alert tone="info">
            Para criar outro CV, conclua primeiro a compra do CV em preparação («{draft.title}») ou elimine-o. Pode trocar o modelo desse CV quando quiser.
          </Alert>
        )}
      </div>

      {cvs.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<FileText className="size-7" aria-hidden />}
            title="Ainda não tem CVs"
            description="Crie o seu primeiro CV profissional em poucos minutos. Pode editá-lo sempre que quiser."
            action={<ButtonLink href="/meu-espaco/cvs/novo">Escolher modelo e criar CV</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {cvs.map((cv) => (
            <li key={cv.id}>
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: cv.template?.accentColor ?? "#1d40d8" }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">
                      <Link href={`/meu-espaco/cvs/${cv.id}`} className="hover:text-brand-700">
                        {cv.title}
                      </Link>
                    </h2>
                    <p className="truncate text-sm text-slate-600">{[cv.fullName, cv.jobTitle].filter(Boolean).join(" · ") || "Sem dados pessoais"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Modelo {cv.template?.name ?? "—"} · Atualizado {formatDate(cv.updatedAt)}
                      {access.paywall && (access.unlocked.has(cv.id) ? " · Comprado" : " · Em preparação")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ButtonLink href={`/meu-espaco/cvs/${cv.id}/editar`} variant="secondary" size="sm" icon={<Pencil className="size-4" aria-hidden />}>
                    Editar
                  </ButtonLink>
                  <ButtonLink href={`/meu-espaco/cvs/${cv.id}`} variant="outline" size="sm" icon={<Eye className="size-4" aria-hidden />}>
                    Ver
                  </ButtonLink>
                  {access.paywall && !access.unlocked.has(cv.id) ? (
                    <ButtonLink href={`/checkout?cv=${cv.id}`} prefetch={false} variant="success" size="sm" className="col-span-2" icon={<ShoppingCart className="size-4" aria-hidden />}>
                      Comprar · {formatMoney(cv.template?.priceMinor ?? access.priceMinor, access.currency)}
                    </ButtonLink>
                  ) : (
                    <>
                      <a href={`/api/cv/${cv.id}/pdf`} className={buttonClass("outline", "sm")} download>
                        <Download className="size-4" aria-hidden /> PDF
                      </a>
                      <a href={`/api/cv/${cv.id}/docx`} className={buttonClass("outline", "sm")} download>
                        <Download className="size-4" aria-hidden /> Word
                      </a>
                    </>
                  )}
                </div>
                <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
                  <form action={duplicateCvAction}>
                    <input type="hidden" name="cvId" value={cv.id} />
                    <SubmitButton variant="ghost" size="sm" pendingLabel="A duplicar…" icon={<Copy className="size-4" aria-hidden />}>
                      Duplicar
                    </SubmitButton>
                  </form>
                  <form action={deleteCvAction} id={`delete-${cv.id}`}>
                    <input type="hidden" name="cvId" value={cv.id} />
                  </form>
                  <ConfirmButton
                    form={`delete-${cv.id}`}
                    variant="ghost"
                    size="sm"
                    className="text-red-700 hover:bg-red-50"
                    title="Eliminar este CV?"
                    description={`O CV «${cv.title}» será eliminado permanentemente. Esta ação não pode ser anulada.`}
                    confirmLabel="Eliminar"
                  >
                    <Trash2 className="size-4" aria-hidden /> Eliminar
                  </ConfirmButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
