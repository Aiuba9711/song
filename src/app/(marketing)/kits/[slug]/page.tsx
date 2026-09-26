import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Download, FileText, ShieldCheck, Smartphone } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/whatsapp-button";
import { Faq } from "@/components/marketing/faq";
import { KitIllustration } from "@/components/marketing/kit-illustration";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { formatBytes } from "@/lib/utils";
import { getActiveProduct, listActiveProducts, parseFaq } from "@/server/catalog";
import { getSiteSettings, whatsappLink } from "@/server/settings";
import { claimFreeProductAction } from "../actions";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listActiveProducts().catch(() => [])).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProduct(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/kits/${product.slug}` },
    openGraph: { title: product.name, description: product.shortDescription, url: `/kits/${product.slug}`, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getActiveProduct(slug), getSiteSettings()]);
  if (!product) notFound();

  const free = product.priceMinor === 0;
  const price = free ? "Grátis" : formatMoney(product.priceMinor, product.currency);
  const faq = parseFaq(product.faq);
  const orderMessage = `Olá! Gostaria de comprar o produto "${product.name}" (${price}).`;

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Caminho" className="mb-6 flex items-center gap-1 text-sm text-slate-500">
        <Link href="/kits" className="hover:text-brand-700">
          Kits
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span aria-current="page" className="truncate text-slate-700">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <KitIllustration className="w-full max-w-xl" />
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-lg text-slate-600">{product.shortDescription}</p>

          <section className="mt-8 space-y-3 text-slate-700" aria-labelledby="descricao">
            <h2 id="descricao" className="sr-only">
              Descrição
            </h2>
            {product.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>

          {product.features.length > 0 && (
            <section className="mt-10" aria-labelledby="incluido">
              <h2 id="incluido" className="text-2xl font-bold">
                O que está incluído
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {product.features.map((f) => (
                  <li key={f} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-go-600" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.files.length > 0 && (
            <section className="mt-10" aria-labelledby="ficheiros">
              <h2 id="ficheiros" className="text-2xl font-bold">
                Ficheiros
              </h2>
              <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {product.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 p-4">
                    <FileText className="size-5 shrink-0 text-brand-700" aria-hidden />
                    <span className="flex-1">{f.name}</span>
                    <span className="text-sm text-slate-500">{formatBytes(f.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10" aria-labelledby="como">
            <h2 id="como" className="text-2xl font-bold">
              Como funciona
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, t: free ? "Entre na sua conta" : "Faça o pedido", d: free ? "Crie uma conta grátis ou entre." : "Indique os seus dados e o método de pagamento." },
                { icon: Download, t: "Acesso imediato", d: "Os ficheiros ficam em «Meu Espaço → Meus kits»." },
                { icon: Smartphone, t: "Adapte e envie", d: "Edite em Word no computador ou telemóvel e candidate-se." },
              ].map(({ icon: Icon, t, d }, i) => (
                <li key={t} className="rounded-xl border border-slate-200 bg-white p-4">
                  <Icon className="size-6 text-brand-700" aria-hidden />
                  <p className="mt-2 font-semibold">
                    {i + 1}. {t}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{d}</p>
                </li>
              ))}
            </ol>
          </section>

          {faq.length > 0 && (
            <section className="mt-10" aria-labelledby="faq">
              <h2 id="faq" className="mb-4 text-2xl font-bold">
                Perguntas frequentes
              </h2>
              <Faq items={faq} />
            </section>
          )}
        </div>

        {/* Caixa de compra */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            {product.tier && !free && <Badge tone="neutral">{product.tier}</Badge>}
            <p className="mt-2 text-4xl font-extrabold text-ink">{price}</p>
            {product.compareAtPriceMinor && product.compareAtPriceMinor > product.priceMinor && (
              <p className="text-slate-400 line-through">{formatMoney(product.compareAtPriceMinor, product.currency)}</p>
            )}
            {free ? (
              <form action={claimFreeProductAction} className="mt-5">
                <input type="hidden" name="productId" value={product.id} />
                <SubmitButton variant="success" size="lg" className="w-full" pendingLabel="A preparar…" icon={<Download className="size-5" aria-hidden />}>
                  Obter grátis
                </SubmitButton>
                <p className="mt-3 text-sm text-slate-500">Precisa de uma conta grátis para descarregar.</p>
              </form>
            ) : (
              <div className="mt-5 space-y-3">
                <button type="button" disabled className={buttonClass("primary", "lg", "w-full")} aria-describedby="pagamentos-info">
                  Comprar
                </button>
                <p id="pagamentos-info" className="text-sm text-slate-600">
                  O pagamento online (M-Pesa, e-Mola, mKesh e cartão) estará disponível brevemente.
                  {settings.whatsappNumber && " Para comprar já, fale connosco no WhatsApp."}
                </p>
                {settings.whatsappNumber && (
                  <a
                    href={whatsappLink(settings.whatsappNumber, orderMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("outline", "lg", "w-full")}
                  >
                    <WhatsAppIcon className="size-5 text-[#128c4a]" />
                    Encomendar pelo WhatsApp
                  </a>
                )}
              </div>
            )}
            <ul className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600">
              <li className="flex gap-2">
                <BadgeCheck className="size-4 shrink-0 text-go-600" aria-hidden /> Ficheiros editáveis em Word
              </li>
              <li className="flex gap-2">
                <BadgeCheck className="size-4 shrink-0 text-go-600" aria-hidden /> Downloads protegidos na sua conta
              </li>
              <li className="flex gap-2">
                <BadgeCheck className="size-4 shrink-0 text-go-600" aria-hidden /> Não garantimos emprego — ajudamos a candidatura
              </li>
            </ul>
          </Card>
        </aside>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.shortDescription,
          url: appUrl(`/kits/${product.slug}`),
          brand: { "@type": "Brand", name: "Emprego Fácil MZ" },
          offers: {
            "@type": "Offer",
            price: (product.priceMinor / 100).toFixed(2),
            priceCurrency: product.currency,
            availability: "https://schema.org/InStock",
            url: appUrl(`/kits/${product.slug}`),
          },
        }}
      />
    </div>
  );
}
