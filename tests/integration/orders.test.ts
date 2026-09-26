import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { claimFreeProduct, generateOrderNumber, getEntitledFile, listUserProducts } from "@/server/orders";
import { createProduct, createUser, resetDatabase } from "../support/db";

beforeEach(resetDatabase);

async function addFile(productId: string) {
  return db.productFile.create({
    data: { productId, name: "Modelo", fileName: "modelo.docx", storageKey: `products/${productId}/x.docx`, mimeType: "application/pdf", sizeBytes: 10 },
  });
}

describe("número de pedido", () => {
  it("é legível e sem caracteres ambíguos", () => {
    expect(generateOrderNumber(new Date("2026-09-26T10:00:00Z"))).toMatch(/^EF-20260926-[2-9A-HJ-NP-Z]{4}$/);
  });
});

describe("produto gratuito → pedido → entrega", () => {
  it("cria pedido pago de 0 MT com pagamento FREE e libera o produto", async () => {
    const u = await createUser();
    const p = await createProduct({ priceMinor: 0 });
    await addFile(p.id);
    const { order, created } = await claimFreeProduct(u.id, p.id);
    expect(created).toBe(true);
    const full = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true, payments: true } });
    expect(full.status).toBe("PAID");
    expect(full.totalMinor).toBe(0);
    expect(full.items[0]!.productName).toBe(p.name);
    expect(full.payments[0]).toMatchObject({ provider: "FREE", status: "SUCCEEDED" });
    const products = await listUserProducts(u.id);
    expect(products.map((i) => i.product!.id)).toEqual([p.id]);
  });

  it("é idempotente (não duplica pedidos)", async () => {
    const u = await createUser();
    const p = await createProduct({ priceMinor: 0 });
    const a = await claimFreeProduct(u.id, p.id);
    const b = await claimFreeProduct(u.id, p.id);
    expect(b.created).toBe(false);
    expect(b.order.id).toBe(a.order.id);
    expect(await db.order.count()).toBe(1);
  });

  it("recusa produtos pagos ou inativos", async () => {
    const u = await createUser();
    const paid = await createProduct({ priceMinor: 39900 });
    const draft = await createProduct({ priceMinor: 0, status: "DRAFT" });
    await expect(claimFreeProduct(u.id, paid.id)).rejects.toMatchObject({ code: "NOT_FREE" });
    await expect(claimFreeProduct(u.id, draft.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("autorização de downloads de produtos", () => {
  it("só quem tem pedido pago acede aos ficheiros", async () => {
    const buyer = await createUser();
    const other = await createUser();
    const p = await createProduct({ priceMinor: 0 });
    const file = await addFile(p.id);
    expect(await getEntitledFile(buyer.id, file.id)).toBeNull();
    await claimFreeProduct(buyer.id, p.id);
    expect((await getEntitledFile(buyer.id, file.id))?.id).toBe(file.id);
    expect(await getEntitledFile(other.id, file.id)).toBeNull();
  });

  it("pedidos não pagos não dão acesso", async () => {
    const u = await createUser();
    const p = await createProduct({ priceMinor: 39900 });
    const file = await addFile(p.id);
    await db.order.create({
      data: {
        number: "EF-TESTE-PEND",
        userId: u.id,
        customerName: u.name,
        customerEmail: u.email,
        status: "AWAITING_PAYMENT",
        subtotalMinor: 39900,
        totalMinor: 39900,
        items: { create: { productId: p.id, productName: p.name, unitPriceMinor: 39900 } },
      },
    });
    expect(await getEntitledFile(u.id, file.id)).toBeNull();
  });
});
