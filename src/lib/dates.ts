import { defaultLocale, type Locale } from "@/lib/i18n/config";

const TZ = "Africa/Maputo";

export function formatDate(date: Date | string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: TZ }).format(new Date(date));
}

export function formatDateTime(date: Date | string, locale: Locale = defaultLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: TZ }).format(
    new Date(date),
  );
}
