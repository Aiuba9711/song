import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { getSiteSettings } from "@/server/settings";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader />
      <main id="conteudo">{children}</main>
      <SiteFooter settings={settings} />
      <WhatsAppButton number={settings.whatsappNumber} message={settings.whatsappMessage} />
    </>
  );
}
