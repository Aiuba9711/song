"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { productSchema } from "@/lib/admin-schemas";
import { audit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { buildStorageKey, storage } from "@/lib/storage";
import { detectFileType, MAX_PRODUCT_FILE_BYTES, PRODUCT_FILE_TYPES } from "@/lib/storage/files";
import { fieldErrorsOf, formDataToObject, type ActionState } from "@/lib/validation";

function revalidateCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/kits");
  if (slug) revalidatePath(`/kits/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/produtos");
}

function toData(d: z.output<typeof productSchema>) {
  return {
    name: d.name,
    slug: d.slug,
    tier: d.tier,
    shortDescription: d.shortDescription,
    description: d.description,
    type: d.type,
    status: d.status,
    priceMinor: d.price!,
    compareAtPriceMinor: d.compareAtPrice,
    currency: d.currency,
    features: d.features,
    faq: d.faq,
    isFeatured: d.isFeatured,
    sortOrder: d.sortOrder,
  };
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("products.manage");
  const parsed = productSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  let id: string;
  try {
    id = (await db.product.create({ data: toData(parsed.data), select: { id: true } })).id;
  } catch (error) {
    if (isUniqueViolation(error)) return { fieldErrors: { slug: ["Já existe um produto com este endereço."] } };
    throw error;
  }
  await audit({ actorId: user.id, action: "product.create", entityType: "Product", entityId: id, metadata: { price: parsed.data.price } });
  revalidateCatalog(parsed.data.slug);
  redirect(`/admin/produtos/${id}?criado=1`);
}

export async function updateProductAction(productId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await assertPermission("products.manage");
  const parsed = productSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const before = await db.product.findUnique({ where: { id: productId }, select: { slug: true, priceMinor: true, status: true } });
  if (!before) return { error: "Produto não encontrado." };
  try {
    await db.product.update({ where: { id: productId }, data: toData(parsed.data) });
  } catch (error) {
    if (isUniqueViolation(error)) return { fieldErrors: { slug: ["Já existe um produto com este endereço."] } };
    throw error;
  }
  await audit({
    actorId: user.id,
    action: "product.update",
    entityType: "Product",
    entityId: productId,
    metadata: { priceBefore: before.priceMinor, priceAfter: parsed.data.price, statusBefore: before.status, statusAfter: parsed.data.status },
  });
  revalidateCatalog(before.slug);
  if (before.slug !== parsed.data.slug) revalidatePath(`/kits/${parsed.data.slug}`);
  return { ok: true, message: "Produto guardado." };
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const user = await assertPermission("products.manage");
  const productId = z.string().min(1).parse(formData.get("productId"));
  const product = await db.product.findUnique({ where: { id: productId }, include: { files: true, _count: { select: { orderItems: true } } } });
  if (!product) redirect("/admin/produtos");
  if (product._count.orderItems > 0) {
    // Produtos com vendas não são apagados (histórico); ficam arquivados.
    await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
    await audit({ actorId: user.id, action: "product.archive", entityType: "Product", entityId: productId });
  } else {
    await db.product.delete({ where: { id: productId } });
    await Promise.all(product.files.map((f) => storage().delete(f.storageKey).catch(() => undefined)));
    await audit({ actorId: user.id, action: "product.delete", entityType: "Product", entityId: productId });
  }
  revalidateCatalog(product.slug);
  redirect("/admin/produtos");
}

export type UploadState = ActionState;

export async function uploadProductFileAction(productId: string, _prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await assertPermission("products.manage");
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, slug: true, _count: { select: { files: true } } } });
  if (!product) return { error: "Produto não encontrado." };
  const file = formData.get("file");
  const name = z.string().trim().max(120).parse(formData.get("name") ?? "");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { file: ["Escolha um ficheiro."] } };
  if (file.size > MAX_PRODUCT_FILE_BYTES) return { fieldErrors: { file: ["O ficheiro deve ter no máximo 4 MB."] } };
  const data = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(data);
  if (!type || !PRODUCT_FILE_TYPES.includes(type.mime)) return { fieldErrors: { file: ["Formato não permitido. Use PDF, DOCX, XLSX, PPTX ou ZIP."] } };

  const key = buildStorageKey(`products/${product.id}`, type.ext);
  await storage().put({ key, body: data, contentType: type.mime });
  const originalName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || `ficheiro.${type.ext}`;
  const created = await db.productFile.create({
    data: {
      productId: product.id,
      name: name || originalName.replace(/\.[^.]+$/, ""),
      fileName: originalName.toLowerCase().endsWith(`.${type.ext}`) ? originalName : `${originalName}.${type.ext}`,
      storageKey: key,
      mimeType: type.mime,
      sizeBytes: data.length,
      sortOrder: product._count.files,
    },
  });
  await audit({ actorId: user.id, action: "product.file_upload", entityType: "ProductFile", entityId: created.id, metadata: { productId, size: data.length } });
  revalidateCatalog(product.slug);
  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true, message: "Ficheiro carregado." };
}

export async function deleteProductFileAction(formData: FormData): Promise<void> {
  const user = await assertPermission("products.manage");
  const fileId = z.string().min(1).parse(formData.get("fileId"));
  const file = await db.productFile.findUnique({ where: { id: fileId }, include: { product: { select: { id: true, slug: true } } } });
  if (!file) return;
  await db.productFile.delete({ where: { id: fileId } });
  await storage().delete(file.storageKey).catch(() => undefined);
  await audit({ actorId: user.id, action: "product.file_delete", entityType: "ProductFile", entityId: fileId, metadata: { productId: file.product.id } });
  revalidateCatalog(file.product.slug);
  revalidatePath(`/admin/produtos/${file.product.id}`);
}
