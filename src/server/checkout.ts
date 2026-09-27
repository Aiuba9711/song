import "server-only";
import type { PaymentProviderId } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { PaymentError } from "@/lib/payments/types";
import { calculateTotals } from "@/lib/pricing";
import { generateOrderNumber } from "@/server/orders";
import { getPaymentProvider } from "@/server/payments/registry";
import { getPaymentSettings } from "@/server/payments/settings";
import { getPhotoPricing } from "@/server/photos";

export const MAX_OPEN_ORDERS = 5;

export type CheckoutTarget = { productSlug: string } | { cvId: string } | { letterId: string } | { photoId: string } | { bundle: { cvId: string; photoId: string } };

export type ResolvedItem = {
  kind: "PRODUCT" | "CV_UNLOCK" | "LETTER_UNLOCK" | "PHOTO_UNLOCK" | "CV_PHOTO_BUNDLE";
  productId: string | null;
  cvId: string | null;
  letterId: string | null;
  photoId?: string | null;
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
      letterId: null,
      name: product.name,
      description: product.shortDescription,
      unitPriceMinor: product.priceMinor,
      currency: product.currency,
    };
  }

  if ("photoId" in target || "bundle" in target) return resolvePhotoItem(userId, target);

  if ("letterId" in target) {
    const [letter, settings] = await Promise.all([
      db.coverLetter.findFirst({ where: { id: target.letterId, userId }, select: { id: true, title: true, type: true, purchasedAt: true } }),
      getPaymentSettings(),
    ]);
    if (!letter) throw new PaymentError("Carta não encontrada.", "INVALID_ITEM");
    if (settings.letterPriceMinor <= 0) throw new PaymentError("O download desta carta é gratuito.", "INVALID_ITEM");
    if (letter.purchasedAt) throw new PaymentError("Esta carta já foi comprada.", "INVALID_ITEM");
    return {
      kind: "LETTER_UNLOCK",
      productId: null,
      cvId: null,
      letterId: letter.id,
      name: `${letter.type === "MOTIVACAO" ? "Carta de motivação" : "Carta de candidatura"} «${letter.title}»`,
      description: "PDF e Word (DOCX) editável desta carta.",
      // Preço configurável em Admin > Definições > Pagamentos.
      unitPriceMinor: settings.letterPriceMinor,
      currency: settings.currency,
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
    letterId: null,
    name: `CV profissional «${cv.title}»${cv.template ? ` — modelo ${cv.template.name}` : ""}`,
    description: "PDF sem marca d'água e Word (DOCX) editável deste CV.",
    // Preço do modelo (definido no admin) ou valor padrão da configuração de pagamentos.
    unitPriceMinor: cv.template?.priceMinor ?? settings.defaultPriceMinor,
    currency: settings.currency,
  };
}

/** O utilizador já tem este item pago? */
export async function alreadyOwns(userId: string, item: Pick<ResolvedItem, "productId" | "cvId"> & { letterId?: string | null; photoId?: string | null; kind?: ResolvedItem["kind"] }): Promise<boolean> {
  if (item.kind === "CV_PHOTO_BUNDLE") {
    return !!(await db.orderItem.findFirst({ where: { kind: "CV_PHOTO_BUNDLE", cvId: item.cvId, photoId: item.photoId, order: { userId, status: "PAID" } }, select: { id: true } }));
  }
  if (item.photoId) {
    return !!(await db.orderItem.findFirst({ where: { photoId: item.photoId, kind: { in: ["PHOTO_UNLOCK", "CV_PHOTO_BUNDLE"] }, order: { userId, status: "PAID" } }, select: { id: true } }));
  }
  const where = item.productId
    ? { productId: item.productId }
    : item.letterId
      ? { letterId: item.letterId, kind: "LETTER_UNLOCK" as const }
      : { cvId: item.cvId!, kind: "CV_UNLOCK" as const };
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

  const itemWhere = item.productId
    ? { productId: item.productId }
    : item.kind === "CV_PHOTO_BUNDLE"
      ? { kind: item.kind, cvId: item.cvId, photoId: item.photoId }
      : item.photoId
        ? { photoId: item.photoId, kind: item.kind }
        : item.letterId
          ? { letterId: item.letterId }
          : { cvId: item.cvId! };
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
            create: { kind: item.kind, productId: item.productId, cvId: item.cvId, letterId: item.letterId, photoId: item.photoId ?? null, productName: item.name, unitPriceMinor: item.unitPriceMinor, quantity: 1 },
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

/**
 * Pode descarregar (PDF/DOCX) esta carta? Gratuito quando o preço da carta é 0 (predefinição);
 * caso contrário, só depois de um pedido PAID de desbloqueio desta carta.
 */
export async function canDownloadLetter(userId: string, letterId: string): Promise<boolean> {
  const [letter, settings] = await Promise.all([db.coverLetter.findFirst({ where: { id: letterId, userId }, select: { purchasedAt: true } }), getPaymentSettings()]);
  if (!letter) return false;
  if (settings.letterPriceMinor <= 0) return true;
  return !!letter.purchasedAt || (await alreadyOwns(userId, { productId: null, cvId: null, letterId }));
}

/** Preço de uma carta (Admin > Definições > Pagamentos); 0 = download gratuito. */
export async function getLetterPrice() {
  const settings = await getPaymentSettings();
  return { priceMinor: settings.letterPriceMinor, currency: settings.currency, paid: settings.letterPriceMinor > 0 };
}

/** Foto profissional (preço com promoção, se ativa) ou pacote CV + Foto — preços do admin. */
async function resolvePhotoItem(userId: string, target: { photoId: string } | { bundle: { cvId: string; photoId: string } }): Promise<ResolvedItem> {
  const pricing = await getPhotoPricing();
  const photoId = "photoId" in target ? target.photoId : target.bundle.photoId;
  const photo = await db.professionalPhoto.findFirst({ where: { id: photoId, userId }, select: { id: true, purchasedAt: true, format: true } });
  if (!photo) throw new PaymentError("Fotografia não encontrada.", "INVALID_ITEM");

  if ("photoId" in target) {
    if (!pricing.paid) throw new PaymentError("A foto profissional é gratuita.", "INVALID_ITEM");
    if (photo.purchasedAt) throw new PaymentError("Esta fotografia já foi comprada.", "INVALID_ITEM");
    return {
      kind: "PHOTO_UNLOCK",
      productId: null,
      cvId: null,
      letterId: null,
      photoId: photo.id,
      name: "Foto profissional",
      description: "Download em JPG/PNG sem marca d'água e uso nos seus CVs.",
      unitPriceMinor: pricing.priceMinor,
      currency: pricing.currency,
    };
  }

  if (!pricing.bundleMinor) throw new PaymentError("O pacote CV + Foto não está disponível.", "INVALID_ITEM");
  const cv = await db.cV.findFirst({ where: { id: target.bundle.cvId, userId }, select: { id: true, title: true, purchasedAt: true } });
  if (!cv) throw new PaymentError("CV não encontrado.", "INVALID_ITEM");
  if (cv.purchasedAt && photo.purchasedAt) throw new PaymentError("Já tem o CV e a fotografia.", "INVALID_ITEM");
  return {
    kind: "CV_PHOTO_BUNDLE",
    productId: null,
    cvId: cv.id,
    letterId: null,
    photoId: photo.id,
    name: `Pacote CV + Foto profissional «${cv.title}»`,
    description: "CV (PDF sem marca d'água e Word) e foto profissional (JPG/PNG e uso no CV).",
    unitPriceMinor: pricing.bundleMinor,
    currency: pricing.currency,
  };
}
