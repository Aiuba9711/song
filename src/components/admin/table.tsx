import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className={cn("w-full min-w-[640px] text-left text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-slate-100 px-4 py-3 align-middle", className)} {...props} />;
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-600">
        Página {page} de {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <a href={hrefFor(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Anterior
          </a>
        )}
        {page < pages && (
          <a href={hrefFor(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
            Seguinte
          </a>
        )}
      </div>
    </nav>
  );
}
