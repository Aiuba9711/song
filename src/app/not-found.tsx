import { SearchX } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <SearchX className="size-8" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 max-w-sm text-slate-600">O endereço pode estar errado ou a página já não existe.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Ir para o início</ButtonLink>
        <ButtonLink href="/meu-espaco" variant="outline">
          Meu Espaço
        </ButtonLink>
      </div>
    </main>
  );
}
