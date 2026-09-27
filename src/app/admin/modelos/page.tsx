import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, Plus, ScanText } from "lucide-react";
import { Table, Td, Th } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { CATEGORY_LABELS } from "@/cv/categories";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getPaymentSettings } from "@/server/payments/settings";
import { duplicateTemplateAction, moveTemplateAction, toggleTemplateAction } from "./actions";

export const metadata: Metadata = { title: "Modelos de CV" };

export default async function AdminTemplatesPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  await requirePermission("templates.manage");
  const { categoria } = await searchParams;
  const [templates, settings] = await Promise.all([
    db.cVTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { cvs: true } } } }),
    getPaymentSettings(),
  ]);
  const categories = [...new Set(templates.map((t) => t.category))];
  const visible = categoria ? templates.filter((t) => t.category === categoria) : templates;
  const active = templates.filter((t) => t.isActive).length;

  return (
    <>
      <PageHeader
        title="Modelos de CV"
        description={`${templates.length} modelos · ${active} ativos · preço padrão ${formatMoney(settings.defaultPriceMinor, settings.currency)} por CV (Configurações › Pagamentos)`}
        actions={
          <ButtonLink href="/admin/modelos/novo" icon={<Plus className="size-4" aria-hidden />}>
            Novo modelo
          </ButtonLink>
        }
      />
      <nav aria-label="Filtrar por categoria" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link href="/admin/modelos" aria-current={!categoria ? "page" : undefined} className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-medium ring-1 ring-slate-200 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white">
          Todas
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/admin/modelos?categoria=${c}`}
            aria-current={categoria === c ? "page" : undefined}
            className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-medium whitespace-nowrap ring-1 ring-slate-200 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white"
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </nav>
      <Table>
        <thead>
          <tr>
            <Th className="w-24">Ordem</Th>
            <Th>Modelo</Th>
            <Th>Categoria · estilo</Th>
            <Th>Preço</Th>
            <Th>CVs</Th>
            <Th>Estado</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {visible.map((t, i) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td>
                <div className="flex items-center gap-1">
                  <form action={moveTemplateAction}>
                    <input type="hidden" name="templateId" value={t.id} />
                    <input type="hidden" name="direction" value="up" />
                    <SubmitButton variant="ghost" size="sm" className="px-2" disabled={!categoria && i === 0} aria-label={`Subir ${t.name}`}>
                      <ArrowUp className="size-4" aria-hidden />
                    </SubmitButton>
                  </form>
                  <form action={moveTemplateAction}>
                    <input type="hidden" name="templateId" value={t.id} />
                    <input type="hidden" name="direction" value="down" />
                    <SubmitButton variant="ghost" size="sm" className="px-2" disabled={!categoria && i === visible.length - 1} aria-label={`Descer ${t.name}`}>
                      <ArrowDown className="size-4" aria-hidden />
                    </SubmitButton>
                  </form>
                </div>
              </Td>
              <Td>
                <span className="flex items-center gap-3">
                  {t.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura pequena
                    <img src={t.previewImageUrl} alt="" width={36} height={51} loading="lazy" className="rounded ring-1 ring-slate-200" />
                  ) : (
                    <span className="h-[51px] w-9 rounded ring-1 ring-slate-200" style={{ background: t.accentColor }} aria-hidden />
                  )}
                  <span>
                    <Link href={`/admin/modelos/${t.id}`} className="font-semibold text-brand-700 hover:underline">
                      {t.name}
                    </Link>
                    <span className="block text-xs text-slate-500">/{t.slug}</span>
                  </span>
                </span>
              </Td>
              <Td>
                {CATEGORY_LABELS[t.category]}
                <span className="block text-xs text-slate-500">
                  {t.style}
                  {t.isAtsFriendly && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-go-700">
                      <ScanText className="size-3" aria-hidden /> ATS
                    </span>
                  )}
                </span>
              </Td>
              <Td className="whitespace-nowrap tabular-nums">
                {formatMoney(t.priceMinor ?? settings.defaultPriceMinor, settings.currency)}
                {t.priceMinor === null && <span className="block text-xs text-slate-500">padrão</span>}
              </Td>
              <Td className="tabular-nums">{t._count.cvs}</Td>
              <Td>{t.isActive ? <Badge tone="success">Ativo</Badge> : <Badge tone="neutral">Inativo</Badge>}</Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <ButtonLink href={`/admin/modelos/${t.id}`} variant="ghost" size="sm">
                    Editar
                  </ButtonLink>
                  <form action={duplicateTemplateAction}>
                    <input type="hidden" name="templateId" value={t.id} />
                    <SubmitButton variant="ghost" size="sm" aria-label={`Duplicar ${t.name}`}>
                      <Copy className="size-4" aria-hidden />
                    </SubmitButton>
                  </form>
                  <form action={toggleTemplateAction}>
                    <input type="hidden" name="templateId" value={t.id} />
                    <SubmitButton variant="ghost" size="sm">
                      {t.isActive ? "Desativar" : "Ativar"}
                    </SubmitButton>
                  </form>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-slate-500">
        Desativar um modelo esconde-o da galeria; os CVs que já o usam continuam a funcionar. A ordem aplica-se à galeria pública.
      </p>
    </>
  );
}
