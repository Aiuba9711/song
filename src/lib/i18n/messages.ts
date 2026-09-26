import type { Locale } from "./config";

/**
 * Mensagens partilhadas (navegação, estados, erros genéricos).
 * O conteúdo editorial das páginas está em pt-MZ nos próprios componentes nesta fase;
 * quando outros locais forem ativados, será movido para dicionários por página.
 */
const ptMZ = {
  "nav.home": "Início",
  "nav.createCv": "Criar CV",
  "nav.templates": "Modelos",
  "nav.kits": "Kits",
  "nav.advice": "Conselhos",
  "nav.mySpace": "Meu Espaço",
  "nav.login": "Entrar",
  "nav.register": "Criar conta",
  "nav.logout": "Sair",
  "state.loading": "A carregar…",
  "state.saving": "A guardar…",
  "state.saved": "Guardado",
  "error.generic": "Ocorreu um erro. Tente novamente.",
  "error.rateLimited": "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.",
  "error.unauthorized": "Precisa de entrar na sua conta.",
  "error.forbidden": "Não tem permissão para esta ação.",
  "disclaimer.review": "Revise todas as informações antes de enviar a candidatura.",
} as const;

export type MessageKey = keyof typeof ptMZ;

const dictionaries: Partial<Record<Locale, Record<MessageKey, string>>> = {
  "pt-MZ": ptMZ,
};

export function t(key: MessageKey, locale: Locale = "pt-MZ"): string {
  return dictionaries[locale]?.[key] ?? ptMZ[key];
}
