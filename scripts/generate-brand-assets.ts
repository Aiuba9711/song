/**
 * Gera os PNG da marca (ícones PWA, apple-touch-icon, favicon.ico, imagem Open Graph)
 * a partir dos SVG em /public, usando o Chromium do Playwright.
 *
 *   npx tsx scripts/generate-brand-assets.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const PUBLIC = path.resolve("public");
const mark = readFileSync(path.join(PUBLIC, "favicon.svg"), "utf8");
const inner = mark.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

function iconHtml(size: number, opts: { padding: number; background: string; radius: number }) {
  const s = size - opts.padding * 2;
  return `<html><body style="margin:0;background:transparent">
<div style="width:${size}px;height:${size}px;background:${opts.background};border-radius:${opts.radius}px;display:grid;place-items:center">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${s}" height="${s}">${inner}</svg></div></body></html>`;
}

const OG_HTML = `<html><body style="margin:0">
<div style="width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;font-family:Roboto,'Noto Sans','Helvetica Neue',Arial,sans-serif;background:linear-gradient(135deg,#eef4ff 0%,#ffffff 55%,#dbe6fe 100%);display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden">
  <div style="position:absolute;right:-60px;top:70px;width:470px;height:600px;transform:rotate(6deg);background:#fff;border-radius:22px;box-shadow:0 30px 60px rgba(15,23,42,.15);overflow:hidden">
    <div style="height:120px;background:#1d40d8"></div>
    <div style="padding:30px">
      <div style="height:22px;width:60%;background:#dbe6fe;border-radius:6px"></div>
      <div style="margin-top:22px;height:12px;width:90%;background:#e2e8f0;border-radius:6px"></div>
      <div style="margin-top:12px;height:12px;width:80%;background:#e2e8f0;border-radius:6px"></div>
      <div style="margin-top:12px;height:12px;width:85%;background:#e2e8f0;border-radius:6px"></div>
      <div style="margin-top:34px;height:16px;width:40%;background:#93b4fd;border-radius:6px"></div>
      <div style="margin-top:16px;height:12px;width:92%;background:#e2e8f0;border-radius:6px"></div>
      <div style="margin-top:12px;height:12px;width:70%;background:#e2e8f0;border-radius:6px"></div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:18px">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="72" height="72">${inner}</svg>
    <span style="font-size:40px;font-weight:800;color:#0b1733;letter-spacing:-1px">Emprego Fácil <span style="color:#1d40d8">MZ</span></span>
  </div>
  <div style="max-width:640px">
    <div style="font-size:60px;line-height:1.08;font-weight:800;color:#0b1733;letter-spacing:-1.5px">O teu próximo emprego começa com uma boa candidatura.</div>
    <div style="margin-top:24px;font-size:28px;color:#475569">CVs profissionais em PDF e Word · Cartas · Entrevistas</div>
  </div>
  <div style="display:flex;gap:14px">
    <span style="background:#0f9d58;color:#fff;font-size:24px;font-weight:700;padding:12px 22px;border-radius:14px">Grátis para começar</span>
    <span style="background:#fff;color:#1e36af;font-size:24px;font-weight:700;padding:12px 22px;border-radius:14px;border:2px solid #bfd3fe">Feito para Moçambique</span>
  </div>
</div></body></html>`;

/** Ficheiro ICO com imagens PNG embutidas (suportado por todos os browsers modernos). */
function buildIco(pngs: Array<{ size: number; data: Buffer }>): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function main() {
  // CHROMIUM_PATH permite usar um Chromium já instalado (ex.: CI/containers).
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage();

  async function shot(html: string, width: number, height: number, transparent = true): Promise<Buffer> {
    await page.setViewportSize({ width, height });
    await page.setContent(html);
    return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
  }

  const outputs: Array<[string, Buffer]> = [
    ["icons/icon-192.png", await shot(iconHtml(192, { padding: 0, background: "transparent", radius: 0 }), 192, 192)],
    ["icons/icon-512.png", await shot(iconHtml(512, { padding: 0, background: "transparent", radius: 0 }), 512, 512)],
    // Maskable: símbolo dentro da "zona segura" (80%) com fundo sólido.
    ["icons/maskable-512.png", await shot(iconHtml(512, { padding: 72, background: "#1d40d8", radius: 0 }), 512, 512, false)],
    ["icons/apple-touch-icon.png", await shot(iconHtml(180, { padding: 16, background: "#1d40d8", radius: 0 }), 180, 180, false)],
    ["og.png", await shot(OG_HTML, 1200, 630, false)],
  ];
  const ico16 = await shot(iconHtml(16, { padding: 0, background: "transparent", radius: 0 }), 16, 16);
  const ico32 = await shot(iconHtml(32, { padding: 0, background: "transparent", radius: 0 }), 32, 32);
  const ico48 = await shot(iconHtml(48, { padding: 0, background: "transparent", radius: 0 }), 48, 48);
  outputs.push(["favicon.ico", buildIco([{ size: 16, data: ico16 }, { size: 32, data: ico32 }, { size: 48, data: ico48 }])]);

  for (const [file, data] of outputs) {
    writeFileSync(path.join(PUBLIC, file), data);
    console.info(`✔ public/${file} (${Math.round(data.length / 1024)} KB)`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
