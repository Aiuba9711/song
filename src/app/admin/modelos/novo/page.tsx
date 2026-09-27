import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";
import { getPaymentSettings } from "@/server/payments/settings";
import { createTemplateAction } from "../actions";
import { categoryOptions, NEW_TEMPLATE_DESIGN } from "../options";
import { TemplateForm } from "../template-form";

export const metadata: Metadata = { title: "Novo modelo" };

export default async function NewTemplatePage() {
  await requirePermission("templates.manage");
  const settings = await getPaymentSettings();
  return (
    <>
      <PageHeader title="Novo modelo de CV" description="O modelo é criado inativo por omissão — ative-o quando estiver pronto." />
      <TemplateForm
        action={createTemplateAction}
        categories={categoryOptions()}
        submitLabel="Criar modelo"
        defaultPriceLabel={formatMoney(settings.defaultPriceMinor, settings.currency)}
        defaults={{
          name: "",
          slug: "",
          description: "",
          category: "GERAL",
          style: "Professional",
          accentColor: "#1d40d8",
          sortOrder: 1000,
          isActive: false,
          isPremium: false,
          price: "",
          design: NEW_TEMPLATE_DESIGN,
        }}
      />
    </>
  );
}
