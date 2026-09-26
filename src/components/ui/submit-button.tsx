"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass } from "./button";
import { Spinner } from "./spinner";

type Props = Omit<ComponentProps<"button">, "type"> & {
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  pendingLabel?: string;
  icon?: ReactNode;
};

/** Botão de submissão com estado de carregamento automático. */
export function SubmitButton({ children, pendingLabel, variant, size, className, icon, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {pending ? <Spinner /> : icon}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
