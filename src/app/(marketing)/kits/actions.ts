"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { db } from "@/lib/db";
import { claimFreeProduct } from "@/server/orders";

const schema = z.object({ productId: z.string().min(1).max(40) });

export async function claimFreeProductAction(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({ productId: formData.get("productId") });
  if (!parsed.success) redirect("/kits");

  const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { slug: true } });
  if (!product) redirect("/kits");

  const user = await getCurrentUser();
  if (!user) redirect(`/registar?next=${encodeURIComponent(`/kits/${product.slug}`)}`);

  const limit = await rateLimit(`claim:${user.id}`, LIMITS.claimFree.limit, LIMITS.claimFree.window);
  if (!limit.ok) redirect("/meu-espaco/kits?erro=limite");

  const { order, created } = await claimFreeProduct(user.id, parsed.data.productId);
  if (created) await audit({ actorId: user.id, action: "order.free_claimed", entityType: "Order", entityId: order.id });
  redirect(`/meu-espaco/kits?obtido=${encodeURIComponent(order.number)}`);
}
