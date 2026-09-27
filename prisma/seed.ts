/**
 * Seed idempotente: modelos de CV, produtos iniciais, kit gratuito e definições.
 * NÃO cria utilizadores nem administradores (usar `npm run admin:create`).
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { CATALOG } from "../src/cv/catalog";
import { createStorage } from "../src/lib/storage/create";
import { buildFreeCoverLetterDocx, buildFreeCvTemplateDocx } from "../src/kits/free-kit";
import { randomUUID } from "node:crypto";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

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

const DEFAULT_PAYMENT_INSTRUCTIONS = [
  "1. Abra a aplicação ou o menu do seu operador e escolha enviar/transferir dinheiro.",
  "2. Envie o valor exato para o número indicado.",
  "3. Se o operador permitir, escreva a referência do pedido na descrição.",
  "4. Guarde a mensagem (SMS) de confirmação: precisa do código da transação.",
  "5. Volte a esta página e informe os dados do pagamento. O acesso é libertado depois da verificação.",
].join("\n");

async function main() {
  // Biblioteca de modelos (src/cv/catalog.ts). Modelos já existentes só recebem o design
  // se ainda não o tiverem — edições feitas no admin são preservadas.
  let created = 0;
  for (const [i, t] of CATALOG.entries()) {
    const previewFile = path.join("public", "templates", `${t.slug}.jpg`);
    const previewImageUrl = existsSync(previewFile) ? `/templates/${t.slug}.jpg` : null;
    const data = {
      name: t.name,
      description: t.description,
      category: t.category,
      style: t.style,
      layout: t.layout,
      accentColor: t.accentColor,
      isAtsFriendly: t.isAtsFriendly,
      design: t.design as Prisma.InputJsonValue,
      sortOrder: (i + 1) * 10,
    };
    const existing = await db.cVTemplate.findUnique({ where: { slug: t.slug } });
    if (!existing) {
      await db.cVTemplate.create({ data: { slug: t.slug, ...data, previewImageUrl } });
      created++;
    } else if (existing.design === null) {
      await db.cVTemplate.update({ where: { id: existing.id }, data: { ...data, previewImageUrl: existing.previewImageUrl ?? previewImageUrl } });
    } else if (!existing.previewImageUrl && previewImageUrl) {
      await db.cVTemplate.update({ where: { id: existing.id }, data: { previewImageUrl } });
    }
  }
  console.info(`✔ ${CATALOG.length} modelos de CV (${created} novos)`);

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

  // Configuração de pagamentos manuais. Os números vêm APENAS de variáveis de ambiente
  // (nunca do código) e só são usados na primeira criação — depois gerem-se no admin.
  const digits = (v: string | undefined) => (v ?? "").replace(/\D/g, "") || null;
  const mpesa = digits(process.env.SEED_MPESA_NUMBER);
  const emola = digits(process.env.SEED_EMOLA_NUMBER);
  const mkesh = digits(process.env.SEED_MKESH_NUMBER);
  await db.paymentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      mpesaNumber: mpesa,
      mpesaEnabled: !!mpesa,
      emolaNumber: emola,
      emolaEnabled: !!emola,
      mkeshNumber: mkesh,
      mkeshEnabled: !!mkesh,
      instructions: DEFAULT_PAYMENT_INSTRUCTIONS,
      currency: "MZN",
      defaultPriceMinor: 19900,
    },
    update: {},
  });
  console.info(`✔ definições de pagamento (${[mpesa && "M-Pesa", emola && "e-Mola", mkesh && "mKesh"].filter(Boolean).join(", ") || "sem números — configurar no admin"})`);

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
