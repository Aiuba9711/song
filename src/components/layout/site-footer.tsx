import Link from "next/link";
import type { PublicSettings } from "@/server/settings";
import { Logo } from "./logo";
import { SocialLinks } from "./social-links";

export function SiteFooter({ settings }: { settings: PublicSettings }) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white pb-24 md:pb-0">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-slate-600">
            O teu próximo emprego começa com uma boa candidatura. Ferramentas práticas para quem procura emprego em Moçambique.
          </p>
          <SocialLinks settings={settings} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Ferramentas</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/cv-modelos" className="hover:text-brand-700">Criar CV</Link></li>
            <li><Link href="/cv-modelos" className="hover:text-brand-700">Modelos de CV</Link></li>
            <li><Link href="/kits" className="hover:text-brand-700">Kits de candidatura</Link></li>
            <li><Link href="/conselhos" className="hover:text-brand-700">Conselhos de carreira</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-ink">Emprego Fácil MZ</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/contactos" className="hover:text-brand-700">Contactos</Link></li>
            <li><Link href="/privacidade" className="hover:text-brand-700">Política de privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-brand-700">Termos de utilização</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <p className="container-page py-5 text-xs text-slate-500">
          © {new Date().getFullYear()} Emprego Fácil MZ. Não garantimos emprego — ajudamos a apresentar a sua candidatura de forma mais profissional.
        </p>
      </div>
    </footer>
  );
}
