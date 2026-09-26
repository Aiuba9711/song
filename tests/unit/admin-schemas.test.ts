import { describe, expect, it } from "vitest";
import { faqToText, parseFaqText, productSchema, settingsSchema } from "@/lib/admin-schemas";

const base = {
  name: "Kit Teste",
  slug: "kit-teste",
  tier: "",
  shortDescription: "Descrição curta do kit",
  description: "Descrição completa do kit de teste",
  type: "KIT",
  status: "ACTIVE",
  price: "399",
  compareAtPrice: "",
  currency: "MZN",
  features: "Item 1\n\n Item 2 ",
  faq: "Pergunta 1?\nResposta 1\n\nPergunta 2?\nResposta 2",
  sortOrder: "5",
};

describe("formulário de produto (admin)", () => {
  it("converte preço em centavos e listas", () => {
    const p = productSchema.parse(base);
    expect(p.price).toBe(39900);
    expect(p.compareAtPrice).toBeNull();
    expect(p.features).toEqual(["Item 1", "Item 2"]);
    expect(p.faq).toEqual([
      { q: "Pergunta 1?", a: "Resposta 1" },
      { q: "Pergunta 2?", a: "Resposta 2" },
    ]);
    expect(p.isFeatured).toBe(false);
  });
  it("rejeita preço inválido e slug inseguro", () => {
    expect(productSchema.safeParse({ ...base, price: "abc" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, price: "" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, slug: "../admin" }).success).toBe(false);
  });
  it("FAQ ida e volta", () => {
    const faq = [{ q: "A?", a: "B" }];
    expect(parseFaqText(faqToText(faq))).toEqual(faq);
  });
});

describe("definições do site", () => {
  it("normaliza o número de WhatsApp", () => {
    expect(settingsSchema.parse({ whatsappNumber: "84 123 4567" }).whatsappNumber).toBe("258841234567");
    expect(settingsSchema.parse({ whatsappNumber: "+258 84 123 4567" }).whatsappNumber).toBe("258841234567");
    expect(settingsSchema.parse({ whatsappNumber: "" }).whatsappNumber).toBeNull();
  });
  it("só aceita URLs https para redes sociais", () => {
    expect(settingsSchema.safeParse({ facebookUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsSchema.safeParse({ facebookUrl: "http://facebook.com/x" }).success).toBe(false);
    expect(settingsSchema.parse({ facebookUrl: "https://facebook.com/x" }).facebookUrl).toBe("https://facebook.com/x");
  });
});
