import { beforeEach, describe, expect, it } from "vitest";
import { reviewPaymentAction } from "@/app/admin/pedidos/pendentes/actions";
import { updatePaymentSettingsAction } from "@/app/admin/definicoes/pagamentos/actions";
import { startCheckoutAction, submitPaymentAction } from "@/app/checkout/actions";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ConsoleEmailProvider } from "@/lib/email";
import { createPaymentSettings, createProduct, createUser, resetDatabase } from "../support/db";
import { TINY_PNG } from "../support/documents";
import { resetCookies } from "../support/next-mocks";

function form(values: Record<string, string | Blob>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function redirectOf(p: Promise<unknown>): Promise<string> {
  const e = await p.then(
    () => null,
    (err: { digest?: string }) => err,
  );
  expect(e?.digest).toMatch(/^NEXT_REDIRECT/);
  return e!.digest!.split(";")[2]!;
}

const maputoNow = () => new Date(Date.now() + 2 * 3600_000 - 60_000).toISOString().slice(0, 16);

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  ConsoleEmailProvider.outbox.length = 0;
  await createPaymentSettings();
  await db.siteSettings.create({ data: { id: "default", contactEmail: "equipa@teste.co.mz" } });
});

describe("fluxo de checkout (server actions)", () => {
  it("produto → método → instruções → cliente informa → pendente → admin confirma → acesso", async () => {
    const user = await createUser({ email: "compra@teste.co.mz" });
    const admin = await createUser({ role: "ADMIN" });
    const product = await createProduct({ priceMinor: 19900, slug: "kit-basico-teste" });
    await createSession(user.id);

    // Escolher método (o valor enviado pelo cliente é ignorado: o preço vem da BD)
    const to = await redirectOf(
      startCheckoutAction({}, form({ produto: product.slug, method: "MPESA", name: "Compra Teste", email: "compra@teste.co.mz", phone: "84 123 4567", totalMinor: "1" })),
    );
    expect(to).toMatch(/^\/checkout\?pedido=EF-/);
    const number = decodeURIComponent(to.split("=")[1]!);
    expect((await db.order.findUniqueOrThrow({ where: { number } })).totalMinor).toBe(19900);

    // Informar o pagamento, com comprovativo
    const pending = await redirectOf(
      submitPaymentAction(
        number,
        {},
        form({ payerName: "Compra Teste", payerPhone: "84 123 4567", transactionId: "MP260927ABC", reportedPaidAt: maputoNow(), confirmTruth: "on", proof: new File([TINY_PNG], "sms.png", { type: "image/png" }) }),
      ),
    );
    expect(pending).toBe(`/checkout/pending?pedido=${encodeURIComponent(number)}`);
    expect((await db.order.findUniqueOrThrow({ where: { number } })).status).toBe("PENDING_VERIFICATION");
    expect(ConsoleEmailProvider.outbox.map((m) => m.to).sort()).toEqual(["compra@teste.co.mz", "equipa@teste.co.mz"]);

    // Admin confirma
    resetCookies();
    await createSession(admin.id);
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number } } });
    expect(await redirectOf(reviewPaymentAction({}, form({ paymentId: payment.id, decision: "CONFIRM" })))).toBe(
      `/admin/pedidos/pendentes?feito=CONFIRM&pedido=${encodeURIComponent(number)}`,
    );
    expect((await db.order.findUniqueOrThrow({ where: { number } })).status).toBe("PAID");
    expect(ConsoleEmailProvider.outbox.at(-1)?.subject).toMatch(/acesso aos seus materiais/);
  });

  it("comprovativos com formato inválido são recusados (magic bytes)", async () => {
    const user = await createUser();
    const product = await createProduct({ priceMinor: 19900 });
    await createSession(user.id);
    const number = decodeURIComponent(
      (await redirectOf(startCheckoutAction({}, form({ produto: product.slug, method: "EMOLA", name: "Teste Nome", email: "a@teste.co.mz" })))).split("=")[1]!,
    );
    const res = await submitPaymentAction(
      number,
      {},
      form({ payerName: "Teste Nome", payerPhone: "86 123 4567", transactionId: "EM123456", reportedPaidAt: maputoNow(), confirmTruth: "on", proof: new File(["<html>"], "x.png", { type: "image/png" }) }),
    );
    expect(res.fieldErrors?.proof).toBeTruthy();
    expect((await db.order.findUniqueOrThrow({ where: { number } })).status).toBe("AWAITING_PAYMENT");
  });

  it("não é possível informar o pagamento do pedido de outra pessoa", async () => {
    const owner = await createUser();
    const product = await createProduct({ priceMinor: 19900 });
    await createSession(owner.id);
    const number = decodeURIComponent(
      (await redirectOf(startCheckoutAction({}, form({ produto: product.slug, method: "MPESA", name: "Dono Pedido", email: "d@teste.co.mz" })))).split("=")[1]!,
    );
    resetCookies();
    const intruder = await createUser();
    await createSession(intruder.id);
    const res = await submitPaymentAction(number, {}, form({ payerName: "Intruso", payerPhone: "84 111 1111", transactionId: "HACK1234", reportedPaidAt: maputoNow(), confirmTruth: "on" }));
    expect(res.error).toBe("Pedido não encontrado.");
  });
});

describe("decisões e configuração só para administradores", () => {
  it("USER não pode confirmar pagamentos nem alterar a configuração", async () => {
    const user = await createUser();
    await createSession(user.id);
    await expect(reviewPaymentAction({}, form({ paymentId: "x", decision: "CONFIRM" }))).rejects.toMatchObject({ status: 403 });
    await expect(updatePaymentSettingsAction({}, form({ currency: "MZN", defaultPrice: "1" }))).rejects.toMatchObject({ status: 403 });
  });

  it("rejeitar exige motivo e notifica o cliente", async () => {
    const user = await createUser({ email: "rej@teste.co.mz" });
    const admin = await createUser({ role: "ADMIN" });
    const product = await createProduct({ priceMinor: 19900 });
    await createSession(user.id);
    const number = decodeURIComponent(
      (await redirectOf(startCheckoutAction({}, form({ produto: product.slug, method: "MPESA", name: "Rej Teste", email: "rej@teste.co.mz" })))).split("=")[1]!,
    );
    await redirectOf(submitPaymentAction(number, {}, form({ payerName: "Rej Teste", payerPhone: "84 222 2222", transactionId: "REJ12345", reportedPaidAt: maputoNow(), confirmTruth: "on" })));
    resetCookies();
    await createSession(admin.id);
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number } } });
    expect((await reviewPaymentAction({}, form({ paymentId: payment.id, decision: "REJECT", note: "" }))).error).toBeTruthy();
    expect(await redirectOf(reviewPaymentAction({}, form({ paymentId: payment.id, decision: "REJECT", note: "Transação inexistente" })))).toMatch(/feito=REJECT/);
    expect((await db.order.findUniqueOrThrow({ where: { number } })).status).toBe("FAILED");
    expect(ConsoleEmailProvider.outbox.at(-1)).toMatchObject({ to: "rej@teste.co.mz" });
    expect(ConsoleEmailProvider.outbox.at(-1)?.text).toContain("Transação inexistente");
  });

  it("admin configura números, métodos, preço e download pago — com registo de auditoria", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createSession(admin.id);
    const bad = await updatePaymentSettingsAction({}, form({ mpesaEnabled: "on", mpesaNumber: "86 000 0000", currency: "MZN", defaultPrice: "199" }));
    expect(bad.fieldErrors?.mpesaNumber).toBeTruthy();
    const ok = await updatePaymentSettingsAction(
      {},
      form({ mpesaEnabled: "on", mpesaNumber: "85 999 0000", mkeshEnabled: "on", mkeshNumber: "83 999 0000", currency: "MZN", defaultPrice: "249", cvPaywallEnabled: "on", instructions: "Pague e informe." }),
    );
    expect(ok.ok).toBe(true);
    const s = await db.paymentSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect(s).toMatchObject({ mpesaNumber: "859990000", mkeshEnabled: true, emolaEnabled: false, defaultPriceMinor: 24900, cvPaywallEnabled: true, cardEnabled: false });
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "settings.payments_update" } });
    expect(log.metadata).toMatchObject({ defaultPriceMinor: { from: 19900, to: 24900 } });
  });
});
