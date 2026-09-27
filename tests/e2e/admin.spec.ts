import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("painel administrativo", () => {
  test.skip(({ isMobile }) => isMobile, "Fluxo admin testado em desktop");

  test("admin altera preço e o site mostra o novo valor; configura WhatsApp", async ({ page }) => {
    await login(page, "admin@e2e.test", "Admin-e2e-2026");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("CVs criados")).toBeVisible();

    await page.getByRole("link", { name: "Produtos" }).click();
    await page.getByRole("link", { name: "Kit Emprego Fácil MZ — Básico" }).click();
    await page.getByRole("textbox", { name: "Preço", exact: true }).fill("249");
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Produto guardado.")).toBeVisible();

    await page.goto("/kits");
    await expect(page.getByText("249 MT")).toBeVisible();

    await page.goto("/admin/definicoes");
    await page.getByLabel(/Número de WhatsApp/).fill("258840000001");
    await page.getByRole("button", { name: "Guardar definições" }).click();
    await expect(page.getByText("Definições guardadas.")).toBeVisible();
    await page.goto("/contactos");
    await expect(page.getByRole("link", { name: "Falar connosco no WhatsApp" }).first()).toHaveAttribute("href", /wa\.me\/258840000001/);

    await page.goto("/admin/auditoria");
    await expect(page.getByText("product.update")).toBeVisible();
  });

  test("modelos de CV: duplicar, editar design e preço, ativar e ver na galeria", async ({ page }) => {
    await login(page, "admin@e2e.test", "Admin-e2e-2026");
    await page.goto("/admin/modelos");
    expect(await page.getByRole("link", { name: "Editar" }).count()).toBeGreaterThanOrEqual(36);
    await page.getByRole("button", { name: "Duplicar Direção" }).click();
    await expect(page.getByText("Cópia criada (inativa).")).toBeVisible();

    await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Direção Azul");
    await page.getByRole("textbox", { name: "Slug" }).fill("direcao-azul");
    await page.getByLabel("Preço do CV (MT)").fill("249");
    await page.getByLabel("Estrutura").selectOption("sidebar-left");
    await expect(page.getByText("Não compatível com ATS")).toBeVisible();
    await page.getByLabel("Estrutura").selectOption("single");
    await page.getByLabel("Cabeçalho").selectOption("left");
    await page.getByLabel("Títulos das secções").selectOption("rule");
    await page.getByLabel("Experiência e formação").selectOption("classic");
    await page.getByRole("combobox", { name: "Competências", exact: true }).selectOption("list");
    await page.getByLabel(/Competências e idiomas lado a lado/).uncheck();
    await expect(page.getByText("Compatível com ATS", { exact: true })).toBeVisible();
    await page.getByLabel("Ativo (visível na galeria)").check();
    await page.getByRole("button", { name: "Guardar alterações" }).click();
    await expect(page.getByText("Modelo guardado.")).toBeVisible();

    await page.goto("/cv-modelos/direcao-azul");
    await expect(page.getByRole("heading", { name: "Modelo Direção Azul" })).toBeVisible();
    await expect(page.getByText("249 MT")).toBeVisible();
    await expect(page.getByText("Compatível com ATS").first()).toBeVisible();

    await page.goto("/admin/auditoria");
    await expect(page.getByText("template.duplicate")).toBeVisible();
    await expect(page.getByText("template.update").first()).toBeVisible();
  });
});
