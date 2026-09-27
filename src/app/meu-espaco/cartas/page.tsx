import type { Metadata } from "next";
import Link from "next/link";
import { Copy, Download, FilePlus2, Mail, MessageSquareText, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { LETTER_TYPE_LABELS, LETTER_TYPES } from "@/letters/types";
import { requireUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getLetterPrice } from "@/server/checkout";
import { listUserLetters } from "@/server/letters";
import { createLetterAction, deleteLetterAction, duplicateLetterAction } from "./actions";

export const metadata: Metadata = { title: "Minhas cartas" };

const ERRORS: Record<string, string> = {
  LIMIT: "Atingiu o limite de cartas. Elimine uma carta antiga para criar outra.",
  NOT_FOUND: "Carta não encontrada.",
};

const DESCRIPTIONS = {
  CANDIDATURA: "Para responder a uma vaga concreta: apresenta a candidatura, a formação, a experiência e as competências.",
  MOTIVACAO: "Para mostrar porque quer trabalhar numa empresa ou área — ideal para candidaturas espontâneas e estágios.",
} as const;

export default async function LettersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [user, params] = await Promise.all([requireUser("/meu-espaco/cartas"), searchParams]);
  const [letters, price] = await Promise.all([listUserLetters(user.id), getLetterPrice()]);

  return (
    <>
      <PageHeader title="Minhas cartas" description="Cartas de candidatura e de motivação: gere, edite, copie ou descarregue em PDF e Word." />
      <div className="space-y-3">
        {params.erro && <Alert tone="error">{ERRORS[params.erro] ?? "Não foi possível concluir a ação."}</Alert>}
        {params.duplicada && <Alert tone="success">Carta duplicada.</Alert>}
        {params.eliminada && <Alert tone="success">Carta eliminada.</Alert>}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {LETTER_TYPES.map((t) => (
          <Card key={t} className="flex flex-col p-5">
            <h2 className="text-lg font-semibold">{LETTER_TYPE_LABELS[t]}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-600">{DESCRIPTIONS[t]}</p>
            <form action={createLetterAction} className="mt-4">
              <input type="hidden" name="type" value={t} />
              <SubmitButton pendingLabel="A criar…" icon={<FilePlus2 className="size-4" aria-hidden />} className="w-full sm:w-auto">
                Nova {t === "CANDIDATURA" ? "carta de candidatura" : "carta de motivação"}
              </SubmitButton>
            </form>
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {price.paid ? `Gerar, editar e copiar são gratuitos. Download em PDF e Word: ${formatMoney(price.priceMinor, price.currency)} por carta.` : "Gerar, editar, copiar e descarregar cartas é gratuito."}
      </p>

      <h2 className="mt-8 text-lg font-semibold">As suas cartas</h2>
      {letters.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={<Mail className="size-7" aria-hidden />} title="Ainda não tem cartas" description="Escolha acima o tipo de carta para começar." />
        </div>
      ) : (
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {letters.map((l) => {
            const unlocked = !price.paid || !!l.purchasedAt;
            return (
              <li key={l.id}>
                <Card className="p-5">
                  <h3 className="truncate text-lg font-semibold">
                    <Link href={`/meu-espaco/cartas/${l.id}/editar`} className="hover:text-brand-700">
                      {l.title}
                    </Link>
                  </h3>
                  <p className="truncate text-sm text-slate-600">{[LETTER_TYPE_LABELS[l.type], l.position, l.company].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 text-xs text-slate-500">Atualizada {formatDate(l.updatedAt)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ButtonLink href={`/meu-espaco/cartas/${l.id}/editar`} variant="secondary" size="sm" icon={<Pencil className="size-4" aria-hidden />}>
                      Editar
                    </ButtonLink>
                    {unlocked ? (
                      <>
                        <a href={`/api/cartas/${l.id}/pdf`} className={buttonClass("outline", "sm")} download>
                          <Download className="size-4" aria-hidden /> PDF
                        </a>
                        <a href={`/api/cartas/${l.id}/docx`} className={buttonClass("outline", "sm")} download>
                          <Download className="size-4" aria-hidden /> Word
                        </a>
                      </>
                    ) : (
                      <ButtonLink href={`/checkout?carta=${l.id}`} prefetch={false} variant="success" size="sm" className="col-span-2" icon={<ShoppingCart className="size-4" aria-hidden />}>
                        Comprar · {formatMoney(price.priceMinor, price.currency)}
                      </ButtonLink>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
                    <form action={duplicateLetterAction}>
                      <input type="hidden" name="letterId" value={l.id} />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="A duplicar…" icon={<Copy className="size-4" aria-hidden />}>
                        Duplicar
                      </SubmitButton>
                    </form>
                    <form action={deleteLetterAction} id={`delete-${l.id}`}>
                      <input type="hidden" name="letterId" value={l.id} />
                    </form>
                    <ConfirmButton
                      form={`delete-${l.id}`}
                      variant="ghost"
                      size="sm"
                      className="text-red-700 hover:bg-red-50"
                      title="Eliminar esta carta?"
                      description={`A carta «${l.title}» será eliminada permanentemente.`}
                      confirmLabel="Eliminar"
                    >
                      <Trash2 className="size-4" aria-hidden /> Eliminar
                    </ConfirmButton>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card className="mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <MessageSquareText className="size-8 shrink-0 text-brand-700" aria-hidden />
        <div className="flex-1">
          <h2 className="font-semibold">Emails e mensagens de WhatsApp</h2>
          <p className="text-sm text-slate-600">Modelos prontos para enviar a candidatura, acompanhar o processo ou agradecer a entrevista.</p>
        </div>
        <ButtonLink href="/meu-espaco/mensagens" variant="outline">
          Ver modelos
        </ButtonLink>
      </Card>
    </>
  );
}
