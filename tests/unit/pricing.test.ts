import { describe, expect, it } from "vitest";
import { paymentSettingsSchema } from "@/lib/admin-schemas";
import { parseMaputoDateTime, paymentReportSchema } from "@/lib/payments/report-schema";
import { calculateTotals, formatMzPhone, normalizeMzMobile } from "@/lib/pricing";

describe("cálculo de preço", () => {
  it("soma itens e aplica desconto sem ultrapassar o subtotal", () => {
    expect(calculateTotals([{ unitPriceMinor: 19900, quantity: 1, currency: "MZN" }])).toEqual({ subtotalMinor: 19900, discountMinor: 0, totalMinor: 19900, currency: "MZN" });
    expect(calculateTotals([{ unitPriceMinor: 19900, quantity: 2, currency: "MZN" }], 5000).totalMinor).toBe(34800);
    expect(calculateTotals([{ unitPriceMinor: 19900, quantity: 1, currency: "MZN" }], 999999).totalMinor).toBe(0);
    expect(calculateTotals([{ unitPriceMinor: 100, quantity: 1, currency: "MZN" }], -50).discountMinor).toBe(0);
  });
  it("rejeita preços, quantidades ou moedas inválidas", () => {
    expect(() => calculateTotals([])).toThrow();
    expect(() => calculateTotals([{ unitPriceMinor: -1, quantity: 1, currency: "MZN" }])).toThrow();
    expect(() => calculateTotals([{ unitPriceMinor: 10.5, quantity: 1, currency: "MZN" }])).toThrow();
    expect(() => calculateTotals([{ unitPriceMinor: 100, quantity: 0, currency: "MZN" }])).toThrow();
    expect(() => calculateTotals([{ unitPriceMinor: 100, quantity: 1, currency: "MZN" }, { unitPriceMinor: 100, quantity: 1, currency: "USD" }])).toThrow();
  });
});

describe("números moçambicanos", () => {
  it("formata e normaliza", () => {
    expect(formatMzPhone("841234567")).toBe("84 123 4567");
    expect(formatMzPhone("258841234567")).toBe("84 123 4567");
    expect(normalizeMzMobile("+258 84 123 4567")).toBe("841234567");
    expect(normalizeMzMobile("86 123 4567")).toBe("861234567");
    expect(normalizeMzMobile("21 123 456")).toBeNull();
    expect(normalizeMzMobile("891234567")).toBeNull();
  });
});

describe("dados do pagamento informados pelo cliente", () => {
  const recent = () => {
    const d = new Date(Date.now() + 2 * 3600_000 - 3600_000); // há 1 h, hora de Maputo
    return d.toISOString().slice(0, 16);
  };
  const valid = () => ({ payerName: "Ana Machava", payerPhone: "84 123 4567", transactionId: "abc123xyz", reportedPaidAt: recent(), confirmTruth: "on" });

  it("aceita dados válidos e normaliza", () => {
    const r = paymentReportSchema.parse(valid());
    expect(r.payerPhone).toBe("841234567");
    expect(r.reportedPaidAt).toBeInstanceOf(Date);
  });
  it("exige confirmação de veracidade, código e número válidos", () => {
    expect(paymentReportSchema.safeParse({ ...valid(), confirmTruth: undefined }).success).toBe(false);
    expect(paymentReportSchema.safeParse({ ...valid(), transactionId: "ab" }).success).toBe(false);
    expect(paymentReportSchema.safeParse({ ...valid(), transactionId: "<script>" }).success).toBe(false);
    expect(paymentReportSchema.safeParse({ ...valid(), payerPhone: "123" }).success).toBe(false);
  });
  it("rejeita datas no futuro ou demasiado antigas", () => {
    const future = new Date(Date.now() + 2 * 3600_000 + 3 * 3600_000).toISOString().slice(0, 16);
    expect(paymentReportSchema.safeParse({ ...valid(), reportedPaidAt: future }).success).toBe(false);
    expect(paymentReportSchema.safeParse({ ...valid(), reportedPaidAt: "2020-01-01T10:00" }).success).toBe(false);
  });
  it("interpreta a hora em Maputo (UTC+2)", () => {
    expect(parseMaputoDateTime("2026-09-27T14:30")?.toISOString()).toBe("2026-09-27T12:30:00.000Z");
    expect(parseMaputoDateTime("ontem")).toBeNull();
  });
});

describe("configuração de pagamentos (admin)", () => {
  const base = { currency: "MZN", defaultPrice: "199", instructions: "" };
  it("valida o prefixo de cada operador", () => {
    expect(paymentSettingsSchema.safeParse({ ...base, mpesaNumber: "86 000 0000" }).success).toBe(false);
    expect(paymentSettingsSchema.safeParse({ ...base, emolaNumber: "84 000 0000" }).success).toBe(false);
    expect(paymentSettingsSchema.safeParse({ ...base, mkeshNumber: "82 000 0000" }).success).toBe(true);
    const ok = paymentSettingsSchema.parse({ ...base, mpesaEnabled: "on", mpesaNumber: "+258 84 000 0001" });
    expect(ok.mpesaNumber).toBe("840000001");
    expect(ok.defaultPrice).toBe(19900);
  });
  it("não permite ativar um método sem número nem valor padrão zero", () => {
    expect(paymentSettingsSchema.safeParse({ ...base, emolaEnabled: "on" }).success).toBe(false);
    expect(paymentSettingsSchema.safeParse({ ...base, defaultPrice: "0" }).success).toBe(false);
  });
});
