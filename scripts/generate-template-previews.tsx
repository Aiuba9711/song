/**
 * Gera as imagens de pré-visualização dos modelos (public/templates/<slug>.jpg e
 * <slug>-sem-foto.jpg) a partir do MESMO componente usado na aplicação, com dados de exemplo
 * fictícios e uma silhueta genérica no lugar da fotografia.
 *
 *   CHROMIUM_PATH=/caminho/chrome npx tsx scripts/generate-template-previews.tsx [slug…]
 *   (depois: npm run db:seed para associar as imagens aos modelos)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { CATALOG } from "../src/cv/catalog";
import { resolveDesign } from "../src/cv/design";
import { CvPreview } from "../src/cv/preview";
import { SAMPLE_CV } from "../src/cv/sample";

const SILHOUETTE = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#cbd5e1"/><circle cx="100" cy="78" r="38" fill="#94a3b8"/><path d="M30 200c6-44 36-68 70-68s64 24 70 68z" fill="#94a3b8"/></svg>`,
).toString("base64")}`;

const OUT = path.resolve("public/templates");
const WIDTH = 400;

async function main() {
  mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  for (const t of CATALOG.filter((x) => !only.length || only.includes(x.slug))) {
    const design = resolveDesign({ layout: t.layout, design: t.design, accentColor: t.accentColor });
    for (const withPhoto of [true, false]) {
      const cv = { ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, showPhoto: withPhoto } };
      const html = renderToStaticMarkup(<CvPreview cv={cv} design={design} photoUrl={withPhoto ? SILHOUETTE : null} />);
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff}</style></head><body>${html}</body></html>`);
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: 794, height: 1123 } });
      const jpg = await sharp(png).resize(WIDTH).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      const file = path.join(OUT, `${t.slug}${withPhoto ? "" : "-sem-foto"}.jpg`);
      writeFileSync(file, jpg);
    }
    console.info(`✔ ${t.slug}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
