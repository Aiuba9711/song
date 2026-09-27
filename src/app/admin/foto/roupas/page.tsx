import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { outfitDataUrl } from "@/photo/outfit";
import { OUTFIT_FILTERS, OUTFIT_TAG_LABELS, type OutfitDef } from "@/photo/types";
import { deleteOutfitAction, toggleOutfitAction } from "../actions";
import { OutfitForm, type OutfitValues } from "../forms";
import { PhotoAdminTabs } from "../tabs";

export const metadata: Metadata = { title: "Roupas · Foto Profissional" };

const EMPTY: OutfitValues = { name: "", gender: "MASCULINO", garment: "BLAZER", jacketColor: "#1e2a4a", shirtColor: "#ffffff", tieColor: "", tags: [], isActive: true, sortOrder: 0 };
const GARMENT = { BLAZER: "Blazer", FATO: "Fato", CAMISA: "Camisa", BLUSA: "Blusa" } as const;

export default async function PhotoOutfitsPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  await requirePermission("photos.manage");
  const { filtro } = await searchParams;
  const rows = await db.photoOutfit.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { photos: true } } } });
  const filter = OUTFIT_FILTERS.find((f) => f.id === filtro);
  const visible = filter ? rows.filter((o) => filter.test(o as unknown as OutfitDef)) : rows;

  return (
    <>
      <PageHeader title="Foto Profissional" description="Roupas digitais (ilustrações sobrepostas). Não alteram o rosto, o cabelo nem o corpo." />
      <PhotoAdminTabs current="roupas" />

      <details className="mb-6 rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
          <Plus className="size-5" aria-hidden /> Adicionar roupa
        </summary>
        <div className="border-t border-slate-100 p-4">
          <OutfitForm id={null} defaults={{ ...EMPTY, sortOrder: (rows.length + 1) * 10 }} />
        </div>
      </details>

      <nav aria-label="Filtrar roupas" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {[{ id: "", label: "Todas" }, ...OUTFIT_FILTERS].map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/foto/roupas?filtro=${f.id}` : "/admin/foto/roupas"}
            aria-current={(filtro ?? "") === f.id ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap", (filtro ?? "") === f.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <p className="mb-3 text-sm text-slate-600">{visible.length} roupa(s)</p>
      <ul className="grid gap-3 lg:grid-cols-2">
        {visible.map((o) => (
          <li key={o.id}>
            <Card className="p-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- ilustração SVG gerada localmente */}
                <img src={outfitDataUrl(o, { tie: !!o.tieColor, tieColor: o.tieColor })} alt="" className="h-20 w-24 shrink-0 rounded-lg bg-[#d8c7b4] object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{o.name}</p>
                  <p className="text-xs text-slate-500">
                    {o.gender === "MASCULINO" ? "Homem" : "Mulher"} · {GARMENT[o.garment]}
                    {o.tieColor ? " · com gravata" : ""} · usada em {o._count.photos} foto(s)
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {o.tags.map((t) => (
                      <Badge key={t} tone="neutral">
                        {OUTFIT_TAG_LABELS[t as keyof typeof OUTFIT_TAG_LABELS] ?? t}
                      </Badge>
                    ))}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={o.isActive ? "success" : "neutral"}>{o.isActive ? "Ativa" : "Inativa"}</Badge>
                <form action={toggleOutfitAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <SubmitButton variant="outline" size="sm" pendingLabel="…">
                    {o.isActive ? "Desativar" : "Ativar"}
                  </SubmitButton>
                </form>
                <form action={deleteOutfitAction} id={`del-outfit-${o.id}`}>
                  <input type="hidden" name="id" value={o.id} />
                </form>
                <ConfirmButton
                  form={`del-outfit-${o.id}`}
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:bg-red-50"
                  title="Remover esta roupa?"
                  description="Deixa de estar disponível no editor. As fotografias já guardadas não mudam."
                  confirmLabel="Remover"
                >
                  Remover
                </ConfirmButton>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">Editar</summary>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <OutfitForm
                    id={o.id}
                    defaults={{
                      name: o.name,
                      gender: o.gender,
                      garment: o.garment,
                      jacketColor: o.jacketColor ?? "",
                      shirtColor: o.shirtColor,
                      tieColor: o.tieColor ?? "",
                      tags: o.tags,
                      isActive: o.isActive,
                      sortOrder: o.sortOrder,
                    }}
                  />
                </div>
              </details>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
