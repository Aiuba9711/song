import { expect, test } from "@playwright/test";
import { register } from "./helpers";

const WARNING = "Revise o conteúdo antes de utilizar. A IA não deve substituir informações verdadeiras sobre a sua experiência.";

test.describe("assistente de IA no editor (modo de demonstração)", () => {
  test("melhorar texto só altera o CV depois de «Aplicar sugestão»; vaga; competências", async ({ page }) => {
    await register(page, { name: "Lúcia Mondlane" });
    await page.goto("/meu-espaco/cvs/novo?modelo=essencial");
    await page.getByRole("button", { name: "Começar com este modelo" }).click();
    await expect(page).toHaveURL(/\/editar/);
    const preview = page.getByRole("region", { name: "Pré-visualização do CV", exact: true });

    // Descrição da vaga (opcional)
    await page.getByText("Adaptar o CV a uma vaga").click();
    await page.getByLabel("Descrição da vaga").fill("Cargo: Técnico de Suporte Informático\nRequisitos:\n- Experiência em redes\n- Instalação de software e Excel");
    await expect(page.getByLabel("Descrição da vaga")).toHaveAttribute("placeholder", "Cole aqui a descrição da vaga.");
    // 1.º uso: pede consentimento antes de enviar texto; sem consentimento nada é enviado
    await page.getByRole("button", { name: "Analisar vaga com IA" }).click();
    const consent = page.getByRole("dialog", { name: "Usar o assistente de IA?" });
    await expect(consent).toContainText("Não guardamos o texto enviado nem as sugestões.");
    await consent.getByRole("button", { name: "Agora não" }).click();
    await expect(page.getByText("Sem o seu consentimento, o texto não é enviado ao assistente de IA.")).toBeVisible();
    await page.getByRole("button", { name: "Analisar vaga com IA" }).click();
    await consent.getByRole("button", { name: "Aceito e continuar" }).click();
    await expect(page.getByText("Cargo: Técnico de Suporte Informático", { exact: true })).toBeVisible();
    await expect(page.getByText("Requisitos", { exact: true })).toBeVisible();
    await expect(page.getByText("Experiência em redes", { exact: true })).toBeVisible();

    // Resumo: sugestão → campo inalterado → Aplicar sugestão
    await page.getByRole("button", { name: "Resumo", exact: true }).click();
    const original = "tecnica de suporte com experiencia em redes , nao desisto facilmente";
    await page.getByLabel("Perfil profissional").fill(original);
    await page.getByRole("button", { name: "Melhorar com IA" }).first().click();
    await expect(page.getByText(WARNING).first()).toBeVisible();
    await page.getByRole("button", { name: "Gerar sugestão" }).click();
    const suggestion = "Técnica de suporte com experiência em redes, não desisto facilmente.";
    await expect(page.getByTestId("ai-suggestion")).toHaveText(suggestion);
    await expect(page.getByText("Modo de demonstração").first()).toBeVisible();
    // Nada muda sem aprovação
    await expect(page.getByLabel("Perfil profissional")).toHaveValue(original);
    await expect(preview).not.toContainText(suggestion);
    await page.getByRole("button", { name: "Aplicar sugestão" }).click();
    await expect(page.getByLabel("Perfil profissional")).toHaveValue(suggestion);
    await expect(preview).toContainText(suggestion);

    // Objetivo vazio: a IA não cria conteúdo
    await page.getByRole("button", { name: "Melhorar com IA" }).nth(1).click();
    await page.getByRole("button", { name: "Gerar sugestão" }).click();
    await expect(page.getByText(/Escreva primeiro o texto/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Objetivo profissional/ })).toHaveValue("");

    // Descrição de funções
    await page.getByRole("button", { name: "Experiência", exact: true }).click();
    await page.getByRole("button", { name: "Adicionar experiência" }).click();
    await page.getByLabel("Cargo").fill("Técnica de Suporte");
    await page.getByLabel("Empresa / organização").fill("Empresa XYZ, Lda.");
    await page.getByLabel("Responsabilidades e resultados").fill("instalacao de software; apoio aos utilizadores");
    await page.getByRole("button", { name: "Melhorar com IA" }).click();
    await page.getByRole("button", { name: "Gerar sugestão" }).click();
    await expect(page.getByTestId("ai-suggestion")).toBeVisible();
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByLabel("Responsabilidades e resultados")).toHaveValue("instalacao de software; apoio aos utilizadores");
    await page.getByRole("button", { name: "Gerar sugestão" }).click();
    await page.getByRole("button", { name: "Aplicar sugestão" }).click();
    await expect(page.getByLabel("Responsabilidades e resultados")).toHaveValue("- Instalação de software\n- Apoio aos utilizadores");

    // Competências sugeridas com prova no texto
    await page.getByRole("button", { name: "Competências", exact: true }).click();
    await page.getByRole("button", { name: "Sugerir competências com IA" }).click();
    await page.getByRole("button", { name: "Gerar sugestões" }).click();
    await expect(page.getByText("Com base em: «Instalação de software»")).toBeVisible();
    await expect(page.getByRole("list", { name: "Competências adicionadas" })).toHaveCount(0);
    await page.getByRole("button", { name: "Aplicar sugestão" }).click();
    await expect(page.getByRole("list", { name: "Competências adicionadas" })).toContainText("Instalação de software");

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText(/Guardado às/)).toBeVisible();

    // O consentimento pode ser retirado no perfil
    await page.goto("/meu-espaco/perfil");
    await page.getByRole("button", { name: "Retirar consentimento" }).click();
    await expect(page.getByText(/Consentimento retirado/)).toBeVisible();
  });
});
