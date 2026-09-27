import "server-only";
import { unstable_cache } from "next/cache";
import type { PaymentSettings } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ManualMethod } from "@/lib/payments/types";

export const PAYMENT_SETTINGS_TAG = "payment-settings";

/** Configuração central de pagamentos (linha única). Nunca lança: sem linha → tudo desativado. */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  const row = await db.paymentSettings.findUnique({ where: { id: "default" } });
  return (
    row ?? {
      id: "default",
      mpesaEnabled: false,
      mpesaNumber: null,
      emolaEnabled: false,
      emolaNumber: null,
      mkeshEnabled: false,
      mkeshNumber: null,
      accountHolderName: null,
      instructions: "",
      currency: "MZN",
      defaultPriceMinor: 19900,
      cvPaywallEnabled: false,
      letterPriceMinor: 0,
      photoPriceMinor: 0,
      photoPromoPriceMinor: null,
      photoPromoEndsAt: null,
      photoBundlePriceMinor: null,
      cardEnabled: false,
      updatedAt: new Date(0),
    }
  );
}

export function manualMethodConfig(settings: PaymentSettings, method: ManualMethod): { enabled: boolean; number: string | null } {
  switch (method) {
    case "MPESA":
      return { enabled: settings.mpesaEnabled, number: settings.mpesaNumber };
    case "EMOLA":
      return { enabled: settings.emolaEnabled, number: settings.emolaNumber };
    case "MKESH":
      return { enabled: settings.mkeshEnabled, number: settings.mkeshNumber };
  }
}

/** Resumo público (para páginas estáticas): há algum método ativo? o CV é pago? */
export const getPublicPaymentSummary = unstable_cache(
  async () => {
    try {
      const s = await getPaymentSettings();
      const anyManual = (["MPESA", "EMOLA", "MKESH"] as const).some((m) => {
        const c = manualMethodConfig(s, m);
        return c.enabled && !!c.number;
      });
      return {
        checkoutAvailable: anyManual && s.currency === "MZN",
        cvPaywallEnabled: s.cvPaywallEnabled,
        cvPriceMinor: s.defaultPriceMinor,
        letterPriceMinor: s.letterPriceMinor,
        currency: s.currency,
      };
    } catch (error) {
      console.error("[payments] definições indisponíveis", error);
      return { checkoutAvailable: false, cvPaywallEnabled: false, cvPriceMinor: 19900, letterPriceMinor: 0, currency: "MZN" };
    }
  },
  ["payment-summary-v2"],
  { tags: [PAYMENT_SETTINGS_TAG], revalidate: 600 },
);
