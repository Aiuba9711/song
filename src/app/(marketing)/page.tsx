import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Download,
  FileText,
  FileWarning,
  Mail,
  MailX,
  MessageSquareText,
  PenLine,
  SpellCheck,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { AtsBadge, TemplatePreview } from "@/components/templates/gallery";
import { Faq } from "@/components/marketing/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { getFeaturedProduct } from "@/server/catalog";
import { getGalleryTemplates } from "@/server/gallery";
import { getPublicPaymentSummary } from "@/server/payments/settings";

export const revalidate = 3600;

const PROBLEMS = [
  { icon: FileWarning, title: "CV mal estruturado", text: "Informação desorganizada faz o recrutador perder o interesse nos primeiros segundos." },
  { icon: SpellCheck, title: "Erros de português", text: "Pequenos erros transmitem descuido, mesmo quando o candidato é competente." },
  { icon: MailX, title: "Candidatura sem carta", text: "Enviar só o CV, sem apresentação, torna a candidatura igual a tantas outras." },
  { icon: Mail, title: "Email inadequado", text: "Assunto vazio, texto informal ou anexos com nomes confusos prejudicam a primeira impressão." },
  { icon: Users, title: "Falta de preparação", text: "Chegar à entrevista sem saber responder às perguntas mais comuns gera nervosismo." },
  { icon: Target, title: "CV igual para todas as vagas", text: "Não adaptar o CV ao anúncio esconde as competências que a empresa procura." },
];

const SOLUTIONS = [
  { icon: FileText, title: "CV profissional", text: "Modelos modernos e editáveis. Preencha passo a passo e descarregue em PDF e Word.", href: "/cv-modelos", cta: "Ver modelos" },
  { icon: PenLine, title: "Cartas", text: "Gerador de carta de candidatura e de motivação: preencha os dados, edite e descarregue em PDF ou Word.", href: "/meu-espaco/cartas", cta: "Criar carta" },
  { icon: ClipboardList, title: "Entrevista", text: "Perguntas frequentes, o que o recrutador avalia e como estruturar a resposta.", href: "/kits", cta: "Ver kits" },
  { icon: MessageSquareText, title: "Candidaturas", text: "Modelos de email e de mensagem de WhatsApp para contactar recrutadores, prontos a copiar.", href: "/meu-espaco/mensagens", cta: "Ver modelos" },
];

const STEPS = [
  { icon: UserPlus, title: "Escolha um modelo", text: "Mais de 36 modelos por área profissional. Crie a conta grátis em menos de um minuto." },
  { icon: PenLine, title: "Preencha passo a passo", text: "Dados, experiência, formação, competências — com dicas em cada etapa." },
  { icon: Download, title: "Descarregue", text: "Veja a pré-visualização em tempo real e baixe em PDF ou Word." },
];

const FAQ = [

  { q: "Funciona no telemóvel?", a: "Sim. A plataforma foi pensada para smartphones Android e funciona bem mesmo com internet lenta. Pode instalá-la no ecrã inicial." },
  { q: "Os meus dados ficam públicos?", a: "Não. Os seus CVs são privados e só podem ser vistos e descarregados por si, depois de entrar na sua conta." },
  { q: "O Emprego Fácil MZ garante emprego?", a: "Não. Nenhuma ferramenta garante emprego. Ajudamos a apresentar a sua candidatura de forma mais clara e profissional." },
];

export default async function HomePage() {
  const [featured, payments, templates] = await Promise.all([getFeaturedProduct(), getPublicPaymentSummary(), getGalleryTemplates().catch(() => [])]);
  // Uma amostra variada: um modelo por estilo.
  const showcase = templates.filter((t, i) => templates.findIndex((x) => x.style === t.style) === i).slice(0, 6);
  const hero = [templates.find((t) => t.slug === "horizonte") ?? templates[0], templates.find((t) => t.slug === "executivo") ?? templates[1]];
  const faq = [
    payments.cvPaywallEnabled
      ? {
          q: "Criar o CV é gratuito?",
          a: `Escolher o modelo, preencher e pré-visualizar é gratuito. O CV final — PDF sem marca d'água e Word editável — custa ${formatMoney(payments.cvPriceMinor, payments.currency)} por CV, pago por M-Pesa, e-Mola ou mKesh.`,
        }
      : { q: "Criar o CV é gratuito?", a: "Sim. Pode criar, editar e descarregar os seus CVs em PDF e Word gratuitamente. Os kits com materiais adicionais são pagos." },
    ...FAQ,
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-slate-50">
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="animate-slide-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-800 shadow-soft ring-1 ring-brand-100">
              <BadgeCheck className="size-4 text-go-600" aria-hidden />
              Feito para quem procura emprego em Moçambique
            </p>
            <h1 className="text-[2rem] leading-[1.15] font-extrabold tracking-tight sm:text-5xl">
              Cria uma candidatura profissional e aumenta a qualidade da tua apresentação.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Modelos de CV, cartas de candidatura, preparação para entrevistas e ferramentas práticas para quem procura emprego em Moçambique.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/cv-modelos" size="lg" icon={<FileText className="size-5" aria-hidden />}>
                Criar meu CV
              </ButtonLink>
              <ButtonLink href="/kits" size="lg" variant="outline">
                Ver Kits
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              {["36+ modelos profissionais", "PDF e Word", "Funciona no telemóvel"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-go-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto hidden sm:block" aria-hidden>
            <div className="absolute -inset-6 rounded-[2rem] bg-brand-100/60 blur-2xl" />
            <div className="relative flex gap-4">
              {hero[0] && (
                <div className="w-[260px] rotate-[-3deg] overflow-hidden rounded-xl shadow-lift">
                  <TemplatePreview t={hero[0]} withPhoto width={260} />
                </div>
              )}
              {hero[1] && (
                <div className="mt-10 hidden w-[200px] rotate-[3deg] overflow-hidden rounded-xl shadow-lift lg:block">
                  <TemplatePreview t={hero[1]} withPhoto width={200} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="container-page py-14 sm:py-20" aria-labelledby="problema">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">O problema</p>
          <h2 id="problema" className="mt-2 text-3xl font-bold tracking-tight">
            Muitas candidaturas boas perdem-se por detalhes
          </h2>
          <p className="mt-3 text-slate-600">Estes são os erros mais comuns que vemos nas candidaturas — e todos têm solução.</p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <Card className="h-full p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="mt-3 text-[15px] text-slate-600">{text}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* SOLUÇÃO */}
      <section className="bg-white py-14 sm:py-20" aria-labelledby="solucao">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold tracking-wide text-go-700 uppercase">A solução</p>
            <h2 id="solucao" className="mt-2 text-3xl font-bold tracking-tight">
              Tudo o que precisa para se candidatar com confiança
            </h2>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOLUTIONS.map(({ icon: Icon, title, text, href, cta }) => (
              <li key={title}>
                <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-lift">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 flex-1 text-[15px] text-slate-600">{text}</p>
                  <Link href={href} prefetch={false} className="mt-4 inline-flex items-center gap-1 font-semibold text-brand-700 hover:gap-2 hover:underline">
                    {cta} <ArrowRight className="size-4 transition-all" aria-hidden />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="container-page py-14 sm:py-20" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-3xl font-bold tracking-tight">
          Como funciona
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-5">
              <span className="absolute top-4 right-4 text-4xl font-black text-slate-100" aria-hidden>
                {i + 1}
              </span>
              <Icon className="size-7 text-brand-700" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold">
                <span className="sr-only">Passo {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-1 text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* MODELOS */}
      <section className="bg-white py-14 sm:py-20" aria-labelledby="modelos">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 id="modelos" className="text-3xl font-bold tracking-tight">
                Modelos para diferentes profissões
              </h2>
              <p className="mt-2 text-slate-600">
                Mais de 36 modelos originais em 22 áreas — de Primeiro Emprego a Executivo. Troque de modelo até finalizar; os seus dados mantêm-se.
              </p>
            </div>
            <ButtonLink href="/cv-modelos" variant="secondary">
              Ver todos os modelos
            </ButtonLink>
          </div>
          <ul className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
            {showcase.map((t) => (
              <li key={t.slug} className="w-[200px] shrink-0 snap-start sm:w-auto">
                <Link href={`/cv-modelos/${t.slug}`} className="group block rounded-2xl p-2 transition-colors hover:bg-slate-50">
                  <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
                    <TemplatePreview t={t} withPhoto width={200} />
                  </div>
                  <h3 className="mt-2 font-semibold group-hover:text-brand-700">{t.name}</h3>
                  <p className="text-xs text-slate-500">
                    {t.categoryLabel} · {t.style}
                  </p>
                  {t.isAtsFriendly && <AtsBadge className="mt-1" />}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">As miniaturas usam dados de exemplo fictícios.</p>
        </div>
      </section>

      {/* OFERTA */}
      <section className="container-page py-14 sm:py-20" aria-labelledby="oferta">
        <div className="grid gap-6 overflow-hidden rounded-3xl bg-brand-900 p-6 text-white sm:p-10 lg:grid-cols-2">
          <div>
            <h2 id="oferta" className="text-3xl font-bold tracking-tight text-white">
              Comece com um modelo gratuito
            </h2>
            <p className="mt-3 text-brand-100">
              Descarregue grátis 1 modelo de CV e 1 carta de candidatura em Word. Quando precisar de mais, o kit completo inclui modelos de CV, cartas, emails, WhatsApp e guia de entrevista.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/kits/modelo-gratuito" variant="success" size="lg">
                Obter modelo grátis
              </ButtonLink>
              {featured && (
                <ButtonLink href={`/kits/${featured.slug}`} size="lg" className="bg-white text-brand-900 hover:bg-brand-50">
                  Kit Completo — {formatMoney(featured.priceMinor, featured.currency)}
                </ButtonLink>
              )}
            </div>
          </div>
          <ul className="grid content-center gap-3 text-brand-50">
            {["Apresente-se de forma mais profissional.", "Melhore a qualidade da sua candidatura.", "Tenha modelos prontos para adaptar."].map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-xl bg-white/10 p-4">
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-go-100" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page pb-6" aria-labelledby="faq">
        <h2 id="faq" className="text-3xl font-bold tracking-tight">
          Perguntas frequentes
        </h2>
        <div className="mt-6 max-w-3xl">
          <Faq items={faq} />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container-page py-14 text-center">
        <h2 className="text-3xl font-bold tracking-tight">O teu próximo emprego começa com uma boa candidatura.</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Crie agora o seu CV — é grátis e pode editar sempre que precisar.</p>
        <ButtonLink href="/cv-modelos" size="lg" className="mt-6">
          Criar meu CV
        </ButtonLink>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
    </>
  );
}
