import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.co.mz`;
}

export async function register(page: Page, opts: { name?: string; email?: string; password?: string } = {}) {
  const email = opts.email ?? uniqueEmail();
  const password = opts.password ?? "Senha1234";
  await page.goto("/registar");
  await page.getByLabel("Nome completo").fill(opts.name ?? "Teste Automático");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel(/Li e aceito/).check();
  await page.getByRole("button", { name: "Criar conta grátis" }).click();
  await expect(page).toHaveURL(/\/meu-espaco/);
  return { email, password };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
}

/** Garante que a página não tem scroll horizontal (layout mobile correto). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
