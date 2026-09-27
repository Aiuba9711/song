import { describe, expect, it } from "vitest";
import { findUngrounded, isGrounded } from "@/lib/ai/guard";
import { aiRequestSchema } from "@/lib/ai/types";
import { toWinAnsi } from "@/lib/pdf-text";
import { buildWhatsAppLink, normalizeWhatsAppNumber, WHATSAPP_MAX_TEXT } from "@/lib/whatsapp";
import { generateLetter, letterFileName, letterLayout, letterPlainText, listPt } from "@/letters/compose";
import { renderLetterDocx } from "@/letters/docx";
import { EMAIL_TEMPLATES, EMPTY_VARS, greetingForHour, WHATSAPP_TEMPLATES, type MessageVars } from "@/letters/messages";
import { renderLetterPdf } from "@/letters/pdf";
import { EMPTY_LETTER, LETTER_LIMITS, letterSchema, type LetterContent } from "@/letters/types";
import { checkResult } from "@/server/ai";
import { docxText, docxXml, pdfPageCount, pdfText } from "../support/documents";

const norm = (s: string) => s.replace(/\s+/g, "");
const DATE = new Date("2026-09-27T10:00:00Z");

const FULL: LetterContent = {
  ...EMPTY_LETTER,
  type: "CANDIDATURA",
  title: "Carta Banco",
  senderName: "Ana Maria Machava",
  senderContact: "+258 84 123 4567 | ana@exemplo.co.mz",
  recipientName: "Dra. Maria Sitoe",
  company: "Banco Exemplo, S.A.",
  position: "Técnica de Contabilidade",
  city: "Maputo",
  education: "Licenciatura em Contabilidade e Auditoria (2020)",
  experience: "- 4 anos como assistente de contabilidade\n- Reconciliações bancárias mensais",
  skills: "Primavera; Excel; organização",
  motivation: "quero contribuir para relatórios financeiros fiáveis",
};

describe("gerador de cartas", () => {
  it("carta de candidatura com todos os dados do utilizador, sem inventar nada", () => {
    const { subject, body } = generateLetter(FULL);
    expect(subject).toBe("Candidatura à vaga de Técnica de Contabilidade");
    expect(body.startsWith("Exmo.(a) Sr.(a) Dra. Maria Sitoe,")).toBe(true);
    for (const piece of ["Técnica de Contabilidade", "Banco Exemplo, S.A.", "Licenciatura em Contabilidade e Auditoria (2020)", "Reconciliações bancárias mensais", "Primavera, Excel e organização", "Quero contribuir"]) {
      expect(body).toContain(piece);
    }
    expect(body).toContain("+258 84 123 4567 ou ana@exemplo.co.mz");
    expect(body).not.toContain("S.A..");
    expect(body.trim().endsWith("Com os melhores cumprimentos,")).toBe(true);
    // Nenhum número, nome próprio, sigla ou contacto que não venha dos dados
    const sources = Object.values(FULL).filter((v): v is string => typeof v === "string");
    expect(isGrounded(findUngrounded(body, sources))).toBe(true);
  });

  it("carta de motivação começa pelo interesse e usa a motivação", () => {
    const { subject, body } = generateLetter({ ...FULL, type: "MOTIVACAO", recipientName: "" });
    expect(subject).toBe("Carta de motivação — Técnica de Contabilidade");
    const paragraphs = body.split("\n\n");
    expect(paragraphs[0]).toBe("Exmos. Senhores,");
    expect(paragraphs[1]).toContain("interesse em integrar a vossa equipa na função de Técnica de Contabilidade");
    expect(paragraphs[2]).toContain("Quero contribuir");
  });

  it("campos vazios não aparecem (nada de «undefined» nem frases vazias)", () => {
    const { subject, body } = generateLetter({ ...EMPTY_LETTER, title: "x" });
    expect(subject).toBe("Candidatura espontânea");
    expect(body).not.toMatch(/undefined|null|formação inclui|competências:|experiência profissional:|contactado/);
    expect(body.split("\n\n")).toHaveLength(4);
  });

  it("enumerações em português", () => {
    expect(listPt(["a"])).toBe("a");
    expect(listPt(["a", "b"])).toBe("a e b");
    expect(listPt(["a", "b", "c"], "ou")).toBe("a, b ou c");
  });
});

describe("formatos: texto, pré-visualização, PDF e DOCX", () => {
  const letter = { ...FULL, ...generateLetter(FULL) };

  it("texto copiado tem remetente, data, destinatário, assunto, corpo e assinatura", () => {
    const text = letterPlainText(letter, DATE);
    expect(text).toContain("Ana Maria Machava\n+258 84 123 4567\nana@exemplo.co.mz");
    expect(text).toContain("A/C: Dra. Maria Sitoe\nBanco Exemplo, S.A.");
    expect(text).toContain("Maputo, 27 de setembro de 2026");
    expect(text).toContain("Assunto: Candidatura à vaga de Técnica de Contabilidade");
    expect(text.trim().endsWith("Com os melhores cumprimentos,\n\nAna Maria Machava")).toBe(true);
    expect(letterFileName(letter, "pdf")).toBe("Carta-de-candidatura-Ana-Maria-Machava.pdf");
  });

  it("PDF A4 e DOCX editável com o mesmo conteúdo", async () => {
    const [pdf, docx] = await Promise.all([renderLetterPdf(letter, DATE), renderLetterDocx(letter, DATE)]);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toMatch(/\/MediaBox\s*\[0 0 595\.2\d* 841\.8\d*\]/);
    expect(pdfPageCount(pdf)).toBe(1);
    const p = norm(pdfText(pdf));
    const d = norm(await docxText(docx));
    for (const piece of ["Ana Maria Machava", "Assunto: Candidatura à vaga de Técnica de Contabilidade", "Banco Exemplo, S.A.", "Com os melhores cumprimentos,", "27 de setembro de 2026"]) {
      expect(p, piece).toContain(norm(piece));
      expect(d, piece).toContain(norm(piece));
    }
    expect(await docxXml(docx)).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
    expect(await docxXml(docx)).not.toContain("<w:tbl>");
  });

  it("caracteres especiais: acentos, aspas, &, <tags> e emojis", async () => {
    const special = { ...letter, body: "Exmos. Senhores,\n\nGestão «rigorosa» & “clara” <script>alert(1)</script> — 100% 😀 ação.\n\nCom os melhores cumprimentos," };
    const [pdf, docx] = await Promise.all([renderLetterPdf(special, DATE), renderLetterDocx(special, DATE)]);
    const p = pdfText(pdf);
    expect(norm(p)).toContain(norm("Gestão «rigorosa» & “clara” <script>alert(1)</script> — 100% ação."));
    const d = await docxText(docx);
    expect(d).toContain("Gestão «rigorosa» & “clara” <script>alert(1)</script> — 100% 😀 ação.");
    expect(await docxXml(docx)).not.toContain("<script>"); // escapado no XML
    expect(letterPlainText(special, DATE)).toContain("😀");
  });

  it("textos longos: carta no limite ocupa várias páginas sem perder texto", async () => {
    const para = "Responsável pela reconciliação bancária mensal e pelo apoio ao fecho de contas. ".repeat(12).trim();
    const body = Array.from({ length: 6 }, (_, i) => `${i + 1}. ${para}`).join("\n\n");
    expect(body.length).toBeLessThanOrEqual(LETTER_LIMITS.body);
    const long = { ...letter, body };
    const pdf = await renderLetterPdf(long, DATE);
    expect(pdfPageCount(pdf)).toBeGreaterThan(1);
    expect(norm(pdfText(pdf))).toContain(norm(`6. ${para}`));
    expect(letterLayout(long, DATE).paragraphs).toHaveLength(6);
    expect(letterSchema.safeParse({ ...long, body: "x".repeat(LETTER_LIMITS.body + 1) }).success).toBe(false);
    expect(letterSchema.safeParse({ ...long, company: "x".repeat(LETTER_LIMITS.company + 1) }).success).toBe(false);
  });

  it("PDF: texto convertido para as fontes base (sem símbolos ilegíveis)", () => {
    expect(toWinAnsi("Ação «ok» – “sim” … 20 € 😀.")).toBe("Ação «ok» – “sim” … 20 €.");
    expect(toWinAnsi("Ştefan ‐ Chişinău")).toBe("Stefan - Chisinau");
    expect(toWinAnsi("Привет")).toBe("");
  });
});

describe("links do WhatsApp", () => {
  it("normaliza números de Moçambique e internacionais", () => {
    expect(normalizeWhatsAppNumber("84 123 4567")).toBe("258841234567");
    expect(normalizeWhatsAppNumber("+258 84 123 4567")).toBe("258841234567");
    expect(normalizeWhatsAppNumber("00258841234567")).toBe("258841234567");
    expect(normalizeWhatsAppNumber("(84) 123-4567")).toBe("258841234567");
    expect(normalizeWhatsAppNumber("+27 82 123 4567")).toBe("27821234567");
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("082 123 4567", "27")).toBe("27821234567");
  });

  it("recusa números inválidos e tentativas de injetar outro endereço", () => {
    for (const bad of ["84abc4567", "javascript:alert(1)", "84 123", "+258 84 123 45678", "https://evil.example/841234567", "84123456789012345"]) {
      expect(() => normalizeWhatsAppNumber(bad), bad).toThrow();
      expect(buildWhatsAppLink({ phone: bad, text: "Olá" }).ok, bad).toBe(false);
    }
  });

  it("gera sempre https://wa.me/ com o texto codificado e limpo", () => {
    const link = buildWhatsAppLink({ phone: "84 123 4567", text: `Olá & bom dia?\nSou a Ana #1 😀 ${String.fromCharCode(0x200b)}`, countryCode: "258" });
    expect(link).toEqual({ ok: true, phone: "258841234567", url: `https://wa.me/258841234567?text=${encodeURIComponent("Olá & bom dia?\nSou a Ana #1 😀")}` });
    const noPhone = buildWhatsAppLink({ text: "Olá" });
    expect(noPhone.ok && noPhone.url).toBe("https://wa.me/?text=Ol%C3%A1");
    const long = buildWhatsAppLink({ phone: "841234567", text: "a".repeat(5000) });
    expect(long.ok && decodeURIComponent(long.url.split("text=")[1]!).length).toBe(WHATSAPP_MAX_TEXT);
    expect(buildWhatsAppLink({ phone: "841234567", text: "   " }).ok).toBe(false);
  });
});

describe("modelos de email e WhatsApp", () => {
  const vars: MessageVars = { ...EMPTY_VARS, name: "Ana Machava", phone: "+258 84 123 4567", email: "ana@exemplo.co.mz", position: "Técnica de Contabilidade", company: "Banco Exemplo", recruiterName: "Dra. Maria Sitoe", reference: "REF-15", source: "jornal Notícias", interviewDate: "3 de outubro" };

  it("6 categorias de email, com assunto e texto, só com os dados indicados", () => {
    expect(EMAIL_TEMPLATES.map((t) => t.label)).toEqual(["Candidatura", "Candidatura espontânea", "Envio de CV", "Acompanhamento", "Agradecimento", "Resposta a recrutador"]);
    for (const t of EMAIL_TEMPLATES) {
      const subject = t.subject(vars);
      const body = t.body(vars);
      expect(subject.length, t.id).toBeGreaterThan(5);
      expect(body, t.id).toContain("Exmo.(a) Sr.(a) Dra. Maria Sitoe,");
      expect(body.trim().endsWith("Ana Machava\n+258 84 123 4567\nana@exemplo.co.mz"), t.id).toBe(true);
      expect(isGrounded(findUngrounded(`${subject}\n${body}`, Object.values(vars))), t.id).toBe(true);
      const empty = `${t.subject(EMPTY_VARS)}\n${t.body(EMPTY_VARS)}`;
      expect(empty, t.id).not.toMatch(/undefined|null|\(\s*\)|Ref\.ª\s*\)|  /);
    }
    expect(EMAIL_TEMPLATES[0]!.subject(vars)).toBe("Candidatura à vaga de Técnica de Contabilidade (Ref.ª REF-15)");
  });

  it("mensagens de WhatsApp curtas e profissionais", () => {
    for (const t of WHATSAPP_TEMPLATES) {
      const m = t.message(vars, 9);
      expect(m.startsWith("Bom dia, Dra. Maria Sitoe."), t.id).toBe(true);
      expect(m.length, t.id).toBeLessThan(300);
      expect(m, t.id).not.toMatch(/undefined|null|  |\p{Extended_Pictographic}/u);
      expect(isGrounded(findUngrounded(m, Object.values(vars))), t.id).toBe(true);
      expect(t.message(EMPTY_VARS, 15).startsWith("Boa tarde."), t.id).toBe(true);
    }
    expect([greetingForHour(8), greetingForHour(14), greetingForHour(21)]).toEqual(["Bom dia", "Boa tarde", "Boa noite"]);
  });

  it("caracteres especiais nos dados ficam intactos", () => {
    const v = { ...vars, company: "Café & Cª «Lda»", position: "Técnico <júnior>" };
    expect(EMAIL_TEMPLATES[1]!.body(v)).toContain("Café & Cª «Lda»");
    expect(WHATSAPP_TEMPLATES[1]!.message(v, 9)).toContain("Técnico <júnior>");
  });
});

describe("IA nas cartas e mensagens: as mesmas regras do CV", () => {
  const facts = "Empresa: Banco Exemplo\nCargo: Técnica de Contabilidade";
  const req = aiRequestSchema.parse({ task: "rewrite", field: "letter_body", text: "Exmos. Senhores,\n\nvenho candidatar-me a vaga de tecnica de contabilidade.", context: { facts } });

  it("aceita dados que o utilizador indicou no formulário", () => {
    expect(checkResult(req, { suggestion: "Exmos. Senhores,\n\nVenho candidatar-me à vaga de Técnica de Contabilidade no Banco Exemplo.", notes: [] }).ok).toBe(true);
  });

  it("rejeita empresa, anos de experiência ou certificação inventados", () => {
    for (const bad of [
      "Exmos. Senhores,\n\nVenho candidatar-me à vaga, com experiência na Vodacom.",
      "Exmos. Senhores,\n\nVenho candidatar-me à vaga, com 10 anos de experiência.",
      "Exmos. Senhores,\n\nVenho candidatar-me à vaga. Sou certificada ACCA.",
    ]) {
      expect(checkResult(req, { suggestion: bad, notes: [] }).ok, bad).toBe(false);
    }
  });
});
