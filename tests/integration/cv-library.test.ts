import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as cvPhoto } from "@/app/api/cv/[id]/photo/route";
import { GET as cvPreview } from "@/app/api/cv/[id]/preview/route";
import { GET as templatePreview } from "@/app/api/templates/[id]/preview/route";
import { resolveDesign } from "@/cv/design";
import { cvContentSchema } from "@/cv/schema";
import { SAMPLE_CV } from "@/cv/sample";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { createCheckoutOrder, resolveCheckoutItem } from "@/server/checkout";
import { chooseTemplate, createCv, getUserCv, loadFramedPhoto, saveCv, setCvPhoto, setCvTemplate, toCvContent } from "@/server/cv";
import { getGalleryTemplates } from "@/server/gallery";
import { getManualProvider } from "@/server/payments/registry";
import {
  createTemplate as adminCreateTemplate,
  duplicateTemplate,
  moveTemplate,
  removeTemplatePreviewImage,
  setTemplatePreviewImage,
  toggleTemplate,
} from "@/server/templates-admin";
import { createPaymentSettings, createTemplate, createUser, resetDatabase } from "../support/db";
import { pdfText } from "../support/documents";
import { resetCookies } from "../support/next-mocks";

const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  await createPaymentSettings({ cvPaywallEnabled: true, defaultPriceMinor: 19900 });
});

/** Compra pelo fluxo real: pedido → cliente informa a transação → administrador confirma. */
async function purchase(userId: string, cvId: string) {
  const { orderNumber } = await createCheckoutOrder(userId, { target: { cvId }, method: "MPESA", customer: { name: "Cliente", email: "c@teste.co.mz", phone: null } });
  const payment = await db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
  await getManualProvider("MPESA").submitCustomerReport(payment.id, userId, { payerName: "Cliente", payerPhone: "841234567", transactionId: `TX${Date.now()}`, reportedPaidAt: new Date() });
  const admin = await createUser({ role: "ADMIN" });
  await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
}

describe("escolha de modelo (um modelo ativo por conta)", () => {
  it("escolher cria o CV e define o modelo atual; escolher outro troca o modelo do mesmo rascunho", async () => {
    const u = await createUser();
    const a = await createTemplate({ slug: "alfa" });
    const b = await createTemplate({ slug: "beta" });
    const first = await chooseTemplate(u.id, "alfa");
    expect(first.created).toBe(true);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).currentCvTemplateId).toBe(a.id);

    const second = await chooseTemplate(u.id, "beta");
    expect(second).toEqual({ cvId: first.cvId, created: false });
    expect(await db.cV.count({ where: { userId: u.id } })).toBe(1);
    expect((await getUserCv(u.id, first.cvId))?.templateId).toBe(b.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).currentCvTemplateId).toBe(b.id);
  });

  it("não permite um segundo CV por comprar; os dados preenchidos mantêm-se ao trocar de modelo", async () => {
    const u = await createUser();
    await createTemplate({ slug: "alfa" });
    await createTemplate({ slug: "beta" });
    const { cvId } = await chooseTemplate(u.id, "alfa");
    await saveCv(u.id, cvId, cvContentSchema.parse({ ...SAMPLE_CV, templateId: null }));
    await expect(createCv(u.id, {})).rejects.toMatchObject({ code: "DRAFT_EXISTS" });
    await chooseTemplate(u.id, "beta");
    const content = toCvContent((await getUserCv(u.id, cvId))!);
    expect(content.personal.fullName).toBe(SAMPLE_CV.personal.fullName);
    expect(content.experiences).toHaveLength(SAMPLE_CV.experiences.length);
    expect(content.certifications).toEqual(SAMPLE_CV.certifications);
  });

  it("modelo inativo ou inexistente não pode ser escolhido", async () => {
    const u = await createUser();
    await createTemplate({ slug: "oculto", isActive: false });
    await expect(chooseTemplate(u.id, "oculto")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(chooseTemplate(u.id, "nao-existe")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("depois da compra o modelo fica fixo e pode começar um novo CV", async () => {
    const u = await createUser();
    const a = await createTemplate({ slug: "alfa" });
    const b = await createTemplate({ slug: "beta" });
    const { cvId } = await chooseTemplate(u.id, "alfa");
    await saveCv(u.id, cvId, cvContentSchema.parse({ ...SAMPLE_CV, templateId: a.id }));
    await purchase(u.id, cvId);

    await expect(setCvTemplate(u.id, cvId, b.id)).rejects.toMatchObject({ code: "LOCKED" });
    await saveCv(u.id, cvId, cvContentSchema.parse({ ...SAMPLE_CV, templateId: b.id }));
    expect((await getUserCv(u.id, cvId))?.templateId).toBe(a.id);

    const next = await chooseTemplate(u.id, "beta");
    expect(next.created).toBe(true);
    expect(next.cvId).not.toBe(cvId);
  });
});

describe("preço do CV (base de dados, não fixo no código)", () => {
  it("usa o preço do modelo ou, na falta dele, o valor padrão alterável pelo admin", async () => {
    const u = await createUser();
    await createTemplate({ slug: "normal" });
    await createTemplate({ slug: "especial", priceMinor: 24900 });
    const { cvId } = await chooseTemplate(u.id, "normal");
    expect((await resolveCheckoutItem(u.id, { cvId })).unitPriceMinor).toBe(19900);

    await createPaymentSettings({ defaultPriceMinor: 17900 });
    expect((await resolveCheckoutItem(u.id, { cvId })).unitPriceMinor).toBe(17900);

    await chooseTemplate(u.id, "especial");
    const item = await resolveCheckoutItem(u.id, { cvId });
    expect(item.unitPriceMinor).toBe(24900);
    expect(item.name).toContain("modelo");
  });

  it("a galeria mostra apenas modelos ativos, com o respetivo preço", async () => {
    await createTemplate({ slug: "visivel", priceMinor: 24900 });
    await createTemplate({ slug: "padrao" });
    await createTemplate({ slug: "escondido", isActive: false });
    const gallery = await getGalleryTemplates();
    expect(gallery.map((t) => t.slug).sort()).toEqual(["padrao", "visivel"]);
    expect(gallery.find((t) => t.slug === "visivel")?.priceLabel).toBe("249 MT");
  });
});

describe("pré-visualização com marca d'água", () => {
  it("antes da compra a pré-visualização PDF tem marca d'água; depois não", async () => {
    const u = await createUser();
    await createTemplate({ slug: "alfa" });
    const { cvId } = await chooseTemplate(u.id, "alfa");
    await saveCv(u.id, cvId, cvContentSchema.parse({ ...SAMPLE_CV, templateId: null }));
    await createSession(u.id);

    const before = await cvPreview(new Request("http://x"), params({ id: cvId }));
    expect(before.status).toBe(200);
    expect(before.headers.get("content-disposition")).toContain("inline");
    const textBefore = pdfText(Buffer.from(await before.arrayBuffer()));
    expect(textBefore).toContain("Emprego Fácil MZ");
    expect(textBefore).toContain(SAMPLE_CV.personal.fullName);

    await purchase(u.id, cvId);
    const after = await cvPreview(new Request("http://x"), params({ id: cvId }));
    expect(pdfText(Buffer.from(await after.arrayBuffer()))).not.toContain("Emprego Fácil MZ");
  });

  it("só o dono vê a pré-visualização", async () => {
    const owner = await createUser();
    const { id } = await createCv(owner.id, {});
    const intruder = await createUser();
    await createSession(intruder.id);
    expect((await cvPreview(new Request("http://x"), params({ id }))).status).toBe(404);
  });
});

describe("fotografia", () => {
  it("aceita WEBP, reduz, converte para JPEG e remove metadados (EXIF/GPS)", async () => {
    const u = await createUser();
    const { id } = await createCv(u.id, {});
    const webp = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#6688aa" } })
      .withExif({ IFD0: { Artist: "Nome Privado", ImageDescription: "Casa" } })
      .webp()
      .toBuffer();
    await setCvPhoto(u.id, id, webp);
    const cv = (await getUserCv(u.id, id))!;
    const stored = (await storage().get(cv.photoKey!))!;
    const meta = await sharp(stored).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1200);
    expect(meta.exif).toBeUndefined();
    expect(stored.toString("latin1")).not.toContain("Nome Privado");
    expect(cv.showPhoto).toBe(true);
  });

  it("recusa ficheiros que não são imagens", async () => {
    const u = await createUser();
    const { id } = await createCv(u.id, {});
    await expect(setCvPhoto(u.id, id, Buffer.from("%PDF-1.4 não é imagem"))).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });

  it("o enquadramento guardado é aplicado à foto do PDF/DOCX; a rota devolve a versão enquadrada", async () => {
    const u = await createUser();
    const { id } = await createCv(u.id, {});
    // Metade esquerda vermelha, metade direita azul
    const img = await sharp({ create: { width: 800, height: 400, channels: 3, background: "#ff0000" } })
      .composite([{ input: await sharp({ create: { width: 400, height: 400, channels: 3, background: "#0000ff" } }).png().toBuffer(), left: 400, top: 0 }])
      .png()
      .toBuffer();
    await setCvPhoto(u.id, id, img);
    await saveCv(u.id, id, cvContentSchema.parse({ ...SAMPLE_CV, photoSettings: { zoom: 2, offsetX: 1, offsetY: 0, position: "right" } }));
    const cv = (await getUserCv(u.id, id))!;
    expect(toCvContent(cv).photoSettings).toEqual({ zoom: 2, offsetX: 1, offsetY: 0, position: "right" });

    const framed = (await loadFramedPhoto(cv))!;
    const { data, info } = await sharp(framed.data).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([600, 600]);
    const center = (300 * 600 + 300) * info.channels;
    expect(data[center + 2]).toBeGreaterThan(200); // azul: recorte do lado direito
    expect(data[center]).toBeLessThan(60);

    await createSession(u.id);
    const res = await cvPhoto(new Request(`http://x/api/cv/${id}/photo`), params({ id }));
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width).toBe(600);
    const raw = await cvPhoto(new Request(`http://x/api/cv/${id}/photo?raw=1`), params({ id }));
    expect((await sharp(Buffer.from(await raw.arrayBuffer())).metadata()).width).toBe(800);
  });
});

describe("admin: modelos de CV", () => {
  const design = resolveDesign({ layout: "CLASSICO", design: { structure: "single", header: "left", headingStyle: "rule", pairs: false } });
  const base = { name: "Teste", slug: "teste", description: "Modelo criado no teste.", category: "GESTAO" as const, style: "Minimal", accentColor: "#123456", sortOrder: 5, isActive: true, isPremium: false, price: null };

  it("o selo ATS e a família são calculados a partir do design", async () => {
    const ats = await adminCreateTemplate({ ...base, design });
    const side = await adminCreateTemplate({ ...base, slug: "teste-lateral", design: { ...design, structure: "sidebar-left" } });
    expect(await db.cVTemplate.findUniqueOrThrow({ where: { id: ats.id } })).toMatchObject({ isAtsFriendly: true, layout: "CLASSICO", priceMinor: null });
    expect(await db.cVTemplate.findUniqueOrThrow({ where: { id: side.id } })).toMatchObject({ isAtsFriendly: false, layout: "MODERNO" });
    await expect(adminCreateTemplate({ ...base, design })).rejects.toMatchObject({ code: "SLUG_TAKEN" });
  });

  it("duplicar cria uma cópia inativa com slug único; ativar/desativar; ordenar", async () => {
    const a = await adminCreateTemplate({ ...base, slug: "a", sortOrder: 10, price: 24900, design });
    const b = await adminCreateTemplate({ ...base, slug: "b", sortOrder: 20, design });
    const copy1 = await duplicateTemplate(a.id);
    const copy2 = await duplicateTemplate(a.id);
    const c1 = await db.cVTemplate.findUniqueOrThrow({ where: { id: copy1.id } });
    const c2 = await db.cVTemplate.findUniqueOrThrow({ where: { id: copy2.id } });
    expect(c1).toMatchObject({ slug: "a-copia", isActive: false, priceMinor: 24900 });
    expect(c2.slug).toBe("a-copia-2");

    expect(await toggleTemplate(a.id)).toBe(false);
    expect(await toggleTemplate(a.id)).toBe(true);

    const slugs = async () => (await db.cVTemplate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true } })).map((t) => t.slug);
    const before = await slugs();
    await moveTemplate(b.id, "up");
    const after = await slugs();
    expect(after.indexOf("b")).toBe(before.indexOf("b") - 1);
    await moveTemplate(a.id, "up"); // já é o primeiro: nada muda
    expect((await slugs())[0]).toBe("a");
  });

  it("imagem de pré-visualização carregada é servida publicamente e pode ser removida", async () => {
    const t = await adminCreateTemplate({ ...base, design });
    const png = await sharp({ create: { width: 1200, height: 1700, channels: 3, background: "#eeeeee" } }).png().toBuffer();
    await setTemplatePreviewImage(t.id, png);
    const row = await db.cVTemplate.findUniqueOrThrow({ where: { id: t.id } });
    expect(row.previewImageUrl).toMatch(new RegExp(`^/api/templates/${t.id}/preview`));
    const res = await templatePreview(new Request("http://x"), params({ id: t.id }));
    expect(res.status).toBe(200);
    expect((await sharp(Buffer.from(await res.arrayBuffer())).metadata()).width).toBe(400);

    await removeTemplatePreviewImage(t.id);
    expect((await db.cVTemplate.findUniqueOrThrow({ where: { id: t.id } })).previewImageKey).toBeNull();
    expect(await storage().get(row.previewImageKey!)).toBeNull();
    expect((await templatePreview(new Request("http://x"), params({ id: t.id }))).status).toBe(404);
  });
});
