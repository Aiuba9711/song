import { beforeEach, describe, expect, it } from "vitest";
import { GET as cvPdf } from "@/app/api/cv/[id]/pdf/route";
import { GET as productFile } from "@/app/api/files/[fileId]/route";
import { cvContentSchema } from "@/cv/schema";
import { SAMPLE_CV } from "@/cv/sample";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PaymentError } from "@/lib/payments/types";
import { storage } from "@/lib/storage";
import { canDownloadCv, cancelCustomerOrder, createCheckoutOrder, resolveCheckoutItem } from "@/server/checkout";
import { createCv, saveCv } from "@/server/cv";
import { getEntitledFile } from "@/server/orders";
import { CardPaymentProvider } from "@/server/payments/card";
import { getManualProvider, listAvailableMethods } from "@/server/payments/registry";
import { createPaymentSettings, createProduct, createUser, resetDatabase } from "../support/db";
import { TINY_PNG } from "../support/documents";
import { resetCookies } from "../support/next-mocks";

const customer = { name: "Cliente Teste", email: "cliente@teste.co.mz", phone: "258841234567" };
const report = (transactionId = "TX123ABC") => ({ payerName: "Cliente Teste", payerPhone: "841234567", transactionId, reportedPaidAt: new Date() });

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  await createPaymentSettings();
});

async function paidProductSetup(priceMinor = 19900) {
  const user = await createUser();
  const admin = await createUser({ role: "ADMIN" });
  const product = await createProduct({ priceMinor, slug: `kit-${Date.now()}` });
  const key = `products/${product.id}/kit.pdf`;
  await storage().put({ key, body: Buffer.from("%PDF-1.4 kit"), contentType: "application/pdf" });
  const file = await db.productFile.create({ data: { productId: product.id, name: "Kit", fileName: "kit.pdf", storageKey: key, mimeType: "application/pdf", sizeBytes: 12 } });
  return { user, admin, product, file };
}

async function orderWithPayment(userId: string, slug: string, method: "MPESA" | "EMOLA" = "MPESA") {
  const { orderNumber } = await createCheckoutOrder(userId, { target: { productSlug: slug }, method, customer });
  const order = await db.order.findUniqueOrThrow({ where: { number: orderNumber }, include: { payments: { orderBy: { createdAt: "desc" } }, items: true } });
  return { order, payment: order.payments[0]! };
}

describe("criação de pedido e cálculo de preço", () => {
  it("usa o preço da base de dados e cria pedido AWAITING_PAYMENT com pagamento manual PENDING", async () => {
    const { user, product } = await paidProductSetup(39900);
    const { order, payment } = await orderWithPayment(user.id, product.slug);
    expect(order.status).toBe("AWAITING_PAYMENT");
    expect(order.totalMinor).toBe(39900);
    expect(order.subtotalMinor).toBe(39900);
    expect(order.items[0]).toMatchObject({ kind: "PRODUCT", productId: product.id, unitPriceMinor: 39900 });
    expect(payment).toMatchObject({ provider: "MPESA", mode: "MANUAL", status: "PENDING", amountMinor: 39900, payeeNumber: "840000001" });
    expect(await db.auditLog.count({ where: { action: "order.create" } })).toBe(1);
  });

  it("alterar o preço depois não altera pedidos existentes", async () => {
    const { user, product } = await paidProductSetup(19900);
    const { order } = await orderWithPayment(user.id, product.slug);
    await db.product.update({ where: { id: product.id }, data: { priceMinor: 1 } });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).totalMinor).toBe(19900);
  });

  it("reutiliza o pedido em aberto e permite trocar de método", async () => {
    const { user, product } = await paidProductSetup();
    const a = await orderWithPayment(user.id, product.slug, "MPESA");
    const b = await orderWithPayment(user.id, product.slug, "EMOLA");
    expect(b.order.id).toBe(a.order.id);
    expect(b.payment.provider).toBe("EMOLA");
    expect((await db.payment.findUniqueOrThrow({ where: { id: a.payment.id } })).status).toBe("CANCELLED");
    expect(await db.order.count()).toBe(1);
  });

  it("recusa métodos inativos, cartão, produtos gratuitos e itens já comprados", async () => {
    const { user, product } = await paidProductSetup();
    await expect(createCheckoutOrder(user.id, { target: { productSlug: product.slug }, method: "MKESH", customer })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(createCheckoutOrder(user.id, { target: { productSlug: product.slug }, method: "CARD", customer })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const free = await createProduct({ priceMinor: 0 });
    await expect(createCheckoutOrder(user.id, { target: { productSlug: free.slug }, method: "MPESA", customer })).rejects.toMatchObject({ code: "INVALID_ITEM" });
    expect((await listAvailableMethods()).map((m) => m.id)).toEqual(["MPESA", "EMOLA"]);
  });

  it("limita o número de pedidos em aberto", async () => {
    const user = await createUser();
    for (let i = 0; i < 5; i++) {
      const p = await createProduct({ priceMinor: 100 + i });
      await createCheckoutOrder(user.id, { target: { productSlug: p.slug }, method: "MPESA", customer });
    }
    const extra = await createProduct({ priceMinor: 999 });
    await expect(createCheckoutOrder(user.id, { target: { productSlug: extra.slug }, method: "MPESA", customer })).rejects.toMatchObject({ code: "LIMIT" });
  });

  it("CV: preço = valor padrão da configuração, só com download pago ativo e só para o dono", async () => {
    await createPaymentSettings({ cvPaywallEnabled: false });
    const user = await createUser();
    const other = await createUser();
    const { id } = await createCv(user.id, { title: "CV Banco" });
    await expect(resolveCheckoutItem(user.id, { cvId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" }); // download gratuito
    await createPaymentSettings({ cvPaywallEnabled: true, defaultPriceMinor: 14900 });
    const item = await resolveCheckoutItem(user.id, { cvId: id });
    expect(item).toMatchObject({ kind: "CV_UNLOCK", cvId: id, unitPriceMinor: 14900, currency: "MZN" });
    await expect(resolveCheckoutItem(other.id, { cvId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });
});

describe("pagamento manual", () => {
  it("instruções vêm da configuração central", async () => {
    const { user, product } = await paidProductSetup();
    const { order } = await orderWithPayment(user.id, product.slug);
    const instructions = await getManualProvider("MPESA").getPaymentInstructions(order);
    expect(instructions).toMatchObject({ payeeNumber: "840000001", amountMinor: 19900, reference: order.number, steps: ["Passo 1", "Passo 2"] });
  });

  it("informar a transação muda para PENDING_VERIFICATION — nunca para PAID — e não liberta o produto", async () => {
    const { user, product, file } = await paidProductSetup();
    const { order, payment } = await orderWithPayment(user.id, product.slug);
    await getManualProvider("MPESA").submitCustomerReport(payment.id, user.id, { ...report(" tx123abc "), proof: { data: TINY_PNG, mime: "image/png", ext: "png" } });
    const p = await db.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { order: true } });
    expect(p.status).toBe("PENDING_VERIFICATION");
    expect(p.order.status).toBe("PENDING_VERIFICATION");
    expect(p.transactionId).toBe("TX123ABC");
    expect(p.proofKey).toBeTruthy();
    expect(await storage().get(p.proofKey!)).not.toBeNull();
    expect(p.order.paidAt).toBeNull();
    expect(await getEntitledFile(user.id, file.id)).toBeNull();
    expect(order.status).toBe("AWAITING_PAYMENT");
  });

  it("outro utilizador não pode informar o pagamento, e não se pode reenviar enquanto está em verificação", async () => {
    const { user, product } = await paidProductSetup();
    const intruder = await createUser();
    const { payment } = await orderWithPayment(user.id, product.slug);
    await expect(getManualProvider("MPESA").submitCustomerReport(payment.id, intruder.id, report())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await getManualProvider("MPESA").submitCustomerReport(payment.id, user.id, report());
    await expect(getManualProvider("MPESA").submitCustomerReport(payment.id, user.id, report("OUTRO1"))).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("o mesmo código de transação não serve para dois pedidos", async () => {
    const a = await paidProductSetup();
    const b = await paidProductSetup();
    const pa = await orderWithPayment(a.user.id, a.product.slug);
    const pb = await orderWithPayment(b.user.id, b.product.slug);
    await getManualProvider("MPESA").submitCustomerReport(pa.payment.id, a.user.id, report("DUP001"));
    await expect(getManualProvider("MPESA").submitCustomerReport(pb.payment.id, b.user.id, report("dup001"))).rejects.toMatchObject({ code: "DUPLICATE_TRANSACTION" });
  });
});

describe("verificação pelo administrador", () => {
  async function submitted() {
    const setup = await paidProductSetup();
    const { order, payment } = await orderWithPayment(setup.user.id, setup.product.slug);
    await getManualProvider("MPESA").submitCustomerReport(payment.id, setup.user.id, report(`TX${Date.now()}`));
    return { ...setup, order, payment };
  }

  it("só ADMIN pode confirmar (USER e EDITOR recusados)", async () => {
    const { user, payment } = await submitted();
    const editor = await createUser({ role: "EDITOR" });
    for (const reviewer of [{ id: user.id, role: "USER" as const }, { id: editor.id, role: "EDITOR" as const }]) {
      await expect(getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect((await db.order.findFirstOrThrow({ where: { userId: user.id } })).status).toBe("PENDING_VERIFICATION");
  });

  it("confirmação: PENDING_VERIFICATION → PAID, liberta o produto e regista a alteração", async () => {
    const { user, admin, payment, order, file } = await submitted();
    const res = await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    expect(res).toMatchObject({ paymentStatus: "SUCCEEDED", orderStatus: "PAID" });
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(o.status).toBe("PAID");
    expect(o.paidAt).toBeInstanceOf(Date);
    expect(o.payments[0]).toMatchObject({ status: "SUCCEEDED", reviewedById: admin.id });
    expect((await getEntitledFile(user.id, file.id))?.id).toBe(file.id);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "payment.confirm" } });
    expect(log.actorId).toBe(admin.id);
    expect(log.metadata).toMatchObject({ orderStatus: { from: "PENDING_VERIFICATION", to: "PAID" }, source: "admin" });
  });

  it("não confirma duas vezes nem confirma pagamentos que o cliente ainda não informou", async () => {
    const { admin, payment } = await submitted();
    const reviewer = { id: admin.id, role: "ADMIN" as const };
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer });
    await expect(getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer })).rejects.toMatchObject({ code: "INVALID_STATE" });

    const fresh = await paidProductSetup();
    const { payment: notSubmitted } = await orderWithPayment(fresh.user.id, fresh.product.slug);
    await expect(getManualProvider("MPESA").verifyPayment(notSubmitted.id, { decision: "CONFIRM", reviewer })).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await db.auditLog.count({ where: { action: "payment.confirm" } })).toBe(1);
  });

  it("rejeição: pedido FAILED, sem acesso, motivo guardado e registado", async () => {
    const { user, admin, payment, file } = await submitted();
    const res = await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "REJECT", reviewer: { id: admin.id, role: "ADMIN" }, note: "Transação não encontrada" });
    expect(res).toMatchObject({ paymentStatus: "REJECTED", orderStatus: "FAILED" });
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).reviewNote).toBe("Transação não encontrada");
    expect(await getEntitledFile(user.id, file.id)).toBeNull();
    expect(await db.auditLog.count({ where: { action: "payment.reject" } })).toBe(1);
    await expect(
      getManualProvider("MPESA").verifyPayment(payment.id, { decision: "REJECT", reviewer: { id: admin.id, role: "ADMIN" }, note: "" }),
    ).rejects.toBeInstanceOf(PaymentError);
  });

  it("pedir novo comprovativo: o cliente pode reenviar e o admin confirma depois", async () => {
    const { user, admin, payment, order } = await submitted();
    const reviewer = { id: admin.id, role: "ADMIN" as const };
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "REQUEST_NEW_PROOF", reviewer, note: "Envie a captura do SMS" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("AWAITING_PAYMENT");
    await getManualProvider("MPESA").submitCustomerReport(payment.id, user.id, { ...report(`NOVO${Date.now()}`), proof: { data: TINY_PNG, mime: "image/png", ext: "png" } });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_VERIFICATION");
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });

  it("o cliente só cancela pedidos que ainda não enviou para verificação", async () => {
    const { user, order } = await submitted();
    await expect(cancelCustomerOrder(user.id, order.number)).rejects.toMatchObject({ code: "INVALID_STATE" });
    const fresh = await paidProductSetup();
    const { order: open } = await orderWithPayment(fresh.user.id, fresh.product.slug);
    await cancelCustomerOrder(fresh.user.id, open.number);
    expect((await db.order.findUniqueOrThrow({ where: { id: open.id } })).status).toBe("CANCELLED");
  });
});

describe("proteção de downloads", () => {
  it("ficheiro de kit: 404 sem pagamento e em verificação; 200 depois da confirmação", async () => {
    const { user, admin, product, file } = await paidProductSetup();
    await createSession(user.id);
    const params = { params: Promise.resolve({ fileId: file.id }) };
    expect((await productFile(new Request("http://x"), params)).status).toBe(404);
    const { payment } = await orderWithPayment(user.id, product.slug);
    await getManualProvider("MPESA").submitCustomerReport(payment.id, user.id, report("PROT01"));
    expect((await productFile(new Request("http://x"), params)).status).toBe(404);
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    expect((await productFile(new Request("http://x"), params)).status).toBe(200);
  });

  it("CV com download pago: 402 antes do pagamento, 200 depois; outros CVs continuam bloqueados", async () => {
    await createPaymentSettings({ cvPaywallEnabled: true });
    const user = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    await createSession(user.id);
    const { id } = await createCv(user.id, {});
    // Só um CV por comprar de cada vez: não é possível acumular modelos gratuitamente.
    await expect(createCv(user.id, {})).rejects.toMatchObject({ code: "DRAFT_EXISTS" });
    await saveCv(user.id, id, cvContentSchema.parse(SAMPLE_CV));
    const params = { params: Promise.resolve({ id }) };
    expect((await cvPdf(new Request("http://x"), params)).status).toBe(402);

    const { orderNumber } = await createCheckoutOrder(user.id, { target: { cvId: id }, method: "EMOLA", customer });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
    expect(payment.amountMinor).toBe(19900);
    await getManualProvider("EMOLA").submitCustomerReport(payment.id, user.id, report("CVPAY1"));
    expect((await cvPdf(new Request("http://x"), params)).status).toBe(402);
    await getManualProvider("EMOLA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    expect((await cvPdf(new Request("http://x"), params)).status).toBe(200);
    expect((await db.cV.findUniqueOrThrow({ where: { id } })).purchasedAt).not.toBeNull();
    // Depois da compra pode começar outro CV — que continua bloqueado até ser pago.
    const { id: otherCv } = await createCv(user.id, {});
    expect(await canDownloadCv(user.id, otherCv)).toBe(false);
  });

  it("por omissão o CV é pago", async () => {
    const user = await createUser();
    const { id } = await createCv(user.id, {});
    expect(await canDownloadCv(user.id, id)).toBe(false);
  });

  it("com o download gratuito ativado pelo admin, o dono descarrega sem pagar", async () => {
    await createPaymentSettings({ cvPaywallEnabled: false });
    const user = await createUser();
    const { id } = await createCv(user.id, {});
    expect(await canDownloadCv(user.id, id)).toBe(true);
  });
});

describe("cartão bancário (placeholder)", () => {
  it("está indisponível e não cria pagamentos", async () => {
    const card = new CardPaymentProvider();
    expect(await card.isAvailable()).toBe(false);
    await expect(card.createPayment()).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
