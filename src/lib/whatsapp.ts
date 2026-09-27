import { cleanOutput } from "@/lib/ai/guard";

/**
 * Links «Abrir WhatsApp» gerados de forma segura:
 * - destino fixo (https://wa.me/) — nunca vem do utilizador;
 * - número reduzido a dígitos, com o indicativo configurado no admin quando falta
 *   (ex.: 84 123 4567 → 258841234567), validado pelo formato internacional (E.164: 8–15 dígitos);
 * - texto limpo de caracteres invisíveis, limitado e codificado com encodeURIComponent.
 */
export const WHATSAPP_BASE = "https://wa.me/";
export const WHATSAPP_MAX_TEXT = 1500;

export type WhatsAppLink = { ok: true; url: string; phone: string | null } | { ok: false; error: string };

/** Normaliza o número; devolve null se vazio. Lança erro com mensagem se inválido. */
export function normalizeWhatsAppNumber(raw: string, countryCode = "258"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[^\d\s()+.-]/.test(trimmed)) throw new Error("O número só pode ter algarismos, espaços, «+», «-» e parênteses.");
  let digits = trimmed.replace(/\D/g, "");
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  const cc = countryCode.replace(/\D/g, "");
  if (!international && cc && !digits.startsWith(cc)) {
    // Número nacional: remove o 0 inicial (usado em alguns países) e junta o indicativo.
    digits = cc + digits.replace(/^0+/, "");
  }
  if (digits.length < 8 || digits.length > 15) throw new Error("Número inválido. Ex.: 84 123 4567 ou +258 84 123 4567.");
  if (cc === "258" && digits.startsWith("258") && digits.length !== 12) throw new Error("Os números de Moçambique têm 9 algarismos (ex.: 84 123 4567).");
  return digits;
}

export function buildWhatsAppLink(input: { phone?: string; text: string; countryCode?: string }): WhatsAppLink {
  let phone: string | null;
  try {
    phone = normalizeWhatsAppNumber(input.phone ?? "", input.countryCode ?? "258");
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const text = cleanOutput(input.text, WHATSAPP_MAX_TEXT);
  if (!text) return { ok: false, error: "Escreva a mensagem primeiro." };
  // Sem número, o WhatsApp abre e pede para escolher o contacto.
  const url = `${WHATSAPP_BASE}${phone ?? ""}?text=${encodeURIComponent(text)}`;
  return { ok: true, url, phone };
}
