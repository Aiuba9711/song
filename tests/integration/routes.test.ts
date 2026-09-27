import { beforeEach, describe, expect, it } from "vitest";
import { GET as cvDocx } from "@/app/api/cv/[id]/docx/route";
import { GET as cvPdf } from "@/app/api/cv/[id]/pdf/route";
import { GET as cvPhoto } from "@/app/api/cv/[id]/photo/route";
import { GET as productFile } from "@/app/api/files/[fileId]/route";
import { cvContentSchema } from "@/cv/schema";
import { SAMPLE_CV } from "@/cv/sample";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { createCv, saveCv, setCvPhoto } from "@/server/cv";
import { claimFreeProduct } from "@/server/orders";
import { createProduct, createUser, resetDatabase } from "../support/db";
import { pdfText, TINY_PNG } from "../support/documents";
import { resetCookies } from "../support/next-mocks";

const req = (url = "http://localhost/api") => new Request(url);
const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
});

async function loginAs() {
  const user = await createUser();
  await createSession(user.id);
  return user;
}

describe("download do CV (PDF/DOCX)", () => {
  it("exige sessão", async () => {
    const res = await cvPdf(req(), params({ id: "qualquer" }));
    expect(res.status).toBe(401);
  });

  it("o dono descarrega PDF e Word; o download fica registado", async () => {
    const user = await loginAs();
    const { id } = await createCv(user.id, {});
    await saveCv(user.id, id, cvContentSchema.parse(SAMPLE_CV));

    const pdf = await cvPdf(req(), params({ id }));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-disposition")).toContain('filename="CV-Ana-Maria-Machava.pdf"');
    expect(pdf.headers.get("cache-control")).toContain("no-store");
    const body = Buffer.from(await pdf.arrayBuffer());
    expect(pdfText(body)).toContain("Ana Maria Machava");

    const docx = await cvDocx(req(), params({ id }));
    expect(docx.status).toBe(200);
    expect(docx.headers.get("content-type")).toContain("wordprocessingml");

    const downloads = await db.download.findMany({ where: { userId: user.id } });
    expect(downloads.map((d) => d.kind).sort()).toEqual(["CV_DOCX", "CV_PDF"]);
  });

  it("CVs de outros utilizadores devolvem 404 (não públicos)", async () => {
    const owner = await createUser();
    const { id } = await createCv(owner.id, {});
    await loginAs();
    expect((await cvPdf(req(), params({ id }))).status).toBe(404);
    expect((await cvDocx(req(), params({ id }))).status).toBe(404);
  });

  it("a fotografia é privada", async () => {
    const owner = await createUser();
    const { id } = await createCv(owner.id, {});
    await setCvPhoto(owner.id, id, TINY_PNG);
    await loginAs();
    expect((await cvPhoto(req(), params({ id }))).status).toBe(404);
    resetCookies();
    await createSession(owner.id);
    const res = await cvPhoto(req(), params({ id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
  });
});

describe("download de ficheiros de produtos", () => {
  it("entrega o ficheiro apenas após pedido pago", async () => {
    const user = await loginAs();
    const product = await createProduct({ priceMinor: 0 });
    const key = `products/${product.id}/teste.pdf`;
    await storage().put({ key, body: Buffer.from("%PDF-1.4 teste"), contentType: "application/pdf" });
    const file = await db.productFile.create({
      data: { productId: product.id, name: "Guia", fileName: "guia.pdf", storageKey: key, mimeType: "application/pdf", sizeBytes: 14 },
    });

    expect((await productFile(req(), params({ fileId: file.id }))).status).toBe(404);
    await claimFreeProduct(user.id, product.id);
    const res = await productFile(req(), params({ fileId: file.id }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("guia.pdf");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("%PDF-1.4 teste");
  });
});
