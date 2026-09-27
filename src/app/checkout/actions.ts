"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { adminPaymentPendingEmail, paymentSubmittedEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { MAX_PROOF_BYTES, paymentReportSchema, PROOF_TYPES } from "@/lib/payments/report-schema";
import { METHOD_LABELS, PaymentError } from "@/lib/payments/types";
import { rateLimit } from "@/lib/security/rate-limit";
import { detectFileType } from "@/lib/storage/files";
import { emailSchema, fieldErrorsOf, formDataToObject, nameSchema, phoneSchema, type ActionState } from "@/lib/validation";
import { cancelCustomerOrder, createCheckoutOrder, type CheckoutTarget } from "@/server/checkout";
import { getManualProvider, isManualMethod } from "@/server/payments/registry";
import { getSiteSettings } from "@/server/settings";

const startSchema = z.object({
  produto: z.string().trim().max(80).optional(),
  cv: z.string().trim().max(40).optional(),
  method: z.enum(["MPESA", "EMOLA", "MKESH", "CARD"], { error: "Escolha um método de pagamento." }),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

function targetOf(data: { produto?: string; cv?: string }): CheckoutTarget | null {
  if (data.produto) return { productSlug: data.produto };
  if (data.cv) return { cvId: data.cv };
  return null;
}

/** Passo 1: cria (ou reutiliza) o pedido com o método escolhido. */
export async function startCheckoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertUser();
  const parsed = startSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const target = targetOf(parsed.data);
  if (!target) return { error: "Escolha o que quer comprar." };

  const limit = await rateLimit(`checkout:${user.id}`, 20, 3600);
  if (!limit.ok) return { error: "Demasiados pedidos seguidos. Tente mais tarde." };

  let orderNumber: string;
  try {
    ({ orderNumber } = await createCheckoutOrder(user.id, {
      target,
      method: parsed.data.method,
      customer: { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone ?? null },
    }));
  } catch (error) {
    if (error instanceof PaymentError) return { error: error.message };
    throw error;
  }
  redirect(`/checkout?pedido=${encodeURIComponent(orderNumber)}`);
}

/** Trocar de método num pedido que ainda aguarda pagamento. */
export async function changeMethodAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const number = z.string().max(40).parse(formData.get("pedido"));
  const method = z.string().parse(formData.get("method"));
  if (!isManualMethod(method)) redirect(`/checkout?pedido=${encodeURIComponent(number)}`);
  const order = await db.order.findFirst({ where: { number, userId: user.id, status: "AWAITING_PAYMENT" } });
  if (order) {
    const provider = getManualProvider(method);
    if (await provider.isAvailable()) await provider.createPayment({ orderId: order.id });
  }
  redirect(`/checkout?pedido=${encodeURIComponent(number)}`);
}

export type ReportState = ActionState;

/** Passo 2: o cliente informa a transação → pedido PENDING_VERIFICATION (nunca PAID). */
export async function submitPaymentAction(orderNumber: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const user = await assertUser();
  const parsed = paymentReportSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const limit = await rateLimit(`payment-report:${user.id}`, 10, 3600);
  if (!limit.ok) return { error: "Demasiadas tentativas. Tente mais tarde." };

  const order = await db.order.findFirst({
    where: { number: orderNumber, userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const payment = order?.payments[0];
  if (!order || !payment || !isManualMethod(payment.provider)) return { error: "Pedido não encontrado." };

  let proof: { data: Buffer; mime: string; ext: string } | null = null;
  const file = formData.get("proof");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PROOF_BYTES) return { fieldErrors: { proof: ["O comprovativo deve ter no máximo 3 MB."] } };
    const data = Buffer.from(await file.arrayBuffer());
    const type = detectFileType(data);
    if (!type || !PROOF_TYPES.includes(type.mime)) return { fieldErrors: { proof: ["Use uma imagem (JPG/PNG) ou PDF."] } };
    proof = { data, mime: type.mime, ext: type.ext };
  }

  try {
    await getManualProvider(payment.provider).submitCustomerReport(payment.id, user.id, { ...parsed.data, proof });
  } catch (error) {
    if (error instanceof PaymentError) {
      return error.code === "DUPLICATE_TRANSACTION" ? { fieldErrors: { transactionId: [error.message] } } : { error: error.message };
    }
    throw error;
  }

  const statusUrl = appUrl(`/checkout/pending?pedido=${encodeURIComponent(order.number)}`);
  await sendEmail(paymentSubmittedEmail(order.customerEmail, order.customerName, order.number, statusUrl));
  const site = await getSiteSettings();
  if (site.contactEmail) {
    await sendEmail(
      adminPaymentPendingEmail(site.contactEmail, order.number, order.customerName, formatMoney(order.totalMinor, order.currency), METHOD_LABELS[payment.provider], appUrl("/admin/pedidos/pendentes")),
    );
  }
  redirect(`/checkout/pending?pedido=${encodeURIComponent(order.number)}`);
}

export async function cancelOrderAction(formData: FormData): Promise<void> {
  const user = await assertUser();
  const number = z.string().max(40).parse(formData.get("pedido"));
  try {
    await cancelCustomerOrder(user.id, number);
  } catch (error) {
    if (!(error instanceof PaymentError)) throw error;
  }
  redirect("/meu-espaco/compras?cancelado=1");
}
