import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { OfflineRetry } from "./retry";

export const metadata: Metadata = { title: "Sem ligação", robots: { index: false } };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-600">
        <WifiOff className="size-8" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Está sem ligação à internet</h1>
        <p className="mt-2 max-w-sm text-slate-600">Verifique os dados móveis ou o Wi-Fi. Os seus CVs estão guardados em segurança na sua conta.</p>
      </div>
      <OfflineRetry />
    </main>
  );
}
