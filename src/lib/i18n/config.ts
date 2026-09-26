/**
 * Internacionalização — preparada para vários locais.
 * Inicialmente apenas pt-MZ está ativo; os restantes estão registados para expansão
 * (ver ARCHITECTURE.md). As mensagens partilhadas vivem em ./messages.
 */
export const locales = ["pt-MZ", "pt-PT", "pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt-MZ";
export const enabledLocales: readonly Locale[] = ["pt-MZ"];

export const currencies = ["MZN", "ZAR", "USD", "BRL", "EUR"] as const;
export type Currency = (typeof currencies)[number];
export const defaultCurrency: Currency = "MZN";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function isCurrency(value: string): value is Currency {
  return (currencies as readonly string[]).includes(value);
}
