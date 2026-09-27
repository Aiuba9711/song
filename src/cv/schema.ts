import { z } from "zod";
import { SECTION_KEYS } from "./types";

const text = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres.`).default("");
const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Email inválido.")
  .default("");

export const MAX_ITEMS = 20;

export const cvContentSchema = z.object({
  title: z.string().trim().min(1, "Dê um nome ao CV.").max(80),
  templateId: z.string().max(40).nullable().default(null),
  personal: z.object({
    fullName: text(80),
    jobTitle: text(100),
    email: optionalEmail,
    phone: text(30),
    location: text(100),
    nationality: text(60),
    birthDate: text(40),
    linkedin: text(200),
    website: text(200),
    showPhoto: z.boolean().default(false),
  }),
  summary: text(2000),
  objective: text(600),
  experiences: z
    .array(
      z.object({
        position: z.string().trim().min(1, "Indique o cargo.").max(100),
        employer: z.string().trim().min(1, "Indique a empresa/organização.").max(120),
        location: text(100),
        startDate: text(30),
        endDate: text(30),
        isCurrent: z.boolean().default(false),
        description: text(2500),
      }),
    )
    .max(MAX_ITEMS)
    .default([]),
  educations: z
    .array(
      z.object({
        degree: z.string().trim().min(1, "Indique o curso/grau.").max(120),
        institution: z.string().trim().min(1, "Indique a instituição.").max(120),
        location: text(100),
        startDate: text(30),
        endDate: text(30),
        isCurrent: z.boolean().default(false),
        description: text(1500),
      }),
    )
    .max(MAX_ITEMS)
    .default([]),
  skills: z
    .array(z.object({ name: z.string().trim().min(1).max(80), level: text(20) }))
    .max(40)
    .default([]),
  languages: z
    .array(z.object({ name: z.string().trim().min(1).max(40), level: text(20) }))
    .max(10)
    .default([]),
  courses: z
    .array(z.object({ name: z.string().trim().min(1, "Indique o nome do curso.").max(150), institution: text(120), year: text(20) }))
    .max(MAX_ITEMS)
    .default([]),
  certifications: z
    .array(z.object({ name: z.string().trim().min(1, "Indique o nome da certificação.").max(150), institution: text(120), year: text(20) }))
    .max(MAX_ITEMS)
    .default([]),
  references: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Indique o nome.").max(80),
        position: text(100),
        company: text(120),
        phone: text(30),
        email: optionalEmail,
      }),
    )
    .max(6)
    .default([]),
  referencesOnRequest: z.boolean().default(false),
  customSections: z
    .array(z.object({ title: z.string().trim().min(1, "Indique o título.").max(60), content: z.string().trim().max(2000) }))
    .max(5)
    .default([]),
  hiddenSections: z.array(z.enum(SECTION_KEYS)).default([]),
  photoSettings: z
    .object({
      zoom: z.number().min(1).max(3).default(1),
      offsetX: z.number().min(-1).max(1).default(0),
      offsetY: z.number().min(-1).max(1).default(0),
      position: z.enum(["auto", "left", "right", "center"]).default("auto"),
    })
    .default({ zoom: 1, offsetX: 0, offsetY: 0, position: "auto" }),
});

export type CvContentInput = z.input<typeof cvContentSchema>;
