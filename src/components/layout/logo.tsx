import Link from "next/link";
import { cn } from "@/lib/utils";

/** Símbolo da marca: documento com marca de verificação (candidatura pronta). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#1d40d8" />
      <path d="M13 9.5h10.5l6 6V29a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V11.5a2 2 0 0 1 2-2Z" fill="#fff" />
      <path d="M23.5 9.5v4a2 2 0 0 0 2 2h4" fill="#bfd3fe" />
      <rect x="14.5" y="15" width="7" height="2" rx="1" fill="#93b4fd" />
      <rect x="14.5" y="19.5" width="11" height="2" rx="1" fill="#dbe6fe" />
      <circle cx="27.5" cy="27.5" r="6.5" fill="#0f9d58" stroke="#1d40d8" strokeWidth="2" />
      <path d="m24.8 27.6 1.9 1.9 3.6-3.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="Emprego Fácil MZ — página inicial">
      <LogoMark />
      <span className="text-[17px] font-extrabold tracking-tight text-ink">
        Emprego Fácil <span className="text-brand-700">MZ</span>
      </span>
    </Link>
  );
}
