import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Método", "Pagar", "Verificação"];

/** Indicador de progresso do checkout (1 = escolher método, 2 = pagar e informar, 3 = verificação). */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Passos do pagamento">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full text-sm font-bold",
                done ? "bg-go-700 text-white" : active ? "bg-brand-700 text-white" : "bg-slate-200 text-slate-600",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : n}
            </span>
            <span className={cn("text-xs font-medium", active ? "text-ink" : "text-slate-500")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
