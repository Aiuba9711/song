import type { PutObjectInput, StorageProvider } from "./types";

/** Parte do cliente Prisma usada aqui (a app e os scripts passam o seu próprio cliente). */
export type StoredFileClient = {
  storedFile: {
    upsert(args: {
      where: { key: string };
      create: { key: string; contentType: string; size: number; body: Uint8Array<ArrayBuffer> };
      update: { contentType: string; size: number; body: Uint8Array<ArrayBuffer> };
    }): Promise<unknown>;
    findUnique(args: { where: { key: string }; select: { body: true } }): Promise<{ body: Uint8Array } | null>;
    deleteMany(args: { where: { key: string } }): Promise<unknown>;
  };
};

/**
 * Ficheiros guardados na própria base de dados PostgreSQL (tabela StoredFile).
 * Para alojamento serverless sem S3 (ex.: Vercel com Neon): persistente e partilhado por todas as
 * funções, privado (só servido pelas rotas com verificação de acesso). Para grandes volumes,
 * preferir S3/R2 (STORAGE_DRIVER=s3).
 */
export class DatabaseStorageProvider implements StorageProvider {
  readonly name = "database" as const;

  constructor(private readonly db: StoredFileClient) {}

  async put({ key, body, contentType }: PutObjectInput): Promise<void> {
    const bytes = new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer);
    await this.db.storedFile.upsert({
      where: { key },
      create: { key, contentType, size: body.length, body: bytes },
      update: { contentType, size: body.length, body: bytes },
    });
  }

  async get(key: string): Promise<Buffer | null> {
    const row = await this.db.storedFile.findUnique({ where: { key }, select: { body: true } });
    return row ? Buffer.from(row.body) : null;
  }

  async delete(key: string): Promise<void> {
    await this.db.storedFile.deleteMany({ where: { key } });
  }

  async getSignedDownloadUrl(): Promise<string | null> {
    return null; // servido pela própria rota, depois da verificação de permissões
  }
}
