import { z } from "zod";

/**
 * Cartas de candidatura e de motivação — modelo partilhado (cliente e servidor).
 * Todo o conteúdo vem do utilizador; o gerador só junta as frases de cortesia habituais.
 */
export const LETTER_TYPES = ["CANDIDATURA", "MOTIVACAO"] as const;
export type LetterType = (typeof LETTER_TYPES)[number];

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  CANDIDATURA: "Carta de candidatura",
  MOTIVACAO: "Carta de motivação",
};

export const LETTER_LIMITS = {
  title: 80,
  senderName: 80,
  senderContact: 200,
  recipientName: 80,
  company: 120,
  position: 120,
  education: 800,
  experience: 1500,
  skills: 600,
  motivation: 1500,
  city: 60,
  subject: 160,
  body: 6000,
} as const;

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`).default("");

export const letterSchema = z.object({
  type: z.enum(LETTER_TYPES),
  title: z.string().trim().min(1, "Dê um nome à carta.").max(LETTER_LIMITS.title),
  senderName: text(LETTER_LIMITS.senderName),
  senderContact: text(LETTER_LIMITS.senderContact),
  recipientName: text(LETTER_LIMITS.recipientName),
  company: text(LETTER_LIMITS.company),
  position: text(LETTER_LIMITS.position),
  education: text(LETTER_LIMITS.education),
  experience: text(LETTER_LIMITS.experience),
  skills: text(LETTER_LIMITS.skills),
  motivation: text(LETTER_LIMITS.motivation),
  city: text(LETTER_LIMITS.city),
  subject: text(LETTER_LIMITS.subject),
  body: z.string().max(LETTER_LIMITS.body, `A carta pode ter no máximo ${LETTER_LIMITS.body} caracteres.`).default(""),
});

export type LetterContent = z.output<typeof letterSchema>;
export type LetterInput = z.input<typeof letterSchema>;

/** Campos usados pelo gerador (os «dados» da carta). */
export const LETTER_FIELDS = ["senderName", "company", "position", "education", "experience", "skills", "motivation", "senderContact"] as const;

export const EMPTY_LETTER: LetterContent = {
  type: "CANDIDATURA",
  title: "",
  senderName: "",
  senderContact: "",
  recipientName: "",
  company: "",
  position: "",
  education: "",
  experience: "",
  skills: "",
  motivation: "",
  city: "",
  subject: "",
  body: "",
};
