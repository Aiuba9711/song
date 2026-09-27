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
  UnderlineType,
  VerticalAlign,
  WidthType,
  type FileChild,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import { maskPhoto } from "@/lib/photo";
import { buildTheme, isAtsCompatible, tintHex, type TemplateDesign, type Theme } from "../design";
import { toBlocks } from "../format";
import { planDocument, type DocumentPlan, type Entry, type PlanSection, type Row } from "../plan";
import type { CvContent, CvPhoto } from "../types";

/*
 * Unidades: twips (1 pt = 20) para medidas; meios-pontos para tamanhos de letra.
 * A4 = 11906 × 16838 twips.
 */
const PAGE = { width: 11906, height: 16838 };
const hex = (c: string) => c.replace("#", "").toUpperCase();
const hp = (pt: number) => Math.round(pt * 2); // meio-ponto
const tw = (pt: number) => Math.round(pt * 20); // twips

type Ctx = {
  d: TemplateDesign;
  t: Theme;
  inSide: boolean;
  width: number; // largura útil da coluna, em twips
  font: string;
  headingFont: string;
  colors: { text: string; ink: string; muted: string };
};

function run(text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string; font?: string; allCaps?: boolean; underline?: boolean; shading?: string } = {}) {
  return new TextRun({
    text,
    bold: o.bold,
    italics: o.italics,
    size: o.size,
    color: o.color,
    font: o.font,
    allCaps: o.allCaps,
    underline: o.underline ? { type: UnderlineType.THICK, color: undefined } : undefined,
    shading: o.shading ? { type: ShadingType.CLEAR, fill: o.shading, color: "auto" } : undefined,
  });
}

function para(children: ParagraphChild[] | string, opts: IParagraphOptions = {}) {
  return new Paragraph({ ...opts, children: typeof children === "string" ? [run(children)] : children });
}

function richText(text: string, ctx: Ctx, indentLeft = 0): Paragraph[] {
  const out: Paragraph[] = [];
  for (const b of toBlocks(text)) {
    if (b.kind === "paragraph") out.push(para([run(b.text, { color: ctx.colors.text })], { spacing: { after: 40 }, indent: indentLeft ? { left: indentLeft } : undefined }));
    else
      for (const item of b.items)
        out.push(
          para([run(item, { color: ctx.colors.text })], {
            numbering: { reference: "cv-bullets", level: indentLeft ? 1 : 0 },
            spacing: { after: 20 },
          }),
        );
  }
  return out;
}

function heading(title: string, ctx: Ctx): Paragraph {
  const { d, t } = ctx;
  const base: IParagraphOptions = { style: "CvSectionHeading", spacing: { before: tw(ctx.t.space.section * 0.6), after: tw(5) }, keepNext: true };
  if (ctx.inSide && t.sidebar) {
    return para([run(title, { bold: true, size: hp(8.6), color: hex(t.sidebar.heading), allCaps: true, font: ctx.font })], base);
  }
  const size = hp(t.size.heading);
  const f = ctx.headingFont;
  switch (d.headingStyle) {
    case "rule":
      return para([run(title, { bold: true, size, color: hex(t.accent), allCaps: true, font: f })], { ...base, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(t.accent), space: 2 } } });
    case "caps":
      return para([run(title, { bold: true, size, color: hex(t.ink), allCaps: true, font: f })], base);
    case "bar":
      return para([run("— ", { bold: true, size, color: hex(t.accent), font: f }), run(title, { bold: true, size, color: hex(t.accent), allCaps: true, font: f })], base);
    case "box":
      return para([run(` ${title} `, { bold: true, size, color: "FFFFFF", allCaps: true, font: f })], { ...base, shading: { type: ShadingType.CLEAR, fill: hex(t.accent), color: "auto" } });
    case "serif-line":
      return para([run(title, { bold: true, size, color: hex(t.ink), font: "Cambria" })], { ...base, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: hex(t.rule), space: 2 } } });
    case "dot":
      return para([run("● ", { size, color: hex(t.accent), font: f }), run(title, { bold: true, size: hp(t.size.heading + 0.6), color: hex(t.ink), font: f })], base);
    case "underline":
      return para([new TextRun({ text: title, bold: true, size: hp(t.size.heading + 1), color: hex(t.ink), font: f, underline: { type: UnderlineType.THICK, color: hex(t.accent) } })], base);
  }
}

function entry(e: Entry, ctx: Ctx): Paragraph[] {
  const { d, t } = ctx;
  const style = ctx.inSide ? "stacked" : d.entryStyle;
  const small = hp(t.size.small);
  const sub = [e.org, e.location].filter(Boolean).join(", ");
  const out: Paragraph[] = [];

  if (style === "date-left") {
    const col = tw(98);
    out.push(
      para([run(e.dates, { bold: true, size: small, color: hex(t.muted) }), run(`\t${e.title}`, { bold: true, color: ctx.colors.ink })], {
        tabStops: [{ type: TabStopType.LEFT, position: col }],
        indent: { left: col, hanging: col },
        spacing: { before: tw(t.space.entry) },
        keepNext: true,
      }),
    );
    out.push(
      para([run(e.location, { size: small, color: hex(t.muted) }), run(`\t${e.org}`, { bold: true, color: hex(t.accent) })], {
        tabStops: [{ type: TabStopType.LEFT, position: col }],
        indent: { left: col, hanging: col },
        keepNext: !!e.description,
      }),
    );
    out.push(...richText(e.description, ctx, col));
    return out;
  }
  if (style === "timeline") {
    const border = { left: { style: BorderStyle.SINGLE, size: 12, color: hex(t.rule), space: 8 } };
    out.push(para([run("● ", { color: hex(t.accent) }), run(e.title, { bold: true, color: ctx.colors.ink })], { border, indent: { left: 120 }, spacing: { before: tw(t.space.entry) }, keepNext: true }));
    out.push(
      para([run(sub, { size: small, color: ctx.colors.muted }), ...(e.dates ? [run(`${sub ? "  ·  " : ""}${e.dates}`, { bold: true, size: small, color: hex(t.accent) })] : [])], {
        border,
        indent: { left: 120 },
        keepNext: !!e.description,
      }),
    );
    for (const p of toBlocks(e.description)) {
      if (p.kind === "paragraph") out.push(para([run(p.text, { color: ctx.colors.text })], { border, indent: { left: 120 } }));
      else for (const item of p.items) out.push(para([run(`•  ${item}`, { color: ctx.colors.text })], { border, indent: { left: 120 } }));
    }
    return out;
  }
  if (style === "stacked") {
    const line = [e.org, e.location, e.dates].filter(Boolean).join(" | ");
    out.push(para([run(e.title, { bold: true, color: ctx.colors.ink })], { spacing: { before: tw(t.space.entry) }, keepNext: true }));
    if (line) out.push(para([run(line, { size: small, color: ctx.colors.muted })], { keepNext: !!e.description }));
    out.push(...richText(e.description, ctx));
    return out;
  }
  out.push(
    para([run(e.title, { bold: true, color: ctx.colors.ink }), ...(e.dates ? [run(`\t${e.dates}`, { size: small, color: hex(t.muted) })] : [])], {
      tabStops: [{ type: TabStopType.RIGHT, position: ctx.width }],
      spacing: { before: tw(t.space.entry) },
      keepNext: true,
    }),
  );
  if (sub) out.push(para([run(sub, { italics: true, color: "334155" })], { keepNext: !!e.description }));
  out.push(...richText(e.description, ctx));
  return out;
}

function namedItems(items: { name: string; level: string }[], ctx: Ctx, kind: "skills" | "languages"): Paragraph[] {
  const { d, t } = ctx;
  const style = ctx.inSide ? "list" : kind === "languages" ? (d.skillsStyle === "inline" ? "inline" : "list") : d.skillsStyle;
  const label = (i: { name: string; level: string }) => [run(i.name, { bold: kind === "languages", color: ctx.colors.text }), ...(i.level ? [run(` — ${i.level}`, { color: ctx.colors.muted })] : [])];

  if (style === "inline") return [para([run(items.map((i) => (i.level ? `${i.name} (${i.level})` : i.name)).join(" · "), { color: ctx.colors.text })])];
  if (style === "tags") {
    const runs: TextRun[] = [];
    items.forEach((i, k) => {
      if (k) runs.push(run("  "));
      runs.push(run(` ${i.name}${i.level ? ` · ${i.level}` : ""} `, { size: hp(t.size.small), color: hex(t.ink), shading: hex(t.soft) }));
    });
    return [para(runs, { spacing: { line: 320 } })];
  }
  if (style === "columns") {
    const out: Paragraph[] = [];
    for (let k = 0; k < items.length; k += 2) {
      const a = items[k]!;
      const b = items[k + 1];
      out.push(
        para([run("• ", { color: hex(t.accent) }), ...label(a), ...(b ? [run("\t• ", { color: hex(t.accent) }), ...label(b)] : [])], {
          tabStops: [{ type: TabStopType.LEFT, position: Math.round(ctx.width / 2) }],
        }),
      );
    }
    return out;
  }
  if (ctx.inSide) {
    return items.flatMap((i) => [
      para([run(i.name, { bold: kind === "languages", size: hp(9.2), color: ctx.colors.text })], { keepNext: !!i.level }),
      ...(i.level ? [para([run(i.level, { size: hp(8), color: ctx.colors.muted })], { spacing: { after: 60 } })] : []),
    ]);
  }
  return items.map((i) => para(label(i), { numbering: { reference: "cv-bullets", level: 0 } }));
}

function sectionBody(s: PlanSection, ctx: Ctx): Paragraph[] {
  const { t } = ctx;
  const small = hp(t.size.small);
  switch (s.key) {
    case "summary":
    case "objective":
    case "custom":
      return richText(s.text, ctx);
    case "experience":
    case "education":
      return s.entries.flatMap((e) => entry(e, ctx));
    case "skills":
    case "languages":
      return namedItems(s.items, ctx, s.key);
    case "courses":
    case "certifications":
      return s.items.flatMap((c) => [
        para([run(c.name, { bold: true, color: ctx.colors.text })], { keepNext: !!(c.detail || c.year) }),
        ...(c.detail || c.year ? [para([run([c.detail, c.year].filter(Boolean).join(", "), { size: small, color: ctx.colors.muted })], { spacing: { after: 60 } })] : []),
      ]);
    case "references":
      if (s.onRequest) return [para([run("Disponíveis mediante solicitação.", { color: ctx.colors.text })])];
      return s.items.flatMap((r) => [
        para([run(r.name, { bold: true, color: ctx.colors.text })], { spacing: { before: 80 }, keepNext: true }),
        ...(r.role ? [para([run(r.role, { color: ctx.colors.text })], { keepNext: !!r.contact })] : []),
        ...(r.contact ? [para([run(r.contact, { size: small, color: ctx.colors.muted })])] : []),
      ]);
    case "contacts":
      return s.items.flatMap((c) => [
        para([run(c.label, { size: hp(7.4), color: ctx.colors.muted, allCaps: true })], { keepNext: true }),
        para([run(c.value, { size: hp(9.2), color: ctx.colors.text })], { spacing: { after: 80 } }),
      ]);
  }
}

const section = (s: PlanSection, ctx: Ctx) => [heading(s.title, ctx), ...sectionBody(s, ctx)];

function rows(rowsList: Row[], ctx: Ctx): FileChild[] {
  const out: FileChild[] = [];
  for (const r of rowsList) {
    if (r.type === "section") out.push(...section(r.section, ctx));
    else {
      const half = Math.floor(ctx.width / 2);
      const cellCtx = { ...ctx, width: half - 200 };
      out.push(
        new Table({
          width: { size: ctx.width, type: WidthType.DXA },
          columnWidths: [half, ctx.width - half],
          layout: TableLayoutType.FIXED,
          borders: TableBorders.NONE,
          rows: [
            new TableRow({
              children: [
                new TableCell({ width: { size: half, type: WidthType.DXA }, margins: { right: 200 }, children: section(r.left, cellCtx) }),
                new TableCell({ width: { size: ctx.width - half, type: WidthType.DXA }, margins: { left: 200 }, children: section(r.right, cellCtx) }),
              ],
            }),
          ],
        }),
        para("", { spacing: { after: 0 } }),
      );
    }
  }
  return out;
}

function photoRun(png: Buffer, sizePt: number) {
  const px = Math.round(sizePt * (4 / 3));
  return new ImageRun({ type: "png", data: png, transformation: { width: px, height: px }, altText: { name: "Fotografia", description: "Fotografia do candidato", title: "Fotografia" } });
}

function header(plan: DocumentPlan, ctx: Ctx, photo: Buffer | null, fullWidth: number): FileChild[] {
  const { d, t } = ctx;
  const band = t.band;
  const center = d.header === "center";
  const pos = photo && plan.photo && plan.photo !== "sidebar" ? plan.photo : null;
  const nameColor = band ? hex(band.text) : hex(t.ink);
  const titleColor = band ? hex(band.muted) : hex(t.accent);
  const contactColor = band ? hex(band.muted) : hex(t.muted);
  const align = center ? AlignmentType.CENTER : AlignmentType.LEFT;

  const nameParas: Paragraph[] = [
    para([run(plan.name || "O seu nome", { bold: true, size: hp(t.size.name), color: nameColor, font: ctx.headingFont })], { style: "CvName", alignment: align }),
  ];
  if (plan.jobTitle) nameParas.push(para([run(plan.jobTitle, { bold: true, size: hp(t.size.title), color: titleColor, allCaps: d.header === "band" })], { alignment: align }));
  if (plan.contactsInHeader && plan.contacts.length && d.header !== "split" && d.header !== "stacked") {
    nameParas.push(para([run(plan.contacts.map((c) => c.value).join("  ·  "), { size: hp(t.size.small), color: contactColor })], { alignment: align, spacing: { before: 80 } }));
  }
  if (plan.contactsInHeader && d.header === "stacked") {
    plan.contacts.forEach((c, i) =>
      nameParas.push(para([run(`${c.label}: `, { bold: true, size: hp(t.size.small), color: hex(t.text) }), run(c.value, { size: hp(t.size.small), color: hex(t.text) })], { spacing: { before: i === 0 ? 100 : 0 } })),
    );
  }

  // Modelos compatíveis com ATS nunca usam tabelas: a foto fica num parágrafo próprio.
  const ats = isAtsCompatible(d);
  const needsTable = !!band || d.header === "split" || (pos && pos !== "center" && !ats);
  if (!needsTable) {
    const out: FileChild[] = [];
    if (pos)
      out.push(
        para([photoRun(photo!, pos === "center" ? 78 : 70)], {
          alignment: pos === "center" ? AlignmentType.CENTER : pos === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { after: 100 },
        }),
      );
    out.push(...nameParas, para("", { spacing: { after: tw(8) } }));
    return out;
  }

  // Cabeçalho em tabela sem bordas (fotografia ao lado, contactos à direita ou faixa de cor).
  const photoW = pos ? tw(84) : 0;
  const contactsW = d.header === "split" ? tw(170) : 0;
  const nameW = fullWidth - photoW - contactsW;
  const shading = band ? { type: ShadingType.CLEAR, fill: hex(band.bg), color: "auto" } : undefined;
  const pad = band ? { top: tw(18), bottom: tw(18), left: tw(12), right: tw(12) } : { top: 0, bottom: 0, left: 0, right: tw(10) };
  const cells: TableCell[] = [];
  const photoCell = pos ? new TableCell({ width: { size: photoW, type: WidthType.DXA }, shading, margins: pad, verticalAlign: VerticalAlign.CENTER, children: [para([photoRun(photo!, 70)])] }) : null;
  if (photoCell && (pos === "left" || pos === "center")) cells.push(photoCell);
  cells.push(new TableCell({ width: { size: nameW, type: WidthType.DXA }, shading, margins: pad, verticalAlign: VerticalAlign.CENTER, children: nameParas }));
  if (photoCell && pos === "right") cells.push(photoCell);
  if (contactsW) {
    cells.push(
      new TableCell({
        width: { size: contactsW, type: WidthType.DXA },
        shading,
        margins: pad,
        verticalAlign: VerticalAlign.CENTER,
        children: plan.contacts.length ? plan.contacts.map((c) => para([run(c.value, { size: hp(t.size.small), color: contactColor })], { alignment: AlignmentType.RIGHT })) : [para("")],
      }),
    );
  }
  return [
    new Table({
      width: { size: fullWidth, type: WidthType.DXA },
      columnWidths: cells.map((c) => (c.options.width?.size as number) ?? 0),
      layout: TableLayoutType.FIXED,
      borders: TableBorders.NONE,
      rows: [new TableRow({ children: cells })],
    }),
    para("", { spacing: { after: tw(8) } }),
  ];
}

/** Gera um documento Word (.docx) editável, com a mesma estrutura da pré-visualização e do PDF. */
export async function renderCvDocx(cv: CvContent, design: TemplateDesign, photo: CvPhoto | null = null): Promise<Buffer> {
  const t = buildTheme(design);
  const plan = planDocument(cv, design, { hasPhoto: !!photo });
  const png = photo && plan.photo ? await maskPhoto(photo.data, design.photoShape) : null;
  const font = t.serifBody ? "Cambria" : "Calibri";
  const headingFont = t.serifHeadings ? "Cambria" : "Calibri";
  const colors = { text: hex(t.text), ink: hex(t.ink), muted: hex(t.muted) };

  const sidebar = t.sidebar;
  const margin = sidebar ? 600 : tw(t.space.pageX);
  const fullWidth = PAGE.width - margin * 2;
  const mainCtx: Ctx = { d: design, t, inSide: false, width: fullWidth, font, headingFont, colors };
  let children: FileChild[];

  if (sidebar) {
    const sideW = tw(t.sidebarWidthPt) - 400;
    const mainW = fullWidth - sideW;
    const sideCtx: Ctx = { ...mainCtx, inSide: true, width: sideW - 480, font: "Calibri", headingFont: "Calibri", colors: { text: hex(sidebar.text), ink: hex(sidebar.text), muted: hex(sidebar.muted) } };
    const inMain: Ctx = { ...mainCtx, width: mainW - 560 };
    const sideChildren: Paragraph[] = [];
    if (png && plan.photo === "sidebar") sideChildren.push(para([photoRun(png, 88)], { alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
    for (const s of plan.side) sideChildren.push(...section(s, sideCtx));
    if (sideChildren.length === 0) sideChildren.push(para(""));
    const mainChildren: FileChild[] = [...(design.header === "band" ? [] : header(plan, inMain, png, mainW - 560)), ...rows(plan.main, inMain)];
    const sideCell = new TableCell({
      width: { size: sideW, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: hex(sidebar.bg), color: "auto" },
      margins: { top: 300, bottom: 300, left: 240, right: 240 },
      children: sideChildren,
    });
    const mainCell = new TableCell({ width: { size: mainW, type: WidthType.DXA }, margins: { top: 300, bottom: 300, left: 280, right: 280 }, children: mainChildren.length ? mainChildren : [para("")] });
    const left = design.structure === "sidebar-left";
    children = [
      ...(design.header === "band" ? header(plan, mainCtx, png, fullWidth) : []),
      new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: left ? [sideW, mainW] : [mainW, sideW],
        layout: TableLayoutType.FIXED,
        borders: TableBorders.NONE,
        rows: [new TableRow({ children: left ? [sideCell, mainCell] : [mainCell, sideCell] })],
      }),
      // O Word exige um parágrafo depois de uma tabela no fim do documento.
      para("", { spacing: { after: 0 } }),
    ];
  } else if (design.structure === "split") {
    const sideW = Math.round(fullWidth * 0.36);
    const mainW = fullWidth - sideW;
    const inMain: Ctx = { ...mainCtx, width: mainW - 280 };
    const inSplitSide: Ctx = { ...mainCtx, width: sideW - 280 };
    children = [
      ...header(plan, mainCtx, png, fullWidth),
      new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: [mainW, sideW],
        layout: TableLayoutType.FIXED,
        borders: TableBorders.NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: mainW, type: WidthType.DXA }, margins: { right: 280 }, children: rows(plan.main, inMain) as Paragraph[] }),
              new TableCell({
                width: { size: sideW, type: WidthType.DXA },
                margins: { left: 280 },
                borders: {
                  left: { style: BorderStyle.SINGLE, size: 6, color: hex(tintHex(t.accent, 0.7)) },
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: plan.side.length ? plan.side.flatMap((s) => section(s, inSplitSide)) : [para("")],
              }),
            ],
          }),
        ],
      }),
      para("", { spacing: { after: 0 } }),
    ];
  } else {
    children = [...header(plan, mainCtx, png, fullWidth), ...rows(plan.main, mainCtx)];
  }

  const doc = new Document({
    creator: "Emprego Fácil MZ",
    title: `CV — ${cv.personal.fullName || cv.title}`,
    description: "Curriculum Vitae criado com Emprego Fácil MZ",
    styles: {
      default: {
        document: { run: { font, size: hp(t.size.base), color: hex(t.text) }, paragraph: { spacing: { line: 264, after: 0 } } },
      },
      paragraphStyles: [
        { id: "CvName", name: "Nome (CV)", basedOn: "Title", next: "Normal", run: { font: headingFont }, paragraph: { spacing: { after: 20 } } },
        { id: "CvSectionHeading", name: "Título de secção (CV)", basedOn: "Heading2", next: "Normal", run: { font: headingFont }, paragraph: { keepNext: true } },
      ],
    },
    numbering: {
      config: [
        {
          reference: "cv-bullets",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 340, hanging: 220 } } } },
            { level: 1, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: tw(98) + 280, hanging: 220 } } } },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: sidebar ? { top: 600, bottom: 600, left: margin, right: margin } : { top: tw(t.space.pageY), bottom: tw(t.space.pageY), left: margin, right: margin },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
