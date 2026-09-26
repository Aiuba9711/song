import { whatsappLink } from "@/server/settings";

/** Botão flutuante "Falar connosco no WhatsApp" — número configurado no painel admin. */
export function WhatsAppButton({ number, message, desktopOnly }: { number: string | null; message: string | null; desktopOnly?: boolean }) {
  if (!number) return null;
  return (
    <a
      href={whatsappLink(number, message ?? "Olá! Gostaria de saber mais sobre o Emprego Fácil MZ.")}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-4 bottom-20 z-40 ${desktopOnly ? "hidden md:inline-flex" : "inline-flex"} items-center gap-2 rounded-full bg-[#25d366] py-3 pr-4 pl-3 font-semibold text-[#073b1f] shadow-lift transition-transform hover:scale-105 md:bottom-6 print:hidden`}
      aria-label="Falar connosco no WhatsApp (abre numa nova janela)"
    >
      <WhatsAppIcon className="size-6" />
      <span className="hidden sm:inline">Falar connosco</span>
    </a>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.23-9.43 9.44-9.43a9.37 9.37 0 0 1 9.42 9.44c0 5.2-4.23 9.43-9.44 9.43Zm8.03-17.46A11.3 11.3 0 0 0 12.05.7C5.8.7.7 5.8.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.03-1.58a11.33 11.33 0 0 0 5.42 1.38h.01c6.25 0 11.34-5.09 11.35-11.35 0-3.03-1.18-5.88-3.33-8.02Z" />
    </svg>
  );
}
