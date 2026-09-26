import { inflateSync } from "node:zlib";
import JSZip from "jszip";

/** Extrai o texto aproximado de um PDF (streams FlateDecode + strings hex/literais). */
export function pdfText(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  const out: string[] = [];
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    let content: string;
    try {
      content = inflateSync(Buffer.from(m[1]!, "latin1")).toString("latin1");
    } catch {
      continue;
    }
    for (const hex of content.matchAll(/<([0-9a-fA-F]+)>/g)) out.push(Buffer.from(hex[1]!, "hex").toString("latin1"));
    for (const lit of content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) out.push(lit[1]!);
  }
  return out.join("");
}

export function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length;
}

export async function docxXml(docx: Buffer, file = "word/document.xml"): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  const entry = zip.file(file);
  if (!entry) throw new Error(`${file} não existe no DOCX`);
  return entry.async("string");
}

export async function docxFiles(docx: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(docx);
  return Object.keys(zip.files);
}

/** PNG 2×2 válido (para testar fotografias). */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==",
  "base64",
);
