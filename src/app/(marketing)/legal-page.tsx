import type { ReactNode } from "react";

/** Layout tipográfico para páginas de texto (legais, conselhos). */
export function ProsePage({ title, intro, updated, children }: { title: string; intro?: ReactNode; updated?: string; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {updated && <p className="mt-2 text-sm text-slate-500">Última atualização: {updated}</p>}
        {intro && <div className="mt-4 text-lg text-slate-600">{intro}</div>}
      </header>
      <div className="space-y-4 leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
