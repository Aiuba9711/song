import type { Metadata } from "next";
import { Clock, Mail, Phone } from "lucide-react";
import { SocialLinks } from "@/components/layout/social-links";
import { WhatsAppIcon } from "@/components/layout/whatsapp-button";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSiteSettings, whatsappLink } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contactos",
  description: "Fale com a equipa Emprego Fácil MZ por WhatsApp, email ou redes sociais.",
  alternates: { canonical: "/contactos" },
};

export default async function ContactPage() {
  const s = await getSiteSettings();
  const hasAny = s.whatsappNumber || s.contactEmail || s.contactPhone;
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contactos</h1>
      <p className="mt-3 text-lg text-slate-600">Tem dúvidas sobre a plataforma, um pedido ou uma sugestão? Fale connosco.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {s.whatsappNumber && (
          <Card className="p-5 sm:col-span-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <WhatsAppIcon className="size-5 text-[#128c4a]" /> WhatsApp
            </h2>
            <p className="mt-1 text-slate-600">A forma mais rápida de falar connosco.</p>
            <a
              href={whatsappLink(s.whatsappNumber, s.whatsappMessage ?? "Olá! Tenho uma dúvida sobre o Emprego Fácil MZ.")}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("success", "lg", "mt-4")}
            >
              Falar connosco no WhatsApp
            </a>
          </Card>
        )}
        {s.contactEmail && (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Mail className="size-5 text-brand-700" aria-hidden /> Email
            </h2>
            <a href={`mailto:${s.contactEmail}`} className="mt-2 block font-medium break-all text-brand-700 underline">
              {s.contactEmail}
            </a>
          </Card>
        )}
        {s.contactPhone && (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Phone className="size-5 text-brand-700" aria-hidden /> Telefone
            </h2>
            <a href={`tel:${s.contactPhone.replace(/\s/g, "")}`} className="mt-2 block font-medium text-brand-700 underline">
              {s.contactPhone}
            </a>
          </Card>
        )}
        {s.supportHours && (
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock className="size-5 text-brand-700" aria-hidden /> Horário
            </h2>
            <p className="mt-2 text-slate-700">{s.supportHours}</p>
          </Card>
        )}
      </div>

      {!hasAny && <p className="mt-6 rounded-xl bg-white p-5 text-slate-600 ring-1 ring-slate-200">Os contactos estão a ser configurados. Volte em breve.</p>}

      <section className="mt-10">
        <h2 className="text-xl font-bold">Redes sociais</h2>
        <SocialLinks settings={s} className="mt-3 flex flex-wrap gap-2" />
        {!s.facebookUrl && !s.instagramUrl && !s.tiktokUrl && !s.linkedinUrl && <p className="mt-2 text-slate-500">Em breve.</p>}
      </section>
    </div>
  );
}
