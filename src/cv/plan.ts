import type { TemplateDesign } from "./design";
import { DEFAULT_SECTION_ORDER } from "./design";
import { contactItems, formatRange, isSectionVisible, joinNonEmpty, SECTION_LABELS } from "./format";
import type { CvContent, SectionKey } from "./types";

/**
 * Plano do documento: decide O QUE aparece e ONDE (cabeçalho, coluna principal, coluna lateral),
 * independentemente do formato. Os renderizadores HTML, PDF e DOCX apenas desenham este plano,
 * por isso a pré-visualização e o documento final têm sempre o mesmo conteúdo e estrutura.
 */
export type Entry = { title: string; org: string; location: string; dates: string; description: string };
export type NamedItem = { name: string; level: string };
export type CourseItem = { name: string; detail: string; year: string };
export type RefItem = { name: string; role: string; contact: string };

export type PlanSection =
  | { key: "summary" | "objective"; title: string; text: string }
  | { key: "experience" | "education"; title: string; entries: Entry[] }
  | { key: "skills" | "languages"; title: string; items: NamedItem[] }
  | { key: "courses" | "certifications"; title: string; items: CourseItem[] }
  | { key: "references"; title: string; items: RefItem[]; onRequest: boolean }
  | { key: "custom"; title: string; text: string }
  | { key: "contacts"; title: string; items: { key: string; label: string; value: string }[] };

export type Row = { type: "section"; section: PlanSection } | { type: "pair"; left: PlanSection; right: PlanSection };

export type PhotoPlacement = "left" | "right" | "center" | "sidebar";

export type DocumentPlan = {
  name: string;
  jobTitle: string;
  contacts: { key: string; label: string; value: string }[];
  /** Contactos no cabeçalho (false quando vão para a coluna lateral) */
  contactsInHeader: boolean;
  photo: PhotoPlacement | null;
  photoShape: TemplateDesign["photoShape"];
  main: Row[];
  side: PlanSection[];
};

function buildSection(cv: CvContent, key: SectionKey): PlanSection[] {
  if (!isSectionVisible(cv, key)) return [];
  const title = SECTION_LABELS[key];
  switch (key) {
    case "summary":
      return [{ key, title, text: cv.summary }];
    case "objective":
      return [{ key, title, text: cv.objective }];
    case "experience":
      return [
        {
          key,
          title,
          entries: cv.experiences.map((e) => ({ title: e.position, org: e.employer, location: e.location, dates: formatRange(e.startDate, e.endDate, e.isCurrent), description: e.description })),
        },
      ];
    case "education":
      return [
        {
          key,
          title,
          entries: cv.educations.map((e) => ({ title: e.degree, org: e.institution, location: e.location, dates: formatRange(e.startDate, e.endDate, e.isCurrent), description: e.description })),
        },
      ];
    case "skills":
      return [{ key, title, items: cv.skills.map((s) => ({ name: s.name, level: s.level })) }];
    case "languages":
      return [{ key, title, items: cv.languages.map((l) => ({ name: l.name, level: l.level })) }];
    case "courses":
      return [{ key, title, items: cv.courses.map((c) => ({ name: c.name, detail: c.institution, year: c.year })) }];
    case "certifications":
      return [{ key, title, items: cv.certifications.map((c) => ({ name: c.name, detail: c.institution, year: c.year })) }];
    case "references":
      return [
        {
          key,
          title,
          onRequest: cv.references.length === 0 && cv.referencesOnRequest,
          items: cv.references.map((r) => ({ name: r.name, role: joinNonEmpty([r.position, r.company], ", "), contact: joinNonEmpty([r.phone, r.email]) })),
        },
      ];
    case "custom":
      return cv.customSections.map((s) => ({ key: "custom" as const, title: s.title, text: s.content }));
  }
}

export function planDocument(cv: CvContent, design: TemplateDesign, opts: { hasPhoto: boolean }): DocumentPlan {
  const sidebar = design.structure === "sidebar-left" || design.structure === "sidebar-right";
  const split = design.structure === "split";
  const sideKeys = new Set<SectionKey>(sidebar || split ? design.sidebarSections : []);

  const main: Row[] = [];
  const side: PlanSection[] = [];
  const contacts = contactItems(cv);

  if (sidebar && contacts.length > 0) side.push({ key: "contacts", title: "Contactos", items: contacts });

  const mainSections: PlanSection[] = [];
  for (const key of DEFAULT_SECTION_ORDER) {
    const sections = buildSection(cv, key);
    if (sideKeys.has(key)) side.push(...sections);
    else mainSections.push(...sections);
  }

  // Uma coluna com "pares": competências e idiomas lado a lado (quando ambos existem).
  for (let i = 0; i < mainSections.length; i++) {
    const s = mainSections[i]!;
    const next = mainSections[i + 1];
    if (design.pairs && design.structure === "single" && next && s.key === "skills" && next.key === "languages") {
      main.push({ type: "pair", left: s, right: next });
      i++;
    } else {
      main.push({ type: "section", section: s });
    }
  }

  let photo: PhotoPlacement | null = null;
  if (opts.hasPhoto && cv.personal.showPhoto) {
    const pos = cv.photoSettings.position === "auto" ? design.photoPosition : cv.photoSettings.position;
    photo = sidebar && pos === "center" ? "sidebar" : pos;
  }

  return {
    name: cv.personal.fullName,
    jobTitle: cv.personal.jobTitle,
    contacts,
    contactsInHeader: !sidebar,
    photo,
    photoShape: design.photoShape,
    main,
    side,
  };
}

/** Todos os textos visíveis de um plano (usado nos testes de correspondência pré-visualização ↔ documento). */
export function planTexts(plan: DocumentPlan): string[] {
  const out: string[] = [plan.name || "O seu nome", plan.jobTitle, ...plan.contacts.map((c) => c.value)];
  const visit = (s: PlanSection) => {
    out.push(s.title);
    switch (s.key) {
      case "summary":
      case "objective":
      case "custom":
        out.push(s.text);
        break;
      case "experience":
      case "education":
        for (const e of s.entries) out.push(e.title, e.org, e.location, e.dates, e.description);
        break;
      case "skills":
      case "languages":
        for (const i of s.items) out.push(i.name, i.level);
        break;
      case "courses":
      case "certifications":
        for (const i of s.items) out.push(i.name, i.detail, i.year);
        break;
      case "references":
        for (const i of s.items) out.push(i.name, i.role, i.contact);
        break;
      case "contacts":
        break;
    }
  };
  for (const r of plan.main) {
    if (r.type === "section") visit(r.section);
    else {
      visit(r.left);
      visit(r.right);
    }
  }
  plan.side.forEach(visit);
  return out.filter((t) => t && t.trim().length > 0);
}
