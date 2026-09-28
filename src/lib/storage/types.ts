export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export interface StorageProvider {
  readonly name: "local" | "s3";
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /**
   * URL temporária para download direto (S3). O driver local devolve null e o ficheiro
   * é servido pela própria rota após verificação de permissões.
   */
  getSignedDownloadUrl(key: string, fileName: string, ttlSeconds: number): Promise<string | null>;
}
