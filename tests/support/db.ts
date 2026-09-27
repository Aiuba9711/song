import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { Role } from "@/generated/prisma/enums";

/** Limpa todas as tabelas (base de dados de TESTE). */
export async function resetDatabase() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

let counter = 0;

export async function createUser(opts: { role?: Role; password?: string; email?: string; name?: string } = {}) {
  counter += 1;
  return db.user.create({
    data: {
      email: opts.email ?? `utilizador${counter}-${Date.now()}@teste.co.mz`,
      name: opts.name ?? `Utilizador ${counter}`,
      passwordHash: await hashPassword(opts.password ?? "SenhaSegura1"),
      role: opts.role ?? "USER",
      termsAcceptedAt: new Date(),
      profile: { create: {} },
    },
  });
}

export async function createTemplate(overrides: Partial<{ slug: string; isActive: boolean; layout: "CLASSICO" | "MODERNO" | "EXECUTIVO" }> = {}) {
  counter += 1;
  return db.cVTemplate.create({
    data: {
      slug: overrides.slug ?? `modelo-${counter}`,
      name: `Modelo ${counter}`,
      description: "Modelo de teste",
      layout: overrides.layout ?? "CLASSICO",
      isActive: overrides.isActive ?? true,
      sortOrder: counter,
    },
  });
}

export async function createProduct(overrides: Partial<{ priceMinor: number; status: "DRAFT" | "ACTIVE" | "ARCHIVED"; slug: string }> = {}) {
  counter += 1;
  return db.product.create({
    data: {
      slug: overrides.slug ?? `produto-${counter}`,
      name: `Produto ${counter}`,
      shortDescription: "Produto de teste",
      description: "Descrição do produto de teste",
      priceMinor: overrides.priceMinor ?? 0,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

/** Configuração de pagamentos de TESTE (números fictícios, nunca os reais). */
export async function createPaymentSettings(overrides: Partial<{ cvPaywallEnabled: boolean; mpesaEnabled: boolean; emolaEnabled: boolean; mkeshEnabled: boolean; defaultPriceMinor: number; currency: string }> = {}) {
  return db.paymentSettings.upsert({
    where: { id: "default" },
    update: overrides,
    create: {
      id: "default",
      mpesaEnabled: true,
      mpesaNumber: "840000001",
      emolaEnabled: true,
      emolaNumber: "860000002",
      mkeshEnabled: false,
      mkeshNumber: "820000003",
      instructions: "Passo 1\nPasso 2",
      currency: "MZN",
      defaultPriceMinor: 19900,
      ...overrides,
    },
  });
}
