import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { expectNoHorizontalScroll, login, register } from "./helpers";

const PASSPORT_NOTICE = "Formato visual preparado para fotografia profissional. Confirme sempre os requisitos específicos da instituição onde irá utilizar a fotografia.";

/** Retrato sintético (formas geométricas, não é uma pessoa real): fundo liso claro, cabeça e ombros. */
async function syntheticPortrait(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <rect width="900" height="1200" fill="#e9ecef"/>
    <path d="M90 1200 C110 930 250 860 450 850 C650 860 790 930 810 1200 Z" fill="#6b4f3a"/>
    <rect x="395" y="660" width="110" height="220" fill="#8d5a3b"/>
    <ellipse cx="450" cy="480" rx="160" ry="205" fill="#8d5a3b"/>
    <ellipse cx="450" cy="330" rx="170" ry="95" fill="#1f1a17"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function expectAccessible(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test.describe("foto profissional", () => {
  test("carregar → ajustar → tipo passe → fundo → roupa → posição → guardar → usar no CV → baixar → eliminar", async ({ page, browser, isMobile }) => {
    await register(page, { name: "Teste Fotografia" });

    // Um CV para receber a fotografia
    await page.goto("/meu-espaco/cvs/novo?modelo=primeiro-emprego");
    await page.getByRole("button", { name: "Começar com este modelo" }).click();
    await expect(page).toHaveURL(/\/editar/);
    const cvId = new URL(page.url()).pathname.split("/").at(-2)!;

    await page.goto("/meu-espaco/fotos");
    await expect(page.getByRole("heading", { name: "Minhas Fotos Profissionais" })).toBeVisible();
    await expect(page.getByText("Ainda não tem fotos profissionais")).toBeVisible();
    await page.getByRole("link", { name: "Nova foto profissional" }).click();
    await expect(page.getByRole("heading", { name: "Foto Profissional" })).toBeVisible();
    await expect(page.getByText("Prepare a sua fotografia para uma candidatura profissional.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tirar fotografia" })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // Ficheiros inválidos
    const input = page.getByLabel("Escolher fotografia da galeria");
    await input.setInputFiles({ name: "animacao.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a....") });
    await expect(page.getByText("Formato não suportado. Use JPG, JPEG, PNG ou WEBP.")).toBeVisible();
    await input.setInputFiles({ name: "falsa.jpg", mimeType: "image/jpeg", buffer: Buffer.from("isto não é uma imagem") });
    await expect(page.getByText("O ficheiro não é uma imagem válida.")).toBeVisible();

    // Fotografia válida → editor
    await input.setInputFiles({ name: "retrato.jpg", mimeType: "image/jpeg", buffer: await syntheticPortrait() });
    await expect(page).toHaveURL(/\/meu-espaco\/fotos\/[^/]+\/editar/, { timeout: 20_000 });
    const photoId = new URL(page.url()).pathname.split("/").at(-2)!;
    const preview = page.getByRole("img", { name: /Pré-visualização da fotografia editada/ });
    await expect(preview).toBeVisible();
    const steps = page.getByRole("navigation", { name: "Etapas da foto profissional" });
    const next = page.getByRole("button", { name: "Seguinte" });

    // 2. Ajustar
    await expect(page.getByRole("heading", { name: "2. Ajustar foto" })).toBeVisible();
    await page.getByRole("button", { name: "Melhoria automática" }).click();
    await expect(page.getByText("Melhoria automática aplicada")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);

    // 3. Formato: tipo passe (sem afirmar conformidade oficial)
    await next.click();
    await page.getByRole("button", { name: "Preparar foto tipo passe" }).click();
    await expect(page.getByText(PASSPORT_NOTICE).first()).toBeVisible();
    await expect(page.getByRole("radio", { name: /tipo passe/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("heading", { name: /tipo passe · 700×900/i })).toBeVisible();

    // 4. Fundo: remoção automática não configurada; fundo liso local funciona
    await next.click();
    await page.getByRole("button", { name: "Remover fundo (automático)" }).click();
    await expect(page.getByText("Remoção automática de fundo ainda não configurada.")).toBeVisible();
    const grey = page.getByRole("button", { name: /^Cinza claro/ });
    await grey.click();
    await expect(grey).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Sensibilidade do fundo")).toBeVisible();

    // 5. Roupa digital (identificada como edição digital)
    await next.click();
    await expect(page.getByText(/edição digital/).first()).toBeVisible();
    await page.getByRole("button", { name: "Mulher", exact: true }).click();
    const outfit = page.getByRole("button", { name: "Blazer azul-marinho + camisa branca" });
    await outfit.click();
    await expect(outfit).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Roupa digital (edição digital)")).toBeVisible();

    // 6. Posição
    await next.click();
    await page.getByRole("button", { name: "Centralizar automaticamente" }).click();
    await expect(page.getByText(/Rosto centrado|Centrado com uma estimativa/)).toBeVisible();
    await page.getByLabel("Aumentar / diminuir").fill("1.2");

    // 7. Pré-visualizar: antes | depois, guardar
    await steps.getByRole("button", { name: "Pré-visualizar" }).click();
    await page.getByRole("button", { name: "Antes" }).click();
    await expect(page.getByRole("img", { name: "Fotografia original (antes)" })).toBeVisible();
    await page.getByRole("button", { name: "Depois" }).click();
    await page.getByRole("button", { name: "Guardar fotografia" }).click();
    await expect(page.getByText("Fotografia guardada nas suas fotos profissionais.")).toBeVisible({ timeout: 20_000 });

    if (isMobile) await page.screenshot({ path: "test-results/foto-editor-android.png" });
    // Botões grandes no telemóvel
    const useInCv = page.getByRole("button", { name: "Usar no CV" }).last(); // barra inferior (a 1.ª é a etapa)
    const bottom = await useInCv.boundingBox();
    expect(bottom!.height).toBeGreaterThanOrEqual(44);

    // 8. Usar no meu CV
    await useInCv.click();
    await expect(page.getByRole("heading", { name: "8. Usar no meu CV" })).toBeVisible();
    await page.getByRole("list", { name: "Os seus CVs" }).getByRole("button", { name: "Adicionar fotografia" }).click();
    await expect(page.getByText("Fotografia adicionada ao CV.")).toBeVisible();

    // Downloads (preço 0 = gratuito): passe e final, sem marca de água
    const final = await page.request.get(`/api/fotos/${photoId}/download?formato=png&tipo=final`);
    expect(final.status()).toBe(200);
    expect(final.headers()["content-type"]).toBe("image/png");
    expect(await sharp(await final.body()).metadata()).toMatchObject({ width: 700, height: 900 });
    const passe = await page.request.get(`/api/fotos/${photoId}/download?formato=jpg&tipo=passe`);
    expect(passe.headers()["content-type"]).toBe("image/jpeg");
    const meta = await sharp(await passe.body()).metadata();
    expect(meta.width! / meta.height!).toBeCloseTo(7 / 9, 2);
    expect(meta.exif).toBeUndefined();
    await expect(page.getByRole("link", { name: "Tipo passe" })).toBeVisible();

    // A fotografia aparece no CV (espaço de foto do modelo) e pode ser editada a partir do CV
    await page.goto(`/meu-espaco/cvs/${cvId}/editar?passo=2`);
    await expect(page.getByRole("img", { name: "Fotografia do candidato" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar foto profissional" })).toHaveAttribute("href", `/meu-espaco/fotos/${photoId}/editar`);
    await page.getByRole("button", { name: "Escolher das minhas fotos profissionais" }).click();
    await expect(page.getByRole("list", { name: "As suas fotos profissionais" }).getByRole("button", { name: "Usar original" })).toBeVisible();

    // Privacidade: outro utilizador não vê nem descarrega
    const other = await browser.newPage(isMobile ? { viewport: { width: 412, height: 915 } } : {});
    await register(other);
    expect((await other.request.get(`/api/fotos/${photoId}?v=original`)).status()).toBe(404);
    expect((await other.request.get(`/api/fotos/${photoId}/download?formato=jpg&tipo=final`)).status()).toBe(404);
    expect((await other.goto(`/meu-espaco/fotos/${photoId}/editar`))!.status()).toBe(404);
    await other.close();
    const own = await page.request.get(`/api/fotos/${photoId}?v=resultado`);
    expect(own.headers()["x-robots-tag"]).toContain("noindex");
    expect(own.headers()["cache-control"]).toContain("private");

    // Galeria: miniatura, tipo, utilização; eliminar (também dos CVs)
    await page.goto("/meu-espaco/fotos");
    await expect(page.getByRole("list", { name: "As suas fotografias" }).getByText("Foto profissional", { exact: true })).toBeVisible();
    await expect(page.getByText("Usada em 1 CV")).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Eliminar fotografia" }).click();
    const dialog = page.getByRole("dialog", { name: "Eliminar esta fotografia?" });
    await expect(dialog.getByLabel(/Remover também dos CVs/)).toBeChecked();
    await dialog.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Fotografia eliminada.")).toBeVisible();
    expect((await page.request.get(`/api/fotos/${photoId}?v=original`)).status()).toBe(404);
    expect((await page.request.get(`/api/cv/${cvId}/photo?raw=1`)).status()).toBe(404);
  });

  test("galeria de modelos: filtro com / sem fotografia", async ({ page }) => {
    await page.goto("/cv-modelos");
    const select = page.getByLabel("Fotografia");
    await select.selectOption("without");
    await expect(page.getByText(/^3 modelos$/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Balanço" })).toBeVisible();
    await select.selectOption("with");
    await expect(page.getByRole("heading", { name: "Balanço" })).toHaveCount(0);
  });

  test("admin: processadores, fundos, roupas e preços", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "Fluxo admin testado em desktop");
    await login(page, "admin@e2e.test", "Admin-e2e-2026");
    await page.goto("/admin");
    await page.getByRole("link", { name: "Foto Profissional" }).click();
    await expect(page.getByRole("cell", { name: "BackgroundRemovalProvider" })).toBeVisible();
    await expect(page.getByText("NÃO CONFIGURADO").first()).toBeVisible();
    await expectAccessible(page);

    // Fundos: adicionar, desativar
    await page.getByRole("link", { name: "Fundos" }).click();
    await page.locator("summary", { hasText: "Adicionar fundo" }).click();
    await page.getByRole("textbox", { name: "Nome" }).first().fill("Verde muito claro");
    await page.locator("#novo-color1").fill("#e8f5e9");
    await page.getByRole("button", { name: "Adicionar fundo" }).click();
    await expect(page.getByText("Fundo adicionado.")).toBeVisible();
    await expect(page.getByText("Verde muito claro", { exact: true })).toBeVisible();

    // Roupas: filtro e nova roupa
    await page.getByRole("link", { name: "Roupas" }).click();
    await page.getByRole("link", { name: "Mulher", exact: true }).click();
    await expect(page.getByText(/^11 roupa\(s\)$/)).toBeVisible();
    await page.getByRole("link", { name: "Roupas" }).click();
    await page.locator("summary", { hasText: "Adicionar roupa" }).click();
    await page.locator("#nova-name").fill("Camisa verde-oliva");
    await page.locator("#nova-garment").selectOption("CAMISA");
    await page.locator("#nova-shirtColor").fill("#6b7a4b");
    await page.getByRole("checkbox", { name: "Entrevista" }).first().check();
    await page.getByRole("button", { name: "Adicionar roupa" }).click();
    await expect(page.getByText("Roupa adicionada.")).toBeVisible();

    // Preços: foto e pacote (configuráveis, não fixos no código)
    await page.getByRole("link", { name: "Preços" }).click();
    await page.getByLabel(/^Foto profissional/).fill("150");
    await page.getByLabel(/^Pacote CV \+ Foto/).fill("300");
    await page.getByRole("button", { name: "Guardar preços" }).click();
    await expect(page.getByText("Preços da foto profissional guardados.")).toBeVisible();

    // Um utilizador vê o preço e o download fica bloqueado até ao pagamento
    const user = await browser.newPage();
    await register(user);
    await user.goto("/meu-espaco/fotos/nova");
    await user.getByLabel("Escolher fotografia da galeria").setInputFiles({ name: "retrato.jpg", mimeType: "image/jpeg", buffer: await syntheticPortrait() });
    await expect(user).toHaveURL(/\/editar/, { timeout: 20_000 });
    const id = new URL(user.url()).pathname.split("/").at(-2)!;
    await user.getByRole("navigation", { name: "Etapas da foto profissional" }).getByRole("button", { name: "Pré-visualizar" }).click();
    await user.getByRole("button", { name: "Guardar fotografia" }).click();
    await expect(user.getByText("Fotografia guardada nas suas fotos profissionais.")).toBeVisible({ timeout: 20_000 });
    expect((await user.request.get(`/api/fotos/${id}/download?formato=jpg&tipo=final`)).status()).toBe(402);
    await user.goto(`/meu-espaco/fotos/${id}`);
    await expect(user.getByRole("link", { name: "Comprar foto — 150 MT" })).toBeVisible();
    await user.close();

    // Repor: foto gratuita
    await page.getByLabel(/^Foto profissional/).fill("");
    await page.getByLabel(/^Pacote CV \+ Foto/).fill("");
    await page.getByRole("button", { name: "Guardar preços" }).click();
    await expect(page.getByText("Preços da foto profissional guardados.")).toBeVisible();
  });
});
