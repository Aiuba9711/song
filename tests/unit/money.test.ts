import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyInput, toMinor } from "@/lib/money";

describe("formatMoney", () => {
  it("formata Meticais como «399 MT»", () => {
    expect(formatMoney(39900, "MZN")).toBe("399 MT");
    expect(formatMoney(19900)).toBe("199 MT");
  });
  it("mostra decimais apenas quando existem", () => {
    expect(formatMoney(39950, "MZN")).toBe("399,50 MT");
  });
  it("agrupa milhares", () => {
    expect(formatMoney(1234500, "MZN")).toBe("12 345 MT");
  });
  it("suporta outras moedas preparadas", () => {
    expect(formatMoney(1000, "USD", "en")).toBe("$10");
    expect(formatMoney(999, "EUR", "pt-PT")).toMatch(/9,99\s€/);
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["399", 39900],
    ["399,50", 39950],
    ["399.5", 39950],
    ["1 499", 149900],
    ["0", 0],
    ["699 MT", 69900],
  ])("%s → %d", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });
  it.each(["", "abc", "-5", "1,234,5", "10.999"])("rejeita %s", (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
  it("toMinor arredonda corretamente", () => {
    expect(toMinor(19.99)).toBe(1999);
  });
});
