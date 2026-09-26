import { config } from "dotenv";

/** Carrega .env.test (ou as variáveis já definidas no CI) — nunca a base de dados de desenvolvimento. */
export function loadTestEnv() {
  config({ path: ".env.test", override: false, quiet: true });
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("DATABASE_URL de teste deve apontar para uma base de dados de teste (nome contendo 'test').");
  }
}
