import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Table, Td, Th } from "@/components/admin/table";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { LAYOUTS } from "@/cv/layouts";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CATEGORY_LABELS } from "@/server/catalog";
import { toggleTemplateAction } from "./actions";

export const metadata: Metadata = { title: "Modelos de CV" };

export default async function AdminTemplatesPage({ searchParams }: { searchParams: Promise<{ criado?: string }> }) {
  await requirePermission("templates.manage");
  const { criado } = await searchParams;
  const templates = await db.cVTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { cvs: true } } } });
  return (
    <>
      <PageHeader
        title="Modelos de CV"
        description="Cada modelo é uma variante (cor, categoria, descrição) de um dos layouts implementados."
        actions={
          <ButtonLink href="/admin/modelos/novo" icon={<Plus className="size-4" aria-hidden />}>
            Novo modelo
          </ButtonLink>
        }
      />
      {criado && (
        <Alert tone="success" className="mb-4">
          Modelo criado.
        </Alert>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Modelo</Th>
            <Th>Categoria</Th>
            <Th>Layout</Th>
            <Th>CVs</Th>
            <Th>Estado</Th>
            <Th className="text-right">Ação</Th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td>
                <span className="flex items-center gap-2">
                  <span className="size-4 rounded" style={{ background: t.accentColor }} aria-hidden />
                  <Link href={`/admin/modelos/${t.id}`} className="font-semibold text-brand-700 hover:underline">
                    {t.name}
                  </Link>
                </span>
              </Td>
              <Td>{CATEGORY_LABELS[t.category]}</Td>
              <Td>{LAYOUTS[t.layout].name}</Td>
              <Td className="tabular-nums">{t._count.cvs}</Td>
              <Td>{t.isActive ? <Badge tone="success">Ativo</Badge> : <Badge tone="neutral">Inativo</Badge>}</Td>
              <Td className="text-right">
                <form action={toggleTemplateAction}>
                  <input type="hidden" name="templateId" value={t.id} />
                  <SubmitButton variant="ghost" size="sm">
                    {t.isActive ? "Desativar" : "Ativar"}
                  </SubmitButton>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-slate-500">Desativar um modelo esconde-o do catálogo; os CVs que já o usam continuam a funcionar.</p>
    </>
  );
}
