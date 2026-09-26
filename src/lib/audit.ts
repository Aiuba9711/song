import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipHash?: string | null;
};

/** Regista eventos relevantes (auth, admin, compras). Nunca bloqueia o fluxo principal. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        ipHash: input.ipHash ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] falha ao registar evento", input.action, error);
  }
}
