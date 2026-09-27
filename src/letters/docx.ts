import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { letterLayout } from "./compose";
import type { LetterContent } from "./types";

const tw = (pt: number) => Math.round(pt * 20);

function lines(text: string[], opts: { bold?: boolean; color?: string; size?: number } = {}) {
  return text.map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0, bold: opts.bold, color: opts.color, size: opts.size }));
}

/** Carta em Word (DOCX editável): A4, margens de 2,5 cm, parágrafos reais (sem tabelas). */
export async function renderLetterDocx(c: LetterContent, date: Date): Promise<Buffer> {
  const l = letterLayout(c, date);
  const children: Paragraph[] = [];
  if (l.sender.length) {
    children.push(
      new Paragraph({
        spacing: { after: tw(18) },
        children: [
          new TextRun({ text: l.sender[0]!, bold: true, size: 25, color: "0F172A" }),
          ...l.sender.slice(1).map((line) => new TextRun({ text: line, break: 1, color: "475569" })),
        ],
      }),
    );
  }
  if (l.recipient.length) children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: tw(14) }, children: lines(l.recipient) }));
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: tw(16) }, children: [new TextRun(l.dateLine)] }));
  if (l.subject) children.push(new Paragraph({ spacing: { after: tw(12) }, children: [new TextRun({ text: `Assunto: ${l.subject}`, bold: true })] }));
  for (const p of l.paragraphs) children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: tw(8) }, children: lines(p) }));
  if (l.signature) children.push(new Paragraph({ spacing: { before: tw(22) }, children: [new TextRun({ text: l.signature, bold: true })] }));

  const doc = new Document({
    creator: "Emprego Fácil MZ",
    title: c.subject || c.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: "1E293B" }, paragraph: { spacing: { line: 300 } } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: tw(64), bottom: tw(64), left: tw(70), right: tw(70) } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
