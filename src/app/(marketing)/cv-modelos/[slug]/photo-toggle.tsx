"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TemplatePreview, type GalleryTemplate } from "@/components/templates/gallery";

/** Pré-visualização grande com alternância com/sem fotografia. */
export function PreviewWithToggle({ t }: { t: GalleryTemplate }) {
  const [withPhoto, setWithPhoto] = useState(true);
  return (
    <div>
      <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Pré-visualização">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={withPhoto === v}
            onClick={() => setWithPhoto(v)}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", withPhoto === v ? "bg-white text-ink shadow-sm" : "text-slate-600")}
          >
            {v ? "Com fotografia" : "Sem fotografia"}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-slate-200/70 p-3 sm:p-5">
        <div className="mx-auto max-w-[560px] shadow-lift">
          <TemplatePreview t={t} withPhoto={withPhoto} width={560} />
        </div>
      </div>
    </div>
  );
}
