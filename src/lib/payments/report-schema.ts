import { z } from "zod";
import { normalizeMzMobile } from "@/lib/pricing";

/** Fuso de Moçambique (CAT, UTC+2, sem horário de verão). */
const MAPUTO_OFFSET = "+02:00";

/** Converte "2026-09-27T14:30" (hora local de Maputo) em Date. */
export function parseMaputoDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${MAPUTO_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Dados que o cliente informa depois de pagar (validados no servidor). */
export const paymentReportSchema = z.object({
  payerName: z.string().trim().min(3, "Indique o nome do titular da conta.").max(80),
  payerPhone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizeMzMobile(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Número inválido. Ex.: 84 123 4567" });
        return z.NEVER;
      }
      return n;
    }),
  transactionId: z
    .string()
    .trim()
    .min(4, "Indique o código da transação (está no SMS de confirmação).")
    .max(40)
    .regex(/^[A-Za-z0-9.\-_/]+$/, "Use apenas letras, números e os símbolos . - _ /"),
  reportedPaidAt: z.string().transform((v, ctx) => {
    const d = parseMaputoDateTime(v);
    const now = Date.now();
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Indique a data e a hora do pagamento." });
      return z.NEVER;
    }
    if (d.getTime() > now + 10 * 60 * 1000 || d.getTime() < now - 30 * 24 * 60 * 60 * 1000) {
      ctx.addIssue({ code: "custom", message: "A data deve ser dos últimos 30 dias e não pode ser no futuro." });
      return z.NEVER;
    }
    return d;
  }),
  confirmTruth: z.literal("on", { error: "Confirme que os dados são verdadeiros." }),
});

export const MAX_PROOF_BYTES = 3 * 1024 * 1024;
export const PROOF_TYPES = ["image/jpeg", "image/png", "application/pdf"];
