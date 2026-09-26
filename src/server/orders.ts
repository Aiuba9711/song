import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { DomainError } from "@/server/users";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 0/O/1/I para leitura fácil ao telefone

/** Número de pedido legível, ex.: EF-20260926-7K3P */
export function generateOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `EF-${date}-${suffix}`;
}

/**
 * Obtém um produto gratuito: cria um pedido pago com valor 0 (fornecedor FREE) para que
 * o fluxo de entrega seja o mesmo dos produtos pagos. Idempotente por utilizador/produto.
 */
export async function claimFreeProduct(userId: string, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" } });
  if (!product) throw new DomainError("Produto indisponível.", "NOT_FOUND");
  if (product.priceMinor !== 0) throw new DomainError("Este produto não é gratuito.", "NOT_FREE");

  const existing = await db.order.findFirst({
    where: { userId, status: "PAID", items: { some: { productId } } },
    select: { id: true, number: true },
  });
  if (existing) return { order: existing, created: false };

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true } });

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await db.order.create({
        data: {
          number: generateOrderNumber(),
          userId,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone,
          status: "PAID",
          subtotalMinor: 0,
          totalMinor: 0,
          currency: product.currency,
          paidAt: new Date(),
          items: { create: { productId: product.id, productName: product.name, unitPriceMinor: 0 } },
          payments: { create: { provider: "FREE", status: "SUCCEEDED", amountMinor: 0, currency: product.currency } },
        },
        select: { id: true, number: true },
      });
      return { order, created: true };
    } catch (error) {
      // Colisão improvável no número do pedido → tenta de novo.
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new Error("Não foi possível gerar o número do pedido");
}

/** Produtos a que o utilizador tem acesso (pedidos pagos), com os respetivos ficheiros. */
export async function listUserProducts(userId: string) {
  const items = await db.orderItem.findMany({
    where: { order: { userId, status: "PAID" }, productId: { not: null } },
    orderBy: { order: { paidAt: "desc" } },
    select: {
      order: { select: { number: true, paidAt: true } },
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          shortDescription: true,
          files: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, fileName: true, mimeType: true, sizeBytes: true } },
        },
      },
    },
  });
  // Remove duplicados (o mesmo produto comprado mais de uma vez).
  const seen = new Set<string>();
  return items.filter((i) => i.product && !seen.has(i.product.id) && seen.add(i.product.id));
}

export async function listUserOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      totalMinor: true,
      currency: true,
      createdAt: true,
      items: { select: { productName: true } },
      payments: { select: { provider: true }, take: 1, orderBy: { createdAt: "desc" } },
    },
  });
}

/** Verifica se o utilizador pode descarregar um ficheiro de produto. */
export async function getEntitledFile(userId: string, fileId: string) {
  const file = await db.productFile.findUnique({ where: { id: fileId } });
  if (!file) return null;
  const owns = await db.orderItem.findFirst({
    where: { productId: file.productId, order: { userId, status: "PAID" } },
    select: { id: true },
  });
  return owns ? file : null;
}

export async function userOwnsProduct(userId: string, productId: string): Promise<boolean> {
  const item = await db.orderItem.findFirst({ where: { productId, order: { userId, status: "PAID" } }, select: { id: true } });
  return !!item;
}
