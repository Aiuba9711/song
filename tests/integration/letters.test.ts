import { beforeEach, describe, expect, it } from "vitest";
import { updateSettingsAction } from "@/app/admin/definicoes/actions";
import { updatePaymentSettingsAction } from "@/app/admin/definicoes/pagamentos/actions";
import { GET as letterDocx } from "@/app/api/cartas/[id]/docx/route";
import { GET as letterPdf } from "@/app/api/cartas/[id]/pdf/route";
import { saveLetterAction } from "@/app/meu-espaco/cartas/actions";
import { generateLetter } from "@/letters/compose";
import { LETTER_LIMITS, letterSchema } from "@/letters/types";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canDownloadLetter, createCheckoutOrder, getLetterPrice, resolveCheckoutItem } from "@/server/checkout";
import { createLetter, deleteLetter, duplicateLetter, getUserLetter, MAX_LETTERS_PER_USER, saveLetter, toLetterContent } from "@/server/letters";
import { getManualProvider } from "@/server/payments/registry";
import { getSiteSettings } from "@/server/settings";
import { createPaymentSettings, createUser, resetDatabase } from "../support/db";
import { pdfText } from "../support/documents";
import { resetCookies } from "../support/next-mocks";

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api");
const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
};

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  await createPaymentSettings(); // CV pago (199 MT); carta gratuita por omissão
});

describe("cartas: criação, edição e privacidade", () => {
  it("nova carta pré-preenchida só com os dados da conta, já com texto gerado", async () => {
    const u = await createUser({ name: "Carla Nhantumbo", email: "carla@teste.co.mz" });
    const { id } = await createLetter(u.id, "MOTIVACAO");
    const l = (await getUserLetter(u.id, id))!;
    expect(l).toMatchObject({ type: "MOTIVACAO", title: "Carta de motivação", senderName: "Carla Nhantumbo", senderContact: "carla@teste.co.mz", company: "", experience: "" });
    expect(l.subject).toBe("Carta de motivação");
    expect(l.body).toContain("Exmos. Senhores,");
    expect(l.body).toContain("carla@teste.co.mz");
  });

  it("guarda a edição (com caracteres especiais) e mantém-na exatamente", async () => {
    const u = await createUser();
    const { id } = await createLetter(u.id, "CANDIDATURA");
    const content = letterSchema.parse({ ...toLetterContent((await getUserLetter(u.id, id))!), company: "Café & Cª «Lda»", position: "Técnico <júnior>" });
    const edited = { ...content, ...generateLetter(content) };
    edited.body += "\n\nP.S.: disponível já — 😀";
    await saveLetter(u.id, id, edited);
    const back = toLetterContent((await getUserLetter(u.id, id))!);
    expect(back.body).toBe(edited.body);
    expect(back.body).toContain("Café & Cª «Lda»");
    expect(back.subject).toBe("Candidatura à vaga de Técnico <júnior>");
  });

  it("ação de gravação valida limites e só aceita o dono", async () => {
    const u = await createUser();
    const other = await createUser();
    const { id } = await createLetter(u.id, "CANDIDATURA");
    const content = toLetterContent((await getUserLetter(u.id, id))!);
    await createSession(u.id);
    const long = await saveLetterAction(id, { ...content, body: "x".repeat(LETTER_LIMITS.body + 1) });
    expect(long).toMatchObject({ ok: false });
    if (!long.ok) expect(long.fieldErrors?.body).toMatch(/6000/);
    expect((await saveLetterAction(id, { ...content, title: "" })).ok).toBe(false);
    expect((await saveLetterAction(id, { ...content, body: "a".repeat(LETTER_LIMITS.body) })).ok).toBe(true);
    resetCookies();
    await createSession(other.id);
    expect(await saveLetterAction(id, content)).toMatchObject({ ok: false, error: "Carta não encontrada." });
    expect(await getUserLetter(other.id, id)).toBeNull();
    await expect(deleteLetter(other.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(duplicateLetter(other.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("duplicar, eliminar e limite por utilizador", async () => {
    const u = await createUser();
    const { id } = await createLetter(u.id, "CANDIDATURA");
    const copy = await duplicateLetter(u.id, id);
    expect((await getUserLetter(u.id, copy.id))?.title).toBe("Carta de candidatura (cópia)");
    await deleteLetter(u.id, copy.id);
    expect(await getUserLetter(u.id, copy.id)).toBeNull();
    await db.coverLetter.createMany({ data: Array.from({ length: MAX_LETTERS_PER_USER - 1 }, (_, i) => ({ userId: u.id, type: "CANDIDATURA" as const, title: `C${i}` })) });
    await expect(createLetter(u.id, "CANDIDATURA")).rejects.toMatchObject({ code: "LIMIT" });
  });
});

describe("download em PDF e Word", () => {
  it("gratuito por omissão: PDF e DOCX só para o dono, com registo do download", async () => {
    const u = await createUser({ name: "Ana Machava" });
    const { id } = await createLetter(u.id, "CANDIDATURA");
    expect((await letterPdf(req(), params(id))).status).toBe(401);
    await createSession(u.id);
    const pdf = await letterPdf(req(), params(id));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-disposition")).toContain("Carta-de-candidatura-Ana-Machava.pdf");
    expect(pdfText(Buffer.from(await pdf.arrayBuffer())).replace(/\s+/g, "")).toContain("AnaMachava");
    const docx = await letterDocx(req(), params(id));
    expect(docx.status).toBe(200);
    expect(docx.headers.get("content-type")).toContain("wordprocessingml");
    const downloads = await db.download.findMany({ where: { userId: u.id } });
    expect(downloads.map((d) => d.kind).sort()).toEqual(["LETTER_DOCX", "LETTER_PDF"]);
    expect(downloads.every((d) => d.letterId === id)).toBe(true);

    const intruder = await createUser();
    resetCookies();
    await createSession(intruder.id);
    expect((await letterPdf(req(), params(id))).status).toBe(404);
  });

  it("com preço definido no admin: 402 até o pagamento ser confirmado", async () => {
    await createPaymentSettings({ letterPriceMinor: 4900 });
    const u = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await createLetter(u.id, "CANDIDATURA");
    await createSession(u.id);
    expect((await letterPdf(req(), params(id))).status).toBe(402);
    expect(await getLetterPrice()).toMatchObject({ priceMinor: 4900, paid: true });

    const item = await resolveCheckoutItem(u.id, { letterId: id });
    expect(item).toMatchObject({ kind: "LETTER_UNLOCK", letterId: id, unitPriceMinor: 4900 });
    const { orderNumber } = await createCheckoutOrder(u.id, { target: { letterId: id }, method: "MPESA", customer: { name: "Cliente", email: "c@teste.co.mz", phone: null } });
    const payment = await db.payment.findFirstOrThrow({ where: { order: { number: orderNumber } } });
    await getManualProvider("MPESA").submitCustomerReport(payment.id, u.id, { payerName: "Cliente", payerPhone: "841234567", transactionId: "CARTA123", reportedPaidAt: new Date() });
    expect(await canDownloadLetter(u.id, id)).toBe(false); // informar o código não liberta
    await getManualProvider("MPESA").verifyPayment(payment.id, { decision: "CONFIRM", reviewer: { id: admin.id, role: "ADMIN" } });
    expect((await letterPdf(req(), params(id))).status).toBe(200);
    expect((await db.coverLetter.findUniqueOrThrow({ where: { id } })).purchasedAt).not.toBeNull();
    await expect(resolveCheckoutItem(u.id, { letterId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });

  it("carta gratuita não pode ser comprada; carta de outro utilizador também não", async () => {
    const u = await createUser();
    const other = await createUser();
    const { id } = await createLetter(u.id, "CANDIDATURA");
    await expect(resolveCheckoutItem(u.id, { letterId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" });
    await createPaymentSettings({ letterPriceMinor: 4900 });
    await expect(resolveCheckoutItem(other.id, { letterId: id })).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });
});

describe("preços configuráveis (sem valores no código)", () => {
  it("admin define o preço do CV e da carta; vazio = carta gratuita", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createSession(admin.id);
    const base = { currency: "MZN", defaultPrice: "199", cvPaywallEnabled: "on" };
    expect((await updatePaymentSettingsAction({}, form({ ...base, letterPrice: "49,50" }))).ok).toBe(true);
    let s = await db.paymentSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect([s.defaultPriceMinor, s.letterPriceMinor]).toEqual([19900, 4950]);
    expect((await updatePaymentSettingsAction({}, form({ ...base, letterPrice: "abc" }))).fieldErrors?.letterPrice).toBeTruthy();
    expect((await updatePaymentSettingsAction({}, form(base))).ok).toBe(true);
    s = await db.paymentSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect(s.letterPriceMinor).toBe(0);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "settings.payments_update" }, orderBy: { createdAt: "desc" } });
    expect(log.metadata).toMatchObject({ letterPriceMinor: { from: 4950, to: 0 } });
  });

  it("admin configura o indicativo e o botão «Abrir WhatsApp»", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createSession(admin.id);
    expect((await updateSettingsAction({}, form({ whatsappCountryCode: "abc" }))).fieldErrors?.whatsappCountryCode).toBeTruthy();
    expect((await updateSettingsAction({}, form({ whatsappCountryCode: "+27" }))).ok).toBe(true);
    let s = await db.siteSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect([s.whatsappCountryCode, s.whatsappLinksEnabled]).toEqual(["27", false]);
    expect((await updateSettingsAction({}, form({ whatsappLinksEnabled: "on" }))).ok).toBe(true);
    s = await db.siteSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect([s.whatsappCountryCode, s.whatsappLinksEnabled]).toEqual(["258", true]);
    expect(typeof (await getSiteSettings()).whatsappCountryCode).toBe("string");
  });
});
