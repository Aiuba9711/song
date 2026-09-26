import { describe, expect, it } from "vitest";
import { detectFileType } from "@/lib/storage/files";
import { TINY_PNG } from "../support/documents";
import { LocalStorageProvider } from "@/lib/storage/local";

describe("deteção de tipos de ficheiro (magic bytes)", () => {
  it("reconhece PNG, JPEG e PDF", () => {
    expect(detectFileType(TINY_PNG)?.mime).toBe("image/png");
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime).toBe("image/jpeg");
    expect(detectFileType(Buffer.from("%PDF-1.7\n"))?.mime).toBe("application/pdf");
  });
  it("não confia na extensão: HTML/SVG disfarçados são rejeitados", () => {
    expect(detectFileType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectFileType(Buffer.from("<!doctype html><script>"))).toBeNull();
  });
});

describe("armazenamento local", () => {
  it("impede path traversal", async () => {
    const s = new LocalStorageProvider("./storage-test");
    await expect(s.put({ key: "../../etc/passwd", body: Buffer.from("x"), contentType: "text/plain" })).rejects.toThrow();
  });
  it("guarda, lê e apaga", async () => {
    const s = new LocalStorageProvider("./storage-test");
    await s.put({ key: "unit/a.bin", body: Buffer.from("olá"), contentType: "application/octet-stream" });
    expect((await s.get("unit/a.bin"))?.toString()).toBe("olá");
    await s.delete("unit/a.bin");
    expect(await s.get("unit/a.bin")).toBeNull();
  });
});
