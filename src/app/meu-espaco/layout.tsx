import type { Metadata } from "next";
import { BottomNav, SideNav } from "@/components/app/app-nav";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/layout/logo";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { requireUser } from "@/lib/auth/guards";
import { getSiteSettings } from "@/server/settings";

export const metadata: Metadata = { title: { default: "Meu Espaço", template: "%s | Meu Espaço" }, robots: { index: false, follow: false } };

export default async function MySpaceLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSiteSettings()]);
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur print:hidden">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo href="/meu-espaco" />
          <UserMenu user={user} />
        </div>
      </header>
      <div className="container-page flex gap-8 pt-6">
        <SideNav />
        <main id="conteudo" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      <BottomNav />
      <WhatsAppButton number={settings.whatsappNumber} message={settings.whatsappMessage} desktopOnly />
    </div>
  );
}
