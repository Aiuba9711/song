"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="conteudo" className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-700">
        <TriangleAlert className="size-8" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Algo correu mal</h1>
        <p className="mt-2 max-w-sm text-slate-600">
          Ocorreu um erro inesperado. Os seus dados guardados não foram afetados.
          {error.digest && <span className="mt-1 block text-xs text-slate-400">Código: {error.digest}</span>}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Tentar novamente</Button>
        <ButtonLink href="/" variant="outline">
          Ir para o início
        </ButtonLink>
      </div>
    </main>
  );
}
