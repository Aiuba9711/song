import "server-only";
import type { PaymentStatus, Prisma } from "@/generated/prisma/client";
import { PaymentError } from "@/lib/payments/types";

type Tx = Prisma.TransactionClient;

/**
 * ÚNICA função que marca um pedido como PAID a partir de um pagamento.
 * Chamada apenas por: verificação de um administrador (pagamento manual) ou, no futuro,
 * confirmação oficial de um fornecedor por API. Idempotência garantida por updates condicionais.
 */
export async function markPaymentSucceeded(
  tx: Tx,
  args: { paymentId: string; fromStatuses: PaymentStatus[]; reviewerId: string | null; note?: string | null; source: "admin" | "api" },
) {
  const payment = await tx.payment.findUnique({ where: { id: args.paymentId }, include: { order: true } });
  if (!payment) throw new PaymentError("Pagamento não encontrado.", "NOT_FOUND");
  // Segunda verificação (a do envio não é atómica): o mesmo código de transação nunca paga dois pedidos.
  if (payment.transactionId) {
    const reused = await tx.payment.findFirst({
      where: { provider: payment.provider, transactionId: payment.transactionId, status: "SUCCEEDED", id: { not: payment.id } },
      select: { order: { select: { number: true } } },
    });
    if (reused) throw new PaymentError(`O código de transação ${payment.transactionId} já confirmou o pedido ${reused.order.number}.`, "DUPLICATE_TRANSACTION");
  }

  const updated = await tx.payment.updateMany({
    where: { id: payment.id, status: { in: args.fromStatuses } },
    data: { status: "SUCCEEDED", reviewedAt: new Date(), reviewedById: args.reviewerId, reviewNote: args.note ?? null },
  });
  if (updated.count === 0) throw new PaymentError("Este pagamento já não está pendente de verificação.", "INVALID_STATE");

  const order = await tx.order.updateMany({
    where: { id: payment.orderId, status: { in: ["AWAITING_PAYMENT", "PENDING_VERIFICATION"] } },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (order.count === 0) throw new PaymentError("O pedido não está a aguardar pagamento.", "INVALID_STATE");

  // CV comprado: download final libertado e modelo fixado.
  const cvItems = await tx.orderItem.findMany({ where: { orderId: payment.orderId, kind: "CV_UNLOCK", cvId: { not: null } }, select: { cvId: true } });
  if (cvItems.length) await tx.cV.updateMany({ where: { id: { in: cvItems.map((i) => i.cvId!) }, purchasedAt: null }, data: { purchasedAt: new Date() } });
  const letterItems = await tx.orderItem.findMany({ where: { orderId: payment.orderId, kind: "LETTER_UNLOCK", letterId: { not: null } }, select: { letterId: true } });
  // Foto profissional (sozinha ou no pacote CV + Foto) e o CV do pacote.
  const photoItems = await tx.orderItem.findMany({ where: { orderId: payment.orderId, kind: { in: ["PHOTO_UNLOCK", "CV_PHOTO_BUNDLE"] } }, select: { photoId: true, cvId: true, kind: true } });
  const photoIds = photoItems.map((i) => i.photoId).filter((v): v is string => !!v);
  const bundleCvIds = photoItems.filter((i) => i.kind === "CV_PHOTO_BUNDLE" && i.cvId).map((i) => i.cvId!);
  if (photoIds.length) await tx.professionalPhoto.updateMany({ where: { id: { in: photoIds }, purchasedAt: null }, data: { purchasedAt: new Date() } });
  if (bundleCvIds.length) await tx.cV.updateMany({ where: { id: { in: bundleCvIds }, purchasedAt: null }, data: { purchasedAt: new Date() } });
  if (letterItems.length) await tx.coverLetter.updateMany({ where: { id: { in: letterItems.map((i) => i.letterId!) }, purchasedAt: null }, data: { purchasedAt: new Date() } });

  await tx.auditLog.create({
    data: {
      actorId: args.reviewerId,
      action: "payment.confirm",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        orderId: payment.orderId,
        orderNumber: payment.order.number,
        source: args.source,
        paymentStatus: { from: payment.status, to: "SUCCEEDED" },
        orderStatus: { from: payment.order.status, to: "PAID" },
        amountMinor: payment.amountMinor,
        provider: payment.provider,
        transactionId: payment.transactionId,
      },
    },
  });
  return { orderId: payment.orderId };
}
