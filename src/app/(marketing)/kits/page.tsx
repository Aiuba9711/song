import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Gift, Package } from "lucide-react";
import { KitIllustration } from "@/components/marketing/kit-illustration";
import { Badge, Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/money";
import { listActiveProducts } from "@/server/catalog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Kits de candidatura",
  description: "Kits digitais com modelos de CV em Word, cartas, emails, mensagens de WhatsApp e guia de entrevista. Preços em Meticais.",
  alternates: { canonical: "/kits" },
};

export default async function KitsPage() {
  const products = await listActiveProducts();
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Kits de candidatura</h1>
          <p className="mt-3 text-lg text-slate-600">
            Modelos prontos para adaptar com as suas informações. Apresente-se de forma mais profissional e poupe tempo em cada candidatura.
          </p>
        </div>
        <KitIllustration className="hidden w-full max-w-sm justify-self-end lg:block" />
      </header>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={<Package className="size-7" aria-hidden />} title="Ainda não há kits disponíveis" description="Estamos a preparar os primeiros kits. Volte em breve." />
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const free = p.priceMinor === 0;
            return (
              <li key={p.id}>
                <Card className={`relative flex h-full flex-col p-6 ${p.isFeatured ? "ring-2 ring-brand-600" : ""}`}>
                  <div className="flex items-center gap-2">
                    {free ? (
                      <Badge tone="success">
                        <Gift className="size-3.5" aria-hidden /> Grátis
                      </Badge>
                    ) : (
                      p.tier && <Badge tone="neutral">{p.tier}</Badge>
                    )}
                    {p.isFeatured && <Badge tone="brand">Mais escolhido</Badge>}
                  </div>
                  <h2 className="mt-3 text-xl font-bold">
                    <Link href={`/kits/${p.slug}`} className="after:absolute after:inset-0 hover:text-brand-700">
                      {p.name}
                    </Link>
                  </h2>
                  <p className="mt-2 text-slate-600">{p.shortDescription}</p>
                  <p className="mt-4 text-3xl font-extrabold text-ink">
                    {free ? "0 MT" : formatMoney(p.priceMinor, p.currency)}
                    {p.compareAtPriceMinor && p.compareAtPriceMinor > p.priceMinor && (
                      <span className="ml-2 text-base font-medium text-slate-400 line-through">{formatMoney(p.compareAtPriceMinor, p.currency)}</span>
                    )}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-[15px] text-slate-700">
                    {p.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex gap-2">
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-go-600" aria-hidden />
                        {f}
                      </li>
                    ))}
                    {p.features.length > 5 && <li className="pl-6 text-sm text-slate-500">e mais {p.features.length - 5}…</li>}
                  </ul>
                  <ButtonLink href={`/kits/${p.slug}`} variant={free ? "success" : p.isFeatured ? "primary" : "outline"} className="relative z-10 mt-6 w-full">
                    {free ? "Obter grátis" : "Ver detalhes"}
                  </ButtonLink>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 max-w-2xl text-sm text-slate-500">
        Nenhum kit garante emprego. Os materiais ajudam a melhorar a qualidade e a apresentação da sua candidatura.
      </p>
    </div>
  );
}
