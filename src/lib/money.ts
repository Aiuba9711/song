import { defaultCurrency, defaultLocale, type Currency, type Locale } from "@/lib/i18n/config";

/** Casas decimais por moeda (todas as suportadas usam 2). */
const MINOR_UNITS: Record<Currency, number> = { MZN: 2, ZAR: 2, USD: 2, BRL: 2, EUR: 2 };

export function toMinor(amount: number, currency: Currency = defaultCurrency): number {
  return Math.round(amount * 10 ** MINOR_UNITS[currency]);
}

export function fromMinor(minor: number, currency: Currency = defaultCurrency): number {
  return minor / 10 ** MINOR_UNITS[currency];
}

/**
 * Formata valores monetários.
 * MZN usa o formato local "399 MT" / "1 499,50 MT" (sem casas decimais quando o valor é inteiro).
 * Outras moedas usam Intl.
 */
export function formatMoney(
  minor: number,
  currency: string = defaultCurrency,
  locale: Locale = defaultLocale,
): string {
  const cur = (currency in MINOR_UNITS ? currency : defaultCurrency) as Currency;
  const value = fromMinor(minor, cur);
  const isWhole = Number.isInteger(value);

  if (cur === "MZN") {
    const n = new Intl.NumberFormat("pt-MZ", {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    })
      .format(value)
      .replace(/ | /g, " ");
    return `${n} MT`;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: isWhole ? 0 : 2,
  })
    .format(value)
    .replace(/ | /g, " ");
}

/** Converte texto introduzido no admin ("399", "399,50", "1 499.5") em centavos. */
export function parseMoneyInput(input: string): number | null {
  const cleaned = input.replace(/\s|MT|MZN/gi, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
