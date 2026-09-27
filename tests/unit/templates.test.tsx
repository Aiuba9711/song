import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { CATALOG } from "@/cv/catalog";
import { CATEGORY_LABELS } from "@/cv/categories";
import { designSchema, isAtsCompatible, resolveDesign } from "@/cv/design";
import { renderCvDocx } from "@/cv/docx";
import { renderCvPdf } from "@/cv/pdf";
import { planDocument, planTexts } from "@/cv/plan";
import { CvPreview } from "@/cv/preview";
import { FULL_SAMPLE_CV, SAMPLE_CV } from "@/cv/sample";
import type { CvPhoto } from "@/cv/types";
import { docxFiles, docxText, docxXml, pdfPageCount, pdfText } from "../support/documents";

const norm = (s: string) => s.toLocaleLowerCase("pt").replace(/\s+/g, "");

function htmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

let photo: CvPhoto;
beforeAll(async () => {
  const data = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#7f9fbf" } }).jpeg().toBuffer();
  photo = { data, mime: "image/jpeg" };
});

describe("catálogo de modelos", () => {
  it("tem pelo menos 36 modelos com slugs únicos e designs distintos", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(36);
    expect(new Set(CATALOG.map((t) => t.slug)).size).toBe(CATALOG.length);
    // Não basta mudar a cor: cada modelo tem uma composição própria.
    const fingerprints = CATALOG.map((t) => JSON.stringify({ ...resolveDesign({ layout: t.layout, design: t.design }), accent: undefined }));
    expect(new Set(fingerprints).size).toBe(CATALOG.length);
  });

  it("cobre todas as categorias pedidas e vários estilos", () => {
    const required = [
      "PRIMEIRO_EMPREGO", "RECEM_FORMADO", "ADMINISTRATIVO", "CONTABILIDADE", "RECURSOS_HUMANOS", "SAUDE", "ENFERMAGEM", "OPTOMETRIA", "EDUCACAO", "ENGENHARIA", "INFORMATICA",
      "MARKETING", "VENDAS", "ATENDIMENTO_CLIENTE", "GESTAO", "FINANCAS", "CONSTRUCAO", "LOGISTICA", "HOTELARIA", "MOTORISTA", "TECNICO_PROFISSIONAL", "EXECUTIVO",
    ] as const;
    for (const c of required) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
      expect(CATALOG.some((t) => t.category === c), c).toBe(true);
    }
    const styles = new Set(CATALOG.map((t) => t.style));
    for (const s of ["Minimal", "Executive", "Modern", "Professional", "Classic", "Corporate", "Elegant", "Compact", "Academic", "Creative", "ATS Friendly", "Clean", "Timeline", "Sidebar", "Modern Blue", "Professional Green", "Black & White"]) {
      expect(styles.has(s), s).toBe(true);
    }
    expect(new Set(CATALOG.map((t) => resolveDesign({ layout: t.layout, design: t.design }).structure)).size).toBe(4);
  });

  it("a etiqueta «Compatível com ATS» só existe em designs realmente compatíveis", () => {
    const ats = CATALOG.filter((t) => t.isAtsFriendly);
    expect(ats.length).toBeGreaterThanOrEqual(6);
    // Filtro «Com fotografia / Sem fotografia» da galeria
    const noPhoto = CATALOG.filter((t) => designSchema.parse(t.design).photo === false);
    expect(noPhoto.length).toBeGreaterThanOrEqual(3);
    expect(CATALOG.length - noPhoto.length).toBeGreaterThanOrEqual(30);
    for (const t of CATALOG) {
      const d = designSchema.parse(resolveDesign({ layout: t.layout, design: t.design, accentColor: t.accentColor }));
      expect(isAtsCompatible(d), t.slug).toBe(t.isAtsFriendly);
    }
  });
});

describe.each(CATALOG.map((t) => [t.slug, t] as const))("modelo %s", (_slug, t) => {
  const design = resolveDesign({ layout: t.layout, design: t.design, accentColor: t.accentColor });

  it("HTML, PDF e DOCX mostram todos os campos — com fotografia", async () => {
    const expected = planTexts(planDocument(FULL_SAMPLE_CV, design, { hasPhoto: true }));
    const rawHtml = renderToStaticMarkup(<CvPreview cv={FULL_SAMPLE_CV} design={design} photoUrl="/api/cv/x/photo" />);
    const html = norm(htmlText(rawHtml));
    const pdf = await renderCvPdf(FULL_SAMPLE_CV, design, photo);
    const docx = await renderCvDocx(FULL_SAMPLE_CV, design, photo);
    const pdfT = norm(pdfText(pdf));
    const docxT = norm(await docxText(docx));

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    for (const text of expected) {
      const needle = norm(text.replace(/^[-•*]\s*/gm, ""));
      for (const line of text.split("\n")) {
        const l = norm(line.replace(/^[-•*]\s*/, ""));
        if (!l) continue;
        expect(html, `HTML sem «${line}»`).toContain(l);
        expect(pdfT, `PDF sem «${line}»`).toContain(l);
        expect(docxT, `DOCX sem «${line}»`).toContain(l);
      }
      expect(needle.length).toBeGreaterThan(0);
    }
    // Fotografia presente nos três formatos (ausente nos modelos «Sem fotografia»)
    expect(rawHtml.includes('alt="Fotografia do candidato"')).toBe(design.photo);
    expect(/\/Subtype\s*\/Image/.test(pdf.toString("latin1"))).toBe(design.photo);
    expect((await docxFiles(docx)).some((f) => f.startsWith("word/media/"))).toBe(design.photo);
  });

  it("sem fotografia não inclui imagens e cabe em A4", async () => {
    const cv = { ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, showPhoto: false } };
    const pdf = await renderCvPdf(cv, design, photo);
    const docx = await renderCvDocx(cv, design, photo);
    expect(pdf.toString("latin1")).not.toMatch(/\/Subtype\s*\/Image/);
    expect(pdf.toString("latin1")).toMatch(/\/MediaBox\s*\[0 0 595\.2\d* 841\.8\d*\]/);
    expect(pdfPageCount(pdf)).toBe(1);
    expect((await docxFiles(docx)).some((f) => f.startsWith("word/media/"))).toBe(false);
    expect(await docxXml(docx)).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
  });

  if (t.isAtsFriendly) {
    it("ATS: DOCX sem tabelas nem elementos gráficos", async () => {
      const xml = await docxXml(await renderCvDocx(FULL_SAMPLE_CV, design, photo));
      expect(xml).not.toContain("<w:tbl>");
      expect(xml).not.toMatch(/w:fill="(?!auto)[0-9A-F]{6}"/);
      const html = renderToStaticMarkup(<CvPreview cv={SAMPLE_CV} design={design} />);
      expect(html).not.toContain("border-radius:50%"); // sem pontos/bolinhas decorativas
    });
  }
});
