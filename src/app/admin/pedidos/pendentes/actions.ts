"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { orderDeliveredEmail, paymentRejectedEmail, proofRequestedEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import { PaymentError } from "@/lib/payments/types";
import { getManualProvider } from "@/server/payments/registry";

export type ReviewState = { ok?: boolean; message?: string; error?: string };

const schema = z.object({
  paymentId: z.string().min(1).max(40),
  decision: z.enum(["CONFIRM", "REJECT", "REQUEST_NEW_PROOF"]),
  note: z.string().trim().max(500).optional().default(""),
});

/**
 * Decisão do administrador sobre um pagamento manual.
 * CONFIRM é a única forma (além de uma futura API oficial) de um pedido passar a PAID.
 */
export async function reviewPaymentAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const admin = await assertPermission("payments.verify");
  const parsed = schema.safeParse({ paymentId: formData.get("paymentId"), decision: formData.get("decision"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { error: "Pedido inválido." };
  const { paymentId, decision, note } = parsed.data;
  if (decision !== "CONFIRM" && note.length < 3) return { error: "Escreva o motivo para o cliente (mín. 3 caracteres)." };

  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
  if (!payment) return { error: "Pagamento não encontrado." };

  try {
    const provider = getManualProvider(payment.provider);
    const reviewer = { id: admin.id, role: admin.role };
    if (decision === "CONFIRM") await provider.verifyPayment(paymentId, { decision, reviewer, note: note || undefined });
    else await provider.verifyPayment(paymentId, { decision, reviewer, note });
  } catch (error) {
    if (error instanceof PaymentError) return { error: error.message };
    throw error;
  }

  const o = payment.order;
  const q = `?pedido=${encodeURIComponent(o.number)}`;
  if (decision === "CONFIRM") {
    const cv = o.items.find((i) => i.kind === "CV_UNLOCK" && i.cvId);
    await sendEmail(orderDeliveredEmail(o.customerEmail, o.customerName, o.number, o.items.map((i) => i.productName), appUrl(cv ? `/meu-espaco/cvs/${cv.cvId}` : "/meu-espaco/kits")));
  } else if (decision === "REJECT") {
    await sendEmail(paymentRejectedEmail(o.customerEmail, o.customerName, o.number, note, appUrl(`/checkout/failed${q}`)));
  } else {
    await sendEmail(proofRequestedEmail(o.customerEmail, o.customerName, o.number, note, appUrl(`/checkout${q}`)));
  }

  revalidatePath("/admin", "layout");
  // O pagamento sai da lista «Por verificar»: a mensagem é mostrada no topo da página.
  redirect(`/admin/pedidos/pendentes?feito=${decision}&pedido=${encodeURIComponent(o.number)}`);
}
