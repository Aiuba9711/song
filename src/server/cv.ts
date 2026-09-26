import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CvContent, CvLayoutId, CvPhoto, CvTheme, SectionKey } from "@/cv/types";
import { SECTION_KEYS } from "@/cv/types";
import type { cvContentSchema } from "@/cv/schema";
import type { z } from "zod";
import { db } from "@/lib/db";
import { buildStorageKey, storage } from "@/lib/storage";
import { DomainError } from "@/server/users";

export const MAX_CVS_PER_USER = 30;

const cvInclude = {
  template: { select: { id: true, slug: true, name: true, layout: true, accentColor: true, isActive: true } },
  experiences: { orderBy: { sortOrder: "asc" } },
  educations: { orderBy: { sortOrder: "asc" } },
  skills: { orderBy: { sortOrder: "asc" } },
  languages: { orderBy: { sortOrder: "asc" } },
  courses: { orderBy: { sortOrder: "asc" } },
  references: { orderBy: { sortOrder: "asc" } },
  customSections: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.CVInclude;

export type CvWithRelations = Prisma.CVGetPayload<{ include: typeof cvInclude }>;

const DEFAULT_THEME: CvTheme = { layout: "CLASSICO", accentColor: "#1d40d8" };

export function themeOf(cv: Pick<CvWithRelations, "template">): CvTheme {
  if (!cv.template) return DEFAULT_THEME;
  return { layout: cv.template.layout as CvLayoutId, accentColor: cv.template.accentColor };
}

/** Converte o registo da BD no modelo normalizado usado pelos renderizadores. */
export function toCvContent(cv: CvWithRelations): CvContent {
  return {
    title: cv.title,
    templateId: cv.templateId,
    personal: {
      fullName: cv.fullName,
      jobTitle: cv.jobTitle,
      email: cv.email,
      phone: cv.phone,
      location: cv.location,
      nationality: cv.nationality ?? "",
      birthDate: cv.birthDate ?? "",
      linkedin: cv.linkedin ?? "",
      website: cv.website ?? "",
      showPhoto: cv.showPhoto && !!cv.photoKey,
    },
    summary: cv.summary,
    experiences: cv.experiences.map(({ position, employer, location, startDate, endDate, isCurrent, description }) => ({
      position,
      employer,
      location,
      startDate,
      endDate,
      isCurrent,
      description,
    })),
    educations: cv.educations.map(({ degree, institution, location, startDate, endDate, isCurrent, description }) => ({
      degree,
      institution,
      location,
      startDate,
      endDate,
      isCurrent,
      description,
    })),
    skills: cv.skills.map((s) => ({ name: s.name, level: s.level ?? "" })),
    languages: cv.languages.map((l) => ({ name: l.name, level: l.level })),
    courses: cv.courses.map((c) => ({ name: c.name, institution: c.institution, year: c.year })),
    references: cv.references.map(({ name, position, company, phone, email }) => ({ name, position, company, phone, email })),
    referencesOnRequest: cv.referencesOnRequest,
    customSections: cv.customSections.map((s) => ({ title: s.title, content: s.content })),
    hiddenSections: cv.hiddenSections.filter((s): s is SectionKey => (SECTION_KEYS as readonly string[]).includes(s)),
  };
}

export async function listUserCvs(userId: string) {
  return db.cV.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      fullName: true,
      jobTitle: true,
      updatedAt: true,
      currentStep: true,
      template: { select: { name: true, layout: true, accentColor: true } },
    },
  });
}

/** Devolve o CV apenas se pertencer ao utilizador (autorização por posse). */
export async function getUserCv(userId: string, cvId: string): Promise<CvWithRelations | null> {
  return db.cV.findFirst({ where: { id: cvId, userId }, include: cvInclude });
}

async function resolveTemplateId(templateId: string | null | undefined): Promise<string | null> {
  if (!templateId) return null;
  const t = await db.cVTemplate.findFirst({ where: { id: templateId, isActive: true }, select: { id: true } });
  return t?.id ?? null;
}

export async function createCv(userId: string, input: { title?: string; templateSlug?: string | null }) {
  const count = await db.cV.count({ where: { userId } });
  if (count >= MAX_CVS_PER_USER) {
    throw new DomainError(`Atingiu o limite de ${MAX_CVS_PER_USER} CVs. Elimine um CV antigo para criar outro.`, "LIMIT");
  }
  const [user, template] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, profile: { select: { headline: true, location: true } } } }),
    input.templateSlug
      ? db.cVTemplate.findFirst({ where: { slug: input.templateSlug, isActive: true }, select: { id: true, name: true } })
      : db.cVTemplate.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  // Pré-preenche apenas com dados que o próprio utilizador forneceu na conta.
  return db.cV.create({
    data: {
      userId,
      title: input.title?.trim() || (template ? `CV — ${template.name}` : "O meu CV"),
      templateId: template?.id ?? null,
      fullName: user.name,
      email: user.email,
      phone: user.phone ? `+${user.phone}` : "",
      jobTitle: user.profile?.headline ?? "",
      location: user.profile?.location ?? "",
    },
    select: { id: true },
  });
}

type ParsedContent = z.output<typeof cvContentSchema>;

/** Guarda todo o conteúdo do CV numa transação (substitui as listas). */
export async function saveCv(userId: string, cvId: string, content: ParsedContent, step?: number) {
  const existing = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true } });
  if (!existing) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  const templateId = await resolveTemplateId(content.templateId);
  const p = content.personal;
  const withOrder = <T,>(items: T[]) => items.map((item, i) => ({ ...item, cvId, sortOrder: i }));

  await db.$transaction([
    db.cV.update({
      where: { id: cvId },
      data: {
        title: content.title,
        templateId,
        fullName: p.fullName,
        jobTitle: p.jobTitle,
        email: p.email,
        phone: p.phone,
        location: p.location,
        nationality: p.nationality || null,
        birthDate: p.birthDate || null,
        linkedin: p.linkedin || null,
        website: p.website || null,
        showPhoto: p.showPhoto && !!existing.photoKey,
        summary: content.summary,
        referencesOnRequest: content.referencesOnRequest,
        hiddenSections: content.hiddenSections,
        ...(step ? { currentStep: Math.min(Math.max(step, 1), 10) } : {}),
      },
    }),
    db.cVExperience.deleteMany({ where: { cvId } }),
    db.cVEducation.deleteMany({ where: { cvId } }),
    db.cVSkill.deleteMany({ where: { cvId } }),
    db.cVLanguage.deleteMany({ where: { cvId } }),
    db.cVCourse.deleteMany({ where: { cvId } }),
    db.cVReference.deleteMany({ where: { cvId } }),
    db.cVCustomSection.deleteMany({ where: { cvId } }),
    db.cVExperience.createMany({ data: withOrder(content.experiences) }),
    db.cVEducation.createMany({ data: withOrder(content.educations) }),
    db.cVSkill.createMany({ data: withOrder(content.skills.map((s) => ({ name: s.name, level: s.level || null }))) }),
    db.cVLanguage.createMany({ data: withOrder(content.languages) }),
    db.cVCourse.createMany({ data: withOrder(content.courses) }),
    db.cVReference.createMany({ data: withOrder(content.references) }),
    db.cVCustomSection.createMany({ data: withOrder(content.customSections) }),
  ]);
  return { savedAt: new Date() };
}

export async function setCvTemplate(userId: string, cvId: string, templateId: string) {
  const resolved = await resolveTemplateId(templateId);
  if (!resolved) throw new DomainError("Modelo indisponível.", "NOT_FOUND");
  const res = await db.cV.updateMany({ where: { id: cvId, userId }, data: { templateId: resolved } });
  if (res.count === 0) throw new DomainError("CV não encontrado.", "NOT_FOUND");
}

export async function duplicateCv(userId: string, cvId: string) {
  const cv = await getUserCv(userId, cvId);
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  const count = await db.cV.count({ where: { userId } });
  if (count >= MAX_CVS_PER_USER) throw new DomainError(`Atingiu o limite de ${MAX_CVS_PER_USER} CVs.`, "LIMIT");

  // A foto é copiada para uma nova chave (cada CV gere o seu próprio ficheiro).
  let photoKey: string | null = null;
  if (cv.photoKey) {
    const data = await storage().get(cv.photoKey);
    if (data) {
      photoKey = buildStorageKey(`cv-photos/${userId}`, cv.photoKey.split(".").pop() ?? "jpg");
      await storage().put({ key: photoKey, body: data, contentType: cv.photoKey.endsWith(".png") ? "image/png" : "image/jpeg" });
    }
  }

  const strip = <T extends { id: string; cvId: string }>(rows: T[]) => rows.map(({ id: _id, cvId: _cvId, ...rest }) => rest);
  const copy = await db.cV.create({
    data: {
      userId,
      templateId: cv.templateId,
      title: `${cv.title} (cópia)`.slice(0, 80),
      locale: cv.locale,
      fullName: cv.fullName,
      jobTitle: cv.jobTitle,
      email: cv.email,
      phone: cv.phone,
      location: cv.location,
      nationality: cv.nationality,
      birthDate: cv.birthDate,
      linkedin: cv.linkedin,
      website: cv.website,
      photoKey,
      showPhoto: cv.showPhoto && !!photoKey,
      summary: cv.summary,
      referencesOnRequest: cv.referencesOnRequest,
      hiddenSections: cv.hiddenSections,
      currentStep: cv.currentStep,
      experiences: { create: strip(cv.experiences) },
      educations: { create: strip(cv.educations) },
      skills: { create: strip(cv.skills) },
      languages: { create: strip(cv.languages) },
      courses: { create: strip(cv.courses) },
      references: { create: strip(cv.references) },
      customSections: { create: strip(cv.customSections) },
    },
    select: { id: true },
  });
  return copy;
}

export async function deleteCv(userId: string, cvId: string) {
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true } });
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  await db.cV.delete({ where: { id: cv.id } });
  if (cv.photoKey) await storage().delete(cv.photoKey).catch(() => undefined);
}

export async function setCvPhoto(userId: string, cvId: string, data: Buffer, mime: "image/jpeg" | "image/png") {
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true } });
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  const key = buildStorageKey(`cv-photos/${userId}`, mime === "image/png" ? "png" : "jpg");
  await storage().put({ key, body: data, contentType: mime });
  await db.cV.update({ where: { id: cv.id }, data: { photoKey: key, showPhoto: true } });
  if (cv.photoKey) await storage().delete(cv.photoKey).catch(() => undefined);
}

export async function removeCvPhoto(userId: string, cvId: string) {
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true } });
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  await db.cV.update({ where: { id: cv.id }, data: { photoKey: null, showPhoto: false } });
  if (cv.photoKey) await storage().delete(cv.photoKey).catch(() => undefined);
}

export async function loadCvPhoto(photoKey: string | null): Promise<CvPhoto | null> {
  if (!photoKey) return null;
  const data = await storage().get(photoKey);
  if (!data) return null;
  return { data, mime: photoKey.endsWith(".png") ? "image/png" : "image/jpeg" };
}

/** Tudo o que é necessário para gerar PDF/DOCX de um CV do utilizador. */
export async function getCvForExport(userId: string, cvId: string) {
  const cv = await getUserCv(userId, cvId);
  if (!cv) return null;
  const content = toCvContent(cv);
  const photo = content.personal.showPhoto ? await loadCvPhoto(cv.photoKey) : null;
  return { cv, content, theme: themeOf(cv), photo };
}

export async function recordDownload(input: { userId: string; kind: "CV_PDF" | "CV_DOCX" | "PRODUCT_FILE"; label: string; cvId?: string; productFileId?: string }) {
  await db.download.create({ data: input }).catch((error) => console.error("[download] registo falhou", error));
}

/** Nome de ficheiro amigável: CV-Ana-Maria-Machava.pdf */
export function exportFileName(content: CvContent, ext: "pdf" | "docx"): string {
  const base = (content.personal.fullName || content.title)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `CV-${base || "Emprego-Facil"}.${ext}`;
}
