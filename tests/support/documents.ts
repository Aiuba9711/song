import { inflateSync } from "node:zlib";
import JSZip from "jszip";

/** Descodifica WinAnsi (cp1252) — codificação das fontes padrão do PDF. */
const CP1252: Record<number, string> = { 0x80: "€", 0x82: "‚", 0x84: "„", 0x85: "…", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x99: "™" };
function decodeWinAnsi(buf: Buffer): string {
  let out = "";
  for (const b of buf) out += CP1252[b] ?? String.fromCharCode(b);
  return out;
}

/** Texto de um DOCX (conteúdo de todos os <w:t>). */
export async function docxText(docx: Buffer): Promise<string> {
  const xml = await docxXml(docx);
  return [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => m[1]!)
    .join("")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

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
    for (const hex of content.matchAll(/<([0-9a-fA-F]+)>/g)) out.push(decodeWinAnsi(Buffer.from(hex[1]!, "hex")));
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
