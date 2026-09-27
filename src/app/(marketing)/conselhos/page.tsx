import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { ProsePage } from "../legal-page";

export const metadata: Metadata = {
  title: "Conselhos de carreira",
  description:
    "Como fazer um CV em Moçambique, enviar o CV por email, escrever uma carta de candidatura e preparar a entrevista de emprego. Conselhos práticos e honestos.",
  alternates: { canonical: "/conselhos" },
};

const TOC = [
  { id: "cv", title: "Como fazer um bom CV" },
  { id: "erros", title: "Erros comuns no CV" },
  { id: "adaptar", title: "Como adaptar o CV a uma vaga" },
  { id: "email", title: "Como enviar o CV por email" },
  { id: "carta", title: "Como escrever uma carta de candidatura" },
  { id: "entrevista", title: "Como preparar a entrevista" },
];

export default function AdvicePage() {
  return (
    <ProsePage
      title="Conselhos de carreira"
      intro="Orientações práticas para preparar uma candidatura clara, honesta e profissional."
    >
      <nav aria-label="Índice" className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-ink">Nesta página</p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          {TOC.map((t, i) => (
            <li key={t.id} className="!ml-0 !list-none !pl-0">
              <a href={`#${t.id}`} className="text-brand-700 hover:underline">
                {i + 1}. {t.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <h2 id="cv">1. Como fazer um bom CV</h2>
      <ul>
        <li><strong>Dados de contacto no topo:</strong> nome, telefone, email profissional e cidade. Não é necessário incluir o número do BI.</li>
        <li><strong>Perfil profissional:</strong> 3 a 4 linhas sobre a sua área, experiência (ou formação) e o que procura.</li>
        <li><strong>Experiência do mais recente para o mais antigo:</strong> cargo, empresa, datas e 2 a 4 responsabilidades ou resultados.</li>
        <li><strong>Formação, competências e idiomas:</strong> inclua o que é relevante para a vaga.</li>
        <li><strong>Tamanho:</strong> 1 página para o primeiro emprego; até 2 páginas com mais experiência.</li>
      </ul>

      <h2 id="erros">2. Erros comuns no CV</h2>
      <ul>
        <li>Erros de ortografia — peça a alguém para rever antes de enviar.</li>
        <li>Email pouco profissional (ex.: apelidos ou alcunhas). Crie um com o seu nome.</li>
        <li>Fotografias informais. A foto é opcional; se usar, escolha uma imagem simples e com fundo neutro.</li>
        <li>Blocos de texto enormes. Use frases curtas e listas.</li>
        <li>Informação falsa ou exagerada. Pode ser verificada — e a honestidade conta.</li>
      </ul>

      <h2 id="adaptar">3. Como adaptar o CV a uma vaga</h2>
      <p>
        Leia o anúncio e sublinhe as competências e requisitos pedidos. Depois, no seu CV, coloque em destaque as experiências e competências <strong>que realmente
        tem</strong> e que correspondem ao anúncio. Ajuste o perfil profissional para mencionar a função. No Emprego Fácil MZ pode{" "}
        <strong>duplicar o CV</strong> e criar uma versão para cada tipo de vaga.
      </p>

      <h2 id="email">4. Como enviar o CV por email</h2>
      <ul>
        <li><strong>Assunto claro:</strong> «Candidatura — Assistente Administrativo — Ref. 12/2026».</li>
        <li><strong>Texto curto:</strong> cumprimento, a vaga a que se candidata, uma frase sobre o seu perfil e agradecimento.</li>
        <li><strong>Anexos em PDF</strong> com nomes claros: <em>CV-Ana-Machava.pdf</em>, <em>Carta-Ana-Machava.pdf</em>.</li>
        <li>Verifique o endereço de email do recrutador e envie de um email profissional.</li>
      </ul>

      <h2 id="carta">5. Como escrever uma carta de candidatura</h2>
      <p>Uma carta de uma página, com 3 a 4 parágrafos:</p>
      <ul>
        <li><strong>Introdução:</strong> a vaga e onde a viu.</li>
        <li><strong>O seu perfil:</strong> formação e experiência relevantes.</li>
        <li><strong>Motivação:</strong> porque quer trabalhar naquela organização e como pode contribuir.</li>
        <li><strong>Encerramento:</strong> disponibilidade para entrevista e agradecimento.</li>
      </ul>
      <p>
        Pode começar pelo nosso <Link href="/kits/modelo-gratuito" className="font-semibold text-brand-700 underline">modelo gratuito de carta de candidatura</Link>.
      </p>

      <h2 id="entrevista">6. Como preparar a entrevista</h2>
      <ul>
        <li>Pesquise a empresa: o que faz, onde atua e quais os seus valores.</li>
        <li>Prepare exemplos concretos da sua experiência (situação, o que fez, resultado).</li>
        <li>Treine respostas às perguntas mais comuns: «Fale-me de si», «Porque quer esta vaga?», «Quais são os seus pontos fortes?».</li>
        <li>Seja honesto: se não tem uma competência, diga o que está a fazer para a desenvolver.</li>
        <li>Chegue 10 minutos antes, leve cópias do CV e prepare 1 ou 2 perguntas para o recrutador.</li>
      </ul>

      <div className="mt-10 rounded-2xl bg-brand-50 p-6 text-center">
        <p className="text-lg font-semibold text-ink">Pronto para começar?</p>
        <ButtonLink href="/cv-modelos" size="lg" className="mt-4">
          Criar meu CV
        </ButtonLink>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Conselhos de carreira: CV, carta, email e entrevista",
          inLanguage: "pt-MZ",
          publisher: { "@type": "Organization", name: "Emprego Fácil MZ" },
        }}
      />
    </ProsePage>
  );
}
