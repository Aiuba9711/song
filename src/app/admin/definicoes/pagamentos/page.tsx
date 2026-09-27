import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { formatMzPhone } from "@/lib/pricing";
import { getPaymentSettings } from "@/server/payments/settings";
import { SettingsTabs } from "../tabs";
import { PaymentSettingsForm } from "./payment-settings-form";

export const metadata: Metadata = { title: "Pagamentos" };

export default async function PaymentSettingsPage() {
  await requirePermission("settings.manage");
  const s = await getPaymentSettings();
  return (
    <>
      <PageHeader title="Definições" description="Configuração central dos pagamentos. Os números não estão no código." />
      <SettingsTabs current="pagamentos" />
      <PaymentSettingsForm
        defaults={{
          mpesaEnabled: s.mpesaEnabled,
          mpesaNumber: formatMzPhone(s.mpesaNumber),
          emolaEnabled: s.emolaEnabled,
          emolaNumber: formatMzPhone(s.emolaNumber),
          mkeshEnabled: s.mkeshEnabled,
          mkeshNumber: formatMzPhone(s.mkeshNumber),
          accountHolderName: s.accountHolderName ?? "",
          instructions: s.instructions,
          currency: s.currency,
          defaultPrice: (s.defaultPriceMinor / 100).toString().replace(".", ","),
          cvPaywallEnabled: s.cvPaywallEnabled,
        }}
      />
    </>
  );
}
