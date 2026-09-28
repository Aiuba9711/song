import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resolveStorageDriver } from "@/lib/deploy-env";
import { createStorage } from "@/lib/storage/create";
import { resetDatabase } from "../support/db";

beforeEach(async () => {
  await resetDatabase();
});

describe("armazenamento na base de dados (Vercel sem S3)", () => {
  it("grava, lê, substitui e apaga ficheiros binários", async () => {
    const storage = createStorage({ STORAGE_DRIVER: "database" }, { db });
    expect(storage.name).toBe("database");
    const body = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x10, 0x80, 0xfe]);
    await storage.put({ key: "photos/u1/a.jpg", body, contentType: "image/jpeg" });
    expect(await storage.get("photos/u1/a.jpg")).toEqual(body);
    await storage.put({ key: "photos/u1/a.jpg", body: Buffer.from("novo"), contentType: "image/png" });
    expect((await storage.get("photos/u1/a.jpg"))!.toString()).toBe("novo");
    expect(await storage.getSignedDownloadUrl("photos/u1/a.jpg", "a.jpg", 60)).toBeNull();
    await storage.delete("photos/u1/a.jpg");
    expect(await storage.get("photos/u1/a.jpg")).toBeNull();
    await storage.delete("inexistente"); // não falha
  });

  it("no Vercel sem configuração usa a base de dados; STORAGE_DRIVER explícito prevalece", () => {
    expect(resolveStorageDriver({ VERCEL: "1" })).toBe("database");
    expect(resolveStorageDriver({ VERCEL: "1", STORAGE_DRIVER: "s3" })).toBe("s3");
    expect(resolveStorageDriver({})).toBe("local");
    expect(() => createStorage({ STORAGE_DRIVER: "database" })).toThrow(/cliente/);
  });
});
