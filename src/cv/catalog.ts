import type { TemplateDesignInput } from "./design";
import type { CvLayoutId } from "./types";

/**
 * Catálogo inicial de modelos originais (criados para o Emprego Fácil MZ, inspirados em boas
 * práticas de design de currículos — não copiam modelos de terceiros).
 *
 * Cada modelo = categoria + estilo + design declarativo. O seed cria-os na base de dados;
 * depois são geridos no painel (Modelos de CV).
 */
export type TemplateCategoryId =
  | "PRIMEIRO_EMPREGO"
  | "RECEM_FORMADO"
  | "ADMINISTRATIVO"
  | "CONTABILIDADE"
  | "RECURSOS_HUMANOS"
  | "SAUDE"
  | "ENFERMAGEM"
  | "OPTOMETRIA"
  | "EDUCACAO"
  | "ENGENHARIA"
  | "INFORMATICA"
  | "MARKETING"
  | "VENDAS"
  | "ATENDIMENTO_CLIENTE"
  | "GESTAO"
  | "FINANCAS"
  | "CONSTRUCAO"
  | "LOGISTICA"
  | "HOTELARIA"
  | "MOTORISTA"
  | "TECNICO_PROFISSIONAL"
  | "EXECUTIVO"
  | "GERAL";

export type CatalogTemplate = {
  slug: string;
  name: string;
  category: TemplateCategoryId;
  style: string;
  description: string;
  layout: CvLayoutId; // família de base
  accentColor: string;
  isAtsFriendly: boolean;
  design: TemplateDesignInput;
};

const ATS_BASE: TemplateDesignInput = { structure: "single", entryStyle: "classic", skillsStyle: "list", pairs: false };

export const CATALOG: CatalogTemplate[] = [
  // ── Primeiro emprego / recém-formado ─────────────────────
  {
    slug: "primeiro-emprego",
    name: "Primeiro Emprego",
    category: "PRIMEIRO_EMPREGO",
    style: "Clean",
    description: "Uma coluna, títulos claros e espaço para formação, estágios e voluntariado. Ideal para quem procura o primeiro emprego.",
    layout: "CLASSICO",
    accentColor: "#1d40d8",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "center", headingStyle: "rule", font: "sans", photoShape: "circle", photoPosition: "center" },
  },
  {
    slug: "primeiro-passo",
    name: "Primeiro Passo",
    category: "PRIMEIRO_EMPREGO",
    style: "Modern",
    description: "Barra lateral suave com competências e idiomas, linha do tempo para estágios e projetos.",
    layout: "MODERNO",
    accentColor: "#0f766e",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "tint", header: "left", headingStyle: "dot", entryStyle: "timeline", skillsStyle: "list", photoShape: "circle", photoPosition: "center", sidebarSections: ["skills", "languages", "certifications"] },
  },
  {
    slug: "academico",
    name: "Académico",
    category: "RECEM_FORMADO",
    style: "Academic",
    description: "Tipografia serifada e estrutura sóbria que valoriza a formação, cursos e certificações.",
    layout: "CLASSICO",
    accentColor: "#1e3a8a",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "center", headingStyle: "caps", font: "serif", entryStyle: "stacked", photoShape: "rounded", photoPosition: "center" },
  },
  {
    slug: "diploma",
    name: "Diploma",
    category: "RECEM_FORMADO",
    style: "Modern Blue",
    description: "Duas colunas equilibradas: percurso à esquerda, competências e cursos à direita.",
    layout: "MODERNO",
    accentColor: "#0369a1",
    isAtsFriendly: false,
    design: { structure: "split", header: "left", headingStyle: "bar", entryStyle: "classic", skillsStyle: "tags", photoShape: "circle", photoPosition: "left", sidebarSections: ["skills", "languages", "courses", "certifications"] },
  },
  // ── Administrativo / contabilidade ───────────────────────
  {
    slug: "administrativo",
    name: "Administrativo",
    category: "ADMINISTRATIVO",
    style: "Professional",
    description: "Sóbrio e organizado, para secretariado, assistência administrativa e atendimento.",
    layout: "CLASSICO",
    accentColor: "#334155",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "left", headingStyle: "rule", skillsStyle: "inline", photoShape: "square", photoPosition: "right" },
  },
  {
    slug: "secretariado",
    name: "Secretariado",
    category: "ADMINISTRATIVO",
    style: "Corporate",
    description: "Faixa de cabeçalho discreta e títulos em caixa — transmite organização e rigor.",
    layout: "EXECUTIVO",
    accentColor: "#1e3a8a",
    isAtsFriendly: false,
    design: { structure: "single", header: "band", headingStyle: "box", entryStyle: "date-left", skillsStyle: "columns", pairs: true, photoShape: "rounded", photoPosition: "right" },
  },
  {
    slug: "contabilidade",
    name: "Contabilidade",
    category: "CONTABILIDADE",
    style: "Executive",
    description: "Datas em coluna própria e títulos serifados, para contabilistas, técnicos financeiros e auditores.",
    layout: "EXECUTIVO",
    accentColor: "#1e3a8a",
    isAtsFriendly: false,
    design: { structure: "single", header: "band", headingStyle: "serif-line", font: "serif", entryStyle: "date-left", skillsStyle: "list", pairs: false, density: "compact", photoShape: "square", photoPosition: "right" },
  },
  {
    slug: "balanco",
    name: "Balanço",
    category: "CONTABILIDADE",
    style: "ATS Friendly",
    description: "Preto e branco, contactos em lista e texto simples: lido sem erros pelos sistemas de recrutamento.",
    layout: "CLASSICO",
    accentColor: "#111827",
    isAtsFriendly: true,
    design: { photo: false, ...ATS_BASE, header: "stacked", headingStyle: "caps", palette: "mono", entryStyle: "stacked", skillsStyle: "inline", photoShape: "square", photoPosition: "right" },
  },
  // ── Recursos humanos ─────────────────────────────────────
  {
    slug: "recursos-humanos",
    name: "Recursos Humanos",
    category: "RECURSOS_HUMANOS",
    style: "Sidebar",
    description: "Barra lateral com competências interpessoais e idiomas, para gestão de pessoas e recrutamento.",
    layout: "MODERNO",
    accentColor: "#0e7490",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "accent", header: "left", headingStyle: "bar", entryStyle: "timeline", skillsStyle: "list", photoShape: "circle", photoPosition: "center" },
  },
  {
    slug: "pessoas-e-cultura",
    name: "Pessoas & Cultura",
    category: "RECURSOS_HUMANOS",
    style: "Elegant",
    description: "Cabeçalho centrado, títulos com sublinhado curto e competências em etiquetas.",
    layout: "CLASSICO",
    accentColor: "#9f1239",
    isAtsFriendly: false,
    design: { structure: "single", header: "center", headingStyle: "underline", font: "mixed", entryStyle: "classic", skillsStyle: "tags", photoShape: "circle", photoPosition: "center" },
  },
  // ── Saúde / enfermagem / optometria ─────────────────────
  {
    slug: "saude",
    name: "Saúde",
    category: "SAUDE",
    style: "Clean",
    description: "Claro e profissional, para técnicos de saúde, farmácia, laboratório e medicina.",
    layout: "CLASSICO",
    accentColor: "#0f766e",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "left", headingStyle: "rule", photoShape: "circle", photoPosition: "left" },
  },
  {
    slug: "clinico",
    name: "Clínico",
    category: "SAUDE",
    style: "Professional Green",
    description: "Barra lateral verde suave à direita, com certificações e idiomas em destaque.",
    layout: "MODERNO",
    accentColor: "#15803d",
    isAtsFriendly: false,
    design: { structure: "sidebar-right", sidebarTone: "tint", header: "left", headingStyle: "dot", entryStyle: "classic", skillsStyle: "list", photoShape: "circle", photoPosition: "center", sidebarSections: ["skills", "languages", "certifications", "courses"] },
  },
  {
    slug: "enfermagem",
    name: "Enfermagem",
    category: "ENFERMAGEM",
    style: "Professional",
    description: "Contactos à direita e competências em duas colunas — prático para enfermeiros e parteiras.",
    layout: "CLASSICO",
    accentColor: "#0369a1",
    isAtsFriendly: false,
    design: { structure: "single", header: "split", headingStyle: "rule", entryStyle: "classic", skillsStyle: "columns", pairs: true, photoShape: "circle", photoPosition: "left" },
  },
  {
    slug: "cuidados",
    name: "Cuidados",
    category: "ENFERMAGEM",
    style: "Timeline",
    description: "Linha do tempo para estágios clínicos e experiência hospitalar, títulos com ponto de cor.",
    layout: "MODERNO",
    accentColor: "#0f766e",
    isAtsFriendly: false,
    design: { structure: "single", header: "left", headingStyle: "dot", entryStyle: "timeline", skillsStyle: "tags", photoShape: "circle", photoPosition: "right" },
  },
  {
    slug: "visao",
    name: "Visão",
    category: "OPTOMETRIA",
    style: "Modern",
    description: "Barra lateral escura e linha do tempo — moderno e focado, para optometristas e técnicos de óptica.",
    layout: "MODERNO",
    accentColor: "#0369a1",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "dark", header: "left", headingStyle: "bar", entryStyle: "timeline", skillsStyle: "list", photoShape: "circle", photoPosition: "center" },
  },
  {
    slug: "optica-clinica",
    name: "Óptica Clínica",
    category: "OPTOMETRIA",
    style: "Minimal",
    description: "Minimalista e fácil de ler, com experiência clínica e certificações bem organizadas.",
    layout: "CLASSICO",
    accentColor: "#0f766e",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "left", headingStyle: "caps", entryStyle: "stacked", skillsStyle: "inline", photoShape: "rounded", photoPosition: "right" },
  },
  // ── Educação ─────────────────────────────────────────────
  {
    slug: "educacao",
    name: "Educação",
    category: "EDUCACAO",
    style: "Sidebar",
    description: "Para professores, formadores e educadores — barra lateral clara à direita com cursos e certificações.",
    layout: "MODERNO",
    accentColor: "#a16207",
    isAtsFriendly: false,
    design: { structure: "sidebar-right", sidebarTone: "tint", header: "left", headingStyle: "rule", entryStyle: "classic", skillsStyle: "list", photoShape: "rounded", photoPosition: "center", sidebarSections: ["skills", "languages", "courses", "certifications"] },
  },
  {
    slug: "sala-de-aula",
    name: "Sala de Aula",
    category: "EDUCACAO",
    style: "Academic",
    description: "Serifado e tradicional, adequado a concursos na área da educação.",
    layout: "CLASSICO",
    accentColor: "#9a3412",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "center", headingStyle: "rule", font: "serif", photoShape: "rounded", photoPosition: "center" },
  },
  // ── Engenharia / informática ────────────────────────────
  {
    slug: "engenharia",
    name: "Engenharia",
    category: "ENGENHARIA",
    style: "Classic",
    description: "Clássico e sóbrio, com cabeçalho centrado e datas à esquerda — para engenheiros e técnicos com projetos e certificações.",
    layout: "CLASSICO",
    accentColor: "#9a3412",
    isAtsFriendly: false,
    design: { structure: "single", header: "center", headingStyle: "serif-line", font: "serif", entryStyle: "date-left", skillsStyle: "columns", pairs: true, photoShape: "square", photoPosition: "left" },
  },
  {
    slug: "estrutura",
    name: "Estrutura",
    category: "ENGENHARIA",
    style: "Corporate",
    description: "Duas colunas com contactos à direita e títulos em caixa — técnico e organizado.",
    layout: "CLASSICO",
    accentColor: "#334155",
    isAtsFriendly: false,
    design: { structure: "split", header: "split", headingStyle: "box", entryStyle: "classic", skillsStyle: "list", photoShape: "square", photoPosition: "left", sidebarSections: ["skills", "languages", "certifications", "courses"] },
  },
  {
    slug: "informatica",
    name: "Informática",
    category: "INFORMATICA",
    style: "Sidebar",
    description: "Barra lateral escura com competências técnicas em evidência, para TI, suporte, redes e programação.",
    layout: "MODERNO",
    accentColor: "#1d4ed8",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "dark", header: "left", headingStyle: "box", entryStyle: "stacked", skillsStyle: "list", photoShape: "square", photoPosition: "center", sidebarSections: ["skills", "certifications", "languages", "courses"] },
  },
  {
    slug: "codigo",
    name: "Código",
    category: "INFORMATICA",
    style: "Minimal",
    description: "Minimal e direto, com competências em etiquetas e experiência compacta.",
    layout: "CLASSICO",
    accentColor: "#4338ca",
    isAtsFriendly: false,
    design: { structure: "single", header: "left", headingStyle: "caps", entryStyle: "stacked", skillsStyle: "tags", density: "compact", photoShape: "rounded", photoPosition: "right" },
  },
  // ── Marketing / vendas / atendimento ────────────────────
  {
    slug: "marketing",
    name: "Marketing",
    category: "MARKETING",
    style: "Creative",
    description: "Barra lateral à direita e linha do tempo — criativo sem exageros, para marketing e comunicação.",
    layout: "MODERNO",
    accentColor: "#be123c",
    isAtsFriendly: false,
    design: { structure: "sidebar-right", sidebarTone: "accent", header: "left", headingStyle: "dot", entryStyle: "timeline", skillsStyle: "list", photoShape: "circle", photoPosition: "center" },
  },
  {
    slug: "digital",
    name: "Digital",
    category: "MARKETING",
    style: "Modern",
    description: "Faixa de cor no topo e competências em etiquetas, para marketing digital e redes sociais.",
    layout: "EXECUTIVO",
    accentColor: "#6d28d9",
    isAtsFriendly: false,
    design: { structure: "single", header: "band", headingStyle: "bar", entryStyle: "timeline", skillsStyle: "tags", photoShape: "circle", photoPosition: "right" },
  },
  {
    slug: "vendas-marketing",
    name: "Vendas",
    category: "VENDAS",
    style: "Modern",
    description: "Faixa de cor no topo e barra lateral, para vendas, promoção e atendimento comercial.",
    layout: "MODERNO",
    accentColor: "#be123c",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "tint", header: "band", headingStyle: "dot", entryStyle: "classic", skillsStyle: "list", photoShape: "circle", photoPosition: "left" },
  },
  {
    slug: "comercial",
    name: "Comercial",
    category: "VENDAS",
    style: "Professional",
    description: "Contactos à direita, experiência em linha do tempo e competências em etiquetas — resultados em destaque.",
    layout: "CLASSICO",
    accentColor: "#c2410c",
    isAtsFriendly: false,
    design: { structure: "single", header: "split", headingStyle: "bar", entryStyle: "timeline", skillsStyle: "tags", pairs: false, photoShape: "rounded", photoPosition: "left" },
  },
  {
    slug: "atendimento",
    name: "Atendimento",
    category: "ATENDIMENTO_CLIENTE",
    style: "Clean",
    description: "Simples e arejado, com competências numa linha — para atendimento ao público, receção e call center.",
    layout: "CLASSICO",
    accentColor: "#0369a1",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "left", headingStyle: "underline", skillsStyle: "inline", photoShape: "circle", photoPosition: "right" },
  },
  {
    slug: "contacto",
    name: "Contacto",
    category: "ATENDIMENTO_CLIENTE",
    style: "Sidebar",
    description: "Barra lateral clara à direita com idiomas e competências — ótimo para quem fala várias línguas.",
    layout: "MODERNO",
    accentColor: "#0f766e",
    isAtsFriendly: false,
    design: { structure: "sidebar-right", sidebarTone: "light", header: "left", headingStyle: "bar", entryStyle: "stacked", skillsStyle: "list", photoShape: "rounded", photoPosition: "center" },
  },
  // ── Gestão / finanças ───────────────────────────────────
  {
    slug: "gestao",
    name: "Gestão",
    category: "GESTAO",
    style: "Corporate",
    description: "Faixa escura no topo e duas colunas — para supervisores, gestores e coordenadores.",
    layout: "EXECUTIVO",
    accentColor: "#1f2937",
    isAtsFriendly: false,
    design: { structure: "split", header: "band", headingStyle: "caps", entryStyle: "classic", skillsStyle: "list", photoShape: "rounded", photoPosition: "left", sidebarSections: ["skills", "languages", "certifications", "references"] },
  },
  {
    slug: "financas",
    name: "Finanças",
    category: "FINANCAS",
    style: "Executive",
    description: "Serifado com datas à esquerda e contactos alinhados à direita, para banca e finanças.",
    layout: "EXECUTIVO",
    accentColor: "#065f46",
    isAtsFriendly: false,
    design: { structure: "single", header: "split", headingStyle: "serif-line", font: "mixed", entryStyle: "date-left", skillsStyle: "columns", photoShape: "rounded", photoPosition: "left" },
  },
  {
    slug: "auditoria",
    name: "Auditoria",
    category: "FINANCAS",
    style: "ATS Friendly",
    description: "Linear e objetivo, ideal para candidaturas em portais com leitura automática.",
    layout: "CLASSICO",
    accentColor: "#1e3a8a",
    isAtsFriendly: true,
    design: { photo: false, ...ATS_BASE, header: "left", headingStyle: "rule", entryStyle: "stacked", skillsStyle: "inline", photoShape: "square", photoPosition: "right" },
  },
  // ── Construção / logística / hotelaria / motorista / técnico ─
  {
    slug: "construcao",
    name: "Construção",
    category: "CONSTRUCAO",
    style: "Compact",
    description: "Compacto e robusto: cabe muita experiência numa página, para obras, carpintaria e canalização.",
    layout: "CLASSICO",
    accentColor: "#c2410c",
    isAtsFriendly: false,
    design: { structure: "single", header: "left", headingStyle: "box", entryStyle: "classic", skillsStyle: "columns", pairs: true, density: "compact", photoShape: "square", photoPosition: "right" },
  },
  {
    slug: "logistica",
    name: "Logística",
    category: "LOGISTICA",
    style: "Timeline",
    description: "Barra lateral escura e percurso em linha do tempo, para armazém, stock e distribuição.",
    layout: "MODERNO",
    accentColor: "#0369a1",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "dark", header: "left", headingStyle: "underline", entryStyle: "timeline", skillsStyle: "list", photoShape: "rounded", photoPosition: "center" },
  },
  {
    slug: "hotelaria",
    name: "Hotelaria",
    category: "HOTELARIA",
    style: "Elegant",
    description: "Elegante e acolhedor, com tipografia serifada — para hotelaria, restauração e turismo.",
    layout: "CLASSICO",
    accentColor: "#a16207",
    isAtsFriendly: false,
    design: { structure: "single", header: "center", headingStyle: "underline", font: "serif", entryStyle: "classic", skillsStyle: "tags", photoShape: "circle", photoPosition: "center" },
  },
  {
    slug: "motorista",
    name: "Motorista",
    category: "MOTORISTA",
    style: "Black & White",
    description: "Preto e branco, direto ao essencial: cartas de condução, experiência e referências.",
    layout: "CLASSICO",
    accentColor: "#111827",
    isAtsFriendly: true,
    design: { ...ATS_BASE, header: "stacked", headingStyle: "caps", palette: "mono", entryStyle: "stacked", density: "compact", photoShape: "square", photoPosition: "right" },
  },
  {
    slug: "tecnico-profissional",
    name: "Técnico",
    category: "TECNICO_PROFISSIONAL",
    style: "Professional Green",
    description: "Para eletricistas, mecânicos e técnicos: competências em duas colunas e certificações visíveis.",
    layout: "CLASSICO",
    accentColor: "#15803d",
    isAtsFriendly: false,
    design: { structure: "single", header: "left", headingStyle: "bar", entryStyle: "classic", skillsStyle: "columns", pairs: true, photoShape: "circle", photoPosition: "right" },
  },
  // ── Executivo / geral ───────────────────────────────────
  {
    slug: "executivo",
    name: "Executivo",
    category: "EXECUTIVO",
    style: "Executive",
    description: "Para cargos de direção e gestão sénior: cabeçalho forte e tipografia elegante.",
    layout: "EXECUTIVO",
    accentColor: "#0f172a",
    isAtsFriendly: false,
    design: { structure: "single", header: "band", headingStyle: "serif-line", font: "mixed", entryStyle: "date-left", skillsStyle: "columns", pairs: true, photoShape: "rounded", photoPosition: "left" },
  },
  {
    slug: "direcao",
    name: "Direção",
    category: "EXECUTIVO",
    style: "Elegant",
    description: "Preto e branco serifado, arejado, com contactos à direita — discreto e sénior.",
    layout: "EXECUTIVO",
    accentColor: "#111827",
    isAtsFriendly: false,
    design: { structure: "single", header: "split", headingStyle: "serif-line", font: "serif", palette: "mono", entryStyle: "date-left", skillsStyle: "columns", density: "airy", photoShape: "square", photoPosition: "left" },
  },
  {
    slug: "essencial",
    name: "Essencial",
    category: "GERAL",
    style: "Black & White",
    description: "Minimalismo a preto e branco, compatível com qualquer área e com sistemas de recrutamento.",
    layout: "CLASSICO",
    accentColor: "#111827",
    isAtsFriendly: true,
    design: { photo: false, ...ATS_BASE, header: "left", headingStyle: "caps", palette: "mono", skillsStyle: "inline", photoShape: "square", photoPosition: "right" },
  },
  {
    slug: "horizonte",
    name: "Horizonte",
    category: "GERAL",
    style: "Modern Blue",
    description: "Barra lateral azul-clara, títulos sublinhados e linha do tempo — moderno e versátil.",
    layout: "MODERNO",
    accentColor: "#1d4ed8",
    isAtsFriendly: false,
    design: { structure: "sidebar-left", sidebarTone: "tint", header: "left", headingStyle: "underline", entryStyle: "timeline", skillsStyle: "list", photoShape: "circle", photoPosition: "center" },
  },
];
