import { cleanOutput } from "@/lib/ai/guard";
import type { LetterContent } from "./types";

/**
 * Gerador de cartas por regras (sem IA): organiza os dados que o utilizador escreveu em
 * parágrafos, com as fórmulas de cortesia habituais em Moçambique. Nunca acrescenta factos —
 * campos vazios simplesmente não aparecem.
 */

/** Itens de uma lista escrita pelo utilizador («- a», «b; c», uma por linha). */
export function items(text: string, separators = /\n|;/): string[] {
  return cleanOutput(text, 5000)
    .split(separators)
    .map((l) => l.replace(/^\s*(?:[-–•*·]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim().replace(/[;,]+$/, "").replace(/(?<!\b\p{Lu}\p{L}?)\.$/u, ""))
    .filter(Boolean);
}

/** Texto numa linha: «a; b; c». */
export function inline(text: string): string {
  return items(text).join("; ");
}

/** Enumeração em português: «a», «a e b», «a, b e c». */
export function listPt(list: string[], conj = "e"): string {
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} ${conj} ${list.at(-1)}`;
}

/** Acrescenta o ponto final só quando falta («S.A.» não fica «S.A..»). */
export function stop(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

/** Frase completa: maiúscula inicial e pontuação final. */
export function sentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const s = t[0]!.toUpperCase() + t.slice(1);
  return /[.!?…»”"]$/.test(s) ? s : `${s}.`;
}

/** Parágrafo livre (ex.: motivação), mantendo as frases do utilizador. */
function paragraph(text: string): string {
  return sentence(cleanOutput(text, 5000).replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " "));
}

export function defaultSubject(c: Pick<LetterContent, "type" | "position">): string {
  const pos = c.position.trim();
  if (c.type === "MOTIVACAO") return pos ? `Carta de motivação — ${pos}` : "Carta de motivação";
  return pos ? `Candidatura à vaga de ${pos}` : "Candidatura espontânea";
}

export function salutation(recipientName: string): string {
  const name = recipientName.trim();
  return name ? `Exmo.(a) Sr.(a) ${name},` : "Exmos. Senhores,";
}

export const CLOSING = "Com os melhores cumprimentos,";

/** Gera o assunto e o corpo da carta (editáveis depois pelo utilizador). */
export function generateLetter(c: LetterContent): { subject: string; body: string } {
  const pos = c.position.trim();
  const company = c.company.trim();
  const education = inline(c.education);
  const experience = inline(c.experience);
  const skills = listPt(items(c.skills));
  const motivation = c.motivation.trim() ? paragraph(c.motivation) : "";
  const contact = listPt(items(c.senderContact, /\n|[|·;]/), "ou");

  const where = company ? ` na vossa organização, ${company}` : " na vossa organização";
  const profile = [
    education && stop(`A minha formação inclui: ${education}`),
    experience && stop(`Em termos de experiência profissional: ${experience}`),
    skills && stop(`Destaco as seguintes competências: ${skills}`),
  ].filter(Boolean) as string[];

  const paragraphs: string[] = [salutation(c.recipientName)];
  if (c.type === "MOTIVACAO") {
    paragraphs.push(stop(`Escrevo para manifestar o meu interesse em integrar a vossa equipa${pos ? ` na função de ${pos}` : ""}${company ? `, em ${company}` : ""}`));
    if (motivation) paragraphs.push(motivation);
    if (profile.length) paragraphs.push(profile.join(" "));
  } else {
    paragraphs.push(stop(pos ? `Venho, por este meio, apresentar a minha candidatura à vaga de ${pos}${where}` : `Venho, por este meio, apresentar a minha candidatura espontânea${where}`));
    if (profile.length) paragraphs.push(profile.join(" "));
    if (motivation) paragraphs.push(motivation);
  }
  paragraphs.push(
    [
      "Coloco-me à disposição para uma entrevista, na qual poderei apresentar com mais detalhe o meu percurso.",
      contact ? stop(`Poderei ser contactado(a) através de ${contact}`) : "",
      "Agradeço desde já a atenção dispensada.",
    ]
      .filter(Boolean)
      .join(" "),
  );
  paragraphs.push(CLOSING);
  return { subject: defaultSubject(c), body: paragraphs.join("\n\n") };
}

// ─── Estrutura comum aos formatos (pré-visualização, PDF, DOCX, texto) ────────

export function formatLetterDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Maputo" }).format(date);
}

export type LetterLayout = {
  sender: string[];
  recipient: string[];
  dateLine: string;
  subject: string;
  /** Parágrafos; cada um com as suas linhas */
  paragraphs: string[][];
  signature: string;
};

export function letterLayout(c: LetterContent, date: Date): LetterLayout {
  const lines = (t: string) =>
    t
      .split(/\n|[|·;]/)
      .map((l) => l.trim())
      .filter(Boolean);
  const body = cleanOutput(c.body, 8000);
  return {
    sender: [c.senderName.trim(), ...lines(c.senderContact)].filter(Boolean),
    recipient: [c.recipientName.trim() ? `A/C: ${c.recipientName.trim()}` : "", c.company.trim()].filter(Boolean),
    dateLine: [c.city.trim(), formatLetterDate(date)].filter(Boolean).join(", "),
    subject: c.subject.trim(),
    paragraphs: body
      .split(/\n\s*\n/)
      .map((p) => p.split("\n").map((l) => l.trimEnd()))
      .filter((p) => p.some((l) => l.trim())),
    signature: c.senderName.trim(),
  };
}

/** A carta completa em texto simples (para «Copiar carta»). */
export function letterPlainText(c: LetterContent, date: Date): string {
  const l = letterLayout(c, date);
  return [
    l.sender.join("\n"),
    l.recipient.join("\n"),
    l.dateLine,
    l.subject ? `Assunto: ${l.subject}` : "",
    l.paragraphs.map((p) => p.join("\n")).join("\n\n"),
    l.signature,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Nome de ficheiro amigável: Carta-de-candidatura-Ana-Machava.pdf */
export function letterFileName(c: Pick<LetterContent, "type" | "senderName" | "title">, ext: "pdf" | "docx"): string {
  const base = (c.senderName || c.title)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${c.type === "MOTIVACAO" ? "Carta-de-motivacao" : "Carta-de-candidatura"}-${base || "Emprego-Facil"}.${ext}`;
}
