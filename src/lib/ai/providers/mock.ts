import { normalize } from "../guard";
import type { AIProvider } from "../provider";
import type { AiRequestParsed, CvSource, RewriteMode } from "../types";

/**
 * Provedor de DEMONSTRAÇÃO e TESTES (AI_PROVIDER="mock").
 * Não é inteligência artificial: aplica regras locais simples (espaços, maiúsculas, acentos
 * frequentes, listas, cortes) e procura palavras conhecidas. Nunca acrescenta factos e nada
 * sai do servidor. A interface identifica-o como «modo de demonstração».
 */

const ACCENTS: Record<string, string> = {
  nao: "não", tambem: "também", experiencia: "experiência", experiencias: "experiências", gestao: "gestão", informatica: "informática",
  comunicacao: "comunicação", organizacao: "organização", atencao: "atenção", responsavel: "responsável", responsaveis: "responsáveis",
  varios: "vários", varias: "várias", tecnico: "técnico", tecnica: "técnica", funcoes: "funções", funcao: "função", formacao: "formação",
  administracao: "administração", manutencao: "manutenção", instalacao: "instalação", reconciliacoes: "reconciliações", reconciliacao: "reconciliação",
  bancarias: "bancárias", bancaria: "bancária", faturacao: "faturação", relatorios: "relatórios", relatorio: "relatório", servico: "serviço",
  servicos: "serviços", pratica: "prática", areas: "áreas", area: "área", facil: "fácil", ja: "já", ate: "até", voce: "você", solucao: "solução",
  resolucao: "resolução", producao: "produção", educacao: "educação", saude: "saúde", familia: "família", dinamica: "dinâmica", dinamico: "dinâmico",
medio: "médio", basico: "básico", intermedio: "intermédio", avancado: "avançado",
};

const FILLER = /\b(muito|bastante|realmente|extremamente|sempre|totalmente|super)\s+/giu;

function fixWords(text: string): string {
  return text.replace(/\p{L}+/gu, (w) => {
    const fixed = ACCENTS[w.toLowerCase()];
    if (!fixed) return w;
    return w[0] === w[0]!.toUpperCase() ? fixed[0]!.toUpperCase() + fixed.slice(1) : fixed;
  });
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=\p{L})/gu, "$1 ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

const capitalize = (s: string) => s.replace(/^(\s*(?:[-–•*]\s*)?)(\p{Ll})/u, (_, p: string, c: string) => p + c.toUpperCase());

function sentences(text: string): string[] {
  return tidy(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function prose(text: string): string {
  return sentences(fixWords(text))
    .map((s) => capitalize(s))
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
    .join(" ");
}

function bullets(text: string): string[] {
  const lines = fixWords(text)
    .split(/\n|;/)
    .map((l) => tidy(l.replace(/^\s*[-–•*]\s*/, "")).replace(/\.$/, ""))
    .filter(Boolean);
  return lines.length > 1 ? lines : sentences(fixWords(text)).map((s) => s.replace(/\.$/, ""));
}

/** Cartas e emails: trata parágrafo a parágrafo (mantém saudação, linhas em branco e despedida). */
function rewriteParagraphs(text: string, mode: RewriteMode): string {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs
    .map((p, i) => {
      // Saudação e despedida («Exmos. Senhores,», «Com os melhores cumprimentos,»): só arrumar.
      if (/,$/.test(p) && p.length < 80) return capitalize(tidy(fixWords(p)));
      const clean = mode === "improve" || mode === "correct" ? p : p.replace(FILLER, "");
      const all = sentences(fixWords(clean)).map(capitalize);
      const keep = mode === "shorten" && i > 0 && i < paragraphs.length - 1 ? all.slice(0, Math.max(1, Math.ceil(all.length / 2))) : all;
      return keep.map((s) => (/[.!?]$/.test(s) ? s : `${s}.`)).join(" ");
    })
    .join("\n\n");
}

function rewrite(req: Extract<AiRequestParsed, { task: "rewrite" }>): { suggestion: string; notes: string[] } {
  if (req.field === "letter_body" || req.field === "email_body") {
    let out = rewriteParagraphs(req.text, req.mode);
    if (req.mode === "shorten" && out.length >= req.text.trim().length) out = out.replace(FILLER, "");
    return { suggestion: out, notes: [req.mode === "shorten" ? "Parágrafos reduzidos às ideias principais." : "Corrigidos espaços, maiúsculas e acentuação."] };
  }
  const isList = req.field === "experience_description";
  const notes: string[] = [];
  let out: string;
  switch (req.mode) {
    case "shorten": {
      if (isList) {
        const items = bullets(req.text.replace(FILLER, ""));
        out = items.slice(0, Math.max(1, Math.ceil(items.length / 2))).map((i) => `- ${capitalize(i)}`).join("\n");
      } else {
        const all = sentences(fixWords(req.text.replace(FILLER, "")));
        out = all.slice(0, Math.max(1, Math.ceil(all.length / 2))).map(capitalize).join(" ");
      }
      if (out.length >= req.text.trim().length) out = out.replace(/,[^,]*$/, ".");
      notes.push("Texto reduzido às ideias principais.");
      break;
    }
    case "objective":
      out = isList ? bullets(req.text.replace(FILLER, "")).map((i) => `- ${capitalize(i)}`).join("\n") : prose(req.text.replace(FILLER, ""));
      notes.push("Removidas palavras desnecessárias.");
      break;
    case "correct":
    case "improve":
    default:
      out = isList ? bullets(req.text).map((i) => `- ${capitalize(i)}`).join("\n") : prose(req.text);
      notes.push("Corrigidos espaços, maiúsculas e acentuação.");
  }
  return { suggestion: out, notes };
}

/** Palavras que indicam uma competência → nome da competência (sem marcas que o utilizador não escreveu). */
const SKILL_HINTS: Array<[RegExp, string]> = [
  [/\bexcel\b/, "Excel"],
  [/\bword\b/, "Word"],
  [/\bprimavera\b/, "Primavera"],
  [/atendimento/, "Atendimento ao cliente"],
  [/reconcilia/, "Reconciliações bancárias"],
  [/fatura/, "Faturação"],
  [/\bstock/, "Gestão de stock"],
  [/\bredes?\b/, "Redes de computadores"],
  [/instala\w* de software/, "Instalação de software"],
  [/apoio aos utilizadores|suporte aos utilizadores/, "Suporte aos utilizadores"],
  [/\bcaixa\b/, "Operação de caixa"],
  [/contabil/, "Contabilidade"],
  [/\bvendas?\b/, "Vendas"],
  [/arquivo/, "Arquivo de documentos"],
  [/relatorio/, "Elaboração de relatórios"],
  [/\bequipa\b/, "Trabalho em equipa"],
  [/manutencao/, "Manutenção de equipamentos"],
  [/declaraco\w* fisca/, "Declarações fiscais"],
];

function lineWith(sources: CvSource[], re: RegExp): string | null {
  for (const s of sources) for (const line of s.text.split(/\n|(?<=[.;])\s+/)) if (re.test(normalize(line))) return line.replace(/^\s*[-–•*]\s*/, "").trim();
  return null;
}

function suggestSkills(req: Extract<AiRequestParsed, { task: "suggest_skills" }>) {
  const existing = new Set(req.existingSkills.map(normalize));
  const skills: { name: string; evidence: string }[] = [];
  for (const [re, name] of SKILL_HINTS) {
    if (existing.has(normalize(name)) || skills.length >= 8) continue;
    const evidence = lineWith(req.sources, re);
    if (evidence) skills.push({ name, evidence });
  }
  return { skills };
}

function analyzeJob(req: Extract<AiRequestParsed, { task: "analyze_job" }>) {
  const lines = req.jobDescription.split(/\n/).map((l) => l.replace(/^\s*[-–•*]\s*/, "").trim()).filter(Boolean);
  const titled = lines.find((l) => /^(cargo|vaga|função|posição)\s*:/i.test(l));
  const jobTitle = (titled ? titled.replace(/^[^:]+:\s*/, "") : lines[0] ?? "").slice(0, 120);
  const jobNorm = normalize(req.jobDescription);
  const skills = SKILL_HINTS.filter(([re]) => re.test(jobNorm)).map(([, name]) => name);
  const requirements = lines.filter((l) => /experi[eê]ncia|forma[cç][aã]o|licenciatura|conhecimento|curso|carta de condu|dom[ií]nio/i.test(l)).slice(0, 10);
  // Palavras mais frequentes da vaga (≥ 6 letras), com a grafia original.
  const original = new Map<string, string>();
  const freq = new Map<string, number>();
  for (const w of req.jobDescription.match(/\p{L}+/gu) ?? []) {
    if (w.length < 6) continue;
    const k = normalize(w);
    if (!original.has(k)) original.set(k, w.toLowerCase());
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => original.get(k)!);
  const experience = lines.find((l) => /anos? de experi[eê]ncia|experi[eê]ncia (m[ií]nima|comprovada)/i.test(l)) ?? "";
  const highlights = SKILL_HINTS.filter(([re]) => re.test(jobNorm))
    .map(([re, name]) => ({ name, evidence: lineWith(req.sources, re) }))
    .filter((h): h is { name: string; evidence: string } => !!h.evidence)
    .slice(0, 5)
    .map((h) => ({ tip: `A vaga valoriza «${h.name}» e isso já consta do seu CV: coloque-o em destaque no resumo e na experiência.`, evidence: h.evidence }));
  return { jobTitle, skills, requirements, keywords, experience, highlights };
}

export class MockAiProvider implements AIProvider {
  readonly id = "mock";
  readonly label: string;
  readonly external: boolean;
  readonly demo = true;

  /** `simulateExternal` (AI_MOCK_EXTERNAL=1): comporta-se como um provedor externo para testar o pedido de consentimento. */
  constructor(opts: { simulateExternal?: boolean } = {}) {
    this.external = !!opts.simulateExternal;
    this.label = this.external ? "Demonstração (simula provedor externo)" : "Demonstração local";
  }

  async complete({ request }: Parameters<AIProvider["complete"]>[0]): Promise<unknown> {
    switch (request.task) {
      case "rewrite":
        return rewrite(request);
      case "suggest_skills":
        return suggestSkills(request);
      case "analyze_job":
        return analyzeJob(request);
    }
  }
}
