import type { Metadata } from "next";
import Link from "next/link";
import { TemplateThumb } from "@/components/cv/template-thumb";
import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { LAYOUTS } from "@/cv/layouts";
import { appUrl } from "@/lib/env";
import { CATEGORY_LABELS, listActiveTemplates } from "@/server/catalog";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Modelos de CV profissionais",
  description:
    "Modelos de CV gratuitos para Moçambique: primeiro emprego, administrativo, contabilidade, saúde, educação, informática, engenharia e mais. Descarregue em PDF e Word.",
  alternates: { canonical: "/cv-modelos" },
  openGraph: { title: "Modelos de CV profissionais | Emprego Fácil MZ", url: "/cv-modelos" },
};

export default async function TemplatesPage() {
  const templates = await listActiveTemplates();
  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Modelos de CV</h1>
        <p className="mt-3 text-lg text-slate-600">
          Escolha um modelo adequado à sua área. Todos os campos são editáveis e pode trocar de modelo a qualquer momento sem perder os dados.
        </p>
      </header>

      {templates.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Ainda não há modelos disponíveis. Volte em breve.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex justify-center rounded-xl bg-slate-100 py-4">
                <TemplateThumb layout={t.layout} accentColor={t.accentColor} width={220} label={`Pré-visualização do modelo ${t.name} com dados de exemplo`} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h2 className="text-lg font-semibold">{t.name}</h2>
                <Badge tone="neutral">{LAYOUTS[t.layout].name}</Badge>
              </div>
              <p className="mt-0.5 text-sm font-medium text-brand-700">{CATEGORY_LABELS[t.category]}</p>
              <p className="mt-2 flex-1 text-[15px] text-slate-600">{t.description}</p>
              <ButtonLink href={`/meu-espaco/cvs/novo?modelo=${t.slug}`} prefetch={false} className="mt-4 w-full">
                Usar este modelo
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-slate-500">As pré-visualizações usam dados de exemplo fictícios. O seu CV usa apenas as informações que introduzir.</p>

      <section className="mt-14 max-w-3xl space-y-3 text-slate-700">
        <h2 className="text-2xl font-bold">Como escolher o modelo de CV certo</h2>
        <p>
          Para o <strong>primeiro emprego</strong>, prefira um modelo simples que destaque a formação, estágios e voluntariado. Em áreas como{" "}
          <strong>contabilidade, administração ou saúde</strong>, um modelo clássico e sóbrio transmite rigor. Para <strong>informática, marketing ou vendas</strong>, um
          modelo moderno ajuda a destacar competências.
        </p>
        <p>
          Seja qual for o modelo, o mais importante é o conteúdo: informação verdadeira, organizada e adaptada à vaga. Veja também os nossos{" "}
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
          itemListElement: templates.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `Modelo de CV ${t.name}`,
            url: appUrl(`/meu-espaco/cvs/novo?modelo=${t.slug}`),
          })),
        }}
      />
    </div>
  );
}
