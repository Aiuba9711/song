import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
  type FileChild,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import { contactItems, formatRange, isSectionVisible, joinNonEmpty, safeAccent, SECTION_LABELS, tint, toBlocks } from "../format";
import type { CvContent, CvPhoto, CvTheme } from "../types";

/*
 * Unidades: twips (1 pt = 20) para espaçamentos/margens; meios-pontos para tamanhos de letra.
 * A4 = 11906 × 16838 twips.
 */
const PAGE = { width: 11906, height: 16838 };
const MARGIN = 1000; // ≈ 1,76 cm
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const MODERNO_MARGIN = 700;
const MODERNO_WIDTH = PAGE.width - MODERNO_MARGIN * 2;

const TEXT_COLOR = "1E293B";
const MUTED = "475569";

type Ctx = { accent: string; font: string; headingFont: string };

const hex = (c: string) => c.replace("#", "").toUpperCase();

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string; font?: string; allCaps?: boolean } = {}) {
  return new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color, font: opts.font, allCaps: opts.allCaps });
}

function para(children: ParagraphChild[] | string, opts: IParagraphOptions = {}) {
  return new Paragraph({ ...opts, children: typeof children === "string" ? [run(children)] : children });
}

/** Texto livre → parágrafos e marcadores (linhas iniciadas por "-" ou "•"). */
function richText(text: string, color?: string): Paragraph[] {
  const out: Paragraph[] = [];
  for (const block of toBlocks(text)) {
    if (block.kind === "paragraph") {
      out.push(para([run(block.text, { color })], { spacing: { after: 40 } }));
    } else {
      for (const item of block.items) {
        out.push(para([run(item, { color })], { numbering: { reference: "cv-bullets", level: 0 }, spacing: { after: 20 } }));
      }
    }
  }
  return out;
}

function sectionHeading(title: string, ctx: Ctx, variant: "rule" | "plain" | "serif" = "rule"): Paragraph {
  if (variant === "serif") {
    return para([run(title, { bold: true, size: 25, font: ctx.headingFont, color: "0F172A" })], {
      style: "CvSectionHeading",
      spacing: { before: 220, after: 90 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: hex(tint(ctx.accent, 0.5)), space: 2 } },
      keepNext: true,
    });
  }
  return para([run(title, { bold: true, size: 20, color: hex(ctx.accent), allCaps: true })], {
    style: "CvSectionHeading",
    spacing: { before: 220, after: 90 },
    border: variant === "rule" ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(ctx.accent), space: 2 } } : undefined,
    keepNext: true,
  });
}

/** Título + data alinhada à direita (tabulação), como num CV feito à mão no Word. */
function titleWithDate(title: string, date: string, width: number): Paragraph {
  return para([run(title, { bold: true, color: "0F172A" }), ...(date ? [run(`\t${date}`, { size: 19, color: MUTED })] : [])], {
    tabStops: [{ type: TabStopType.RIGHT, position: width }],
    spacing: { before: 100 },
    keepNext: true,
  });
}

function photoRun(photo: CvPhoto, size: number) {
  return new ImageRun({
    type: photo.mime === "image/png" ? "png" : "jpg",
    data: photo.data,
    transformation: { width: size, height: size },
    altText: { name: "Fotografia", description: "Fotografia do candidato", title: "Fotografia" },
  });
}

function referencesBlock(cv: CvContent): Paragraph[] {
  if (cv.references.length === 0) return [para("Disponíveis mediante solicitação.")];
  const out: Paragraph[] = [];
  for (const r of cv.references) {
    out.push(para([run(r.name, { bold: true })], { spacing: { before: 80 }, keepNext: true }));
    const role = joinNonEmpty([r.position, r.company], ", ");
    if (role) out.push(para(role, { keepNext: true }));
    const contact = joinNonEmpty([r.phone, r.email]);
    if (contact) out.push(para([run(contact, { size: 19, color: MUTED })]));
  }
  return out;
}

function coursesBlock(cv: CvContent, width: number): Paragraph[] {
  return cv.courses.map((c) =>
    para(
      [
        run(c.name, { bold: true }),
        ...(c.institution ? [run(` — ${c.institution}`, { color: MUTED })] : []),
        ...(c.year ? [run(`\t${c.year}`, { size: 19, color: MUTED })] : []),
      ],
      { tabStops: [{ type: TabStopType.RIGHT, position: width }], spacing: { after: 40 } },
    ),
  );
}

function customBlocks(cv: CvContent, ctx: Ctx, variant: "rule" | "plain" | "serif"): Paragraph[] {
  if (!isSectionVisible(cv, "custom")) return [];
  return cv.customSections.flatMap((s) => [sectionHeading(s.title, ctx, variant), ...richText(s.content)]);
}

// ─── Clássico ────────────────────────────────────────────────
function classico(cv: CvContent, ctx: Ctx, photo: CvPhoto | null): FileChild[] {
  const p = cv.personal;
  const contacts = contactItems(cv).map((c) => c.value).join("  ·  ");
  const out: FileChild[] = [];

  if (photo) out.push(para([photoRun(photo, 96)], { alignment: AlignmentType.CENTER, spacing: { after: 80 } }));
  out.push(para([run(p.fullName || "O seu nome", { bold: true, size: 44, color: "0F172A" })], { style: "CvName", alignment: AlignmentType.CENTER }));
  if (p.jobTitle) out.push(para([run(p.jobTitle, { bold: true, size: 23, color: hex(ctx.accent) })], { alignment: AlignmentType.CENTER }));
  if (contacts) out.push(para([run(contacts, { size: 19, color: MUTED })], { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 } }));

  if (isSectionVisible(cv, "summary")) out.push(sectionHeading(SECTION_LABELS.summary, ctx), ...richText(cv.summary));
  if (isSectionVisible(cv, "experience")) {
    out.push(sectionHeading(SECTION_LABELS.experience, ctx));
    for (const e of cv.experiences) {
      out.push(titleWithDate(e.position, formatRange(e.startDate, e.endDate, e.isCurrent), CONTENT_WIDTH));
      const sub = joinNonEmpty([e.employer, e.location], ", ");
      if (sub) out.push(para([run(sub, { italics: true, color: "334155" })], { keepNext: !!e.description }));
      out.push(...richText(e.description));
    }
  }
  if (isSectionVisible(cv, "education")) {
    out.push(sectionHeading(SECTION_LABELS.education, ctx));
    for (const e of cv.educations) {
      out.push(titleWithDate(e.degree, formatRange(e.startDate, e.endDate, e.isCurrent), CONTENT_WIDTH));
      const sub = joinNonEmpty([e.institution, e.location], ", ");
      if (sub) out.push(para([run(sub, { italics: true, color: "334155" })]));
      out.push(...richText(e.description));
    }
  }
  if (isSectionVisible(cv, "skills")) {
    out.push(sectionHeading(SECTION_LABELS.skills, ctx));
    for (const s of cv.skills)
      out.push(para([run(s.name), ...(s.level ? [run(` — ${s.level}`, { color: "64748B" })] : [])], { numbering: { reference: "cv-bullets", level: 0 } }));
  }
  if (isSectionVisible(cv, "languages")) {
    out.push(sectionHeading(SECTION_LABELS.languages, ctx));
    for (const l of cv.languages) out.push(para([run(l.name, { bold: true }), ...(l.level ? [run(` — ${l.level}`, { color: MUTED })] : [])]));
  }
  if (isSectionVisible(cv, "courses")) out.push(sectionHeading(SECTION_LABELS.courses, ctx), ...coursesBlock(cv, CONTENT_WIDTH));
  out.push(...customBlocks(cv, ctx, "rule"));
  if (isSectionVisible(cv, "references")) out.push(sectionHeading(SECTION_LABELS.references, ctx), ...referencesBlock(cv));
  return out;
}

// ─── Executivo ───────────────────────────────────────────────
function executivo(cv: CvContent, ctx: Ctx, photo: CvPhoto | null): FileChild[] {
  const p = cv.personal;
  const contacts = contactItems(cv);
  const headerFill = hex(tint(ctx.accent, 0.94));
  const photoWidth = photo ? 1500 : 0;
  const contactWidth = 3200;
  const nameWidth = CONTENT_WIDTH - photoWidth - contactWidth;

  const cells: TableCell[] = [];
  const cellBase = { shading: { type: ShadingType.CLEAR, fill: headerFill, color: "auto" }, verticalAlign: VerticalAlign.CENTER, margins: { top: 200, bottom: 200, left: 160, right: 160 } };
  if (photo) cells.push(new TableCell({ ...cellBase, width: { size: photoWidth, type: WidthType.DXA }, children: [para([photoRun(photo, 80)])] }));
  cells.push(
    new TableCell({
      ...cellBase,
      width: { size: nameWidth, type: WidthType.DXA },
      children: [
        para([run(p.fullName || "O seu nome", { bold: true, size: 46, font: ctx.headingFont, color: "0F172A" })], { style: "CvName" }),
        ...(p.jobTitle ? [para([run(p.jobTitle, { bold: true, size: 20, color: hex(ctx.accent), allCaps: true })])] : []),
      ],
    }),
  );
  cells.push(
    new TableCell({
      ...cellBase,
      width: { size: contactWidth, type: WidthType.DXA },
      children: contacts.length ? contacts.map((c) => para([run(c.value, { size: 18, color: "334155" })], { alignment: AlignmentType.RIGHT })) : [para("")],
    }),
  );

  const out: FileChild[] = [
    para("", { border: { top: { style: BorderStyle.SINGLE, size: 36, color: hex(ctx.accent), space: 0 } }, spacing: { after: 0 } }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: cells.map((c) => (c.options.width?.size as number) ?? 0),
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
      rows: [new TableRow({ children: cells })],
    }),
  ];

  const entry = (date: string, location: string, title: string, org: string, description: string) => [
    para([run(title, { bold: true, color: "0F172A" }), ...(date ? [run(`\t${date}`, { bold: true, size: 18, color: MUTED })] : [])], {
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      spacing: { before: 120 },
      keepNext: true,
    }),
    para([run(org, { bold: true, color: hex(ctx.accent) }), ...(location ? [run(`\t${location}`, { size: 18, color: MUTED })] : [])], {
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
      keepNext: !!description,
    }),
    ...richText(description),
  ];

  if (isSectionVisible(cv, "summary")) out.push(sectionHeading(SECTION_LABELS.summary, ctx, "serif"), ...richText(cv.summary, "334155"));
  if (isSectionVisible(cv, "experience")) {
    out.push(sectionHeading(SECTION_LABELS.experience, ctx, "serif"));
    for (const e of cv.experiences) out.push(...entry(formatRange(e.startDate, e.endDate, e.isCurrent), e.location, e.position, e.employer, e.description));
  }
  if (isSectionVisible(cv, "education")) {
    out.push(sectionHeading(SECTION_LABELS.education, ctx, "serif"));
    for (const e of cv.educations) out.push(...entry(formatRange(e.startDate, e.endDate, e.isCurrent), e.location, e.degree, e.institution, e.description));
  }
  if (isSectionVisible(cv, "skills")) {
    out.push(sectionHeading(SECTION_LABELS.skills, ctx, "serif"));
    for (const s of cv.skills)
      out.push(para([run(s.name), ...(s.level ? [run(` — ${s.level}`, { color: "64748B" })] : [])], { numbering: { reference: "cv-bullets", level: 0 } }));
  }
  if (isSectionVisible(cv, "languages")) {
    out.push(sectionHeading(SECTION_LABELS.languages, ctx, "serif"));
    for (const l of cv.languages) out.push(para([run(l.name, { bold: true }), ...(l.level ? [run(` — ${l.level}`, { color: MUTED })] : [])]));
  }
  if (isSectionVisible(cv, "courses")) out.push(sectionHeading(SECTION_LABELS.courses, ctx, "serif"), ...coursesBlock(cv, CONTENT_WIDTH));
  out.push(...customBlocks(cv, ctx, "serif"));
  if (isSectionVisible(cv, "references")) out.push(sectionHeading(SECTION_LABELS.references, ctx, "serif"), ...referencesBlock(cv));
  return out;
}

// ─── Moderno (tabela de 2 colunas: barra lateral + conteúdo) ──
function moderno(cv: CvContent, ctx: Ctx, photo: CvPhoto | null): FileChild[] {
  const p = cv.personal;
  const sideWidth = 3100;
  const mainWidth = MODERNO_WIDTH - sideWidth;
  const white = "FFFFFF";
  const soft = hex(tint(ctx.accent, 0.75));

  const sideHeading = (t: string) => para([run(t, { bold: true, size: 17, color: soft, allCaps: true })], { spacing: { before: 240, after: 80 }, keepNext: true });
  const side: Paragraph[] = [];
  if (photo) side.push(para([photoRun(photo, 110)], { alignment: AlignmentType.CENTER, spacing: { after: 120 } }));
  const contacts = contactItems(cv);
  if (contacts.length) {
    side.push(sideHeading("Contactos"));
    for (const c of contacts) {
      side.push(para([run(c.label, { size: 15, color: soft, allCaps: true })], { keepNext: true }));
      side.push(para([run(c.value, { size: 18, color: white })], { spacing: { after: 80 } }));
    }
  }
  if (isSectionVisible(cv, "skills")) {
    side.push(sideHeading(SECTION_LABELS.skills));
    for (const s of cv.skills) {
      side.push(para([run(s.name, { size: 18, color: white })], { keepNext: !!s.level }));
      if (s.level) side.push(para([run(s.level, { size: 16, color: soft })], { spacing: { after: 40 } }));
    }
  }
  if (isSectionVisible(cv, "languages")) {
    side.push(sideHeading(SECTION_LABELS.languages));
    for (const l of cv.languages) {
      side.push(para([run(l.name, { bold: true, size: 18, color: white })], { keepNext: !!l.level }));
      if (l.level) side.push(para([run(l.level, { size: 16, color: soft })], { spacing: { after: 40 } }));
    }
  }
  if (side.length === 0) side.push(para(""));

  const main: Paragraph[] = [
    para([run(p.fullName || "O seu nome", { bold: true, size: 44, color: "0F172A" })], { style: "CvName" }),
  ];
  if (p.jobTitle) main.push(para([run(p.jobTitle, { bold: true, size: 23, color: hex(ctx.accent) })], { spacing: { after: 120 } }));
  const entry = (title: string, sub: string, date: string, description: string) => [
    para([run(title, { bold: true, color: "0F172A" })], { spacing: { before: 120 }, keepNext: true }),
    para([run(sub, { size: 19, color: MUTED }), ...(date ? [run(`${sub ? "  ·  " : ""}${date}`, { bold: true, size: 19, color: hex(ctx.accent) })] : [])], { keepNext: !!description }),
    ...richText(description),
  ];
  if (isSectionVisible(cv, "summary")) main.push(sectionHeading(SECTION_LABELS.summary, ctx, "plain"), ...richText(cv.summary));
  if (isSectionVisible(cv, "experience")) {
    main.push(sectionHeading(SECTION_LABELS.experience, ctx, "plain"));
    for (const e of cv.experiences) main.push(...entry(e.position, joinNonEmpty([e.employer, e.location], ", "), formatRange(e.startDate, e.endDate, e.isCurrent), e.description));
  }
  if (isSectionVisible(cv, "education")) {
    main.push(sectionHeading(SECTION_LABELS.education, ctx, "plain"));
    for (const e of cv.educations) main.push(...entry(e.degree, joinNonEmpty([e.institution, e.location], ", "), formatRange(e.startDate, e.endDate, e.isCurrent), e.description));
  }
  if (isSectionVisible(cv, "courses")) main.push(sectionHeading(SECTION_LABELS.courses, ctx, "plain"), ...coursesBlock(cv, mainWidth - 400));
  main.push(...customBlocks(cv, ctx, "plain"));
  if (isSectionVisible(cv, "references")) main.push(sectionHeading(SECTION_LABELS.references, ctx, "plain"), ...referencesBlock(cv));

  return [
    new Table({
      width: { size: MODERNO_WIDTH, type: WidthType.DXA },
      columnWidths: [sideWidth, mainWidth],
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: sideWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: hex(ctx.accent), color: "auto" },
              margins: { top: 300, bottom: 300, left: 260, right: 260 },
              children: side,
            }),
            new TableCell({
              width: { size: mainWidth, type: WidthType.DXA },
              margins: { top: 300, bottom: 300, left: 400, right: 100 },
              children: main,
            }),
          ],
        }),
      ],
    }),
    // O Word exige um parágrafo depois de uma tabela no fim do documento.
    para("", { spacing: { after: 0 } }),
  ];
}

/** Gera um documento Word (.docx) editável, preservando títulos, espaçamentos, margens e secções. */
export async function renderCvDocx(cv: CvContent, theme: CvTheme, photo: CvPhoto | null = null): Promise<Buffer> {
  const accent = safeAccent(theme.accentColor);
  const ctx: Ctx = { accent, font: "Calibri", headingFont: theme.layout === "EXECUTIVO" ? "Cambria" : "Calibri" };
  const usePhoto = cv.personal.showPhoto ? photo : null;
  const children =
    theme.layout === "MODERNO" ? moderno(cv, ctx, usePhoto) : theme.layout === "EXECUTIVO" ? executivo(cv, ctx, usePhoto) : classico(cv, ctx, usePhoto);

  const doc = new Document({
    creator: "Emprego Fácil MZ",
    title: `CV — ${cv.personal.fullName || cv.title}`,
    description: "Curriculum Vitae criado com Emprego Fácil MZ",
    styles: {
      default: {
        document: {
          run: { font: ctx.font, size: 21, color: TEXT_COLOR },
          paragraph: { spacing: { line: 264, after: 0 } },
        },
      },
      paragraphStyles: [
        { id: "CvName", name: "Nome (CV)", basedOn: "Title", next: "Normal", run: { font: ctx.headingFont }, paragraph: { spacing: { after: 20 } } },
        { id: "CvSectionHeading", name: "Título de secção (CV)", basedOn: "Heading2", next: "Normal", run: { font: ctx.font }, paragraph: { keepNext: true } },
      ],
    },
    numbering: {
      config: [
        {
          reference: "cv-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 340, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: theme.layout === "MODERNO" ? { top: MODERNO_MARGIN, bottom: MODERNO_MARGIN, left: MODERNO_MARGIN, right: MODERNO_MARGIN } : { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
