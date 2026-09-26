import { ChevronDown } from "lucide-react";

/** Perguntas frequentes com <details> nativo (acessível e sem JavaScript). */
export function Faq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-1">
          <summary className="flex min-h-12 items-center justify-between gap-4 py-3 text-left font-semibold text-ink">
            {item.q}
            <ChevronDown className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="pb-4 text-slate-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
