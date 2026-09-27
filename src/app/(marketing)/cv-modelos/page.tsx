import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { TemplateGallery } from "@/components/templates/gallery";
import { appUrl } from "@/lib/env";
import { getGalleryTemplates } from "@/server/gallery";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Modelos de CV profissionais",
  description:
    "Mais de 30 modelos de CV para Moçambique: primeiro emprego, administrativo, contabilidade, saúde, enfermagem, educação, informática, engenharia, vendas, logística e mais. PDF e Word.",
  alternates: { canonical: "/cv-modelos" },
  openGraph: { title: "Modelos de CV profissionais | Emprego Fácil MZ", url: "/cv-modelos" },
};

export default async function TemplatesPage() {
  const templates = await getGalleryTemplates();
  return (
    <div className="container-page py-8 sm:py-12">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Escolha o modelo do seu CV</h1>
        <p className="mt-3 text-lg text-slate-600">
          {templates.length} modelos profissionais para diferentes áreas. Veja cada modelo com e sem fotografia, escolha um e preencha — pode trocar de modelo até finalizar.
        </p>
      </header>

      <div className="mt-6">
        {templates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">Ainda não há modelos disponíveis. Volte em breve.</p>
        ) : (
          <TemplateGallery templates={templates} />
        )}
      </div>
      <p className="mt-6 text-xs text-slate-500">As pré-visualizações usam dados de exemplo fictícios. O seu CV usa apenas as informações que introduzir.</p>

      <section className="mt-14 max-w-3xl space-y-3 text-slate-700">
        <h2 className="text-2xl font-bold">Como escolher o modelo de CV certo</h2>
        <p>
          Para o <strong>primeiro emprego</strong>, prefira um modelo simples que destaque a formação, estágios e voluntariado. Em <strong>contabilidade, finanças ou saúde</strong>, um
          modelo sóbrio transmite rigor. Para <strong>marketing, vendas ou informática</strong>, um modelo moderno ajuda a destacar competências.
        </p>
        <p>
          Se vai candidatar-se num portal de emprego ou numa grande empresa, escolha um modelo <strong>compatível com ATS</strong>: uma coluna, sem gráficos, lido sem erros pelos sistemas
          de recrutamento. Veja também os nossos{" "}
          <Link href="/conselhos" className="font-semibold text-brand-700 underline">
            conselhos de carreira
          </Link>
          .
        </p>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Modelos de CV",
          itemListElement: templates.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: `Modelo de CV ${t.name}`, url: appUrl(`/cv-modelos/${t.slug}`) })),
        }}
      />
    </div>
  );
}
