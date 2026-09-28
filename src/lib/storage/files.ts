/**
 * Validação de ficheiros por "magic bytes" (não confiamos na extensão nem no MIME do browser).
 */
export type DetectedType = { mime: string; ext: string };

export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { mime: "image/png", ext: "png" };
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // ZIP: DOCX/XLSX/PPTX também são ZIP; distinguimos pelo conteúdo.
    const head = buf.subarray(0, Math.min(buf.length, 4096)).toString("latin1");
    if (head.includes("word/")) return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
    if (head.includes("xl/")) return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" };
    if (head.includes("ppt/")) return { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx" };
    return { mime: "application/zip", ext: "zip" };
  }
  return null;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PRODUCT_FILE_TYPES = [
  "application/pdf",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

/** Fotografias: até 5 MB no envio (o telemóvel já reduz antes de enviar); guardadas comprimidas. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_FILE_BYTES = 4 * 1024 * 1024; // limite de corpo em funções serverless (~4,5 MB)
