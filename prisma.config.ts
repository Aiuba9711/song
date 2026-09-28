import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveMigrationUrl } from "./src/lib/deploy-env";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrações: ligação direta quando o fornecedor a disponibiliza (ver src/lib/deploy-env.ts).
    url: resolveMigrationUrl(),
  },
});
