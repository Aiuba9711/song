import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { BACKGROUND_CATEGORY_LABELS } from "@/photo/types";
import { deleteBackgroundAction, toggleBackgroundAction } from "../actions";
import { BackgroundForm, type BackgroundValues } from "../forms";
import { PhotoAdminTabs } from "../tabs";

export const metadata: Metadata = { title: "Fundos · Foto Profissional" };

const EMPTY: BackgroundValues = { name: "", category: "NEUTRO", kind: "SOLID", color1: "#ffffff", color2: "", pattern: "", passport: false, isActive: true, sortOrder: 0, hasImage: false };

export default async function PhotoBackgroundsPage() {
  await requirePermission("photos.manage");
  const rows = await db.photoBackground.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { photos: true } } } });

  return (
    <>
      <PageHeader title="Foto Profissional" description="Fundos disponíveis no editor. Prefira fundos discretos: a atenção deve ficar na pessoa." />
      <PhotoAdminTabs current="fundos" />

      <details className="group mb-6 rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
          <Plus className="size-5" aria-hidden /> Adicionar fundo
        </summary>
        <div className="border-t border-slate-100 p-4">
          <BackgroundForm id={null} defaults={{ ...EMPTY, sortOrder: (rows.length + 1) * 10 }} />
        </div>
      </details>

      {(["NEUTRO", "CORPORATIVO", "GRADIENTE"] as const).map((cat) => {
        const items = rows.filter((b) => b.category === cat);
        return (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">
              {BACKGROUND_CATEGORY_LABELS[cat]} <span className="text-sm font-normal text-slate-600">({items.length})</span>
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum fundo nesta categoria.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((b) => {
                  const swatch =
                    b.kind === "IMAGE" && b.imageKey
                      ? { backgroundImage: `url("/api/foto-fundos/${b.id}")`, backgroundSize: "cover" }
                      : b.kind === "SOLID"
                        ? { background: b.color1 }
                        : { background: `linear-gradient(${b.color1}, ${b.color2 ?? b.color1})` };
                  return (
                    <li key={b.id}>
                      <Card className="p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="size-12 shrink-0 rounded-lg ring-1 ring-slate-300" style={swatch} aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{b.name}</p>
                            <p className="text-xs text-slate-500">
                              {b.kind} · ordem {b.sortOrder} · usado em {b._count.photos} foto(s)
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {b.passport && <Badge tone="brand">Tipo passe</Badge>}
                            <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Ativo" : "Inativo"}</Badge>
                            <form action={toggleBackgroundAction}>
                              <input type="hidden" name="id" value={b.id} />
                              <SubmitButton variant="outline" size="sm" pendingLabel="…">
                                {b.isActive ? "Desativar" : "Ativar"}
                              </SubmitButton>
                            </form>
                            <form action={deleteBackgroundAction} id={`del-bg-${b.id}`}>
                              <input type="hidden" name="id" value={b.id} />
                            </form>
                            <ConfirmButton
                              form={`del-bg-${b.id}`}
                              variant="ghost"
                              size="sm"
                              className="text-red-700 hover:bg-red-50"
                              title="Remover este fundo?"
                              description="Deixa de estar disponível no editor. As fotografias já guardadas não mudam."
                              confirmLabel="Remover"
                            >
                              Remover
                            </ConfirmButton>
                          </div>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar</summary>
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <BackgroundForm
                              id={b.id}
                              defaults={{
                                name: b.name,
                                category: b.category,
                                kind: b.kind,
                                color1: b.color1,
                                color2: b.color2 ?? "",
                                pattern: b.pattern ?? "",
                                passport: b.passport,
                                isActive: b.isActive,
                                sortOrder: b.sortOrder,
                                hasImage: !!b.imageKey,
                              }}
                            />
                          </div>
                        </details>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
