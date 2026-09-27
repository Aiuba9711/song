import { describe, expect, it } from "vitest";
import { renderCvDocx } from "@/cv/docx";
import { SAMPLE_CV } from "@/cv/sample";
import { resolveDesign } from "@/cv/design";
import type { CvLayoutId } from "@/cv/types";
import { buildFreeCoverLetterDocx, buildFreeCvTemplateDocx } from "@/kits/free-kit";
import { detectFileType } from "@/lib/storage/files";
import { docxFiles, docxXml, TINY_PNG } from "../support/documents";

const LAYOUTS: CvLayoutId[] = ["CLASSICO", "MODERNO", "EXECUTIVO"];

describe("geração de DOCX (Word editável)", () => {
  it.each(LAYOUTS)("layout %s gera um documento Word válido", async (layout) => {
    const docx = await renderCvDocx(SAMPLE_CV, resolveDesign({ layout, accentColor: "#1d40d8" }));
    expect(detectFileType(docx)?.ext).toBe("docx");
    const xml = await docxXml(docx);
    expect(xml).toContain("Ana Maria Machava");
    expect(xml).toContain("Reconciliações bancárias mensais");
    // Página A4 com margens definidas
    expect(xml).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
    expect(xml).toMatch(/<w:pgMar [^>]*w:top="\d+"/);
    // Títulos de secção com estilo próprio (navegação e edição fácil no Word)
    expect(xml).toContain('w:val="CvSectionHeading"');
  });

  it("define estilos, fonte e marcadores reais (não caracteres soltos)", async () => {
    const docx = await renderCvDocx(SAMPLE_CV, resolveDesign({ layout: "CLASSICO", accentColor: "#1d40d8" }));
    const styles = await docxXml(docx, "word/styles.xml");
    expect(styles).toContain("Calibri");
    expect(styles).toContain("Título de secção (CV)");
    const numbering = await docxXml(docx, "word/numbering.xml");
    expect(numbering).toContain('w:val="bullet"');
    const xml = await docxXml(docx);
    expect(xml).toContain("<w:numPr>");
  });

  it("o layout Moderno usa uma tabela de duas colunas com a barra lateral colorida", async () => {
    const xml = await docxXml(await renderCvDocx(SAMPLE_CV, resolveDesign({ layout: "MODERNO", accentColor: "#0F766E" })));
    expect(xml).toContain("<w:tbl>");
    expect(xml).toMatch(/w:fill="0F766E"/);
  });

  it("inclui a fotografia só quando pedida", async () => {
    const photo = { data: TINY_PNG, mime: "image/png" as const };
    const withPhoto = await renderCvDocx({ ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, showPhoto: true } }, resolveDesign({ layout: "EXECUTIVO", accentColor: "#1d40d8" }), photo);
    expect((await docxFiles(withPhoto)).some((f) => f.startsWith("word/media/"))).toBe(true);
    const without = await renderCvDocx(SAMPLE_CV, resolveDesign({ layout: "EXECUTIVO", accentColor: "#1d40d8" }), photo);
    expect((await docxFiles(without)).some((f) => f.startsWith("word/media/"))).toBe(false);
  });

  it("os ficheiros do modelo gratuito são DOCX com campos a preencher", async () => {
    const cv = await docxXml(await buildFreeCvTemplateDocx());
    expect(cv).toContain("[Nome Completo]");
    const letter = await docxXml(await buildFreeCoverLetterDocx());
    expect(letter).toContain("Candidatura à vaga de [Cargo]");
    expect(letter).toContain("Não inclua informações que não sejam verdadeiras");
  });
});
