import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { loadTestEnv } from "./load-env";

export default function setup() {
  loadTestEnv();
  // Aplica as migrações à base de dados de teste.
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: process.env });
  return () => {
    rmSync(process.env.STORAGE_LOCAL_DIR ?? "./storage-test", { recursive: true, force: true });
  };
}
