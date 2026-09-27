/**
 * Cálculo de preços — funções puras (testadas). O valor é SEMPRE calculado no servidor a
 * partir da base de dados; o cliente nunca envia totais.
 */
export type PricedItem = { unitPriceMinor: number; quantity: number; currency: string };

export type OrderTotals = { subtotalMinor: number; discountMinor: number; totalMinor: number; currency: string };

export function calculateTotals(items: PricedItem[], discountMinor = 0): OrderTotals {
  if (items.length === 0) throw new Error("Pedido sem itens");
  const currency = items[0]!.currency;
  let subtotal = 0;
  for (const item of items) {
    if (item.currency !== currency) throw new Error("Itens com moedas diferentes");
    if (!Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor < 0) throw new Error("Preço inválido");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new Error("Quantidade inválida");
    subtotal += item.unitPriceMinor * item.quantity;
  }
  const discount = Math.min(Math.max(0, Math.round(discountMinor)), subtotal);
  return { subtotalMinor: subtotal, discountMinor: discount, totalMinor: subtotal - discount, currency };
}

/** Número moçambicano para apresentação: 841234567 → "84 123 4567" */
export function formatMzPhone(value: string | null | undefined): string {
  if (!value) return "";
  const d = value.replace(/\D/g, "").replace(/^258(?=\d{9}$)/, "");
  if (d.length === 9) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return value;
}

/** Normaliza para 9 dígitos nacionais (84XXXXXXX) ou devolve null se inválido. */
export function normalizeMzMobile(value: string): string | null {
  const d = value.replace(/\D/g, "").replace(/^258(?=\d{9}$)/, "");
  return /^8[2-7]\d{7}$/.test(d) ? d : null;
}
