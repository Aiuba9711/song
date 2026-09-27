import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { appEnvironment, externalBackgroundRemoval, externalClothing, getImageEditingProvider, providerStatuses } from "@/lib/image-editing";
import { plainBackgroundMask } from "@/photo/background";
import { BACKGROUND_CATALOG, OUTFIT_CATALOG } from "@/photo/catalog";
import { autoCenter, coverScale, estimatedFace, faceOnOutput, outfitRect, placement } from "@/photo/geometry";
import { outfitSvg, shade } from "@/photo/outfit";
import { applyAdjustments, AUTO_LIMITS, autoEnhance, imageStats, isNeutral } from "@/photo/pixels";
import { DEFAULT_SETTINGS, editorSettingsSchema, FORMAT_PRESETS, NO_ADJUSTMENTS, OUTFIT_FILTERS, outputSize, PASSPORT_NOTICE, photoKindLabel, styleLabel } from "@/photo/types";
import { checkPhotoFile } from "@/photo/uploader";

/** Imagem RGBA sintética: fundo liso + um «busto» (elipse e retângulo) de outra cor. */
function portraitPixels(w: number, h: number, bg = [233, 236, 239], fg = [120, 80, 55]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const head = ((x - w / 2) / (w * 0.18)) ** 2 + ((y - h * 0.4) / (h * 0.17)) ** 2 <= 1;
      const body = y > h * 0.7 && Math.abs(x - w / 2) < w * 0.4;
      const c = head || body ? fg : bg;
      const i = (y * w + x) * 4;
      data[i] = c[0]!;
      data[i + 1] = c[1]!;
      data[i + 2] = c[2]!;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

describe("formatos e definições", () => {
  it("formatos predefinidos têm as proporções certas; personalizada segue a proporção escolhida", () => {
    expect(outputSize("PASSE", "3:4")).toEqual({ width: FORMAT_PRESETS.PASSE.width, height: FORMAT_PRESETS.PASSE.height });
    expect(FORMAT_PRESETS.PASSE.width / FORMAT_PRESETS.PASSE.height).toBeCloseTo(7 / 9);
    expect(outputSize("CV", "1:1").width / outputSize("CV", "1:1").height).toBeCloseTo(4 / 5);
    expect(outputSize("QUADRADA", "3:4")).toMatchObject({ width: 1000, height: 1000 });
    const custom = outputSize("PERSONALIZADA", "2:3");
    expect(custom.width / custom.height).toBeCloseTo(2 / 3, 2);
    expect(Math.max(custom.width, custom.height)).toBeLessThanOrEqual(2000);
  });

  it("valida e limita as definições do editor (valores fora do intervalo são recusados)", () => {
    expect(editorSettingsSchema.parse({})).toEqual(DEFAULT_SETTINGS);
    expect(editorSettingsSchema.safeParse({ zoom: 10 }).success).toBe(false);
    expect(editorSettingsSchema.safeParse({ adjust: { ...NO_ADJUSTMENTS, brightness: 500 } }).success).toBe(false);
    expect(editorSettingsSchema.safeParse({ format: "OFICIAL" }).success).toBe(false);
  });

  it("aviso do tipo passe não afirma conformidade com requisitos oficiais", () => {
    expect(PASSPORT_NOTICE).toBe("Formato visual preparado para fotografia profissional. Confirme sempre os requisitos específicos da instituição onde irá utilizar a fotografia.");
    expect(PASSPORT_NOTICE).not.toMatch(/cumpre|conforme|oficial|aprovad/i);
  });

  it("etiquetas: tipo e modelo utilizado", () => {
    expect(photoKindLabel({ backgroundId: null, outfitId: null })).toBe("Foto editada");
    expect(photoKindLabel({ backgroundId: "b", outfitId: null })).toBe("Foto profissional");
    const label = styleLabel({ ...DEFAULT_SETTINGS, format: "PASSE" }, { id: "b", name: "Branco", category: "NEUTRO", kind: "SOLID", color1: "#ffffff", color2: null, pattern: null, imageUrl: null, passport: true }, null);
    expect(label).toBe("Foto tipo passe · Fundo branco");
  });
});

describe("geometria (enquadramento)", () => {
  it("a fotografia cobre sempre a área de saída, também rodada", () => {
    for (const rot of [0, 7, 90, -15]) {
      const s = coverScale(900, 1200, 700, 900, rot);
      const pl = placement(900, 1200, 700, 900, { zoom: 1, offsetX: 0, offsetY: 0, rotation: rot });
      // Os quatro cantos da saída caem dentro da imagem rodada e escalada
      const rad = (rot * Math.PI) / 180;
      for (const [x, y] of [[0, 0], [700, 0], [0, 900], [700, 900]] as const) {
        const dx = x - pl.cx;
        const dy = y - pl.cy;
        const u = (dx * Math.cos(-rad) - dy * Math.sin(-rad)) / s;
        const v = (dx * Math.sin(-rad) + dy * Math.cos(-rad)) / s;
        expect(Math.abs(u)).toBeLessThanOrEqual(450 + 0.5);
        expect(Math.abs(v)).toBeLessThanOrEqual(600 + 0.5);
      }
    }
  });

  it("«Centralizar automaticamente» põe o rosto no centro horizontal e à altura-alvo do formato", () => {
    const face = { x: 0.2, y: 0.15, w: 0.25, h: 0.25 }; // rosto descentrado
    for (const format of ["PASSE", "CV", "QUADRADA"] as const) {
      const { width: W, height: H } = outputSize(format, "3:4");
      const c = autoCenter(face, 1000, 1000, W, H, { rotation: 0, format });
      const pl = placement(1000, 1000, W, H, { ...c, rotation: 0 });
      const f = faceOnOutput(face, 1000, 1000, pl);
      if (Math.abs(c.offsetX) < 1) expect(f.cx / W).toBeCloseTo(0.5, 2);
      expect(c.zoom).toBeGreaterThanOrEqual(1);
      expect(c.zoom).toBeLessThanOrEqual(4);
    }
    // tipo passe: espaço acima da cabeça
    const { width: W, height: H } = outputSize("PASSE", "3:4");
    const centered = { x: 0.4, y: 0.3, w: 0.2, h: 0.25 };
    const c = autoCenter(centered, 1000, 1400, W, H, { rotation: 0, format: "PASSE" });
    const f = faceOnOutput(centered, 1000, 1400, placement(1000, 1400, W, H, { ...c, rotation: 0 }));
    expect((f.cy - f.h / 2) / H).toBeGreaterThan(0.12);
  });

  it("rosto estimado (sem deteção) fica no terço superior e centrado", () => {
    const f = estimatedFace(900, 1200);
    expect(f.x + f.w / 2).toBeCloseTo(0.5, 2);
    expect(f.y).toBeLessThan(0.4);
  });

  it("a roupa fica por baixo do queixo e acompanha os ajustes", () => {
    const face = { cx: 350, cy: 380, w: 200, h: 260 };
    const r = outfitRect(700, 900, face, { outfitScale: 1, outfitX: 0, outfitY: 0 });
    expect(r.y).toBeGreaterThan(face.cy + face.h / 2);
    expect(r.x + r.w / 2).toBeCloseTo(350);
    const bigger = outfitRect(700, 900, face, { outfitScale: 1.5, outfitX: 0.1, outfitY: 0 });
    expect(bigger.w).toBeCloseTo(r.w * 1.5);
    expect(bigger.x + bigger.w / 2).toBeCloseTo(350 + 70);
  });
});

describe("correções de imagem (sem filtros de beleza)", () => {
  it("ajustes neutros não mudam os píxeis; brilho clareia", () => {
    const img = portraitPixels(20, 20);
    const copy = new Uint8ClampedArray(img.data);
    applyAdjustments(img, NO_ADJUSTMENTS);
    expect(img.data).toEqual(copy);
    applyAdjustments(img, { ...NO_ADJUSTMENTS, brightness: 20 });
    expect(img.data[0]!).toBeGreaterThan(copy[0]!);
  });

  it("«Melhoria automática» respeita limites baixos", () => {
    const dark = portraitPixels(40, 40, [40, 40, 45], [20, 15, 10]);
    const a = autoEnhance(imageStats(dark));
    expect(isNeutral(a)).toBe(false);
    expect(Math.abs(a.brightness)).toBeLessThanOrEqual(AUTO_LIMITS.brightness);
    expect(Math.abs(a.contrast)).toBeLessThanOrEqual(AUTO_LIMITS.contrast);
    expect(Math.abs(a.saturation)).toBeLessThanOrEqual(AUTO_LIMITS.saturation);
    expect(a.sharpness).toBeLessThanOrEqual(AUTO_LIMITS.sharpness);
  });
});

describe("fundo liso (algoritmo local)", () => {
  it("separa a pessoa de um fundo liso e marca o resultado como fiável", () => {
    const img = portraitPixels(120, 160);
    const m = plainBackgroundMask(img, 40);
    expect(m.uniform).toBe(true);
    expect(m.reliable).toBe(true);
    expect(m.mask[0]).toBe(0); // canto = fundo
    expect(m.mask[Math.round(160 * 0.4) * 120 + 60]).toBe(255); // centro da cabeça = pessoa
  });

  it("fundo irregular: avisa que não é fiável", () => {
    const img = portraitPixels(120, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (i * 7919) % 255;
      if ((i / 4) % 120 < 25 || (i / 4) % 120 > 95) img.data.set([n, 255 - n, (n * 3) % 255], i);
    }
    expect(plainBackgroundMask(img, 40).reliable).toBe(false);
  });
});

describe("roupa digital (ilustração)", () => {
  it("gera SVG válido; gravata só quando pedida e só em roupa masculina", () => {
    const male = { gender: "MASCULINO" as const, garment: "BLAZER" as const, jacketColor: "#1e2a4a", shirtColor: "#ffffff", tieColor: "#5b1a26" };
    expect(outfitSvg(male, { tie: true, tieColor: "#5b1a26" })).toContain('fill="#5b1a26"');
    expect(outfitSvg(male, { tie: false, tieColor: null })).not.toContain('fill="#5b1a26"');
    const female = { ...male, gender: "FEMININO" as const };
    expect(outfitSvg(female, { tie: true, tieColor: "#5b1a26" })).not.toContain('fill="#5b1a26"');
  });

  it("cores inválidas não são injetadas no SVG", () => {
    const svg = outfitSvg({ gender: "MASCULINO", garment: "CAMISA", jacketColor: null, shirtColor: '"/><script>alert(1)</script>', tieColor: null }, { tie: false, tieColor: null });
    expect(svg).not.toContain("<script");
    expect(shade("#ffffff", 0.5)).toBe("#808080");
  });

  it("catálogo: 7+ combinações masculinas, 6 femininas, camisas e blusas; filtros cobrem todas as categorias pedidas", () => {
    const combos = OUTFIT_CATALOG.filter((o) => o.jacketColor);
    expect(combos.filter((o) => o.gender === "MASCULINO").length).toBeGreaterThanOrEqual(7);
    expect(combos.filter((o) => o.gender === "FEMININO").length).toBeGreaterThanOrEqual(6);
    expect(OUTFIT_CATALOG.filter((o) => o.garment === "CAMISA").length).toBeGreaterThanOrEqual(5);
    expect(OUTFIT_CATALOG.filter((o) => o.garment === "BLUSA").length).toBeGreaterThanOrEqual(5);
    expect(OUTFIT_FILTERS.map((f) => f.label)).toEqual(expect.arrayContaining(["Homem", "Mulher", "Blazer", "Fato", "Camisa", "Blusa", "Gravata", "Corporativo", "Executivo", "Primeiro emprego", "Entrevista", "Académico"]));
    expect(BACKGROUND_CATALOG.filter((b) => b.passport).map((b) => b.name)).toEqual(["Branco", "Claro", "Cinza claro", "Azul muito claro"]);
  });
});

describe("validação no navegador", () => {
  const MB = 1024 * 1024;
  it("aceita JPG/JPEG/PNG/WEBP e recusa outros formatos", () => {
    for (const [name, type] of [["a.jpg", "image/jpeg"], ["a.JPEG", "image/jpeg"], ["a.png", "image/png"], ["a.webp", "image/webp"]]) expect(checkPhotoFile({ name: name!, type: type!, size: MB }, 10 * MB)).toBeNull();
    expect(checkPhotoFile({ name: "a.gif", type: "image/gif", size: MB }, 10 * MB)).toMatch(/Formato não suportado/);
    expect(checkPhotoFile({ name: "a.jpg", type: "application/pdf", size: MB }, 10 * MB)).toMatch(/Formato não suportado/);
    expect(checkPhotoFile({ name: "a.jpg", type: "image/jpeg", size: 0 }, 10 * MB)).toMatch(/vazio/);
    expect(checkPhotoFile({ name: "a.jpg", type: "image/jpeg", size: 50 * MB }, 10 * MB)).toMatch(/demasiado grande/);
  });
});

describe("fornecedores de edição de imagem", () => {
  it("sem variáveis: remoção de fundo e roupa externas NÃO CONFIGURADAS; nada é inventado", () => {
    expect(externalBackgroundRemoval({}).state).toBe("NAO_CONFIGURADO");
    expect(externalClothing({}).state).toBe("NAO_CONFIGURADO");
    // Um valor preenchido sem integração implementada é um ERRO (não finge funcionar).
    expect(externalBackgroundRemoval({ IMAGE_BG_PROVIDER: "fornecedor-x" }).state).toBe("ERRO");
    expect(externalClothing({ IMAGE_CLOTHING_PROVIDER: "fornecedor-y" }).state).toBe("ERRO");
    const statuses = providerStatuses({});
    expect(statuses.map((s) => s.name)).toEqual(["BackgroundRemovalProvider", "ClothingProvider", "ImageEditingProvider"]);
    expect(statuses.every((s) => s.local.state === "CONFIGURADO" && s.external.state === "NAO_CONFIGURADO")).toBe(true);
  });

  it("ambientes DEV / STAGING / PRODUCTION separados", () => {
    expect(appEnvironment({ APP_ENV: "staging" })).toBe("staging");
    expect(appEnvironment({ NODE_ENV: "production" })).toBe("production");
    expect(appEnvironment({})).toBe("development");
  });

  it("local: recorte tipo passe, iluminação, fundo e roupa — sem sair do servidor", async () => {
    const p = getImageEditingProvider();
    expect(p.external).toBe(false);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#e9ecef"/><ellipse cx="300" cy="320" rx="110" ry="140" fill="#7a4f35"/><rect x="80" y="600" width="440" height="200" fill="#7a4f35"/></svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const crop = await p.cropPortrait({ data: png, mime: "image/png" }, { width: 700, height: 900, face: { x: 0.32, y: 0.22, w: 0.36, h: 0.35 } });
    const meta = await sharp(crop.data).metadata();
    expect(meta.width! / meta.height!).toBeCloseTo(7 / 9, 2);
    const bg = await p.removeBackground({ data: png, mime: "image/png" });
    expect(bg.reliable).toBe(true);
    expect((await sharp(bg.data).metadata()).hasAlpha).toBe(true);
    const dressed = await p.applyClothing({ data: png, mime: "image/png" }, { gender: "MASCULINO", garment: "BLAZER", jacketColor: "#1e2a4a", shirtColor: "#ffffff", tieColor: null, tie: false }, { x: 0.32, y: 0.22, w: 0.36, h: 0.35 });
    expect((await sharp(dressed.data).metadata()).width).toBe(600);
    expect((await p.improveLighting({ data: png, mime: "image/png" })).data.length).toBeGreaterThan(0);
  });
});
