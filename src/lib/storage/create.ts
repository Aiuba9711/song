import { DatabaseStorageProvider, type StoredFileClient } from "./database";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";
import type { StorageProvider } from "./types";

type StorageEnv = {
  STORAGE_DRIVER?: string;
  STORAGE_LOCAL_DIR?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_FORCE_PATH_STYLE?: string | boolean;
  [key: string]: unknown;
};

/**
 * Cria o fornecedor a partir das variáveis de ambiente (usado pela app e pelos scripts).
 * O driver «database» precisa do cliente Prisma de quem chama (app ou script).
 */
export function createStorage(e: StorageEnv, deps: { db?: StoredFileClient } = {}): StorageProvider {
  if (e.STORAGE_DRIVER === "database") {
    if (!deps.db) throw new Error("STORAGE_DRIVER=database requer o cliente da base de dados");
    return new DatabaseStorageProvider(deps.db);
  }
  if (e.STORAGE_DRIVER === "s3") {
    if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_DRIVER=s3 requer S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY");
    }
    return new S3StorageProvider({
      bucket: e.S3_BUCKET,
      region: e.S3_REGION || "auto",
      endpoint: e.S3_ENDPOINT,
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
      forcePathStyle: e.S3_FORCE_PATH_STYLE === true || e.S3_FORCE_PATH_STYLE === "true",
    });
  }
  return new LocalStorageProvider(e.STORAGE_LOCAL_DIR || "./storage");
}
