import type { Metadata } from "next";
import { Table, Td, Th } from "@/components/admin/table";
import { Badge, Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { appEnvironment, providerStatuses } from "@/lib/image-editing";
import type { ProviderState } from "@/lib/image-editing/types";
import { PhotoAdminTabs } from "./tabs";

export const metadata: Metadata = { title: "Foto Profissional" };

const STATE: Record<ProviderState, { label: string; tone: "success" | "neutral" | "danger" }> = {
  CONFIGURADO: { label: "CONFIGURADO", tone: "success" },
  NAO_CONFIGURADO: { label: "NÃO CONFIGURADO", tone: "neutral" },
  ERRO: { label: "ERRO", tone: "danger" },
};

const ENV_LABELS = { development: "Desenvolvimento (DEV)", staging: "Testes (STAGING)", production: "Produção (PRODUCTION)" } as const;

export default async function PhotoAdminPage() {
  await requirePermission("photos.manage");
  const [photos, backgrounds, outfits] = await Promise.all([
    db.professionalPhoto.count(),
    db.photoBackground.groupBy({ by: ["isActive"], _count: true }),
    db.photoOutfit.groupBy({ by: ["isActive"], _count: true }),
  ]);
  const count = (rows: { isActive: boolean; _count: number }[], active: boolean) => rows.find((r) => r.isActive === active)?._count ?? 0;
  const statuses = providerStatuses();

  return (
    <>
      <PageHeader title="Foto Profissional" description="Fundos, roupas digitais, preços e estado dos processadores de imagem." />
      <PhotoAdminTabs current="geral" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-slate-600">Fotografias de utilizadores</p>
          <p className="text-2xl font-bold">{photos}</p>
          <p className="text-xs text-slate-500">Privadas — o admin não tem acesso às imagens.</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">Fundos</p>
          <p className="text-2xl font-bold">{count(backgrounds, true)} ativos</p>
          <p className="text-xs text-slate-500">{count(backgrounds, false)} inativos</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600">Roupas</p>
          <p className="text-2xl font-bold">{count(outfits, true)} ativas</p>
          <p className="text-xs text-slate-500">{count(outfits, false)} inativas</p>
        </Card>
      </div>

      <h2 className="mt-8 mb-1 text-lg font-semibold">Processadores de imagem</h2>
      <p className="mb-3 text-sm text-slate-600">
        Ambiente: <strong>{ENV_LABELS[appEnvironment()]}</strong> (variável APP_ENV). O processamento local funciona sem serviços externos e sem IA. Os serviços externos
        configuram-se no servidor (IMAGE_BG_PROVIDER, IMAGE_CLOTHING_PROVIDER) — ainda não existe nenhuma integração externa implementada.
      </p>
      <Card className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Processador</Th>
              <Th>Local</Th>
              <Th>Serviço externo</Th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.name}>
                <Td className="font-medium">{s.name}</Td>
                <Td>
                  <Badge tone={STATE[s.local.state].tone}>{STATE[s.local.state].label}</Badge>
                  <p className="mt-1 text-xs text-slate-600">{s.local.description}</p>
                </Td>
                <Td>
                  <Badge tone={STATE[s.external.state].tone}>{STATE[s.external.state].label}</Badge>
                  <p className="mt-1 text-xs text-slate-600">{s.external.description}</p>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <p className="mt-3 text-xs text-slate-600">
        As fotografias dos utilizadores nunca são enviadas a serviços externos sem consentimento, nem usadas para treinar modelos de IA. Os registos de erro não guardam imagens.
      </p>
    </>
  );
}
