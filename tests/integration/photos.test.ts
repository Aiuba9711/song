import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { saveBackgroundAction, toggleBackgroundAction, updatePhotoPricesAction } from "@/app/admin/foto/actions";
import { GET as downloadRoute } from "@/app/api/fotos/[id]/download/route";
import { GET as photoRoute } from "@/app/api/fotos/[id]/route";
import { applyPhotoToCvAction, deletePhotoAction, requestAutoBackgroundRemovalAction, savePhotoResultAction, uploadProfessionalPhotoAction } from "@/app/meu-espaco/fotos/actions";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { DEFAULT_SETTINGS } from "@/photo/types";
import { createCheckoutOrder, resolveCheckoutItem } from "@/server/checkout";
import { getManualProvider } from "@/server/payments/registry";
import { activeBackgrounds, applyPhotoToCv, canUsePhoto, createPhoto, getPhoto, getPhotoPricing, MAX_PHOTOS_PER_USER, savePhotoResult, validatePhotoUpload } from "@/server/photos";
import { deleteAccount } from "@/server/users";
import { createPaymentSettings, createUser, resetDatabase } from "../support/db";
import { resetCookies } from "../support/next-mocks";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (q = "") => new Request(`http://localhost/api?${q}`);

async function jpegWithExif(w = 900, h = 1200) {
  return sharp({ create: { width: w, height: h, channels: 3, background: "#e9ecef" } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><ellipse cx="${w / 2}" cy="${h * 0.4}" rx="${w * 0.18}" ry="${h * 0.17}" fill="#7a4f35"/></svg>`) }])
    .withExif({ IFD0: { Make: "TelemovelTeste", Model: "X1" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "25/1 58/1 0/1" } })
    .jpeg()
    .toBuffer();
}

async function resultPng(w = 700, h = 900) {
  return sharp({ create: { width: w, height: h, channels: 4, background: "#ffffff" } }).png().toBuffer();
}

function file(data: Buffer, name: string, type: string) {
  const fd = new FormData();
  fd.set("photo", new File([new Uint8Array(data)], name, { type }));
  return fd;
}

async function saveForm(png: Buffer, settings: object, faceOut: object | null = { x: 0.35, y: 0.2, w: 0.3, h: 0.35 }) {
  const fd = new FormData();
  fd.set("result", new Blob([new Uint8Array(png)], { type: "image/png" }), "foto.png");
  fd.set("settings", JSON.stringify(settings));
  fd.set("faceOut", JSON.stringify(faceOut));
  return fd;
}

async function newCv(userId: string) {
  return db.cV.create({ data: { userId, title: "O meu CV", fullName: "Teste" } });
}

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  await createPaymentSettings(); // foto gratuita por omissão (photoPriceMinor = 0)
});

describe("upload: validação no servidor", () => {
  it("aceita JPG/PNG/WEBP; recusa extensão errada, conteúdo falso, MIME diferente e vazio", async () => {
    const jpg = await jpegWithExif(400, 500);
    const png = await sharp(jpg).png().toBuffer();
    const webp = await sharp(jpg).webp().toBuffer();
    expect(validatePhotoUpload(jpg, "a.jpeg", "image/jpeg")).toBe("image/jpeg");
    expect(validatePhotoUpload(png, "a.PNG", "image/png")).toBe("image/png");
    expect(validatePhotoUpload(webp, "a.webp", "")).toBe("image/webp");
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as { code?: string }).code;
      }
    };
    expect(code(() => validatePhotoUpload(jpg, "a.gif", "image/gif"))).toBe("INVALID_EXTENSION");
    expect(code(() => validatePhotoUpload(Buffer.from("<script>alert(1)</script>"), "a.jpg", "image/jpeg"))).toBe("INVALID_TYPE");
    expect(code(() => validatePhotoUpload(png, "a.jpg", "image/jpeg"))).toBe("MISMATCH");
    expect(code(() => validatePhotoUpload(jpg, "a.jpg", "text/html"))).toBe("INVALID_TYPE");
    expect(code(() => validatePhotoUpload(Buffer.alloc(0), "a.jpg", "image/jpeg"))).toBe("EMPTY");
  });

  it("imagem demasiado grande (limite configurável) e demasiado pequena", async () => {
    const before = process.env.PHOTO_MAX_UPLOAD_MB;
    process.env.PHOTO_MAX_UPLOAD_MB = "1";
    try {
      const big = Buffer.concat([await jpegWithExif(300, 300), Buffer.alloc(1.2 * 1024 * 1024)]);
      expect(() => validatePhotoUpload(big, "a.jpg", "image/jpeg")).toThrow(/máximo 1 MB/);
    } finally {
      if (before === undefined) delete process.env.PHOTO_MAX_UPLOAD_MB;
      else process.env.PHOTO_MAX_UPLOAD_MB = before;
    }
    const u = await createUser();
    await expect(createPhoto(u.id, { data: await jpegWithExif(120, 150), fileName: "a.jpg", mime: "image/jpeg" })).rejects.toMatchObject({ code: "TOO_SMALL" });
  });

  it("guarda em armazenamento privado, reduz para ≤ 2000 px e remove EXIF/GPS", async () => {
    const u = await createUser();
    await createSession(u.id);
    const res = await uploadProfessionalPhotoAction(file(await jpegWithExif(2400, 3200), "retrato.jpg", "image/jpeg"));
    expect(res.ok).toBe(true);
    const photo = (await getPhoto(u.id, res.ok ? res.id : ""))!;
    expect(photo.originalKey).toMatch(new RegExp(`^photos/${u.id}/`));
    const stored = (await storage().get(photo.originalKey))!;
    const meta = await sharp(stored).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2000);
    expect(meta.exif).toBeUndefined();
    expect(stored.includes(Buffer.from("TelemovelTeste"))).toBe(false);
  });

  it("não autenticado não carrega; limite de fotografias por conta", async () => {
    expect(await uploadProfessionalPhotoAction(file(await jpegWithExif(), "a.jpg", "image/jpeg"))).toMatchObject({ ok: false, code: "AUTH" });
    const u = await createUser();
    const img = await jpegWithExif(300, 400);
    await createPhoto(u.id, { data: img, fileName: "a.jpg", mime: "image/jpeg" });
    await db.professionalPhoto.createMany({ data: Array.from({ length: MAX_PHOTOS_PER_USER - 1 }, (_, i) => ({ userId: u.id, originalKey: `x/${i}`, settings: {} })) });
    await expect(createPhoto(u.id, { data: img, fileName: "a.jpg", mime: "image/jpeg" })).rejects.toMatchObject({ code: "LIMIT" });
  });
});

describe("resultado do editor", () => {
  it("valida formato, proporção e fundo/roupa; guarda etiqueta e miniatura", async () => {
    const u = await createUser();
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    const [bg] = await activeBackgrounds();
    const outfit = await db.photoOutfit.create({ data: { name: "Camisa branca", gender: "MASCULINO", garment: "CAMISA", shirtColor: "#ffffff" } });
    const settings = { ...DEFAULT_SETTINGS, format: "PASSE", backgroundId: bg?.id ?? null, outfitId: outfit.id };

    await expect(savePhotoResult(u.id, id, await jpegWithExif(700, 900), settings, { faceOut: null })).rejects.toMatchObject({ code: "INVALID_IMAGE" }); // não é PNG
    await expect(savePhotoResult(u.id, id, await resultPng(800, 800), settings, { faceOut: null })).rejects.toThrow(/proporção/);
    await expect(savePhotoResult(u.id, id, await resultPng(), { ...settings, outfitId: "inexistente" }, { faceOut: null })).rejects.toThrow(/Roupa indisponível/);
    await expect(savePhotoResult(u.id, id, await resultPng(), { ...settings, zoom: 99 }, { faceOut: null })).rejects.toThrow(/Definições inválidas/);

    await savePhotoResult(u.id, id, await resultPng(), settings, { faceOut: { x: 0.3, y: 0.2, w: 0.4, h: 0.4 } });
    const p = (await getPhoto(u.id, id))!;
    expect(p).toMatchObject({ format: "PASSE", width: 700, height: 900, outfitId: outfit.id });
    expect(p.styleLabel).toContain("Camisa branca");
    expect(p.resultKey).toBeTruthy();
  });

  it("action: só o dono guarda o resultado", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const { id } = await createPhoto(owner.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    await createSession(intruder.id);
    expect(await savePhotoResultAction(id, await saveForm(await resultPng(), { ...DEFAULT_SETTINGS, format: "PASSE" }))).toMatchObject({ ok: false, code: "NOT_FOUND" });
    await createSession(owner.id);
    expect(await savePhotoResultAction(id, await saveForm(await resultPng(), { ...DEFAULT_SETTINGS, format: "PASSE" }))).toEqual({ ok: true });
  });

  it("remoção automática de fundo: mensagem de não configurada (sem inventar serviço)", async () => {
    const u = await createUser();
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    await createSession(u.id);
    expect(await requestAutoBackgroundRemovalAction(id)).toEqual({ ok: false, error: "Remoção automática de fundo ainda não configurada.", code: "NOT_CONFIGURED" });
  });
});

describe("privacidade e acesso", () => {
  it("só o dono vê e descarrega; cabeçalhos privados e sem indexação", async () => {
    const owner = await createUser();
    const other = await createUser();
    const { id } = await createPhoto(owner.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    await savePhotoResult(owner.id, id, await resultPng(), { ...DEFAULT_SETTINGS, format: "PASSE" }, { faceOut: null });

    expect((await photoRoute(req("v=original"), params(id))).status).toBe(401);
    await createSession(other.id);
    expect((await photoRoute(req("v=original"), params(id))).status).toBe(404);
    expect((await downloadRoute(req("formato=jpg&tipo=final"), params(id))).status).toBe(404);
    expect(await applyPhotoToCvAction(id, (await newCv(other.id)).id, "result")).toMatchObject({ ok: false, code: "NOT_FOUND" });

    await createSession(owner.id);
    const res = await photoRoute(req("v=resultado"), params(id));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noimageindex");
    expect((await photoRoute(req("v=qualquer"), params(id))).status).toBe(400);
  });

  it("download grátis sem marca de água: tipo passe e CV com a proporção certa; regista o download", async () => {
    const u = await createUser();
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    await savePhotoResult(u.id, id, await resultPng(800, 1000), { ...DEFAULT_SETTINGS, format: "CV" }, { faceOut: { x: 0.35, y: 0.2, w: 0.3, h: 0.3 } });
    await createSession(u.id);
    const passe = await downloadRoute(req("formato=jpg&tipo=passe"), params(id));
    expect(passe.headers.get("content-type")).toBe("image/jpeg");
    const m = await sharp(Buffer.from(await passe.arrayBuffer())).metadata();
    expect(m.width! / m.height!).toBeCloseTo(7 / 9, 2);
    const png = await downloadRoute(req("formato=png&tipo=final"), params(id));
    expect(await sharp(Buffer.from(await png.arrayBuffer())).metadata()).toMatchObject({ format: "png", width: 800, height: 1000 });
    expect(await db.download.count({ where: { userId: u.id, photoId: id } })).toBe(2);
  });

  it("eliminar apaga ficheiros e registo; opcionalmente retira dos CVs", async () => {
    const u = await createUser();
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    await savePhotoResult(u.id, id, await resultPng(), { ...DEFAULT_SETTINGS, format: "PASSE" }, { faceOut: null });
    const cv = await newCv(u.id);
    await applyPhotoToCv(u.id, id, cv.id, "result");
    const keys = (await getPhoto(u.id, id))!;
    await createSession(u.id);
    const fd = new FormData();
    fd.set("photoId", id);
    fd.set("alsoFromCvs", "on");
    await expect(deletePhotoAction(fd)).rejects.toThrow(/NEXT_REDIRECT/);
    expect(await getPhoto(u.id, id)).toBeNull();
    for (const k of [keys.originalKey, keys.resultKey!, keys.thumbKey!]) expect(await storage().get(k)).toBeNull();
    expect(await db.cV.findUniqueOrThrow({ where: { id: cv.id } })).toMatchObject({ photoKey: null, professionalPhotoId: null });
  });

  it("eliminar a conta apaga também as fotografias profissionais", async () => {
    const u = await createUser({ password: "SenhaSegura1" });
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    const key = (await getPhoto(u.id, id))!.originalKey;
    await deleteAccount(u.id, "SenhaSegura1");
    expect(await db.professionalPhoto.count({ where: { id } })).toBe(0);
    expect(await storage().get(key)).toBeNull();
  });
});

describe("usar no CV", () => {
  it("coloca a fotografia no espaço de foto do CV, enquadrada no rosto", async () => {
    const u = await createUser();
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    const cv = await newCv(u.id);
    await createSession(u.id);
    expect(await applyPhotoToCvAction(id, cv.id, "result")).toMatchObject({ ok: false, error: "Guarde primeiro a fotografia no editor." });
    await savePhotoResult(u.id, id, await resultPng(800, 1000), { ...DEFAULT_SETTINGS, format: "CV" }, { faceOut: { x: 0.35, y: 0.1, w: 0.3, h: 0.3 } });
    const res = await applyPhotoToCvAction(id, cv.id, "result");
    expect(res).toMatchObject({ ok: true, cvId: cv.id });
    if (res.ok) expect(res.framing.offsetY).toBeLessThan(0); // rosto acima do centro
    const updated = await db.cV.findUniqueOrThrow({ where: { id: cv.id } });
    expect(updated).toMatchObject({ professionalPhotoId: id, showPhoto: true });
    expect(updated.photoKey).toBeTruthy();
    // A original também pode ser usada
    expect(await applyPhotoToCvAction(id, cv.id, "original")).toMatchObject({ ok: true });
  });
});

describe("preço configurável, compra e pacote CV + Foto", () => {
  it("com preço: 402 e não usa no CV até o pagamento ser confirmado", async () => {
    await createPaymentSettings({});
    await db.paymentSettings.update({ where: { id: "default" }, data: { photoPriceMinor: 15000, photoBundlePriceMinor: 30000 } });
    const u = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    await savePhotoResult(u.id, id, await resultPng(), { ...DEFAULT_SETTINGS, format: "PASSE" }, { faceOut: null });
    await createSession(u.id);
    expect((await downloadRoute(req("formato=jpg&tipo=final"), params(id))).status).toBe(402);
    expect(await applyPhotoToCvAction(id, (await newCv(u.id)).id, "result")).toMatchObject({ ok: false, code: "PAYMENT_REQUIRED" });

    expect(await resolveCheckoutItem(u.id, { photoId: id })).toMatchObject({ kind: "PHOTO_UNLOCK", photoId: id, unitPriceMinor: 15000 });
    const { orderNumber } = await createCheckoutOrder(u.id, { target: { photoId: id }, method: "MPESA", customer: { name: "Cliente", email: "c@teste.co.mz", phone: null } });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
    await getManualProvider("MPESA").submitCustomerReport(payment.id, u.id, { payerName: "Cliente", payerPhone: "841234567", transactionId: "FOTO123", reportedPaidAt: new Date() });
    expect(await canUsePhoto(u.id, id)).toBe(false);
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    expect((await downloadRoute(req("formato=jpg&tipo=final"), params(id))).status).toBe(200);
    expect((await getPhoto(u.id, id))!.purchasedAt).not.toBeNull();
    await expect(resolveCheckoutItem(u.id, { photoId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });

  it("pacote CV + Foto liberta os dois; indisponível quando o admin não define preço", async () => {
    const u = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await createPhoto(u.id, { data: await jpegWithExif(), fileName: "a.jpg", mime: "image/jpeg" });
    const cv = await newCv(u.id);
    await db.paymentSettings.update({ where: { id: "default" }, data: { photoPriceMinor: 15000 } });
    await expect(resolveCheckoutItem(u.id, { bundle: { cvId: cv.id, photoId: id } })).rejects.toMatchObject({ code: "INVALID_ITEM" });
    await db.paymentSettings.update({ where: { id: "default" }, data: { photoBundlePriceMinor: 30000 } });
    expect(await resolveCheckoutItem(u.id, { bundle: { cvId: cv.id, photoId: id } })).toMatchObject({ kind: "CV_PHOTO_BUNDLE", unitPriceMinor: 30000 });
    const { orderNumber } = await createCheckoutOrder(u.id, { target: { bundle: { cvId: cv.id, photoId: id } }, method: "MPESA", customer: { name: "Cliente", email: "c@teste.co.mz", phone: null } });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
    await getManualProvider("MPESA").submitCustomerReport(payment.id, u.id, { payerName: "Cliente", payerPhone: "841234567", transactionId: "PACOTE1", reportedPaidAt: new Date() });
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    expect((await db.cV.findUniqueOrThrow({ where: { id: cv.id } })).purchasedAt).not.toBeNull();
    expect((await getPhoto(u.id, id))!.purchasedAt).not.toBeNull();
    // outro utilizador não compra a foto de outra pessoa
    const other = await createUser();
    await expect(resolveCheckoutItem(other.id, { photoId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });

  it("promoção com data de fim", async () => {
    const past = new Date(Date.now() - 86_400_000);
    await db.paymentSettings.update({ where: { id: "default" }, data: { photoPriceMinor: 15000, photoPromoPriceMinor: 9900, photoPromoEndsAt: new Date(Date.now() + 86_400_000) } });
    expect(await getPhotoPricing()).toMatchObject({ priceMinor: 9900, regularMinor: 15000, promoActive: true });
    await db.paymentSettings.update({ where: { id: "default" }, data: { photoPromoEndsAt: past } });
    expect(await getPhotoPricing()).toMatchObject({ priceMinor: 15000, promoActive: false });
  });
});

describe("admin", () => {
  it("preços só por administradores; editores gerem fundos; utilizadores não", async () => {
    const editor = await createUser({ role: "EDITOR" });
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser();
    const prices = new FormData();
    prices.set("photoPrice", "150");
    prices.set("photoBundlePrice", "300");
    prices.set("photoPromoPrice", "120");
    prices.set("photoPromoEndsAt", "2099-12-31");

    await createSession(editor.id);
    await expect(updatePhotoPricesAction({}, prices)).rejects.toThrow();
    const bg = new FormData();
    for (const [k, v] of Object.entries({ name: "Verde claro", category: "NEUTRO", kind: "SOLID", color1: "#e8f5e9", isActive: "on", sortOrder: "5" })) bg.set(k, v);
    expect(await saveBackgroundAction(null, {}, bg)).toMatchObject({ ok: true });
    const created = await db.photoBackground.findFirstOrThrow({ where: { name: "Verde claro" } });
    const toggle = new FormData();
    toggle.set("id", created.id);
    await toggleBackgroundAction(toggle);
    expect((await db.photoBackground.findUniqueOrThrow({ where: { id: created.id } })).isActive).toBe(false);
    expect((await activeBackgrounds()).some((b) => b.id === created.id)).toBe(false);

    const bad = new FormData();
    for (const [k, v] of Object.entries({ name: "Mau", category: "NEUTRO", kind: "GRADIENT", color1: "red" })) bad.set(k, v);
    const invalid = await saveBackgroundAction(null, {}, bad);
    expect(invalid.fieldErrors?.color1).toBeTruthy();
    expect(invalid.fieldErrors?.color2).toBeTruthy();

    await createSession(user.id);
    await expect(saveBackgroundAction(null, {}, bg)).rejects.toThrow();

    await createSession(admin.id);
    expect(await updatePhotoPricesAction({}, prices)).toMatchObject({ ok: true });
    expect(await getPhotoPricing()).toMatchObject({ priceMinor: 12000, regularMinor: 15000, bundleMinor: 30000, promoActive: true });
    const badPromo = new FormData();
    badPromo.set("photoPrice", "100");
    badPromo.set("photoPromoPrice", "150");
    expect((await updatePhotoPricesAction({}, badPromo)).fieldErrors?.photoPromoPrice).toBeTruthy();
    expect(await db.auditLog.count({ where: { action: "settings.photo_prices_update" } })).toBe(1);
  });
});
