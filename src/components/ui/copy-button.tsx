"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonClass } from "./button";

/** Copia texto para a área de transferência (API moderna com alternativa para navegadores antigos). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta a alternativa */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

type Props = {
  /** Texto a copiar (calculado no momento do clique) */
  getText: () => string;
  label: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  className?: string;
  disabled?: boolean;
};

export function CopyButton({ getText, label, variant = "primary", size = "md", className, disabled }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const onClick = async () => {
    const ok = await copyText(getText());
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  };

  return (
    <>
      <button type="button" onClick={onClick} disabled={disabled} className={buttonClass(variant, size, className)}>
        {state === "copied" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {state === "copied" ? "Copiado!" : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Texto copiado para a área de transferência." : ""}
      </span>
      {state === "failed" && (
        <p role="alert" className="text-sm text-red-700">
          Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.
        </p>
      )}
    </>
  );
}
