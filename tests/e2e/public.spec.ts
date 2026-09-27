import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

test.describe("páginas públicas", () => {
  test("landing: hero, CTAs e secções principais", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cria uma candidatura profissional");
    await expect(page.getByRole("link", { name: "Criar meu CV" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver Kits", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /perdem-se por detalhes/ })).toBeVisible();
    await expect(page.getByText("Kit Completo — 399 MT")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("não promete emprego garantido", async ({ page }) => {
    await page.goto("/");
    const text = (await page.locator("#conteudo").innerText()).toLowerCase();
    expect(text).not.toMatch(/emprego garantido|garantimos (o )?emprego|conseguirás emprego/);
  });

  test("catálogo de modelos e kits com preços da base de dados", async ({ page }) => {
    await page.goto("/cv-modelos");
    await expect(page.getByRole("heading", { name: "Modelos de CV", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Usar este modelo" })).toHaveCount(10);
    await page.goto("/kits");
    // Preços vêm da base de dados (o teste de admin pode alterar o kit Básico).
    await expect(page.getByText("399 MT").first()).toBeVisible();
    await page.getByRole("link", { name: "Kit Emprego Fácil MZ — Profissional" }).click();
    await expect(page.getByRole("heading", { name: "O que está incluído" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Comprar" })).toHaveAttribute("href", "/checkout?produto=kit-emprego-profissional");
    await expectNoHorizontalScroll(page);
  });

  test("SEO e PWA: metadados, manifest, robots, sitemap e service worker", async ({ page, request }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Emprego Fácil MZ/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og\.png/);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toBe("Emprego Fácil MZ");
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /meu-espaco");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/kits/kit-emprego-profissional");
    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state ?? null), { timeout: 15_000 }).toBe("activated");
  });

  test("cabeçalhos de segurança", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  for (const path of ["/", "/cv-modelos", "/kits", "/kits/modelo-gratuito", "/entrar", "/registar", "/contactos", "/privacidade"]) {
    test(`acessibilidade (axe) ${path}`, async ({ page }) => {
      // Sem animações: o contraste é medido no estado final (a app respeita prefers-reduced-motion).
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude('[aria-hidden="true"]').analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }

  test("áreas privadas redirecionam para o login", async ({ page }) => {
    await page.goto("/meu-espaco/cvs");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fmeu-espaco%2Fcvs/);
  });
});
