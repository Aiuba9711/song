"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight } from "lucide-react";
import { chooseTemplateAction } from "@/app/meu-espaco/cvs/actions";
import { buttonClass } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function Inner({ label, variant }: { label: string; variant: "primary" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, "md", "w-full")}>
      {pending ? <Spinner /> : null}
      {label}
      {!pending && <ArrowRight className="size-4" aria-hidden />}
    </button>
  );
}

/** «Usar este modelo» — escolhe o modelo e abre o editor (pede login se necessário). */
export function ChooseTemplateButton({ slug, label = "Usar este modelo", variant = "primary" }: { slug: string; label?: string; variant?: "primary" | "outline" }) {
  return (
    <form action={chooseTemplateAction}>
      <input type="hidden" name="modelo" value={slug} />
      <Inner label={label} variant={variant} />
    </form>
  );
}
