import "server-only";
import type { PaymentProviderId } from "@/generated/prisma/enums";
import { MANUAL_METHODS, PaymentError, type ManualMethod, type PaymentProvider } from "@/lib/payments/types";
import { CardPaymentProvider } from "./card";
import { ManualMobileMoneyProvider } from "./manual";

const providers: Partial<Record<PaymentProviderId, PaymentProvider>> = {
  MPESA: new ManualMobileMoneyProvider("MPESA"),
  EMOLA: new ManualMobileMoneyProvider("EMOLA"),
  MKESH: new ManualMobileMoneyProvider("MKESH"),
  CARD: new CardPaymentProvider(),
};

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  const p = providers[id];
  if (!p) throw new PaymentError("Método de pagamento não suportado.", "UNAVAILABLE");
  return p;
}

export function getManualProvider(id: PaymentProviderId): ManualMobileMoneyProvider {
  const p = providers[id];
  if (!(p instanceof ManualMobileMoneyProvider)) throw new PaymentError("Método de pagamento não suportado.", "UNAVAILABLE");
  return p;
}

export function isManualMethod(id: string): id is ManualMethod {
  return (MANUAL_METHODS as readonly string[]).includes(id);
}

/** Métodos disponíveis no checkout, pela ordem de apresentação. */
export async function listAvailableMethods(): Promise<Array<{ id: PaymentProviderId; label: string; mode: "MANUAL" | "API" }>> {
  const all = [...MANUAL_METHODS.map((m) => providers[m]!), providers.CARD!];
  const available = await Promise.all(all.map(async (p) => ((await p.isAvailable()) ? { id: p.id, label: p.label, mode: p.mode } : null)));
  return available.filter((p): p is NonNullable<typeof p> => p !== null);
}
