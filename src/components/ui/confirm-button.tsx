"use client";

import { useId, useRef, type ReactNode } from "react";
import { buttonClass } from "./button";

type Props = {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  className?: string;
  /** id do formulário a submeter após confirmação */
  form: string;
};

/**
 * Pede confirmação (diálogo nativo acessível) antes de submeter um formulário destrutivo.
 */
export function ConfirmButton({ children, title, description, confirmLabel, variant = "danger", size = "md", className, form }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className={buttonClass(variant, size, className)} onClick={() => ref.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl p-0 shadow-lift backdrop:bg-slate-900/50"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass("outline")} onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button type="submit" form={form} className={buttonClass(variant)} onClick={() => ref.current?.close()}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
