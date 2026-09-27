import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/guards";
import { readSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";
import { SettingsTabs } from "./tabs";

export const metadata: Metadata = { title: "Definições" };

export default async function AdminSettingsPage() {
  await requirePermission("settings.manage");
  const s = await readSettings();
  return (
    <>
      <PageHeader title="Definições" description="Configuração do site. Nada disto está no código." />
      <SettingsTabs current="site" />
      <SettingsForm
        defaults={{
          whatsappNumber: s.whatsappNumber ?? "",
          whatsappMessage: s.whatsappMessage ?? "",
          contactEmail: s.contactEmail ?? "",
          contactPhone: s.contactPhone ?? "",
          supportHours: s.supportHours ?? "",
          facebookUrl: s.facebookUrl ?? "",
          instagramUrl: s.instagramUrl ?? "",
          tiktokUrl: s.tiktokUrl ?? "",
          linkedinUrl: s.linkedinUrl ?? "",
        }}
      />
    </>
  );
}
