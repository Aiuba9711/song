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

    await page.goto("/admin/modelos");
    await expect(page.getByRole("link", { name: "Executivo" })).toBeVisible();
    await page.goto("/admin/auditoria");
    await expect(page.getByText("product.update")).toBeVisible();
  });
});
