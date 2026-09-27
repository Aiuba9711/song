"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, ScanText } from "lucide-react";
import type { TemplateDesign } from "@/cv/design";
import { CvPreview } from "@/cv/preview";
import { SAMPLE_CV } from "@/cv/sample";
import { cn } from "@/lib/utils";
import { ChooseTemplateButton } from "./choose-button";

export type GalleryTemplate = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  style: string;
  description: string;
  isAtsFriendly: boolean;
  previewImageUrl: string | null;
  design: TemplateDesign;
  priceLabel: string;
  priceMinor: number;
};

function withoutPhoto(url: string) {
  return url.replace(/\.jpg$/, "-sem-foto.jpg");
}

/** Pré-visualização de um modelo: imagem gerada (leve) ou, na falta dela, o próprio componente. */
export function TemplatePreview({ t, withPhoto, width }: { t: GalleryTemplate; withPhoto: boolean; width: number }) {
  const height = Math.round(width * (1123 / 794));
  if (t.previewImageUrl) {
    const src = withPhoto || !t.previewImageUrl.startsWith("/templates/") ? t.previewImageUrl : withoutPhoto(t.previewImageUrl);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagens estáticas pequenas com carregamento diferido
      <img src={src} alt={`Pré-visualização do modelo ${t.name}${withPhoto ? " com fotografia" : " sem fotografia"}`} width={width} height={height} loading="lazy" decoding="async" className="h-auto w-full rounded-md bg-white" />
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-md bg-white" style={{ aspectRatio: "794 / 1123" }} role="img" aria-label={`Pré-visualização do modelo ${t.name}`}>
      <div className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width: 794, transform: `scale(${width / 794})` }} inert>
        <CvPreview cv={{ ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, showPhoto: false } }} design={t.design} />
      </div>
    </div>
  );
}

export function AtsBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-go-50 px-2 py-0.5 text-xs font-semibold text-go-700", className)} title="Estrutura simples, lida corretamente por sistemas de recrutamento (ATS)">
      <ScanText className="size-3.5" aria-hidden /> Compatível com ATS
    </span>
  );
}

export function TemplateGallery({ templates, initialCategory, currentSlug }: { templates: GalleryTemplate[]; initialCategory?: string; currentSlug?: string | null }) {
  const [category, setCategory] = useState(initialCategory && templates.some((t) => t.category === initialCategory) ? initialCategory : "ALL");
  const [atsOnly, setAtsOnly] = useState(false);
  const [withPhoto, setWithPhoto] = useState(true);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of templates) if (!seen.has(t.category)) seen.set(t.category, t.categoryLabel);
    return [...seen.entries()];
  }, [templates]);
  const visible = templates.filter((t) => (category === "ALL" || t.category === category) && (!atsOnly || t.isAtsFriendly));

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 space-y-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/95">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtrar por área">
          {[["ALL", "Todos"] as const, ...categories].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                category === key ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 font-medium text-slate-700">
            <input type="checkbox" checked={atsOnly} onChange={(e) => setAtsOnly(e.target.checked)} className="size-4.5 accent-brand-700" />
            Só compatíveis com ATS
          </label>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Pré-visualização">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={withPhoto === v}
                onClick={() => setWithPhoto(v)}
                className={cn("rounded-md px-3 py-1 font-medium", withPhoto === v ? "bg-white text-ink shadow-sm" : "text-slate-600")}
              >
                {v ? "Com foto" : "Sem foto"}
              </button>
            ))}
          </div>
          <span className="ml-auto text-slate-500" aria-live="polite">
            {visible.length} {visible.length === 1 ? "modelo" : "modelos"}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">Nenhum modelo com estes filtros.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((t) => (
            <li key={t.slug} className={cn("flex flex-col rounded-2xl border bg-white p-2.5 shadow-soft sm:p-3", currentSlug === t.slug ? "border-brand-600 ring-2 ring-brand-200" : "border-slate-200")}>
              <Link href={`/cv-modelos/${t.slug}`} className="block overflow-hidden rounded-lg bg-slate-100 p-1.5 ring-1 ring-slate-200 transition-shadow hover:shadow-lift sm:p-2">
                <TemplatePreview t={t} withPhoto={withPhoto} width={300} />
              </Link>
              <div className="mt-2.5 flex flex-1 flex-col px-0.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight text-ink">
                    <Link href={`/cv-modelos/${t.slug}`} className="hover:text-brand-700">
                      {t.name}
                    </Link>
                  </h3>
                  {currentSlug === t.slug && <CheckCircle2 className="size-5 shrink-0 text-brand-700" aria-label="Modelo atual" />}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.categoryLabel} · {t.style}
                </p>
                {t.isAtsFriendly && <AtsBadge className="mt-1.5 self-start" />}
                <p className="mt-2 hidden flex-1 text-sm text-slate-600 sm:block">{t.description}</p>
                <p className="mt-2 text-sm font-bold text-ink">{t.priceLabel}</p>
                <div className="mt-2">
                  <ChooseTemplateButton slug={t.slug} label={currentSlug === t.slug ? "Continuar" : "Usar este modelo"} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
