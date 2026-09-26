import { z } from "zod";

/** Mensagens de erro em português, curtas e claras. */
export const emailSchema = z
  .string({ error: "Indique o email." })
  .trim()
  .toLowerCase()
  .min(1, "Indique o email.")
  .max(254, "Email demasiado longo.")
  .email("Email inválido.");

export const passwordSchema = z
  .string({ error: "Indique a senha." })
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(128, "A senha é demasiado longa.")
  .refine((v) => /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v), "Use letras e pelo menos um número.");

/** Telefone opcional: aceita +258 84 123 4567, 841234567, etc. Guarda só dígitos com indicativo. */
export const phoneSchema = z
  .string()
  .trim()
  .max(25)
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const digits = v.replace(/[^\d+]/g, "");
    const normalized = digits.startsWith("+") ? digits.slice(1) : digits;
    if (!/^\d{9,15}$/.test(normalized)) {
      ctx.addIssue({ code: "custom", message: "Número de telefone inválido." });
      return z.NEVER;
    }
    // Números moçambicanos sem indicativo (8X XXX XXXX) → 258…
    return normalized.length === 9 && normalized.startsWith("8") ? `258${normalized}` : normalized;
  });

export const nameSchema = z
  .string({ error: "Indique o nome." })
  .trim()
  .min(2, "Indique o nome completo.")
  .max(80, "Nome demasiado longo.");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  acceptTerms: z.literal("on", { error: "Precisa de aceitar os termos e a política de privacidade." }),
  marketingConsent: z.literal("on").optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Indique a senha.").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  headline: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  marketingConsent: z.literal("on").optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Indique a senha atual.").max(128),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: FieldErrors;
};

export function formDataToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}
