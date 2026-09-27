import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { expectNoHorizontalScroll, register } from "./helpers";

async function expectAccessible(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // O documento da carta é conteúdo do utilizador e fica de fora.
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude("[data-letter-document]").analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("documentos de candidatura", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("carta: gerar → editar → copiar → PDF e Word (com caracteres especiais e texto longo)", async ({ page, isMobile }) => {
    await register(page, { name: "Ana Maria Machava" });
    await page.goto("/meu-espaco/cartas");
    await page.getByRole("button", { name: "Nova carta de candidatura" }).click();
    await expect(page).toHaveURL(/\/meu-espaco\/cartas\/.+\/editar/);
    const preview = page.getByRole("region", { name: "Pré-visualização da carta" });

    // Dados (com caracteres especiais)
    await page.getByLabel("Empresa").fill("Café & Cª «Moçambique», Lda.");
    await page.getByLabel("Cargo").fill("Técnica de Contabilidade");
    await page.getByLabel("Cidade").fill("Maputo");
    await page.getByLabel("Formação").fill("Licenciatura em Contabilidade (UEM)");
    await page.getByLabel("Experiência").fill("- 4 anos como assistente de contabilidade\n- Reconciliações bancárias");
    await page.getByLabel("Competências").fill("Primavera; Excel; organização");
    await page.getByRole("textbox", { name: /^Motivação/ }).fill("quero contribuir para relatórios fiáveis — com “rigor” 😀");
    await page.getByRole("button", { name: "Gerar carta" }).click();

    const body = page.getByLabel("Carta", { exact: true });
    await expect(body).toHaveValue(/candidatura à vaga de Técnica de Contabilidade na vossa organização, Café & Cª «Moçambique», Lda\./);
    await expect(page.getByLabel("Assunto")).toHaveValue("Candidatura à vaga de Técnica de Contabilidade");
    await expect(preview).toContainText("Assunto: Candidatura à vaga de Técnica de Contabilidade");
    await expect(preview).toContainText("Primavera, Excel e organização");
    await expectAccessible(page);

    // Mobile: formulário primeiro, pré-visualização por baixo; desktop: lado a lado
    const formBox = (await page.getByRole("heading", { name: "1. Dados da carta" }).boundingBox())!;
    const previewBox = (await preview.boundingBox())!;
    if (isMobile) expect(previewBox.y).toBeGreaterThan(formBox.y);
    else expect(previewBox.x).toBeGreaterThan(formBox.x + formBox.width / 2);
    await expectNoHorizontalScroll(page);

    // Editar (texto longo) → pré-visualização atualiza
    const extra = "Tenho experiência em reconciliações bancárias e no fecho mensal de contas. ".repeat(20).trim();
    const edited = (await body.inputValue()).replace("Com os melhores cumprimentos,", `${extra}\n\nCom os melhores cumprimentos,`);
    await body.fill(edited);
    await expect(preview).toContainText("no fecho mensal de contas.");

    // Gerar de novo pede confirmação (não apaga o texto editado sem perguntar)
    await page.getByRole("button", { name: "Gerar carta" }).click();
    await page.getByRole("dialog", { name: "Substituir o texto da carta?" }).getByRole("button", { name: "Cancelar" }).click();
    await expect(body).toHaveValue(edited);

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Guardado", { exact: true })).toBeVisible();

    // Copiar
    await page.getByRole("button", { name: "Copiar carta" }).click();
    await expect(page.getByRole("button", { name: "Copiado!" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Assunto: Candidatura à vaga de Técnica de Contabilidade");
    expect(copied).toContain("Café & Cª «Moçambique», Lda.");
    expect(copied).toContain("😀");
    expect(copied.trim().endsWith("Ana Maria Machava")).toBe(true);

    // Download (carta gratuita por omissão)
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar PDF" }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toBe("Carta-de-candidatura-Ana-Maria-Machava.pdf");
    expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe("%PDF-");
    const docxDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar Word" }).click();
    expect((await docxDownload).suggestedFilename()).toBe("Carta-de-candidatura-Ana-Maria-Machava.docx");

    // Melhorar com IA (modo de demonstração) — só altera depois de «Aplicar sugestão»
    const withTypo = edited.replace("Com os melhores cumprimentos,", "nao desisto facilmente\n\nCom os melhores cumprimentos,");
    await body.fill(withTypo);
    await page.getByRole("button", { name: "Melhorar com IA" }).click();
    await page.getByRole("button", { name: "Gerar sugestão" }).click();
    await page.getByRole("dialog", { name: "Usar o assistente de IA?" }).getByRole("button", { name: "Aceito e continuar" }).click();
    await expect(page.getByTestId("ai-suggestion")).toBeVisible();
    await expect(page.getByTestId("ai-suggestion")).toContainText("Não desisto facilmente.");
    await expect(body).toHaveValue(withTypo);
    await page.getByRole("button", { name: "Aplicar sugestão" }).click();
    await expect(body).toHaveValue(/Não desisto facilmente\.\n\nCom os melhores cumprimentos,$/);
    await expect(body).toHaveValue(/Café & Cª «Moçambique», Lda\./);

    // Lista
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await page.goto("/meu-espaco/cartas");
    await expect(page.getByRole("heading", { name: "Carta de candidatura", level: 3 })).toBeVisible();
    await expect(page.getByRole("link", { name: "PDF" })).toHaveAttribute("href", /\/api\/cartas\/.+\/pdf/);
  });

  test("email: escolher categoria, copiar, editar e repor", async ({ page }) => {
    await register(page, { name: "Lúcia Mondlane" });
    await page.goto("/meu-espaco/mensagens");
    const types = page.getByRole("radiogroup", { name: "Tipo de email" });
    for (const label of ["Candidatura", "Candidatura espontânea", "Envio de CV", "Acompanhamento", "Agradecimento", "Resposta a recrutador"]) {
      await expect(types.getByRole("radio", { name: label, exact: true })).toBeVisible();
    }
    await types.getByRole("radio", { name: "Acompanhamento" }).click();
    await page.getByLabel("Cargo / vaga").fill("Técnica de Suporte");
    await page.getByLabel("Referência da vaga").fill("REF-2026/15");
    await expect(page.getByLabel("Assunto")).toHaveValue("Acompanhamento da candidatura — Técnica de Suporte (Ref.ª REF-2026/15)");
    await expectAccessible(page);
    await page.getByRole("button", { name: "Copiar email" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.startsWith("Assunto: Acompanhamento da candidatura — Técnica de Suporte (Ref.ª REF-2026/15)\n\nExmos. Senhores,")).toBe(true);
    expect(copied).toContain("Lúcia Mondlane");

    const message = page.getByRole("textbox", { name: "Mensagem", exact: true });
    await message.fill("Texto personalizado com «aspas» & acentos.");
    await page.getByRole("button", { name: "Repor texto do modelo" }).click();
    await expect(message).toHaveValue(/No seguimento da candidatura/);
    await expectNoHorizontalScroll(page);
  });

  test("WhatsApp: mensagem curta, copiar e link seguro para abrir", async ({ page }) => {
    await register(page, { name: "Lúcia Mondlane" });
    await page.goto("/meu-espaco/mensagens?tipo=whatsapp");
    await page.getByRole("radiogroup", { name: "Tipo de mensagem" }).getByRole("radio", { name: "Enviar CV" }).click();
    await page.getByLabel("Cargo / vaga").fill("Técnica de Suporte");
    const message = page.getByRole("textbox", { name: "Mensagem", exact: true });
    await expect(message).toHaveValue(/O meu nome é Lúcia Mondlane\. Envio o meu CV para a vaga de Técnica de Suporte\./);

    await page.getByRole("button", { name: "Copiar mensagem" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Envio o meu CV para a vaga de Técnica de Suporte.");

    // Sem número: abre o WhatsApp para escolher o contacto
    const open = page.getByRole("link", { name: "Abrir WhatsApp" });
    await expect(open).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    await expect(open).toHaveAttribute("target", "_blank");
    await expect(open).toHaveAttribute("rel", "noopener noreferrer");
    await expectAccessible(page);

    // Número nacional → indicativo configurado (258)
    await page.getByLabel(/Número de WhatsApp do recrutador/).fill("84 123 4567");
    await expect(open).toHaveAttribute("href", /^https:\/\/wa\.me\/258841234567\?text=.*Envio%20o%20meu%20CV/);

    // Número inválido / tentativa de injeção: sem link
    await page.getByLabel(/Número de WhatsApp do recrutador/).fill("javascript:alert(1)");
    await expect(page.getByText(/O número só pode ter algarismos/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir WhatsApp" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir WhatsApp" })).toBeDisabled();
    await expectNoHorizontalScroll(page);
  });
});
