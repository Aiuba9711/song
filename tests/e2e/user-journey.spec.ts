import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { expectNoHorizontalScroll, login, register, uniqueEmail } from "./helpers";

test.describe("jornada do utilizador", () => {
  test("Criar meu CV → escolher modelo → editor com pré-visualização → comprar 199 MT → PDF e Word", async ({ page, browser, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Visitante: «Criar meu CV» abre a galeria de modelos
    await page.goto("/");
    await page.getByRole("link", { name: "Criar meu CV" }).first().click();
    await expect(page).toHaveURL(/\/cv-modelos$/);
    await page.getByRole("button", { name: "Informática", exact: true }).click();
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Informática", exact: true }) });
    await card.getByRole("button", { name: "Usar este modelo" }).click();

    // Sem conta: registar e voltar à escolha do modelo
    await expect(page).toHaveURL(/\/registar\?next=/);
    const email = uniqueEmail();
    const password = "Senha1234";
    await page.getByLabel("Nome completo").fill("Lúcia Mondlane");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByLabel(/Li e aceito/).check();
    await page.getByRole("button", { name: "Criar conta grátis" }).click();
    await expect(page).toHaveURL(/\/meu-espaco\/cvs\/novo\?modelo=informatica/);
    await expect(page.getByText("Modelo escolhido")).toBeVisible();
    await page.getByRole("button", { name: "Começar com este modelo" }).click();
    await expect(page).toHaveURL(/\/editar/);
    const cvId = page.url().split("/cvs/")[1]!.split("/")[0]!;

    // Editor: formulário + pré-visualização em tempo real (telemóvel: formulário ↓ pré-visualização)
    const preview = page.getByRole("region", { name: "Pré-visualização do CV", exact: true });
    await expect(page.getByRole("heading", { name: "Dados pessoais" })).toBeVisible();
    await expect(page.getByText("Modelo Informática")).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toHaveValue("Lúcia Mondlane");
    await page.getByLabel("Profissão ou cargo pretendido").fill("Técnica de Suporte Informático");
    await expect(preview).toContainText("Técnica de Suporte Informático");
    await page.getByLabel("Telefone").fill("+258 84 111 2222");
    await page.getByLabel("Localização").fill("Beira, Moçambique");
    const formBox = (await page.getByRole("heading", { name: "Dados pessoais" }).boundingBox())!;
    const previewBox = (await preview.boundingBox())!;
    if (isMobile) expect(previewBox.y).toBeGreaterThan(formBox.y);
    else expect(previewBox.x).toBeGreaterThan(formBox.x + formBox.width / 2);
    await expectNoHorizontalScroll(page);
    // Acessibilidade do editor (o documento do CV em si é conteúdo do utilizador e fica de fora)
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude("[data-cv-document]").analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Fotografia: enviar, enquadrar e escolher a posição
    await expect(page.getByRole("heading", { name: "Fotografia" })).toBeVisible();
    const jpeg = await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#8aa4c8" } }).jpeg().toBuffer();
    await page.locator("#photo-input").setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: jpeg });
    await expect(page.getByLabel("Zoom")).toBeVisible();
    await page.getByLabel("Zoom").fill("1.5");
    await page.getByText("Direita", { exact: true }).click();
    await expect(preview.getByRole("img", { name: "Fotografia do candidato" })).toBeVisible();
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Resumo
    await expect(page.getByRole("heading", { name: "Resumo profissional" })).toBeVisible();
    await page.getByLabel("Perfil profissional").fill("Técnica de suporte com 3 anos de experiência em manutenção de computadores e redes.");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Experiência — validação antes de aceitar; adicionar e remover
    await expect(page.getByRole("heading", { name: "Experiência profissional" })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar experiência" }).click();
    await page.getByLabel("Cargo").fill("Técnica de Suporte");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();
    await expect(page.getByText("Indique a empresa/organização.")).toBeVisible();
    await page.getByLabel("Empresa / organização").fill("Empresa XYZ, Lda.");
    await page.getByLabel("Início").fill("Jan 2022");
    await page.getByLabel("Trabalho aqui atualmente").check();
    await page.getByLabel("Responsabilidades e resultados").fill("- Instalação de software\n- Apoio aos utilizadores");
    await expect(preview).toContainText("Empresa XYZ, Lda.");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Formação
    await expect(page.getByRole("heading", { name: "Formação académica" })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar formação" }).click();
    await page.getByLabel("Curso / grau").fill("Técnico Médio de Informática");
    await page.getByLabel("Instituição").fill("Instituto Industrial da Beira");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Competências
    await page.getByLabel("Competência").fill("Redes de computadores");
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByRole("list", { name: "Competências adicionadas" })).toContainText("Redes de computadores");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Idiomas
    await page.getByRole("button", { name: "Adicionar idioma" }).click();
    await page.getByRole("textbox", { name: "Idioma" }).fill("Português");
    await page.getByLabel("Nível").selectOption("Nativo");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Cursos (opcional) e Certificações
    await expect(page.getByRole("heading", { name: "Cursos" })).toBeVisible();
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();
    await expect(page.getByRole("heading", { name: "Certificações" })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar certificação" }).click();
    await page.getByRole("textbox", { name: "Certificação", exact: true }).fill("CompTIA A+");
    await expect(preview).toContainText("CompTIA A+");
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();

    // Referências e Mais
    await expect(page.getByRole("heading", { name: "Referências" })).toBeVisible();
    await page.getByLabel(/Referências disponíveis mediante solicitação/).check();
    await page.getByRole("button", { name: /Guardar e continuar/ }).click();
    await expect(page.getByRole("heading", { name: "Mais secções" })).toBeVisible();

    // Trocar de modelo antes de finalizar (os dados mantêm-se)
    await page.getByRole("button", { name: "Trocar modelo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Modelo Executivo —/ }).click();
    await expect(page.getByText("Modelo Executivo")).toBeVisible();
    await expect(preview).toContainText("CompTIA A+");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText(/Guardado às/)).toBeVisible();

    // Pré-visualizar: com marca d'água antes do pagamento
    await page.getByRole("button", { name: "Pré-visualizar", exact: true }).click();
    const full = page.getByRole("dialog", { name: "Pré-visualização do CV" });
    await expect(full).toContainText("PRÉ-VISUALIZAÇÃO · Emprego Fácil MZ");
    await full.getByRole("button", { name: "Fechar pré-visualização" }).click();
    expect((await page.request.get(`/api/cv/${cvId}/pdf`)).status()).toBe(402);

    // Comprar CV — pagamento manual confirmado pelo administrador
    await page.getByRole("button", { name: /Comprar CV — \d+ MT/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/checkout\\?cv=${cvId}`));
    await page.getByRole("radio", { name: /M-Pesa/ }).check();
    await page.getByRole("button", { name: /Continuar para o pagamento/ }).click();
    const reference = (await page.getByTestId("order-reference").innerText()).trim();
    await page.getByLabel("Nome do titular da conta").fill("Lúcia Mondlane");
    await page.getByLabel("Número usado para pagar").fill("84 111 2222");
    await page.getByLabel("Código / ID da transação").fill(`CV${Date.now()}`);
    await page.getByLabel(/Confirmo que fiz o pagamento/).check();
    await page.getByRole("button", { name: "Enviar dados do pagamento" }).click();
    await expect(page).toHaveURL(/\/checkout\/pending/);
    expect((await page.request.get(`/api/cv/${cvId}/pdf`)).status()).toBe(402);

    const admin = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    await login(admin, "admin@e2e.test", "Admin-e2e-2026");
    await admin.goto("/admin/pedidos/pendentes");
    await admin.getByRole("listitem").filter({ hasText: reference }).getByRole("button", { name: "Confirmar pagamento" }).click();
    await admin.getByRole("dialog").getByRole("button", { name: "Sim, confirmar" }).click();
    await expect(admin.getByText(`${reference}: Pagamento confirmado`)).toBeVisible();
    await admin.close();

    // Depois da compra: PDF sem marca d'água e Word; modelo fixo
    await page.goto(`/meu-espaco/cvs/${cvId}/editar`);
    await expect(page.getByText("Modelo fixo (CV comprado)")).toBeVisible();
    await expect(page.getByText("PRÉ-VISUALIZAÇÃO · Emprego Fácil MZ")).toHaveCount(0);
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar PDF" }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toBe("CV-Lucia-Mondlane.pdf");
    const pdfBytes = await readFile((await pdf.path())!);
    expect(pdfBytes.subarray(0, 5).toString()).toBe("%PDF-");
    const docxDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar Word" }).click();
    expect((await docxDownload).suggestedFilename()).toBe("CV-Lucia-Mondlane.docx");

    // Lista: duplicar (novo CV por comprar) e eliminar
    await page.goto("/meu-espaco/cvs");
    await expect(page.getByText(/Comprado/).first()).toBeVisible();
    await page.getByRole("button", { name: "Duplicar" }).first().click();
    await expect(page.getByText("CV duplicado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar CV em preparação" })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("CV eliminado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar novo CV" })).toBeVisible();

    // Downloads registados; sair e voltar a entrar
    await page.goto("/meu-espaco/downloads");
    await expect(page.getByText("CV-Lucia-Mondlane.pdf")).toBeVisible();
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
    await page.goto("/meu-espaco/cvs/novo?modelo=essencial");
    await page.getByRole("button", { name: "Começar com este modelo" }).click();
    await expect(page).toHaveURL(/\/editar/);
    const cvUrl = page.url().replace("/editar", "");
    const cvId = cvUrl.split("/").pop()!;

    const other = await browser.newPage();
    await register(other);
    expect((await other.goto(cvUrl))!.status()).toBe(404);
    expect((await other.request.get(`/api/cv/${cvId}/pdf`)).status()).toBe(404);
    expect((await other.request.get(`/api/cv/${cvId}/preview`)).status()).toBe(404);
    expect((await other.request.get(`/api/cv/${cvId}/photo?raw=1`)).status()).toBe(404);
    expect((await other.goto("/admin"))!.status()).toBe(404);
    await other.close();
  });
});
