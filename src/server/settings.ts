import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

export type PublicSettings = {
  siteName: string;
  whatsappNumber: string | null;
  whatsappMessage: string | null;
  /** Indicativo usado nos links «Abrir WhatsApp» quando o número não o tem */
  whatsappCountryCode: string;
  whatsappLinksEnabled: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
  supportHours: string | null;
};

export const SETTINGS_TAG = "site-settings";

const EMPTY: PublicSettings = {
  siteName: "Emprego Fácil MZ",
  whatsappNumber: null,
  whatsappMessage: null,
  whatsappCountryCode: "258",
  whatsappLinksEnabled: true,
  contactEmail: null,
  contactPhone: null,
  facebookUrl: null,
  instagramUrl: null,
  tiktokUrl: null,
  linkedinUrl: null,
  supportHours: null,
};

export async function readSettings(): Promise<PublicSettings> {
  const row = await db.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) return EMPTY;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, updatedAt, ...rest } = row;
  return rest;
}

/** Definições públicas com cache (invalidada pelo admin via tag). Nunca falha a página. */
export const getSiteSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    try {
      return await readSettings();
    } catch (error) {
      console.error("[settings] não foi possível ler as definições", error);
      return EMPTY;
    }
  },
  ["site-settings-v2"],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

export function whatsappLink(number: string, message?: string | null): string {
  const digits = number.replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}
