import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { expectNoHorizontalScroll, login, register } from "./helpers";

test.describe("jornada do utilizador", () => {
  test("criar conta → criar CV em 10 etapas → baixar PDF e Word → duplicar → eliminar", async ({ page }) => {
    const { email, password } = await register(page, { name: "Lúcia Mondlane" });
    await expect(page.getByText("Conta criada com sucesso!")).toBeVisible();

    // Escolher modelo e começar
    await page.goto("/meu-espaco/cvs/novo?modelo=informatica");
    await expect(page.getByRole("radio", { name: /Informática/ })).toBeChecked();
    await page.getByLabel(/Nome do CV/).fill("CV Suporte Informático");
    await page.getByRole("button", { name: "Começar a preencher" }).click();
    await expect(page).toHaveURL(/\/editar/);

    // 1. Dados pessoais (pré-preenchidos com os dados da conta)
    await expect(page.getByRole("heading", { name: "Dados pessoais" })).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toHaveValue("Lúcia Mondlane");
    await page.getByLabel("Profissão ou cargo pretendido").fill("Técnica de Suporte Informático");
    await page.getByLabel("Telefone").fill("+258 84 111 2222");
    await page.getByLabel("Localização").fill("Beira, Moçambique");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 2. Resumo
    await expect(page.getByRole("heading", { name: "Resumo profissional" })).toBeVisible();
    await page.getByLabel("Perfil profissional").fill("Técnica de suporte com 3 anos de experiência em manutenção de computadores e redes.");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 3. Experiência — validação antes de aceitar
    await expect(page.getByRole("heading", { name: "Experiência", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar experiência" }).click();
    await page.getByLabel("Cargo").fill("Técnica de Suporte");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();
    await expect(page.getByText("Indique a empresa/organização.")).toBeVisible();
    await page.getByLabel("Empresa / organização").fill("Empresa XYZ, Lda.");
    await page.getByLabel("Início").fill("Jan 2022");
    await page.getByLabel("Trabalho aqui atualmente").check();
    await page.getByLabel("Responsabilidades e resultados").fill("- Instalação de software\n- Apoio aos utilizadores");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 4. Formação
    await expect(page.getByRole("heading", { name: "Formação", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar formação" }).click();
    await page.getByLabel("Curso / grau").fill("Técnico Médio de Informática");
    await page.getByLabel("Instituição").fill("Instituto Industrial da Beira");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 5. Competências
    await page.getByLabel("Competência").fill("Redes de computadores");
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByRole("list", { name: "Competências adicionadas" })).toContainText("Redes de computadores");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 6. Idiomas
    await page.getByRole("button", { name: "Adicionar idioma" }).click();
    await page.getByRole("textbox", { name: "Idioma" }).fill("Português");
    await page.getByLabel("Nível").selectOption("Nativo");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 7, 8 — saltar (opcionais)
    await expect(page.getByRole("heading", { name: "Cursos e certificações" })).toBeVisible();
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();
    await expect(page.getByRole("heading", { name: "Referências" })).toBeVisible();
    await page.getByLabel(/Referências disponíveis mediante solicitação/).check();
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // 9. Trocar de modelo
    await expect(page.getByRole("heading", { name: "Escolha do modelo" })).toBeVisible();
    await page.getByRole("radio", { name: /Executivo/ }).first().check();
    await page.getByRole("button", { name: "Pré-visualizar", exact: true }).click();

    // 10. Pré-visualização e downloads
    await expect(page.getByRole("heading", { name: "Pré-visualização", exact: true })).toBeVisible();
    await expect(page.getByText("Revise todas as informações antes de enviar a candidatura.")).toBeVisible();
    await expectNoHorizontalScroll(page);

    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar PDF" }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toBe("CV-Lucia-Mondlane.pdf");
    const pdfBytes = await readFile((await pdf.path())!);
    expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");

    const docxDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar Word" }).click();
    const docx = await docxDownload;
    expect(docx.suggestedFilename()).toBe("CV-Lucia-Mondlane.docx");

    // Lista, duplicar e eliminar
    await page.goto("/meu-espaco/cvs");
    await expect(page.getByRole("heading", { name: "CV Suporte Informático" })).toBeVisible();
    await page.getByRole("button", { name: "Duplicar" }).first().click();
    await expect(page.getByText("CV duplicado.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "CV Suporte Informático (cópia)" })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("CV eliminado.")).toBeVisible();
    await expect(page.locator("h2", { hasText: "CV Suporte Informático" })).toHaveCount(1);

    // Downloads registados
    await page.goto("/meu-espaco/downloads");
    await expect(page.getByText("CV-Lucia-Mondlane.pdf")).toBeVisible();

    // Sair e voltar a entrar
    await page.goto("/meu-espaco/perfil");
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL("/");
    await login(page, email, password);
    await expect(page).toHaveURL(/\/meu-espaco/);
  });

  test("obter o modelo gratuito e descarregar os ficheiros", async ({ page }) => {
    await page.goto("/kits/modelo-gratuito");
    await page.getByRole("button", { name: "Obter grátis" }).click();
    await expect(page).toHaveURL(/\/registar\?next=/);
    await page.getByLabel("Nome completo").fill("Kit Gratuito");
    await page.getByLabel("Email", { exact: true }).fill(`kit-${Date.now()}@teste.co.mz`);
    await page.getByLabel("Senha", { exact: true }).fill("Senha1234");
    await page.getByLabel(/Li e aceito/).check();
    await page.getByRole("button", { name: "Criar conta grátis" }).click();
    await expect(page).toHaveURL(/\/kits\/modelo-gratuito/);
    await page.getByRole("button", { name: "Obter grátis" }).click();
    await expect(page.getByText("Pronto! O seu kit está disponível.")).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Descarregar" }).first().click();
    expect((await download).suggestedFilename()).toMatch(/\.docx$/);
    await page.goto("/meu-espaco/compras");
    await expect(page.getByText("Pago")).toBeVisible();
  });

  test("um utilizador não acede ao CV de outro nem ao admin", async ({ page, browser }) => {
    await register(page);
    await page.goto("/meu-espaco/cvs/novo");
    await page.getByRole("button", { name: "Começar a preencher" }).click();
    await expect(page).toHaveURL(/\/editar/);
    const cvUrl = page.url().replace("/editar", "");
    const cvId = cvUrl.split("/").pop()!;

    const other = await browser.newPage();
    await register(other);
    expect((await other.goto(cvUrl))!.status()).toBe(404);
    expect((await other.request.get(`/api/cv/${cvId}/pdf`)).status()).toBe(404);
    expect((await other.goto("/admin"))!.status()).toBe(404);
    await other.close();
  });
});
