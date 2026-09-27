import "server-only";
import type { PaymentProviderId } from "@/generated/prisma/enums";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  METHOD_LABELS,
  PaymentError,
  type ManualMethod,
  type PaymentInstructions,
  type PaymentProvider,
  type PaymentStatusView,
  type VerifyPaymentInput,
  type VerifyPaymentResult,
} from "@/lib/payments/types";
import { formatMzPhone } from "@/lib/pricing";
import { buildStorageKey, storage } from "@/lib/storage";
import { getPaymentSettings, manualMethodConfig } from "./settings";
import { markPaymentSucceeded } from "./transitions";

export type CustomerReport = {
  payerName: string;
  payerPhone: string; // 9 dígitos nacionais, já validado
  transactionId: string;
  reportedPaidAt: Date;
  proof?: { data: Buffer; mime: string; ext: string } | null;
};

/**
 * Pagamento manual por carteira móvel (M-Pesa, e-Mola, mKesh).
 *
 * O cliente transfere para o número configurado em Admin > Definições > Pagamentos e informa
 * os dados da transação. O pedido fica PENDING_VERIFICATION até um ADMINISTRADOR confirmar.
 * Informar um código NUNCA liberta o produto por si só.
 */
export class ManualMobileMoneyProvider implements PaymentProvider {
  readonly mode = "MANUAL" as const;
  readonly id: PaymentProviderId;
  readonly label: string;

  constructor(readonly method: ManualMethod) {
    this.id = method;
    this.label = METHOD_LABELS[method];
  }

  async isAvailable(): Promise<boolean> {
    const settings = await getPaymentSettings();
    const cfg = manualMethodConfig(settings, this.method);
    return cfg.enabled && !!cfg.number && settings.currency === "MZN";
  }

  private async payeeNumber(): Promise<{ number: string; holder: string | null; instructions: string }> {
    const settings = await getPaymentSettings();
    const cfg = manualMethodConfig(settings, this.method);
    if (!cfg.enabled || !cfg.number) throw new PaymentError(`${this.label} não está disponível de momento.`, "UNAVAILABLE");
    return { number: cfg.number, holder: settings.accountHolderName, instructions: settings.instructions };
  }

  async getPaymentInstructions(order: { number: string; totalMinor: number; currency: string }): Promise<PaymentInstructions> {
    if (order.currency !== "MZN") throw new PaymentError("Pagamentos por carteira móvel só aceitam Meticais (MZN).", "CURRENCY_NOT_SUPPORTED");
    const { number, holder, instructions } = await this.payeeNumber();
    const steps = instructions
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      method: this.id,
      label: this.label,
      mode: "MANUAL",
      payeeNumber: number,
      accountHolderName: holder,
      amountMinor: order.totalMinor,
      currency: order.currency,
      reference: order.number,
      steps,
    };
  }

  /** Regista a tentativa de pagamento (com cópia do número de destino para auditoria). */
  async createPayment({ orderId }: { orderId: string }): Promise<{ paymentId: string }> {
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new PaymentError("Pedido não encontrado.", "NOT_FOUND");
    if (order.status !== "AWAITING_PAYMENT") throw new PaymentError("Este pedido não está a aguardar pagamento.", "INVALID_STATE");
    if (order.currency !== "MZN") throw new PaymentError("Pagamentos por carteira móvel só aceitam Meticais (MZN).", "CURRENCY_NOT_SUPPORTED");
    const { number } = await this.payeeNumber();

    const payment = await db.$transaction(async (tx) => {
      // Mudança de método: tentativas anteriores ainda não submetidas são canceladas.
      await tx.payment.updateMany({ where: { orderId, status: { in: ["PENDING", "RESUBMISSION_REQUESTED"] } }, data: { status: "CANCELLED" } });
      return tx.payment.create({
        data: { orderId, provider: this.id, mode: "MANUAL", status: "PENDING", amountMinor: order.totalMinor, currency: order.currency, payeeNumber: number },
        select: { id: true },
      });
    });
    return { paymentId: payment.id };
  }

  /**
   * O cliente informa a transação. Muda o pagamento e o pedido para PENDING_VERIFICATION —
   * NÃO para PAID.
   */
  async submitCustomerReport(paymentId: string, userId: string, report: CustomerReport): Promise<void> {
    const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment || payment.order.userId !== userId || payment.provider !== this.id || payment.mode !== "MANUAL") {
      throw new PaymentError("Pagamento não encontrado.", "NOT_FOUND");
    }
    if (payment.status !== "PENDING" && payment.status !== "RESUBMISSION_REQUESTED") {
      throw new PaymentError("Este pagamento já foi enviado para verificação.", "INVALID_STATE");
    }

    const transactionId = report.transactionId.trim().toUpperCase();
    // O mesmo código de transação não pode servir para dois pedidos.
    const reused = await db.payment.findFirst({
      where: { provider: this.id, transactionId, id: { not: payment.id }, status: { in: ["PENDING_VERIFICATION", "SUCCEEDED"] } },
      select: { id: true },
    });
    if (reused) throw new PaymentError("Este código de transação já foi usado noutro pedido.", "DUPLICATE_TRANSACTION");

    let proofKey: string | null = null;
    if (report.proof) {
      proofKey = buildStorageKey(`payment-proofs/${payment.orderId}`, report.proof.ext);
      await storage().put({ key: proofKey, body: report.proof.data, contentType: report.proof.mime });
    }

    const previousProof = payment.proofKey;
    await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ["PENDING", "RESUBMISSION_REQUESTED"] } },
        data: {
          status: "PENDING_VERIFICATION",
          payerName: report.payerName,
          payerPhone: report.payerPhone,
          transactionId,
          reportedPaidAt: report.reportedPaidAt,
          submittedAt: new Date(),
          ...(proofKey ? { proofKey, proofMime: report.proof!.mime } : {}),
        },
      });
      if (updated.count === 0) throw new PaymentError("Este pagamento já foi enviado para verificação.", "INVALID_STATE");
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "PENDING_VERIFICATION" } });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "payment.submitted",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { orderId: payment.orderId, provider: this.id, transactionId, hasProof: !!proofKey },
        },
      });
    });
    if (proofKey && previousProof) await storage().delete(previousProof).catch(() => undefined);
  }

  /** Decisão do administrador. Só a confirmação muda o pedido para PAID. */
  async verifyPayment(paymentId: string, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!can(input.reviewer.role, "payments.verify")) {
      throw new PaymentError("Só um administrador pode verificar pagamentos manuais.", "FORBIDDEN");
    }
    const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment || payment.provider !== this.id || payment.mode !== "MANUAL") throw new PaymentError("Pagamento não encontrado.", "NOT_FOUND");
    if (payment.status !== "PENDING_VERIFICATION") throw new PaymentError("Este pagamento já não está pendente de verificação.", "INVALID_STATE");

    if (input.decision === "CONFIRM") {
      await db.$transaction((tx) =>
        markPaymentSucceeded(tx, { paymentId, fromStatuses: ["PENDING_VERIFICATION"], reviewerId: input.reviewer.id, note: input.note, source: "admin" }),
      );
      return { paymentStatus: "SUCCEEDED", orderStatus: "PAID", orderId: payment.orderId };
    }

    const note = input.note.trim();
    if (note.length < 3) throw new PaymentError("Indique o motivo para o cliente.", "INVALID_STATE");
    const reject = input.decision === "REJECT";
    await db.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: "PENDING_VERIFICATION" },
        data: { status: reject ? "REJECTED" : "RESUBMISSION_REQUESTED", reviewNote: note, reviewedAt: new Date(), reviewedById: input.reviewer.id },
      });
      if (updated.count === 0) throw new PaymentError("Este pagamento já não está pendente de verificação.", "INVALID_STATE");
      await tx.order.update({ where: { id: payment.orderId }, data: { status: reject ? "FAILED" : "AWAITING_PAYMENT" } });
      await tx.auditLog.create({
        data: {
          actorId: input.reviewer.id,
          action: reject ? "payment.reject" : "payment.request_new_proof",
          entityType: "Payment",
          entityId: paymentId,
          metadata: {
            orderId: payment.orderId,
            orderNumber: payment.order.number,
            note,
            paymentStatus: { from: "PENDING_VERIFICATION", to: reject ? "REJECTED" : "RESUBMISSION_REQUESTED" },
            orderStatus: { from: payment.order.status, to: reject ? "FAILED" : "AWAITING_PAYMENT" },
          },
        },
      });
    });
    return { paymentStatus: reject ? "REJECTED" : "RESUBMISSION_REQUESTED", orderStatus: reject ? "FAILED" : "AWAITING_PAYMENT", orderId: payment.orderId };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusView> {
    const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: { select: { status: true } } } });
    if (!payment) throw new PaymentError("Pagamento não encontrado.", "NOT_FOUND");
    return { paymentId, paymentStatus: payment.status, orderStatus: payment.order.status, reviewNote: payment.reviewNote };
  }
}

export function displayPayeeNumber(number: string | null): string {
  return formatMzPhone(number);
}
