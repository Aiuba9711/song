import "server-only";
import type { PaymentProviderId } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { PaymentError } from "@/lib/payments/types";
import { calculateTotals } from "@/lib/pricing";
import { generateOrderNumber } from "@/server/orders";
import { getPaymentProvider } from "@/server/payments/registry";
import { getPaymentSettings } from "@/server/payments/settings";

export const MAX_OPEN_ORDERS = 5;

export type CheckoutTarget = { productSlug: string } | { cvId: string };

export type ResolvedItem = {
  kind: "PRODUCT" | "CV_UNLOCK";
  productId: string | null;
  cvId: string | null;
  name: string;
  description: string;
  unitPriceMinor: number;
  currency: string;
};

/**
 * Resolve o item a comprar e o PREÇO a partir da base de dados (nunca do cliente).
 * - Produto: preço definido no admin.
 * - CV: "valor padrão" em Admin > Definições > Pagamentos (só se o download de CV for pago).
 */
export async function resolveCheckoutItem(userId: string, target: CheckoutTarget): Promise<ResolvedItem> {
  if ("productSlug" in target) {
    const product = await db.product.findFirst({ where: { slug: target.productSlug, status: "ACTIVE" } });
    if (!product) throw new PaymentError("Produto indisponível.", "INVALID_ITEM");
    if (product.priceMinor === 0) throw new PaymentError("Este produto é gratuito — obtenha-o na página do produto.", "INVALID_ITEM");
    return {
      kind: "PRODUCT",
      productId: product.id,
      cvId: null,
      name: product.name,
      description: product.shortDescription,
      unitPriceMinor: product.priceMinor,
      currency: product.currency,
    };
  }

  const [cv, settings] = await Promise.all([
    db.cV.findFirst({ where: { id: target.cvId, userId }, select: { id: true, title: true, purchasedAt: true, template: { select: { name: true, priceMinor: true } } } }),
    getPaymentSettings(),
  ]);
  if (!cv) throw new PaymentError("CV não encontrado.", "INVALID_ITEM");
  if (!settings.cvPaywallEnabled) throw new PaymentError("O download deste CV já é gratuito.", "INVALID_ITEM");
  if (cv.purchasedAt) throw new PaymentError("Este CV já foi comprado.", "INVALID_ITEM");
  return {
    kind: "CV_UNLOCK",
    productId: null,
    cvId: cv.id,
    name: `CV profissional «${cv.title}»${cv.template ? ` — modelo ${cv.template.name}` : ""}`,
    description: "PDF sem marca d'água e Word (DOCX) editável deste CV.",
    // Preço do modelo (definido no admin) ou valor padrão da configuração de pagamentos.
    unitPriceMinor: cv.template?.priceMinor ?? settings.defaultPriceMinor,
    currency: settings.currency,
  };
}

/** O utilizador já tem este item pago? */
export async function alreadyOwns(userId: string, item: Pick<ResolvedItem, "productId" | "cvId">): Promise<boolean> {
  const where = item.productId ? { productId: item.productId } : { cvId: item.cvId!, kind: "CV_UNLOCK" as const };
  return !!(await db.orderItem.findFirst({ where: { ...where, order: { userId, status: "PAID" } }, select: { id: true } }));
}

export type CustomerDetails = { name: string; email: string; phone: string | null };

/**
 * Cria o pedido (AWAITING_PAYMENT) e a tentativa de pagamento com o método escolhido.
 * Reutiliza um pedido em aberto para o mesmo item, para não duplicar.
 */
export async function createCheckoutOrder(userId: string, input: { target: CheckoutTarget; method: PaymentProviderId; customer: CustomerDetails }) {
  const item = await resolveCheckoutItem(userId, input.target);
  if (await alreadyOwns(userId, item)) throw new PaymentError("Já tem acesso a este item.", "INVALID_ITEM");

  const provider = getPaymentProvider(input.method);
  if (!(await provider.isAvailable())) throw new PaymentError("Este método de pagamento não está disponível.", "UNAVAILABLE");

  const itemWhere = item.productId ? { productId: item.productId } : { cvId: item.cvId! };
  const open = await db.order.findFirst({
    where: { userId, status: { in: ["AWAITING_PAYMENT", "PENDING_VERIFICATION"] }, items: { some: itemWhere } },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (open) {
    if (open.status === "PENDING_VERIFICATION") return { orderNumber: open.number, reused: true };
    // Pedido em aberto: troca de método, se necessário, mantendo o mesmo número.
    const last = open.payments[0];
    if (!last || last.provider !== input.method || (last.status !== "PENDING" && last.status !== "RESUBMISSION_REQUESTED")) {
      await provider.createPayment({ orderId: open.id });
    }
    return { orderNumber: open.number, reused: true };
  }

  const openCount = await db.order.count({ where: { userId, status: { in: ["AWAITING_PAYMENT", "PENDING_VERIFICATION"] } } });
  if (openCount >= MAX_OPEN_ORDERS) {
    throw new PaymentError("Tem demasiados pedidos em aberto. Conclua ou cancele um pedido antes de criar outro.", "LIMIT");
  }

  const totals = calculateTotals([{ unitPriceMinor: item.unitPriceMinor, quantity: 1, currency: item.currency }]);
  let order: { id: string; number: string } | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await db.order.create({
        data: {
          number: generateOrderNumber(),
          userId,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          status: "AWAITING_PAYMENT",
          ...totals,
          items: {
            create: { kind: item.kind, productId: item.productId, cvId: item.cvId, productName: item.name, unitPriceMinor: item.unitPriceMinor, quantity: 1 },
          },
        },
        select: { id: true, number: true },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  if (!order) throw new Error("Não foi possível gerar o número do pedido");

  await provider.createPayment({ orderId: order.id });
  await db.auditLog.create({
    data: { actorId: userId, action: "order.create", entityType: "Order", entityId: order.id, metadata: { number: order.number, totalMinor: totals.totalMinor, method: input.method, kind: item.kind } },
  });
  return { orderNumber: order.number, reused: false };
}

/** Pedido do próprio utilizador (páginas de checkout). */
export async function getCustomerOrder(userId: string, orderNumber: string) {
  return db.order.findFirst({
    where: { number: orderNumber, userId },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/** O cliente pode cancelar um pedido que ainda não enviou para verificação. */
export async function cancelCustomerOrder(userId: string, orderNumber: string) {
  const res = await db.order.updateMany({
    where: { number: orderNumber, userId, status: "AWAITING_PAYMENT" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (res.count === 0) throw new PaymentError("Este pedido já não pode ser cancelado.", "INVALID_STATE");
  const order = await db.order.findUniqueOrThrow({ where: { number: orderNumber }, select: { id: true } });
  await db.payment.updateMany({ where: { orderId: order.id, status: { in: ["PENDING", "RESUBMISSION_REQUESTED"] } }, data: { status: "CANCELLED" } });
  await db.auditLog.create({ data: { actorId: userId, action: "order.cancel", entityType: "Order", entityId: order.id } });
}

/**
 * Pode descarregar (geração final PDF/DOCX) este CV?
 * - Download gratuito (predefinição): sim, para o dono.
 * - Download pago: só com um pedido PAID de desbloqueio para este CV.
 */
export async function canDownloadCv(userId: string, cvId: string): Promise<boolean> {
  const settings = await getPaymentSettings();
  if (!settings.cvPaywallEnabled) return true;
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { purchasedAt: true } });
  if (!cv) return false;
  return !!cv.purchasedAt || (await alreadyOwns(userId, { productId: null, cvId }));
}

/** Preço de um CV (para mostrar no editor): preço do modelo ou valor padrão. */
export async function getCvPrice(templatePriceMinor: number | null | undefined) {
  const settings = await getPaymentSettings();
  return { priceMinor: templatePriceMinor ?? settings.defaultPriceMinor, currency: settings.currency, paywall: settings.cvPaywallEnabled };
}

/** Estado do download pago de CVs para um utilizador (para a interface). */
export async function getCvDownloadAccess(userId: string) {
  const settings = await getPaymentSettings();
  if (!settings.cvPaywallEnabled) return { paywall: false as const, priceMinor: 0, currency: settings.currency, unlocked: new Set<string>() };
  const [items, purchased] = await Promise.all([
    db.orderItem.findMany({ where: { kind: "CV_UNLOCK", cvId: { not: null }, order: { userId, status: "PAID" } }, select: { cvId: true } }),
    db.cV.findMany({ where: { userId, purchasedAt: { not: null } }, select: { id: true } }),
  ]);
  return {
    paywall: true as const,
    priceMinor: settings.defaultPriceMinor,
    currency: settings.currency,
    unlocked: new Set([...items.map((i) => i.cvId!), ...purchased.map((c) => c.id)]),
  };
}
