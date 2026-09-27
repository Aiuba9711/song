import "server-only";
import type { CoverLetter } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { generateLetter } from "@/letters/compose";
import { EMPTY_LETTER, LETTER_TYPE_LABELS, type LetterContent, type LetterType } from "@/letters/types";
import { DomainError } from "@/server/users";

export const MAX_LETTERS_PER_USER = 30;

export function toLetterContent(l: CoverLetter): LetterContent {
  return {
    type: l.type,
    title: l.title,
    senderName: l.senderName,
    senderContact: l.senderContact,
    recipientName: l.recipientName,
    company: l.company,
    position: l.position,
    education: l.education,
    experience: l.experience,
    skills: l.skills,
    motivation: l.motivation,
    city: l.city,
    subject: l.subject,
    body: l.body,
  };
}

export async function listUserLetters(userId: string) {
  return db.coverLetter.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, type: true, title: true, company: true, position: true, updatedAt: true, purchasedAt: true },
  });
}

/** Só devolve a carta se pertencer ao utilizador. */
export async function getUserLetter(userId: string, id: string) {
  return db.coverLetter.findFirst({ where: { id, userId } });
}

/** Nova carta, pré-preenchida só com dados da própria conta (nome, contactos, cargo, cidade). */
export async function createLetter(userId: string, type: LetterType) {
  const count = await db.coverLetter.count({ where: { userId } });
  if (count >= MAX_LETTERS_PER_USER) throw new DomainError(`Atingiu o limite de ${MAX_LETTERS_PER_USER} cartas. Elimine uma carta antiga para criar outra.`, "LIMIT");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, profile: { select: { headline: true, location: true } } } });
  const content: LetterContent = {
    ...EMPTY_LETTER,
    type,
    title: LETTER_TYPE_LABELS[type],
    senderName: user.name,
    senderContact: [user.phone ? `+${user.phone}` : "", user.email].filter(Boolean).join(" | "),
    position: user.profile?.headline ?? "",
    city: (user.profile?.location ?? "").split(",")[0]!.trim(),
  };
  const { subject, body } = generateLetter(content);
  return db.coverLetter.create({ data: { userId, ...content, subject, body }, select: { id: true } });
}

export async function saveLetter(userId: string, id: string, content: LetterContent) {
  const existing = await db.coverLetter.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new DomainError("Carta não encontrada.", "NOT_FOUND");
  const saved = await db.coverLetter.update({ where: { id }, data: content, select: { updatedAt: true } });
  return { savedAt: saved.updatedAt };
}

export async function duplicateLetter(userId: string, id: string) {
  const l = await getUserLetter(userId, id);
  if (!l) throw new DomainError("Carta não encontrada.", "NOT_FOUND");
  const count = await db.coverLetter.count({ where: { userId } });
  if (count >= MAX_LETTERS_PER_USER) throw new DomainError(`Atingiu o limite de ${MAX_LETTERS_PER_USER} cartas.`, "LIMIT");
  const content = toLetterContent(l);
  return db.coverLetter.create({ data: { userId, ...content, title: `${content.title} (cópia)`.slice(0, 80) }, select: { id: true } });
}

export async function deleteLetter(userId: string, id: string) {
  const res = await db.coverLetter.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new DomainError("Carta não encontrada.", "NOT_FOUND");
}
