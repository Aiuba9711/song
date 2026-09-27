import { describe, expect, it } from "vitest";
import { renderCvPdf } from "@/cv/pdf";
import { SAMPLE_CV } from "@/cv/sample";
import { resolveDesign } from "@/cv/design";
import { emptyCvContent, type CvLayoutId } from "@/cv/types";
import { pdfPageCount, pdfText, TINY_PNG } from "../support/documents";

const LAYOUTS: CvLayoutId[] = ["CLASSICO", "MODERNO", "EXECUTIVO"];

describe("geração de PDF", () => {
  it.each(LAYOUTS)("layout %s gera um PDF A4 válido com o conteúdo do utilizador", async (layout) => {
    const pdf = await renderCvPdf(SAMPLE_CV, resolveDesign({ layout, accentColor: "#1d40d8" }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeLessThan(100_000); // leve para enviar por email
    expect(pdf.toString("latin1")).toMatch(/\/MediaBox\s*\[0 0 595\.2\d* 841\.8\d*\]/);
    const text = pdfText(pdf);
    expect(text).toContain("Ana Maria Machava");
    expect(text).toContain("Assistente de Contabilidade");
    expect(text).toContain("Moçambique"); // acentos preservados
  });

  it("não inventa conteúdo: um CV vazio só mostra o marcador do nome", async () => {
    const pdf = await renderCvPdf(emptyCvContent(), resolveDesign({ layout: "CLASSICO", accentColor: "#1d40d8" }));
    const text = pdfText(pdf);
    expect(text).toContain("O seu nome");
    expect(text).not.toMatch(/Experiência|Formação|Competências/);
  });

  it("CVs longos ocupam várias páginas", async () => {
    const long = { ...SAMPLE_CV, experiences: Array(8).fill(SAMPLE_CV.experiences[0]) };
    const pdf = await renderCvPdf(long, resolveDesign({ layout: "MODERNO", accentColor: "#0f766e" }));
    expect(pdfPageCount(pdf)).toBeGreaterThanOrEqual(2);
  });

  it("inclui a fotografia apenas quando showPhoto está ativo", async () => {
    const photo = { data: TINY_PNG, mime: "image/png" as const };
    const withPhoto = await renderCvPdf({ ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, showPhoto: true } }, resolveDesign({ layout: "CLASSICO", accentColor: "#1d40d8" }), photo);
    const withoutPhoto = await renderCvPdf(SAMPLE_CV, resolveDesign({ layout: "CLASSICO", accentColor: "#1d40d8" }), photo);
    expect(withPhoto.toString("latin1")).toMatch(/\/Subtype\s*\/Image/);
    expect(withoutPhoto.toString("latin1")).not.toMatch(/\/Subtype\s*\/Image/);
  });

  it("ignora cores de destaque inválidas", async () => {
    const pdf = await renderCvPdf(SAMPLE_CV, resolveDesign({ layout: "EXECUTIVO", accentColor: "javascript:alert(1)" }));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
