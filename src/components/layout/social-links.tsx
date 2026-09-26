import type { PublicSettings } from "@/server/settings";
import { whatsappLink } from "@/server/settings";

type Social = { key: string; label: string; href: string | null; path: string };

/** Ícones sociais (SVG inline, sem pedidos externos). Só aparecem as redes configuradas. */
export function SocialLinks({ settings, className }: { settings: PublicSettings; className?: string }) {
  const items: Social[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: settings.whatsappNumber ? whatsappLink(settings.whatsappNumber) : null,
      path: "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.8-4.6-4-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: settings.facebookUrl,
      path: "M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.6V14h2.8v8h3.1Z",
    },
    {
      key: "instagram",
      label: "Instagram",
      href: settings.instagramUrl,
      path: "M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.9-8.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM21.9 8c-.1-1.5-.4-2.8-1.5-3.9S18 2.7 16.5 2.6C15 2.5 9 2.5 7.5 2.6 6 2.7 4.7 3 3.6 4.1S2.2 6.5 2.1 8C2 9.5 2 14.5 2.1 16c.1 1.5.4 2.8 1.5 3.9s2.4 1.4 3.9 1.5c1.5.1 7.5.1 9 0 1.5-.1 2.8-.4 3.9-1.5s1.4-2.4 1.5-3.9c.1-1.5.1-6.5 0-8Zm-2 9.9a3.1 3.1 0 0 1-1.7 1.7c-1.2.5-4.1.4-5.4.4s-4.2.1-5.4-.4a3.1 3.1 0 0 1-1.7-1.7c-.5-1.2-.4-4.1-.4-5.4s-.1-4.2.4-5.4a3.1 3.1 0 0 1 1.7-1.7C7.6 4.9 10.5 5 11.8 5s4.2-.1 5.4.4a3.1 3.1 0 0 1 1.7 1.7c.5 1.2.4 4.1.4 5.4s.1 4.2-.4 5.4Z",
    },
    {
      key: "tiktok",
      label: "TikTok",
      href: settings.tiktokUrl,
      path: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.8a5.7 5.7 0 1 0 4.9 5.6V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4c-1.2 0-2.4-.6-3.2-1.6Z",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: settings.linkedinUrl,
      path: "M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.2 2.4 4.2 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1ZM7.1 20.5H3.6V9h3.5v11.5ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z",
    },
  ];
  const visible = items.filter((i) => i.href);
  if (visible.length === 0) return null;
  return (
    <ul className={className ?? "flex gap-2"} aria-label="Redes sociais">
      {visible.map((item) => (
        <li key={item.key}>
          <a
            href={item.href!}
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
            aria-label={`${item.label} (abre numa nova janela)`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
              <path d={item.path} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
