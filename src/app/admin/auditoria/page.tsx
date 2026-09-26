import type { Metadata } from "next";
import { Table, Td, Th } from "@/components/admin/table";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage() {
  await requirePermission("users.manage");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return (
    <>
      <PageHeader title="Registo de auditoria" description="Últimos 200 eventos (autenticação, alterações administrativas, pedidos). IPs pseudonimizados." />
      <Table className="min-w-[800px]">
        <thead>
          <tr>
            <Th>Data</Th>
            <Th>Ação</Th>
            <Th>Autor</Th>
            <Th>Entidade</Th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <Td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
              <Td className="font-mono text-xs">{l.action}</Td>
              <Td>{l.actor?.email ?? "—"}</Td>
              <Td className="font-mono text-xs text-slate-500">{l.entityType ? `${l.entityType}:${l.entityId ?? ""}` : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
