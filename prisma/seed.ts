/**
 * Seed idempotente: modelos de CV, produtos iniciais, kit gratuito e definições.
 * NÃO cria utilizadores nem administradores (usar `npm run admin:create`).
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type CvLayout, type TemplateCategory } from "../src/generated/prisma/client";
import { createStorage } from "../src/lib/storage/create";
import { buildFreeCoverLetterDocx, buildFreeCvTemplateDocx } from "../src/kits/free-kit";
import { randomUUID } from "node:crypto";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TEMPLATES: Array<{ slug: string; name: string; description: string; category: TemplateCategory; layout: CvLayout; accentColor: string }> = [
  { slug: "primeiro-emprego", name: "Primeiro Emprego", category: "PRIMEIRO_EMPREGO", layout: "CLASSICO", accentColor: "#1d40d8", description: "Destaca a formação, estágios, voluntariado e competências — ideal para quem procura o primeiro emprego." },
  { slug: "administrativo", name: "Administrativo", category: "ADMINISTRATIVO", layout: "CLASSICO", accentColor: "#334155", description: "Sóbrio e organizado, para funções de secretariado, assistência administrativa e atendimento." },
  { slug: "contabilidade", name: "Contabilidade", category: "CONTABILIDADE", layout: "EXECUTIVO", accentColor: "#1e3a8a", description: "Estrutura rigorosa com datas em destaque, para contabilistas, técnicos financeiros e auditores." },
  { slug: "recursos-humanos", name: "Recursos Humanos", category: "RECURSOS_HUMANOS", layout: "MODERNO", accentColor: "#0e7490", description: "Barra lateral com competências interpessoais e idiomas, para gestão de pessoas e recrutamento." },
  { slug: "saude", name: "Saúde", category: "SAUDE", layout: "CLASSICO", accentColor: "#0f766e", description: "Claro e profissional, para enfermagem, técnicos de saúde, farmácia e medicina." },
  { slug: "educacao", name: "Educação", category: "EDUCACAO", layout: "MODERNO", accentColor: "#a16207", description: "Para professores, formadores e educadores — destaca formação e experiência pedagógica." },
  { slug: "informatica", name: "Informática", category: "INFORMATICA", layout: "MODERNO", accentColor: "#1d4ed8", description: "Moderno, com competências técnicas em evidência, para TI, suporte, redes e programação." },
  { slug: "engenharia", name: "Engenharia", category: "ENGENHARIA", layout: "EXECUTIVO", accentColor: "#9a3412", description: "Para engenheiros e técnicos — projetos, certificações e experiência de campo em destaque." },
  { slug: "vendas-marketing", name: "Vendas e Marketing", category: "VENDAS_MARKETING", layout: "MODERNO", accentColor: "#be123c", description: "Visual confiante para vendas, marketing, comunicação e atendimento comercial." },
  { slug: "executivo", name: "Executivo", category: "EXECUTIVO", layout: "EXECUTIVO", accentColor: "#0f172a", description: "Para cargos de direção e gestão sénior: cabeçalho forte e tipografia elegante." },
];

type SeedProduct = {
  slug: string;
  name: string;
  tier: string | null;
  shortDescription: string;
  description: string;
  priceMinor: number;
  status: "ACTIVE" | "DRAFT";
  isFeatured: boolean;
  sortOrder: number;
  features: string[];
  faq: Array<{ q: string; a: string }>;
};

const COMMON_FAQ = [
  { q: "Como recebo os materiais?", a: "Depois da confirmação, os ficheiros ficam disponíveis em «Meu Espaço → Meus kits» e pode descarregá-los sempre que precisar." },
  { q: "Os modelos são editáveis?", a: "Sim. Os modelos são entregues em Word (.docx) para adaptar com as suas informações." },
  { q: "Este kit garante emprego?", a: "Não. Nenhum material garante emprego. O kit ajuda-o a apresentar-se de forma mais profissional e a melhorar a qualidade da sua candidatura." },
];

const PRODUCTS: SeedProduct[] = [
  {
    slug: "modelo-gratuito",
    name: "Modelo Gratuito: CV + Carta de Candidatura",
    tier: null,
    shortDescription: "1 modelo de CV e 1 carta de candidatura em Word, prontos para adaptar.",
    description:
      "Comece já a preparar a sua candidatura com dois modelos editáveis em Word.\n\nO modelo de CV segue uma estrutura clara e profissional. A carta de candidatura inclui orientações sobre o que escrever em cada parágrafo. Basta substituir os campos entre parênteses retos pelas suas informações verdadeiras.",
    priceMinor: 0,
    status: "ACTIVE",
    isFeatured: false,
    sortOrder: 0,
    features: ["1 modelo de CV em Word (.docx)", "1 modelo de carta de candidatura em Word (.docx)", "Dicas de preenchimento incluídas"],
    faq: [{ q: "É mesmo gratuito?", a: "Sim. Só precisa de criar uma conta para descarregar os ficheiros." }, ...COMMON_FAQ.slice(1, 3)],
  },
  {
    slug: "kit-emprego-basico",
    name: "Kit Emprego Fácil MZ — Básico",
    tier: "BASIC",
    shortDescription: "Modelos de CV e cartas em Word para começar a candidatar-se com confiança.",
    description:
      "O essencial para preparar candidaturas com uma apresentação cuidada.\n\nInclui modelos de CV para diferentes áreas e modelos de cartas de candidatura, todos editáveis em Word.",
    priceMinor: 19900,
    status: "ACTIVE",
    isFeatured: false,
    sortOrder: 10,
    features: ["10 modelos de CV em Word", "5 modelos de cartas", "Checklist de candidatura"],
    faq: COMMON_FAQ,
  },
  {
    slug: "kit-emprego-profissional",
    name: "Kit Emprego Fácil MZ — Profissional",
    tier: "PROFISSIONAL",
    shortDescription: "O kit completo: CVs, cartas, emails, WhatsApp e preparação para entrevistas.",
    description:
      "Tudo o que precisa para preparar a candidatura do início ao fim.\n\nAlém dos modelos de CV e cartas, inclui modelos de email e de mensagens de WhatsApp para contactar recrutadores, um guia de entrevista com perguntas frequentes e um guia para quem procura o primeiro emprego.",
    priceMinor: 39900,
    status: "ACTIVE",
    isFeatured: true,
    sortOrder: 20,
    features: [
      "10 modelos de CV em Word",
      "5 modelos de cartas (candidatura e motivação)",
      "Modelos de email de candidatura",
      "Modelos de mensagens de WhatsApp",
      "Guia de entrevista",
      "Perguntas de entrevista com orientação de resposta",
      "Checklist de candidatura",
      "Guia para o primeiro emprego",
    ],
    faq: COMMON_FAQ,
  },
  {
    slug: "kit-emprego-premium",
    name: "Kit Emprego Fácil MZ — Premium",
    tier: "PREMIUM",
    shortDescription: "Kit Profissional + materiais adicionais (conteúdo a definir pelo administrador).",
    description: "Versão alargada do Kit Profissional. Defina o conteúdo adicional no painel administrativo antes de ativar este produto.",
    priceMinor: 69900,
    status: "DRAFT",
    isFeatured: false,
    sortOrder: 30,
    features: ["Tudo o que está no Kit Profissional"],
    faq: COMMON_FAQ,
  },
];

async function main() {
  for (const [i, t] of TEMPLATES.entries()) {
    await db.cVTemplate.upsert({
      where: { slug: t.slug },
      create: { ...t, sortOrder: i * 10 },
      update: {},
    });
  }
  console.info(`✔ ${TEMPLATES.length} modelos de CV`);

  for (const p of PRODUCTS) {
    await db.product.upsert({
      where: { slug: p.slug },
      create: { ...p, type: "KIT", currency: "MZN" },
      update: {},
    });
  }
  console.info(`✔ ${PRODUCTS.length} produtos`);

  // Ficheiros do produto gratuito (gerados, sem conteúdo fictício do utilizador).
  const free = await db.product.findUniqueOrThrow({ where: { slug: "modelo-gratuito" }, include: { files: true } });
  if (free.files.length === 0) {
    const storage = createStorage(process.env);
    const files = [
      { name: "Modelo de CV (Word)", fileName: "modelo-cv-emprego-facil-mz.docx", build: buildFreeCvTemplateDocx },
      { name: "Modelo de carta de candidatura (Word)", fileName: "modelo-carta-candidatura.docx", build: buildFreeCoverLetterDocx },
    ];
    for (const [i, f] of files.entries()) {
      const body = await f.build();
      const key = `products/${free.id}/${randomUUID()}.docx`;
      await storage.put({ key, body, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      await db.productFile.create({
        data: {
          productId: free.id,
          name: f.name,
          fileName: f.fileName,
          storageKey: key,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          sizeBytes: body.length,
          sortOrder: i,
        },
      });
    }
    console.info("✔ ficheiros do modelo gratuito");
  }

  await db.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", supportHours: "Segunda a sexta, 8h–17h" },
    update: {},
  });
  console.info("✔ definições do site");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
