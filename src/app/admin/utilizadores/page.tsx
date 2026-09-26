import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Pagination, Table, Td, Th } from "@/components/admin/table";
import { Badge } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDate } from "@/lib/dates";
import { listUsers } from "@/server/admin";
import { UserRowActions } from "./user-actions";

export const metadata: Metadata = { title: "Utilizadores" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const actor = await requirePermission("users.manage");
  const { q, p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const query = q?.trim().slice(0, 100) || undefined;
  const { rows, total, pages } = await listUsers({ q: query, page });

  return (
    <>
      <PageHeader title="Utilizadores" description={`${total} ${total === 1 ? "utilizador" : "utilizadores"}`} />
      <form className="mb-4 flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Pesquisar
        </label>
        <Input id="q" name="q" defaultValue={query} placeholder="Nome, email ou telefone" />
        <button type="submit" className="grid w-12 shrink-0 place-items-center rounded-xl bg-slate-900 text-white" aria-label="Pesquisar">
          <Search className="size-5" aria-hidden />
        </button>
      </form>
      <Table className="min-w-[900px]">
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Contacto</Th>
            <Th>Registo</Th>
            <Th>CVs</Th>
            <Th>Compras</Th>
            <Th>Papel</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className={u.isActive ? "" : "bg-slate-50 text-slate-500"}>
              <Td>
                <span className="font-semibold">{u.name}</span>
                {!u.isActive && <Badge tone="danger" className="ml-2">Inativo</Badge>}
              </Td>
              <Td>
                <span className="block">{u.email}</span>
                {u.phone && <span className="text-xs text-slate-500">+{u.phone}</span>}
              </Td>
              <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
              <Td className="tabular-nums">{u._count.cvs}</Td>
              <Td className="tabular-nums">{u._count.orders}</Td>
              <Td>
                <Badge tone={u.role === "ADMIN" ? "brand" : u.role === "EDITOR" ? "warning" : "neutral"}>{ROLE_LABELS[u.role]}</Badge>
              </Td>
              <Td className="text-right">
                <UserRowActions userId={u.id} role={u.role} isActive={u.isActive} isSelf={u.id === actor.id} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <p className="mt-4 text-center text-slate-500">Nenhum utilizador encontrado.</p>}
      <Pagination page={page} pages={pages} hrefFor={(n) => `/admin/utilizadores?${new URLSearchParams({ ...(query ? { q: query } : {}), p: String(n) })}`} />
    </>
  );
}
