import { z } from "zod";
import { parseMoneyInput } from "@/lib/money";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const money = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) {
        if (required) ctx.addIssue({ code: "custom", message: `Indique o ${label}.` });
        return null;
      }
      const minor = parseMoneyInput(v);
      if (minor === null || minor > 100_000_000) {
        ctx.addIssue({ code: "custom", message: `${label[0]!.toUpperCase()}${label.slice(1)} inválido. Ex.: 399 ou 399,50` });
        return z.NEVER;
      }
      return minor;
    });

/** FAQ em texto: blocos separados por linha em branco; 1.ª linha = pergunta, resto = resposta. */
export function parseFaqText(text: string): Array<{ q: string; a: string }> {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [q, ...rest] = block.split("\n");
      return { q: q!.trim(), a: rest.join(" ").trim() };
    })
    .filter((i) => i.q && i.a);
}

export function faqToText(faq: Array<{ q: string; a: string }>): string {
  return faq.map((i) => `${i.q}\n${i.a}`).join("\n\n");
}

export const productSchema = z.object({
  name: z.string().trim().min(3, "Indique o nome (mín. 3 caracteres).").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.")
    .min(3)
    .max(80),
  tier: optionalText(30),
  shortDescription: z.string().trim().min(10, "Descrição curta demasiado curta.").max(200),
  description: z.string().trim().min(10, "Descrição demasiado curta.").max(5000),
  type: z.enum(["KIT", "TEMPLATE_PACK", "TOOL", "SUBSCRIPTION"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  price: money("preço", true),
  compareAtPrice: money("preço anterior", false),
  currency: z.enum(["MZN", "ZAR", "USD", "BRL", "EUR"]),
  features: z
    .string()
    .max(4000)
    .transform((v) => v.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30)),
  faq: z
    .string()
    .max(8000)
    .transform((v) => parseFaqText(v).slice(0, 20)),
  isFeatured: z.literal("on").optional().transform((v) => v === "on"),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

export const templateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.")
    .min(2)
    .max(60),
  description: z.string().trim().min(10, "Descrição demasiado curta.").max(300),
  category: z.enum(["GERAL", "PRIMEIRO_EMPREGO", "ADMINISTRATIVO", "CONTABILIDADE", "RECURSOS_HUMANOS", "SAUDE", "EDUCACAO", "INFORMATICA", "ENGENHARIA", "VENDAS_MARKETING", "EXECUTIVO"]),
  layout: z.enum(["CLASSICO", "MODERNO", "EXECUTIVO"]),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)."),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.literal("on").optional().transform((v) => v === "on"),
  isPremium: z.literal("on").optional().transform((v) => v === "on"),
});

const url = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      const u = new URL(v);
      if (u.protocol !== "https:") throw new Error();
      return u.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "Use um endereço completo com https://" });
      return z.NEVER;
    }
  });

export const settingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const digits = v.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 15) {
        ctx.addIssue({ code: "custom", message: "Número inválido. Use o formato internacional, ex.: 258841234567" });
        return z.NEVER;
      }
      return digits.length === 9 && digits.startsWith("8") ? `258${digits}` : digits;
    }),
  whatsappMessage: optionalText(300),
  contactEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!z.email().safeParse(v).success) {
        ctx.addIssue({ code: "custom", message: "Email inválido." });
        return z.NEVER;
      }
      return v.toLowerCase();
    }),
  contactPhone: optionalText(30),
  supportHours: optionalText(100),
  facebookUrl: url,
  instagramUrl: url,
  tiktokUrl: url,
  linkedinUrl: url,
});
