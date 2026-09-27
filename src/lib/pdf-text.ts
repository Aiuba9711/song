/**
 * As fontes base do PDF (Helvetica/Times) só têm os caracteres Windows-1252 (WinAnsi).
 * Esta função converte o texto para esse conjunto: mantém acentos portugueses, «», “”, –, —, …, €;
 * troca variantes por equivalentes (ex.: hífens especiais → «-»), remove acentos que não
 * existem nesse conjunto (ă → a) e retira emojis e outros símbolos que ficariam ilegíveis.
 * O DOCX e o texto copiado mantêm o texto original.
 */
const ALLOWED = (() => {
  const set = new Set<string>(["\n", "\t"]);
  const decoder = new TextDecoder("windows-1252");
  for (let b = 0x20; b <= 0xff; b++) {
    if (b === 0x7f) continue;
    set.add(decoder.decode(new Uint8Array([b])));
  }
  return set;
})();

const REPLACE: Record<string, string> = {
  "‐": "-", "‑": "-", "‒": "-", "―": "—", "−": "-", "′": "'", "″": '"', "⁄": "/", "✓": "v", "✔": "v",
};

export function toWinAnsi(text: string): string {
  let out = "";
  for (const ch of text.replace(/\r\n?/g, "\n")) {
    if (ALLOWED.has(ch)) {
      out += ch;
      continue;
    }
    const mapped = REPLACE[ch];
    if (mapped && ALLOWED.has(mapped)) {
      out += mapped;
      continue;
    }
    if (/\s/u.test(ch)) {
      out += " ";
      continue;
    }
    const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
    if (base && [...base].every((c) => ALLOWED.has(c))) out += base;
    // restantes (emojis, outros alfabetos, controlo): omitidos
  }
  // Um símbolo omitido não deixa espaço antes da pontuação («organização 😀.» → «organização.»)
  return out.replace(/ {2,}/g, " ").replace(/ +([.,;:!?])/g, "$1");
}
