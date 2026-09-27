import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { resolveDesign, type TemplateDesign } from "@/cv/design";
import type { CvContent, CvLayoutId, CvPhoto, SectionKey } from "@/cv/types";
import { SECTION_KEYS } from "@/cv/types";
import type { cvContentSchema } from "@/cv/schema";
import type { z } from "zod";
import { db } from "@/lib/db";
import { framePhoto, normalizePhoto } from "@/lib/photo";
import { buildStorageKey, storage } from "@/lib/storage";
import { getPaymentSettings } from "@/server/payments/settings";
import { DomainError } from "@/server/users";

export const MAX_CVS_PER_USER = 30;

const cvInclude = {
  template: { select: { id: true, slug: true, name: true, layout: true, accentColor: true, design: true, isActive: true, priceMinor: true, isAtsFriendly: true, style: true } },
  experiences: { orderBy: { sortOrder: "asc" } },
  educations: { orderBy: { sortOrder: "asc" } },
  skills: { orderBy: { sortOrder: "asc" } },
  languages: { orderBy: { sortOrder: "asc" } },
  courses: { orderBy: { sortOrder: "asc" } },
  references: { orderBy: { sortOrder: "asc" } },
  customSections: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.CVInclude;

export type CvWithRelations = Prisma.CVGetPayload<{ include: typeof cvInclude }>;

/** Design do modelo do CV (predefinição Clássico quando não há modelo). */
export function designOf(cv: Pick<CvWithRelations, "template">): TemplateDesign {
  if (!cv.template) return resolveDesign(null);
  return resolveDesign({ layout: cv.template.layout as CvLayoutId, design: cv.template.design, accentColor: cv.template.accentColor });
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
    objective: cv.objective,
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
    courses: cv.courses.filter((c) => c.kind === "COURSE").map((c) => ({ name: c.name, institution: c.institution, year: c.year })),
    certifications: cv.courses.filter((c) => c.kind === "CERTIFICATION").map((c) => ({ name: c.name, institution: c.institution, year: c.year })),
    references: cv.references.map(({ name, position, company, phone, email }) => ({ name, position, company, phone, email })),
    referencesOnRequest: cv.referencesOnRequest,
    customSections: cv.customSections.map((s) => ({ title: s.title, content: s.content })),
    hiddenSections: cv.hiddenSections.filter((s): s is SectionKey => (SECTION_KEYS as readonly string[]).includes(s)),
    photoSettings: {
      zoom: cv.photoZoom,
      offsetX: cv.photoOffsetX,
      offsetY: cv.photoOffsetY,
      position: cv.photoPosition === "left" || cv.photoPosition === "right" || cv.photoPosition === "center" ? cv.photoPosition : "auto",
    },
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
      purchasedAt: true,
      template: { select: { name: true, layout: true, accentColor: true, priceMinor: true, isAtsFriendly: true } },
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

/** CV ainda não comprado (rascunho) do utilizador — no máximo um quando o CV é pago. */
export async function findUnpaidDraft(userId: string) {
  return db.cV.findFirst({ where: { userId, purchasedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, templateId: true } });
}

/** Com o download pago ativo, só é permitido um CV não comprado de cada vez. */
async function assertCanStartNewDraft(userId: string) {
  const settings = await getPaymentSettings();
  if (!settings.cvPaywallEnabled) return;
  const draft = await findUnpaidDraft(userId);
  if (draft) {
    throw new DomainError("Já tem um CV em preparação. Conclua a compra desse CV (ou elimine-o) antes de começar outro.", "DRAFT_EXISTS");
  }
}

/**
 * «Escolher este modelo»: define o modelo atual da conta e abre o CV em preparação.
 * - Se já existe um rascunho não comprado, troca-lhe o modelo (não cria outro).
 * - Caso contrário, cria um CV novo com este modelo.
 */
export async function chooseTemplate(userId: string, templateSlug: string): Promise<{ cvId: string; created: boolean }> {
  const template = await db.cVTemplate.findFirst({ where: { slug: templateSlug, isActive: true }, select: { id: true } });
  if (!template) throw new DomainError("Modelo indisponível.", "NOT_FOUND");
  await db.user.update({ where: { id: userId }, data: { currentCvTemplateId: template.id } });
  const settings = await getPaymentSettings();
  if (settings.cvPaywallEnabled) {
    const draft = await findUnpaidDraft(userId);
    if (draft) {
      await db.cV.update({ where: { id: draft.id }, data: { templateId: template.id } });
      return { cvId: draft.id, created: false };
    }
  }
  const cv = await createCv(userId, { templateSlug });
  return { cvId: cv.id, created: true };
}

export async function createCv(userId: string, input: { title?: string; templateSlug?: string | null }) {
  await assertCanStartNewDraft(userId);
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

  if (template) await db.user.update({ where: { id: userId }, data: { currentCvTemplateId: template.id } });
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
  const existing = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true, purchasedAt: true, templateId: true } });
  if (!existing) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  // Depois da compra o modelo fica fixo (a compra é do CV com aquele modelo).
  const templateId = existing.purchasedAt ? existing.templateId : await resolveTemplateId(content.templateId);
  if (templateId && templateId !== existing.templateId) await db.user.update({ where: { id: userId }, data: { currentCvTemplateId: templateId } });
  const ph = content.photoSettings;
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
        objective: content.objective,
        referencesOnRequest: content.referencesOnRequest,
        hiddenSections: content.hiddenSections,
        photoZoom: ph.zoom,
        photoOffsetX: ph.offsetX,
        photoOffsetY: ph.offsetY,
        photoPosition: ph.position === "auto" ? null : ph.position,
        ...(step ? { currentStep: Math.min(Math.max(step, 1), 11) } : {}),
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
    db.cVCourse.createMany({
      data: [
        ...content.courses.map((c) => ({ ...c, kind: "COURSE" as const })),
        ...content.certifications.map((c) => ({ ...c, kind: "CERTIFICATION" as const })),
      ].map((c, i) => ({ ...c, cvId, sortOrder: i })),
    }),
    db.cVReference.createMany({ data: withOrder(content.references) }),
    db.cVCustomSection.createMany({ data: withOrder(content.customSections) }),
  ]);
  return { savedAt: new Date() };
}

/** Trocar o modelo — só antes de o CV ser comprado. */
export async function setCvTemplate(userId: string, cvId: string, templateId: string) {
  const resolved = await resolveTemplateId(templateId);
  if (!resolved) throw new DomainError("Modelo indisponível.", "NOT_FOUND");
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { purchasedAt: true } });
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  if (cv.purchasedAt) throw new DomainError("Este CV já foi comprado com este modelo. Para outro modelo, crie um novo CV.", "LOCKED");
  await db.$transaction([
    db.cV.update({ where: { id: cvId }, data: { templateId: resolved } }),
    db.user.update({ where: { id: userId }, data: { currentCvTemplateId: resolved } }),
  ]);
}

export async function duplicateCv(userId: string, cvId: string) {
  const cv = await getUserCv(userId, cvId);
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  await assertCanStartNewDraft(userId);
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
      photoZoom: cv.photoZoom,
      photoOffsetX: cv.photoOffsetX,
      photoOffsetY: cv.photoOffsetY,
      photoPosition: cv.photoPosition,
      summary: cv.summary,
      objective: cv.objective,
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

/**
 * Guarda a fotografia do CV: aceita JPG/PNG/WEBP, corrige a orientação, remove metadados (EXIF/GPS),
 * redimensiona e comprime (JPEG). O enquadramento volta ao centro.
 */
export async function setCvPhoto(userId: string, cvId: string, raw: Buffer) {
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true } });
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  let normalized: Buffer;
  try {
    normalized = (await normalizePhoto(raw)).data;
  } catch {
    throw new DomainError("Não foi possível ler a imagem. Use JPG, PNG ou WEBP.", "INVALID_IMAGE");
  }
  const key = buildStorageKey(`cv-photos/${userId}`, "jpg");
  await storage().put({ key, body: normalized, contentType: "image/jpeg" });
  await db.cV.update({ where: { id: cv.id }, data: { photoKey: key, showPhoto: true, photoZoom: 1, photoOffsetX: 0, photoOffsetY: 0 } });
  if (cv.photoKey) await storage().delete(cv.photoKey).catch(() => undefined);
}

export async function removeCvPhoto(userId: string, cvId: string) {
  const cv = await db.cV.findFirst({ where: { id: cvId, userId }, select: { id: true, photoKey: true } });
  if (!cv) throw new DomainError("CV não encontrado.", "NOT_FOUND");
  await db.cV.update({ where: { id: cv.id }, data: { photoKey: null, showPhoto: false } });
  if (cv.photoKey) await storage().delete(cv.photoKey).catch(() => undefined);
}

/** Fotografia original (já normalizada) — usada no editor de enquadramento. */
export async function loadRawPhoto(photoKey: string | null): Promise<Buffer | null> {
  if (!photoKey) return null;
  return storage().get(photoKey);
}

/** Fotografia enquadrada (quadrada) — a MESMA imagem é usada na pré-visualização, no PDF e no DOCX. */
export async function loadFramedPhoto(cv: { photoKey: string | null; photoZoom: number; photoOffsetX: number; photoOffsetY: number }): Promise<CvPhoto | null> {
  const raw = await loadRawPhoto(cv.photoKey);
  if (!raw) return null;
  const data = await framePhoto(raw, { zoom: cv.photoZoom, offsetX: cv.photoOffsetX, offsetY: cv.photoOffsetY });
  return { data, mime: "image/jpeg" };
}

/** Tudo o que é necessário para gerar PDF/DOCX de um CV do utilizador. */
export async function getCvForExport(userId: string, cvId: string) {
  const cv = await getUserCv(userId, cvId);
  if (!cv) return null;
  const content = toCvContent(cv);
  const photo = content.personal.showPhoto ? await loadFramedPhoto(cv) : null;
  return { cv, content, design: designOf(cv), photo };
}

export async function recordDownload(input: {
  userId: string;
  kind: "CV_PDF" | "CV_DOCX" | "LETTER_PDF" | "LETTER_DOCX" | "PRODUCT_FILE";
  label: string;
  cvId?: string;
  letterId?: string;
  productFileId?: string;
}) {
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
