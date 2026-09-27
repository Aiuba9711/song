import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/money";
import { getPaymentSettings } from "@/server/payments/settings";
import { getPhotoPricing } from "@/server/photos";
import { PhotoPricesForm } from "../forms";
import { PhotoAdminTabs } from "../tabs";

export const metadata: Metadata = { title: "Preços · Foto Profissional" };

const asInput = (minor: number | null) => (minor && minor > 0 ? (minor / 100).toString().replace(".", ",") : "");

export default async function PhotoPricesPage() {
  const user = await requirePermission("photos.manage");
  const [s, pricing] = await Promise.all([getPaymentSettings(), getPhotoPricing()]);
  const editable = can(user.role, "settings.manage");

  return (
    <>
      <PageHeader title="Foto Profissional" description="Preços usados no checkout (mesmo sistema de pagamento dos CVs e das cartas)." />
      <PhotoAdminTabs current="precos" />
      <Card className="mb-4 p-4 text-sm">
        <p>
          Preço atual: <strong>{pricing.paid ? formatMoney(pricing.priceMinor, pricing.currency) : "Gratuita"}</strong>
          {pricing.promoActive && ` (promoção; normal ${formatMoney(pricing.regularMinor, pricing.currency)})`}
        </p>
        <p>
          Pacote CV + Foto: <strong>{pricing.bundleMinor ? formatMoney(pricing.bundleMinor, pricing.currency) : "indisponível"}</strong>
        </p>
      </Card>
      {editable ? (
        <Card className="p-5">
          <PhotoPricesForm
            defaults={{
              photoPrice: asInput(s.photoPriceMinor),
              photoPromoPrice: asInput(s.photoPromoPriceMinor),
              photoPromoEndsAt: s.photoPromoEndsAt ? s.photoPromoEndsAt.toISOString().slice(0, 10) : "",
              photoBundlePrice: asInput(s.photoBundlePriceMinor),
              currency: s.currency,
            }}
          />
        </Card>
      ) : (
        <Alert tone="info">Só administradores podem alterar preços.</Alert>
      )}
    </>
  );
}
