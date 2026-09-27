import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { jsonError, PRIVATE_FILE_HEADERS } from "@/lib/http";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/** Comprovativo de pagamento — apenas para administradores. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, "Precisa de entrar na sua conta.");
  if (!can(user.role, "payments.verify")) return jsonError(404, "Não encontrado.");
  const { id } = await params;
  const payment = await db.payment.findUnique({ where: { id }, select: { proofKey: true, proofMime: true } });
  if (!payment?.proofKey || !payment.proofMime) return jsonError(404, "Sem comprovativo.");
  const data = await storage().get(payment.proofKey);
  if (!data) return jsonError(404, "Comprovativo indisponível.");
  return new Response(new Uint8Array(data), {
    headers: {
      ...PRIVATE_FILE_HEADERS,
      "Content-Type": payment.proofMime,
      "Content-Disposition": "inline",
      // O ficheiro é mostrado isolado (sem scripts), mesmo sendo um PDF.
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}
