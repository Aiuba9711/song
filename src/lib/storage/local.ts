import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PutObjectInput, StorageProvider } from "./types";

/**
 * Armazenamento em disco — para desenvolvimento, testes ou servidores com disco persistente.
 * NÃO usar em plataformas serverless (o disco é efémero).
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local" as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Chave de armazenamento inválida");
    return full;
  }

  async put({ key, body }: PutObjectInput): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async getSignedDownloadUrl(): Promise<string | null> {
    return null;
  }
}
