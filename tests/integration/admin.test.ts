import { beforeEach, describe, expect, it } from "vitest";
import { createProductAction, updateProductAction } from "@/app/admin/produtos/actions";
import { updateSettingsAction } from "@/app/admin/definicoes/actions";
import { toggleTemplateAction } from "@/app/admin/modelos/actions";
import { AuthError } from "@/lib/auth/guards";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { changeUserRole, getDashboardStats, setUserActive } from "@/server/admin";
import { createProduct, createTemplate, createUser, resetDatabase } from "../support/db";
import { resetCookies } from "../support/next-mocks";

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
});

function productForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const values = {
    name: "Kit Teste",
    slug: "kit-teste",
    shortDescription: "Descrição curta do kit",
    description: "Descrição completa do kit",
    type: "KIT",
    status: "ACTIVE",
    price: "399",
    currency: "MZN",
    features: "Item",
    faq: "",
    sortOrder: "0",
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("permissões administrativas", () => {
  it("sem sessão: ações admin recusadas (401)", async () => {
    await expect(updateSettingsAction({}, new FormData())).rejects.toMatchObject({ status: 401 });
  });

  it("USER não pode gerir produtos, definições nem modelos (403)", async () => {
    const user = await createUser();
    await createSession(user.id);
    const product = await createProduct({ priceMinor: 100 });
    await expect(updateProductAction(product.id, {}, productForm({ price: "1" }))).rejects.toBeInstanceOf(AuthError);
    await expect(updateSettingsAction({}, new FormData())).rejects.toMatchObject({ status: 403 });
    const t = await createTemplate();
    const fd = new FormData();
    fd.set("templateId", t.id);
    await expect(toggleTemplateAction(fd)).rejects.toMatchObject({ status: 403 });
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).priceMinor).toBe(100);
  });

  it("EDITOR gere modelos mas não produtos", async () => {
    const editor = await createUser({ role: "EDITOR" });
    await createSession(editor.id);
    const t = await createTemplate({ isActive: true });
    const fd = new FormData();
    fd.set("templateId", t.id);
    await toggleTemplateAction(fd);
    expect((await db.cVTemplate.findUniqueOrThrow({ where: { id: t.id } })).isActive).toBe(false);
    await expect(createProductAction({}, productForm())).rejects.toMatchObject({ status: 403 });
  });

  it("ADMIN altera o preço (sem hardcode) e a alteração fica auditada", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createSession(admin.id);
    const product = await createProduct({ priceMinor: 39900, slug: "kit-teste" });
    const res = await updateProductAction(product.id, {}, productForm({ price: "449,50" }));
    expect(res.ok).toBe(true);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).priceMinor).toBe(44950);
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "product.update" } });
    expect(log.actorId).toBe(admin.id);
    expect(log.metadata).toMatchObject({ priceBefore: 39900, priceAfter: 44950 });
  });

  it("ADMIN configura o WhatsApp nas definições", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await createSession(admin.id);
    const fd = new FormData();
    fd.set("whatsappNumber", "84 123 4567");
    fd.set("facebookUrl", "https://facebook.com/empregofacilmz");
    expect((await updateSettingsAction({}, fd)).ok).toBe(true);
    const s = await db.siteSettings.findUniqueOrThrow({ where: { id: "default" } });
    expect(s.whatsappNumber).toBe("258841234567");
    expect(s.facebookUrl).toBe("https://facebook.com/empregofacilmz");
  });
});

describe("gestão de utilizadores", () => {
  it("não permite alterar o próprio papel nem remover o último admin", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const other = await createUser({ role: "ADMIN" });
    await expect(changeUserRole(admin.id, admin.id, "USER")).rejects.toThrow(/próprio/);
    await changeUserRole(admin.id, other.id, "USER");
    const third = await createUser();
    await expect(changeUserRole(third.id, admin.id, "USER")).rejects.toThrow(/pelo menos um administrador/);
  });

  it("desativar termina as sessões do utilizador", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const u = await createUser();
    await createSession(u.id);
    await setUserActive(admin.id, u.id, false);
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).isActive).toBe(false);
  });

  it("dashboard calcula receita apenas de pedidos pagos em MZN", async () => {
    const u = await createUser();
    await db.order.createMany({
      data: [
        { number: "EF-1", userId: u.id, customerName: "A", customerEmail: "a@a.co", status: "PAID", subtotalMinor: 39900, totalMinor: 39900 },
        { number: "EF-2", userId: u.id, customerName: "A", customerEmail: "a@a.co", status: "FAILED", subtotalMinor: 69900, totalMinor: 69900 },
      ],
    });
    const stats = await getDashboardStats();
    expect(stats.revenueMinor).toBe(39900);
    expect(stats.paidOrders).toBe(1);
    expect(stats.users).toBe(1);
  });
});
