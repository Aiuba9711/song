import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitPaymentAction } from "@/app/checkout/actions";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ConsoleEmailProvider } from "@/lib/email";
import { logError } from "@/lib/log";
import { storage } from "@/lib/storage";
import { AdminError, setUserActive } from "@/server/admin";
import { createCheckoutOrder } from "@/server/checkout";
import { getManualProvider } from "@/server/payments/registry";
import { createPaymentSettings, createProduct, createUser, resetDatabase } from "../support/db";
import { resetCookies } from "../support/next-mocks";

const customer = { name: "Cliente", email: "c@teste.co.mz", phone: null };
const maputoNow = () => new Date(Date.now() + 2 * 3600_000 - 60_000).toISOString().slice(0, 16);
const report = (transactionId: string) => ({ payerName: "Cliente", payerPhone: "841234567", transactionId, reportedPaidAt: new Date() });

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  await createPaymentSettings();
});

afterEach(() => vi.restoreAllMocks());

describe("pagamentos: código de transação repetido", () => {
  it("o mesmo código nunca confirma dois pedidos, mesmo que ambos cheguem à verificação", async () => {
    const product = await createProduct({ priceMinor: 19900 });
    const a = await createUser();
    const b = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const mpesa = getManualProvider("MPESA");
    const pay = async (userId: string) => {
      const { orderNumber } = await createCheckoutOrder(userId, { target: { productSlug: product.slug }, method: "MPESA", customer });
      return db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
    };
    const pa = await pay(a.id);
    const pb = await pay(b.id);
    // Simula dois envios simultâneos: ambos passaram a verificação do envio antes de o outro gravar.
    await mpesa.submitCustomerReport(pa.id, a.id, report("MP123"));
    await db.payment.update({ where: { id: pb.id }, data: { status: "PENDING_VERIFICATION", transactionId: "MP123", submittedAt: new Date() } });

    await mpesa.verifyPayment(pa.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    await expect(mpesa.verifyPayment(pb.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } })).rejects.toMatchObject({ code: "DUPLICATE_TRANSACTION" });
    expect((await db.payment.findUniqueOrThrow({ where: { id: pb.id } })).status).toBe("PENDING_VERIFICATION");
    expect((await db.order.findUniqueOrThrow({ where: { id: pb.orderId } })).status).not.toBe("PAID");
  });

  it("comprovativo em imagem é guardado sem metadados (EXIF/GPS)", async () => {
    const product = await createProduct({ priceMinor: 19900 });
    const user = await createUser();
    await createSession(user.id);
    const { orderNumber } = await createCheckoutOrder(user.id, { target: { productSlug: product.slug }, method: "MPESA", customer });
    const jpeg = await sharp({ create: { width: 300, height: 500, channels: 3, background: "#ffffff" } })
      .withExif({ IFD0: { Make: "TelemovelDoCliente" } })
      .jpeg()
      .toBuffer();
    const fd = new FormData();
    for (const [k, v] of Object.entries({ payerName: "Cliente", payerPhone: "841234567", transactionId: "EXIF1", reportedPaidAt: maputoNow(), confirmTruth: "on" })) fd.set(k, v);
    fd.set("proof", new File([new Uint8Array(jpeg)], "comprovativo.jpg", { type: "image/jpeg" }));
    const res = await submitPaymentAction(orderNumber, {}, fd).catch((e: { digest?: string }) => ({ redirect: e.digest }));
    expect(res).toMatchObject({ redirect: expect.stringMatching(/^NEXT_REDIRECT/) });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
    expect(payment.proofKey).toBeTruthy();
    const stored = (await storage().get(payment.proofKey!))!;
    expect((await sharp(stored).metadata()).exif).toBeUndefined();
    expect(stored.includes(Buffer.from("TelemovelDoCliente"))).toBe(false);
  });
});

describe("admin", () => {
  it("desativar um utilizador inexistente dá um erro claro (não um erro 500)", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await expect(setUserActive(admin.id, "inexistente", false)).rejects.toBeInstanceOf(AdminError);
  });
});

describe("logs sem dados pessoais", () => {
  it("em produção regista só o tipo e o código do erro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    try {
      const err = Object.assign(new Error("Invalid value for field summary: «Ana Machava, ana@exemplo.co.mz»"), { name: "PrismaClientValidationError", code: "P2009" });
      logError("cv.save", err);
      const line = spy.mock.calls.flat().join(" ");
      expect(line).toContain("PrismaClientValidationError");
      expect(line).toContain("P2009");
      expect(line).not.toContain("ana@exemplo.co.mz");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("em produção o driver de email «console» não escreve o corpo (links de recuperação) nos logs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    try {
      await new ConsoleEmailProvider().send({ to: "a@b.co.mz", subject: "Redefinir senha", text: "https://site/redefinir-senha?token=SEGREDO", html: "" });
      const all = [...warn.mock.calls, ...info.mock.calls].flat().join(" ");
      expect(all).not.toContain("SEGREDO");
      expect(all).toContain("EMAIL_DRIVER=console");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
