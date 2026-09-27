import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MessageTemplates } from "@/letters/message-templates";
import { EMPTY_VARS } from "@/letters/messages";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { getAiStatus } from "@/server/ai";
import { getSiteSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Modelos de email e WhatsApp" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const [session, { tipo }] = await Promise.all([requireUser("/meu-espaco/mensagens"), searchParams]);
  const kind = tipo === "whatsapp" ? "whatsapp" : "email";
  const [user, site, aiStatus] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.id }, select: { name: true, email: true, phone: true, profile: { select: { headline: true } } } }),
    getSiteSettings(),
    getAiStatus(session.id),
  ]);
  const defaults = { ...EMPTY_VARS, name: user.name, email: user.email, phone: user.phone ? `+${user.phone}` : "", position: user.profile?.headline ?? "" };

  const tab = (value: "email" | "whatsapp", label: string, Icon: typeof Mail) => (
    <Link
      href={`/meu-espaco/mensagens?tipo=${value}`}
      aria-current={kind === value ? "page" : undefined}
      className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold", kind === value ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-ink")}
    >
      <Icon className="size-4" aria-hidden /> {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Modelos de email e WhatsApp" description="Mensagens profissionais prontas a copiar. Preencha os dados, reveja o texto e envie." />
      <nav aria-label="Tipo de modelo" className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {tab("email", "Email", Mail)}
        {tab("whatsapp", "WhatsApp", MessageCircle)}
      </nav>
      <MessageTemplates
        key={kind}
        kind={kind}
        defaults={defaults}
        aiStatus={aiStatus}
        whatsapp={{ countryCode: site.whatsappCountryCode, linksEnabled: site.whatsappLinksEnabled }}
      />
    </>
  );
}
