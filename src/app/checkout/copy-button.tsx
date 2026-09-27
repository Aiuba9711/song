"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copiar número/valor/referência — evita erros ao digitar no menu do operador. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard indisponível */
        }
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50"
      aria-label={`Copiar ${label}`}
    >
      {copied ? <Check className="size-4 text-go-700" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}
