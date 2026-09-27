import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const reviewInclude = {
  order: {
    select: {
      id: true,
      number: true,
      status: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      totalMinor: true,
      currency: true,
      createdAt: true,
      items: { select: { productName: true, kind: true } },
    },
  },
  reviewedBy: { select: { name: true, email: true } },
} satisfies Prisma.PaymentInclude;

export type ReviewPayment = Prisma.PaymentGetPayload<{ include: typeof reviewInclude }> & { duplicateOf: string[] };

export type ReviewTab = "verificar" | "aguardar" | "historico";

export async function listPaymentsForReview(tab: ReviewTab): Promise<ReviewPayment[]> {
  const where: Prisma.PaymentWhereInput =
    tab === "verificar"
      ? { mode: "MANUAL", status: "PENDING_VERIFICATION" }
      : tab === "aguardar"
        ? { mode: "MANUAL", status: { in: ["PENDING", "RESUBMISSION_REQUESTED"] }, order: { status: "AWAITING_PAYMENT" } }
        : { mode: "MANUAL", status: { in: ["SUCCEEDED", "REJECTED"] } };
  const payments = await db.payment.findMany({
    where,
    include: reviewInclude,
    orderBy: tab === "verificar" ? { submittedAt: "asc" } : tab === "aguardar" ? { createdAt: "desc" } : { reviewedAt: "desc" },
    take: tab === "historico" ? 50 : 100,
  });

  // Alerta de fraude: o mesmo código de transação usado noutros pedidos.
  const codes = payments.filter((p) => p.transactionId).map((p) => ({ provider: p.provider, transactionId: p.transactionId! }));
  const dups = codes.length
    ? await db.payment.findMany({
        where: { OR: codes, status: { notIn: ["CANCELLED"] } },
        select: { id: true, provider: true, transactionId: true, order: { select: { number: true } } },
      })
    : [];
  return payments.map((p) => ({
    ...p,
    duplicateOf: dups.filter((d) => d.id !== p.id && d.provider === p.provider && d.transactionId === p.transactionId).map((d) => d.order.number),
  }));
}

export async function countPendingVerification(): Promise<number> {
  return db.payment.count({ where: { mode: "MANUAL", status: "PENDING_VERIFICATION" } });
}
