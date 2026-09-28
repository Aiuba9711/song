import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createStorage } from "./create";
import type { StorageProvider } from "./types";

export type { StorageProvider } from "./types";

let instance: StorageProvider | null = null;

export function storage(): StorageProvider {
  instance ??= createStorage(env(), { db });
  return instance;
}

/** Gera uma chave única e não adivinhável, ex.: products/<id>/<uuid>.docx */
export function buildStorageKey(prefix: string, extension: string): string {
  const ext = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${prefix.replace(/[^a-zA-Z0-9/_-]/g, "")}/${randomUUID()}${ext ? `.${ext}` : ""}`;
}
