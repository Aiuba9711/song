import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { ChooseTemplateButton } from "@/components/templates/choose-button";
import { AtsBadge, TemplatePreview } from "@/components/templates/gallery";
import { Badge, Card } from "@/components/ui/card";
import { appUrl } from "@/lib/env";
import { getGalleryTemplates } from "@/server/gallery";
import { PreviewWithToggle } from "./photo-toggle";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getGalleryTemplates().catch(() => [])).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = (await getGalleryTemplates()).find((x) => x.slug === slug);
  if (!t) return { title: "Modelo não encontrado" };
  return {
    title: `Modelo de CV ${t.name} — ${t.categoryLabel}`,
    description: t.description,
    alternates: { canonical: `/cv-modelos/${t.slug}` },
    openGraph: { title: `Modelo de CV ${t.name}`, description: t.description, url: `/cv-modelos/${t.slug}`, images: t.previewImageUrl ? [{ url: t.previewImageUrl }] : undefined },
  };
}

export default async function TemplateDetailPage({ params }: Props) {
  const { slug } = await params;
  const all = await getGalleryTemplates();
  const t = all.find((x) => x.slug === slug);
  if (!t) notFound();
  const related = all.filter((x) => x.slug !== t.slug && (x.category === t.category || x.style === t.style)).slice(0, 4);

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Caminho" className="mb-6 flex items-center gap-1 text-sm text-slate-500">
        <Link href="/cv-modelos" className="hover:text-brand-700">
          Modelos de CV
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span aria-current="page" className="text-slate-700">
          {t.name}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <PreviewWithToggle t={t} />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{t.categoryLabel}</Badge>
              <Badge tone="neutral">{t.style}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Modelo {t.name}</h1>
            {t.isAtsFriendly && <AtsBadge className="mt-2" />}
            <p className="mt-3 text-slate-600">{t.description}</p>
            <p className="mt-4 text-3xl font-extrabold text-ink">{t.priceLabel}</p>
            <p className="text-sm text-slate-500">por CV · pagamento por M-Pesa, e-Mola ou mKesh</p>
            <div className="mt-5">
              <ChooseTemplateButton slug={t.slug} />
            </div>
            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
              {[
                "Formato A4, pronto a imprimir",
                "Com ou sem fotografia",
                "Pré-visualização grátis enquanto preenche",
                "PDF sem marca d'água após o pagamento",
                "Word (DOCX) editável",
                "Pode trocar de modelo até finalizar",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <BadgeCheck className="size-4 shrink-0 text-go-600" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </Card>
          {t.isAtsFriendly && (
            <Card className="p-5 text-sm text-slate-600">
              <p className="font-semibold text-ink">O que é «compatível com ATS»?</p>
              <p className="mt-1">
                Muitas empresas usam sistemas que leem o CV automaticamente. Este modelo usa uma coluna, texto simples e títulos claros — sem gráficos, barras ou tabelas complexas.
              </p>
            </Card>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="relacionados">
          <h2 id="relacionados" className="text-2xl font-bold">
            Modelos semelhantes
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/cv-modelos/${r.slug}`} className="group block rounded-2xl border border-slate-200 bg-white p-3 hover:shadow-lift">
                  <TemplatePreview t={r} withPhoto width={260} />
                  <p className="mt-2 font-semibold group-hover:text-brand-700">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {r.categoryLabel} · {r.style}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `Modelo de CV ${t.name}`,
          description: t.description,
          category: t.categoryLabel,
          url: appUrl(`/cv-modelos/${t.slug}`),
          brand: { "@type": "Brand", name: "Emprego Fácil MZ" },
        }}
      />
    </div>
  );
}
