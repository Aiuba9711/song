import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, login, register } from "./helpers";

test.describe("checkout com pagamento manual", () => {
  test("cliente paga por M-Pesa, informa a transação e só recebe acesso depois de o admin confirmar", async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await register(page, { name: "Compradora Teste" });

    // Produto → Comprar → escolher método
    await page.goto("/kits/kit-emprego-basico");
    await page.getByRole("link", { name: "Comprar" }).click();
    await expect(page).toHaveURL(/\/checkout\?produto=kit-emprego-basico/);
    // Preço vem da BD (o teste de admin pode tê-lo alterado).
    await expect(page.getByText(/^\d[\d ]* MT$/).first()).toBeVisible();
    await expect(page.getByRole("radio", { name: /M-Pesa/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /e-Mola/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /mKesh/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole("radio", { name: /M-Pesa/ }).check();
    await page.getByRole("button", { name: /Continuar para o pagamento/ }).click();

    // Instruções: número (da configuração), valor e referência
    await expect(page.getByRole("heading", { name: "Pagar com M-Pesa" })).toBeVisible();
    await expect(page.getByText("84 000 0001")).toBeVisible();
    const reference = (await page.getByTestId("order-reference").innerText()).trim();
    expect(reference).toMatch(/^EF-\d{8}-[A-Z0-9]{4}$/);
    await expectNoHorizontalScroll(page);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

    // O cliente informa a transação
    await page.getByLabel("Nome do titular da conta").fill("Compradora Teste");
    await page.getByLabel("Número usado para pagar").fill("84 555 6666");
    await page.getByLabel("Código / ID da transação").fill(`MP${Date.now()}`);
    await page.getByLabel(/Confirmo que fiz o pagamento/).check();
    await page.getByRole("button", { name: "Enviar dados do pagamento" }).click();
    await expect(page).toHaveURL(/\/checkout\/pending\?pedido=/);
    await expect(page.getByRole("heading", { name: "Pagamento em verificação" })).toBeVisible();

    // Sem confirmação não há acesso
    await page.goto("/meu-espaco/kits");
    await expect(page.getByText("Ainda não tem kits")).toBeVisible();
    await page.goto(`/checkout/success?pedido=${reference}`);
    await expect(page).toHaveURL(/\/checkout\/pending/);

    // Admin confirma em Pagamentos pendentes
    const adminPage = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    await login(adminPage, "admin@e2e.test", "Admin-e2e-2026");
    await adminPage.goto("/admin/pedidos/pendentes");
    const card = adminPage.getByRole("listitem").filter({ hasText: reference });
    await expect(card.getByText("84 555 6666")).toBeVisible();
    await card.getByRole("button", { name: "Confirmar pagamento" }).click();
    await adminPage.getByRole("dialog").getByRole("button", { name: "Sim, confirmar" }).click();
    await expect(adminPage.getByText(`${reference}: Pagamento confirmado`)).toBeVisible();
    await adminPage.goto("/admin/auditoria");
    await expect(adminPage.getByText("payment.confirm").first()).toBeVisible();
    await adminPage.close();

    // Cliente: sucesso e acesso ao kit
    await page.goto(`/checkout/pending?pedido=${reference}`);
    await expect(page).toHaveURL(/\/checkout\/success/);
    await expect(page.getByRole("heading", { name: "Pagamento confirmado!" })).toBeVisible();
    await expect(page.getByText("Obrigado pela compra.")).toBeVisible();
    await page.getByRole("link", { name: "Aceder ao meu kit" }).click();
    await expect(page.getByRole("heading", { name: "Kit Emprego Fácil MZ — Básico" })).toBeVisible();
  });

  test("admin pede novo comprovativo e depois rejeita; o cliente vê o motivo e não recebe acesso", async ({ page, browser }) => {
    await register(page);
    await page.goto("/checkout?produto=kit-emprego-profissional");
    await page.getByRole("radio", { name: /e-Mola/ }).check();
    await page.getByRole("button", { name: /Continuar para o pagamento/ }).click();
    const reference = (await page.getByTestId("order-reference").innerText()).trim();
    const fill = async (code: string) => {
      await page.getByLabel("Nome do titular da conta").fill("Cliente Rejeitado");
      await page.getByLabel("Número usado para pagar").fill("86 555 7777");
      await page.getByLabel("Código / ID da transação").fill(code);
      await page.getByLabel(/Confirmo que fiz o pagamento/).check();
      await page.getByRole("button", { name: "Enviar dados do pagamento" }).click();
      await expect(page).toHaveURL(/\/checkout\/pending/);
    };
    await fill(`EM${Date.now()}`);

    const admin = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
    await login(admin, "admin@e2e.test", "Admin-e2e-2026");
    await admin.goto("/admin/pedidos/pendentes");
    let card = admin.getByRole("listitem").filter({ hasText: reference });
    await card.getByLabel("Motivo / mensagem para o cliente").fill("Envie a captura do SMS, por favor.");
    await card.getByRole("button", { name: "Pedir novo comprovativo" }).click();
    await expect(admin.getByText(`${reference}: Pedido de novo comprovativo`)).toBeVisible();

    await page.goto(`/checkout?pedido=${reference}`);
    await expect(page.getByText("Envie a captura do SMS, por favor.")).toBeVisible();
    await fill(`EM${Date.now()}B`);

    await admin.goto("/admin/pedidos/pendentes");
    card = admin.getByRole("listitem").filter({ hasText: reference });
    await card.getByLabel("Motivo / mensagem para o cliente").fill("Transação não encontrada no extrato.");
    await card.getByRole("button", { name: "Rejeitar pagamento" }).click();
    await expect(admin.getByText(`${reference}: Pagamento rejeitado`)).toBeVisible();
    await admin.close();

    await page.goto(`/checkout/pending?pedido=${reference}`);
    await expect(page).toHaveURL(/\/checkout\/failed/);
    await expect(page.getByText("Transação não encontrada no extrato.")).toBeVisible();
    await page.goto("/meu-espaco/kits");
    await expect(page.getByText("Ainda não tem kits")).toBeVisible();
  });

  test("configurações de pagamento no admin", async ({ page, isMobile }) => {
    test.skip(isMobile, "Admin testado em desktop");
    await login(page, "admin@e2e.test", "Admin-e2e-2026");
    await page.goto("/admin/definicoes/pagamentos");
    await expect(page.getByRole("textbox", { name: "Número M-Pesa" })).toHaveValue("84 000 0001");
    await expect(page.getByLabel("Pagamento por cartão (desativado)")).toBeDisabled();
    await page.getByRole("textbox", { name: "Número e-Mola" }).fill("84 000 0009");
    await page.getByRole("button", { name: "Guardar definições de pagamento" }).click();
    await expect(page.getByText("Números e-Mola começam por 86 ou 87.")).toBeVisible();
  });
});
