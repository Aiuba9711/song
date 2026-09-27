import "server-only";
import type { GalleryTemplate } from "@/components/templates/gallery";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CATEGORY_LABELS, listActiveTemplates } from "@/server/catalog";
import { getPaymentSettings, getPublicPaymentSummary } from "@/server/payments/settings";

/** Dados da galeria (modelos ativos, ordenados; preço de cada CV vindo da base de dados). */
export async function getGalleryTemplates(): Promise<GalleryTemplate[]> {
  const [templates, payments] = await Promise.all([listActiveTemplates(), getPublicPaymentSummary()]);
  return templates.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    category: t.category,
    categoryLabel: CATEGORY_LABELS[t.category],
    style: t.style,
    description: t.description,
    isAtsFriendly: t.isAtsFriendly,
    previewImageUrl: t.previewImageUrl,
    design: t.resolvedDesign,
    priceMinor: t.priceMinor ?? payments.cvPriceMinor,
    priceLabel: payments.cvPaywallEnabled ? formatMoney(t.priceMinor ?? payments.cvPriceMinor, payments.currency) : "Download grátis",
  }));
}

/** Estado do utilizador na galeria: modelo atual e CV em preparação (não comprado). */
export async function getUserTemplateState(userId: string) {
  const [user, payments] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { currentCvTemplate: { select: { slug: true, name: true } } } }),
    getPaymentSettings(),
  ]);
  const draft = payments.cvPaywallEnabled
    ? await db.cV.findFirst({
        where: { userId, purchasedAt: null },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, template: { select: { slug: true, name: true } } },
      })
    : null;
  return { currentSlug: user?.currentCvTemplate?.slug ?? null, currentName: user?.currentCvTemplate?.name ?? null, draft, paywall: payments.cvPaywallEnabled };
}
