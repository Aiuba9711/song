/**
 * Guardas do assistente de IA (funções puras, sem rede).
 *
 * 1. Minimização: emails, telefones e links são substituídos por marcadores antes de sair
 *    do servidor e repostos na resposta.
 * 2. Anti-invenção: uma sugestão é rejeitada se trouxer números, nomes próprios/siglas,
 *    emails ou links que não existem no texto que o próprio utilizador escreveu.
 * 3. Anti-injeção: o texto do utilizador vai sempre dentro de blocos delimitados, e não
 *    consegue fechar esses blocos (ver `fence`).
 */

// ─── Normalização ──────────────────────────────────────────

/** Minúsculas, sem acentos, espaços simples — para comparar «Reconciliações» com «reconciliacoes». */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Caracteres de controlo e invisíveis (inclui marcas de direção usadas para esconder texto). */
const INVISIBLE = new RegExp(
  `[${[[0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2064], [0xfeff, 0xfeff]]
    .map(([a, b]) => `\\u${a!.toString(16).padStart(4, "0")}-\\u${b!.toString(16).padStart(4, "0")}`)
    .join("")}]`,
  "g",
);

/** Remove caracteres de controlo (exceto mudança de linha e tab) e limita o tamanho. */
export function cleanOutput(text: string, max: number): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

// ─── Blocos delimitados (anti-injeção) ─────────────────────

/**
 * Coloca o texto do utilizador dentro de <tag>…</tag>. Os sinais < e > do texto são trocados
 * por ‹ e ›, por isso o utilizador não consegue fechar o bloco nem abrir outro.
 */
export function fence(tag: string, text: string): string {
  const safe = text.replace(/</g, "‹").replace(/>/g, "›");
  return `<${tag}>\n${safe}\n</${tag}>`;
}

// ─── Redação de dados pessoais ─────────────────────────────

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"']+/giu;
// Telefones: +258 84 123 4567, 841234567, 21 123 456… (≥ 8 dígitos no total)
const PHONE = /(?:\+?\d[\d ().-]{6,}\d)/g;

export type Redaction = { text: string; map: Map<string, string> };

export function redact(text: string, map: Map<string, string> = new Map()): Redaction {
  let n = map.size;
  const keep = (value: string, kind: string) => {
    for (const [k, v] of map) if (v === value) return k;
    const key = `⟦${kind}${++n}⟧`;
    map.set(key, value);
    return key;
  };
  let out = text.replace(EMAIL, (m) => keep(m, "EMAIL"));
  out = out.replace(URL, (m) => keep(m, "LINK"));
  out = out.replace(PHONE, (m) => {
    const digits = m.replace(/\D/g, "").length;
    // Intervalos de anos («2019-2020») não são telefones.
    if (digits < 8 || /^\(?\d{4}\s*[-/]\s*\d{4}\)?$/.test(m.trim())) return m;
    return keep(m, "TEL");
  });
  return { text: out, map };
}

/** Repõe os valores originais; marcadores desconhecidos (inventados pela IA) são removidos. */
export function restore(text: string, map: Map<string, string>): string {
  return text.replace(/⟦[A-Z]+\d+⟧/g, (k) => map.get(k) ?? "").replace(/ {2,}/g, " ");
}

// ─── Verificação de invenções ──────────────────────────────

const NUMBER = /\d+(?:[.,]\d+)*/g;

export function numbersIn(text: string): string[] {
  return [...new Set((text.match(NUMBER) ?? []).map((n) => n.replace(/[.,]/g, "")))];
}

const WORD = /[\p{L}\p{N}][\p{L}\p{N}&+#'’.-]*/gu;

/**
 * Nomes próprios e siglas: palavras com maiúscula que NÃO estão no início de uma frase ou
 * de um item de lista, e siglas (2+ maiúsculas) em qualquer posição.
 */
export function properTerms(text: string): string[] {
  const out = new Set<string>();
  for (const line of text.split(/\n/)) {
    const body = line.replace(/^\s*(?:[-–•*·]|\d+[.)])\s*/, "");
    let sentenceStart = true;
    for (const m of body.matchAll(WORD)) {
      const raw = m[0].replace(/[.'’-]+$/, "");
      const before = body.slice(0, m.index);
      if (/[.!?:;]\s*$/.test(before) || /\(\s*$/.test(before) || before.trim() === "") sentenceStart = true;
      const acronym = /\p{Lu}.*\p{Lu}/u.test(raw) && raw.replace(/[^\p{Lu}]/gu, "").length >= 2;
      const capital = /^\p{Lu}/u.test(raw);
      if (raw.length > 1 && (acronym || (capital && !sentenceStart))) out.add(raw);
      sentenceStart = false;
    }
  }
  return [...out];
}

export function linksIn(text: string): string[] {
  return [...new Set([...(text.match(EMAIL) ?? []), ...(text.match(URL) ?? [])])];
}

export type Ungrounded = { numbers: string[]; terms: string[]; links: string[] };

/** Siglas do próprio vocabulário da aplicação (não são afirmações sobre o candidato). */
const APP_TERMS = new Set(["cv", "ia"]);

/** O que existe em `output` mas não existe em nenhum texto de `sources` (escrito pelo utilizador). */
export function findUngrounded(output: string, sources: string[]): Ungrounded {
  const source = normalize(sources.join("\n"));
  const sourceNumbers = new Set(numbersIn(sources.join("\n")));
  const sourceWords = new Set(source.split(/[^\p{L}\p{N}&+#]+/u).filter(Boolean));
  const termKnown = (term: string) => {
    const t = normalize(term);
    if (source.includes(t)) return true;
    // «Contabilidade» ↔ «contabilidade,» / plural simples
    return t.split(/[^\p{L}\p{N}&+#]+/u).every((w) => !w || sourceWords.has(w) || sourceWords.has(w.replace(/s$/, "")) || sourceWords.has(`${w}s`));
  };
  return {
    numbers: numbersIn(output).filter((n) => !sourceNumbers.has(n)),
    terms: properTerms(output).filter((t) => !APP_TERMS.has(normalize(t)) && !termKnown(t)),
    links: linksIn(output).filter((l) => !source.includes(normalize(l))),
  };
}

export function isGrounded(u: Ungrounded): boolean {
  return u.numbers.length === 0 && u.terms.length === 0 && u.links.length === 0;
}

export function describeUngrounded(u: Ungrounded): string[] {
  return [...u.terms, ...u.numbers, ...u.links].slice(0, 6);
}

// ─── Relação entre um termo e o texto do utilizador ────────

const STOP = new Set(
  "a o as os um uma uns umas de do da dos das em no na nos nas por para com sem e ou que se ao aos à às pelo pela pelos pelas sobre entre como mais muito muita seu sua seus suas".split(" "),
);

function stems(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => w.slice(0, 5));
}

/** Pelo menos uma palavra significativa de `a` aparece (pela raiz) em `b`. */
export function sharesStem(a: string, b: string): boolean {
  const bs = new Set(stems(b));
  return stems(a).some((s) => bs.has(s));
}

/** Fração das palavras significativas de `item` que aparecem (pela raiz) em `text`. */
export function stemCoverage(item: string, text: string): number {
  const is = stems(item);
  if (is.length === 0) return 0;
  const ts = new Set(stems(text));
  return is.filter((s) => ts.has(s)).length / is.length;
}

/** A citação existe mesmo no texto do utilizador (ignorando acentos, maiúsculas e espaços)? */
export function quoteFound(quote: string, sources: string[]): boolean {
  const q = normalize(quote).replace(/^[-–•*\s«"“]+|[»"”.\s]+$/g, "");
  if (q.length < 3) return false;
  return normalize(sources.join("\n")).includes(q);
}
