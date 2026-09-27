import type { CvContent, SectionKey } from "./types";

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Perfil profissional",
  objective: "Objetivo profissional",
  experience: "Experiência profissional",
  education: "Formação académica",
  skills: "Competências",
  languages: "Idiomas",
  courses: "Cursos",
  certifications: "Certificações",
  references: "Referências",
  custom: "Outras informações",
};

export const LANGUAGE_LEVELS = ["Nativo", "Fluente", "Avançado", "Intermédio", "Básico"] as const;
export const SKILL_LEVELS = ["", "Básico", "Intermédio", "Avançado"] as const;

/** "Mar 2021" – "Presente" */
export function formatRange(start: string, end: string, isCurrent: boolean): string {
  const s = start.trim();
  const e = isCurrent ? "Presente" : end.trim();
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export type TextBlock = { kind: "paragraph"; text: string } | { kind: "bullets"; items: string[] };

/**
 * Converte texto livre em blocos: linhas começadas por "-", "•" ou "*" tornam-se listas.
 */
export function toBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[-•*]\s*(.+)$/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "bullets") last.items.push(bullet[1]!);
      else blocks.push({ kind: "bullets", items: [bullet[1]!] });
    } else {
      blocks.push({ kind: "paragraph", text: line });
    }
  }
  return blocks;
}

/** Linhas de contacto não vazias, na ordem apresentada no CV. */
export function contactItems(cv: CvContent): { key: string; label: string; value: string }[] {
  const p = cv.personal;
  return [
    { key: "phone", label: "Telefone", value: p.phone },
    { key: "email", label: "Email", value: p.email },
    { key: "location", label: "Localização", value: p.location },
    { key: "linkedin", label: "LinkedIn", value: p.linkedin },
    { key: "website", label: "Website", value: p.website },
    { key: "nationality", label: "Nacionalidade", value: p.nationality },
    { key: "birthDate", label: "Data de nascimento", value: p.birthDate },
  ].filter((i) => i.value.trim().length > 0);
}

/** Uma secção aparece se não estiver oculta e tiver conteúdo. */
export function isSectionVisible(cv: CvContent, key: SectionKey): boolean {
  if (cv.hiddenSections.includes(key)) return false;
  switch (key) {
    case "summary":
      return cv.summary.trim().length > 0;
    case "objective":
      return cv.objective.trim().length > 0;
    case "experience":
      return cv.experiences.length > 0;
    case "education":
      return cv.educations.length > 0;
    case "skills":
      return cv.skills.length > 0;
    case "languages":
      return cv.languages.length > 0;
    case "courses":
      return cv.courses.length > 0;
    case "certifications":
      return cv.certifications.length > 0;
    case "references":
      return cv.references.length > 0 || cv.referencesOnRequest;
    case "custom":
      return cv.customSections.length > 0;
  }
}

export function joinNonEmpty(parts: string[], sep = " · "): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(sep);
}

/** Cor de destaque segura (hex de 6 dígitos). */
export function safeAccent(color: string | null | undefined, fallback = "#1d40d8"): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

/** Mistura a cor com branco (0..1) — para fundos suaves. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
