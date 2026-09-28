// Cores (fundo, texto, borda): nome de cor da paleta, valores fixos ou arbitrários que SÃO cores
// (ex.: «text-[#123456]»; «text-[15px]» é um tamanho e não entra).
const COLOR = String.raw`(?:white|black|transparent|current|inherit|[a-z]+-\d{2,3}(?:\/\d{1,3})?|\[(?:#|rgba?\(|hsla?\(|oklch\(|color:|var\()[^\]]*\])`;
const COLOR_GROUPS: [string, RegExp][] = [
  ["bg", new RegExp(`^bg-${COLOR}$`)],
  ["text", new RegExp(`^text-${COLOR}$`)],
  ["border", new RegExp(`^border-${COLOR}$`)],
];

/**
 * Junta classes CSS ignorando valores falsos. Em conflito de COR do mesmo tipo e com o mesmo
 * prefixo (ex.: «bg-white» do componente e «bg-brand-700» da página, ou «hover:bg-…»), fica a
 * última — no CSS gerado a ordem das classes no atributo não decide qual ganha.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  const tokens = classes.filter(Boolean).join(" ").split(/\s+/).filter(Boolean);
  const lastIndex = new Map<string, number>();
  const keyOf = (t: string) => {
    const i = t.lastIndexOf(":");
    const variant = i >= 0 ? t.slice(0, i + 1) : "";
    const base = t.slice(i + 1).replace(/^!/, "");
    const group = COLOR_GROUPS.find(([, re]) => re.test(base))?.[0];
    return group ? `${variant}${group}` : null;
  };
  tokens.forEach((t, i) => {
    const k = keyOf(t);
    if (k) lastIndex.set(k, i);
  });
  return tokens.filter((t, i) => {
    const k = keyOf(t);
    return !k || lastIndex.get(k) === i;
  }).join(" ");
}

/** Converte texto em slug ASCII (ex.: "Carta de Motivação" → "carta-de-motivacao"). */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Nome de ficheiro seguro para Content-Disposition. */
export function safeFileName(input: string, fallback = "documento"): string {
  const s = slugify(input);
  return s.length > 0 ? s : fallback;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
