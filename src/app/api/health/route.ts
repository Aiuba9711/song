import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Verificação de saúde para monitorização (não expõe detalhes internos). */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
