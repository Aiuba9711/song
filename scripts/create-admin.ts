/**
 * Cria (ou promove) o administrador principal a partir de variáveis de ambiente.
 * A senha nunca está no código.
 *
 *   ADMIN_EMAIL=admin@exemplo.com ADMIN_PASSWORD='...' npm run admin:create
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { emailSchema, passwordSchema } from "../src/lib/validation";
import { resolveDatabaseUrl } from "../src/lib/deploy-env";

async function main() {
  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? "");
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? "");
  const name = (process.env.ADMIN_NAME ?? "Administrador").trim() || "Administrador";

  if (!email.success) throw new Error("ADMIN_EMAIL inválido ou em falta.");
  if (!password.success) throw new Error(`ADMIN_PASSWORD inválida: ${password.error.issues[0]?.message}`);
  if (password.data.length < 12) throw new Error("ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: resolveDatabaseUrl() }) });
  try {
    const passwordHash = await hashPassword(password.data);
    const user = await db.user.upsert({
      where: { email: email.data },
      create: { email: email.data, name, passwordHash, role: "ADMIN", termsAcceptedAt: new Date(), profile: { create: {} } },
      update: { role: "ADMIN", passwordHash, isActive: true },
    });
    await db.auditLog.create({ data: { actorId: user.id, action: "admin.bootstrap", entityType: "User", entityId: user.id } });
    console.info(`✔ Administrador pronto: ${user.email}`);
    console.info("  Remova ADMIN_PASSWORD do ambiente depois de entrar pela primeira vez.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`✖ ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
