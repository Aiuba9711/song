/**
 * Catálogo inicial de fundos e roupas (usado pelo seed quando as tabelas estão vazias).
 * Depois, o administrador gere tudo em Admin › Foto Profissional.
 */
type BackgroundSeed = {
  name: string;
  category: "NEUTRO" | "CORPORATIVO" | "GRADIENTE";
  kind: "SOLID" | "GRADIENT" | "PATTERN";
  color1: string;
  color2?: string;
  pattern?: "office" | "wall" | "studio";
  passport?: boolean;
};

export const BACKGROUND_CATALOG: BackgroundSeed[] = [
  { name: "Branco", category: "NEUTRO", kind: "SOLID", color1: "#ffffff", passport: true },
  { name: "Claro", category: "NEUTRO", kind: "SOLID", color1: "#f5f5f2", passport: true },
  { name: "Cinza claro", category: "NEUTRO", kind: "SOLID", color1: "#e5e7eb", passport: true },
  { name: "Azul muito claro", category: "NEUTRO", kind: "SOLID", color1: "#e6eff9", passport: true },
  { name: "Cinza", category: "NEUTRO", kind: "SOLID", color1: "#a3a9b3" },
  { name: "Bege claro", category: "NEUTRO", kind: "SOLID", color1: "#f1e9dc" },
  { name: "Escritório desfocado", category: "CORPORATIVO", kind: "PATTERN", color1: "#dfe5ea", color2: "#c3ccd4", pattern: "office" },
  { name: "Parede corporativa", category: "CORPORATIVO", kind: "PATTERN", color1: "#e9e4dc", color2: "#d6cfc4", pattern: "wall" },
  { name: "Ambiente profissional subtil", category: "CORPORATIVO", kind: "PATTERN", color1: "#eef1f4", color2: "#c9d0d8", pattern: "studio" },
  { name: "Azul muito suave", category: "GRADIENTE", kind: "GRADIENT", color1: "#f0f5fb", color2: "#d6e3f2" },
  { name: "Cinza suave", category: "GRADIENTE", kind: "GRADIENT", color1: "#f1f2f4", color2: "#cdd1d7" },
  { name: "Branco e cinza", category: "GRADIENTE", kind: "GRADIENT", color1: "#ffffff", color2: "#e1e4e8" },
  { name: "Bege suave", category: "GRADIENTE", kind: "GRADIENT", color1: "#f8f3ea", color2: "#e6dccb" },
];

type OutfitSeed = {
  name: string;
  gender: "MASCULINO" | "FEMININO";
  garment: "BLAZER" | "FATO" | "CAMISA" | "BLUSA";
  jacketColor?: string;
  shirtColor: string;
  tieColor?: string;
  tags: string[];
};

const C = {
  white: "#ffffff",
  lightBlue: "#cfe0f5",
  blue: "#7aa0d1",
  lightGrey: "#e2e4e8",
  beige: "#efe4d2",
  softPink: "#f5e4e6",
  navy: "#1e2a4a",
  black: "#111318",
  charcoal: "#33383f",
  midGrey: "#6b7280",
  darkBrown: "#4a3426",
  taupe: "#a8998a",
  wine: "#5b1a26",
  brown: "#6b4a36",
  femBeige: "#d9c8b0",
  neutralBlouse: "#f1e9df",
};

export const OUTFIT_CATALOG: OutfitSeed[] = [
  // Homem — combinações
  { name: "Camisa branca + blazer azul-marinho", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.navy, shirtColor: C.white, tieColor: C.navy, tags: ["CORPORATIVO", "ENTREVISTA", "FORMAL_CLASSICO"] },
  { name: "Camisa branca + blazer preto", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.black, shirtColor: C.white, tieColor: C.black, tags: ["EXECUTIVO", "FORMAL_CLASSICO"] },
  { name: "Camisa azul clara + blazer azul-marinho", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.navy, shirtColor: C.lightBlue, tieColor: C.navy, tags: ["CORPORATIVO", "EXECUTIVO_MODERNO", "ENTREVISTA"] },
  { name: "Camisa branca + blazer cinza", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.midGrey, shirtColor: C.white, tieColor: C.wine, tags: ["EXECUTIVO_MODERNO", "CORPORATIVO"] },
  { name: "Camisa azul + blazer cinza", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.midGrey, shirtColor: C.blue, tags: ["EXECUTIVO_MODERNO"] },
  { name: "Camisa branca + blazer castanho escuro", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.darkBrown, shirtColor: C.white, tieColor: C.darkBrown, tags: ["ACADEMICO"] },
  { name: "Camisa branca + fato preto", gender: "MASCULINO", garment: "FATO", jacketColor: C.black, shirtColor: C.white, tieColor: C.black, tags: ["EXECUTIVO", "FORMAL_CLASSICO"] },
  { name: "Camisa branca + blazer cinza carvão", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.charcoal, shirtColor: C.white, tieColor: C.navy, tags: ["EXECUTIVO", "CORPORATIVO"] },
  { name: "Camisa branca + blazer bege/taupe", gender: "MASCULINO", garment: "BLAZER", jacketColor: C.taupe, shirtColor: C.white, tags: ["ACADEMICO", "CORPORATIVO_DISCRETO"] },
  // Homem — só camisa
  { name: "Camisa branca", gender: "MASCULINO", garment: "CAMISA", shirtColor: C.white, tags: ["PRIMEIRO_EMPREGO", "ENTREVISTA", "CORPORATIVO_DISCRETO"] },
  { name: "Camisa azul clara", gender: "MASCULINO", garment: "CAMISA", shirtColor: C.lightBlue, tags: ["PRIMEIRO_EMPREGO", "CORPORATIVO_DISCRETO"] },
  { name: "Camisa azul", gender: "MASCULINO", garment: "CAMISA", shirtColor: C.blue, tags: ["PRIMEIRO_EMPREGO"] },
  { name: "Camisa cinza clara", gender: "MASCULINO", garment: "CAMISA", shirtColor: C.lightGrey, tags: ["PRIMEIRO_EMPREGO", "CORPORATIVO_DISCRETO"] },
  { name: "Camisa bege", gender: "MASCULINO", garment: "CAMISA", shirtColor: C.beige, tags: ["ACADEMICO", "PRIMEIRO_EMPREGO"] },
  { name: "Camisa rosa muito suave", gender: "MASCULINO", garment: "CAMISA", shirtColor: C.softPink, tags: ["PRIMEIRO_EMPREGO"] },
  // Mulher — combinações
  { name: "Blazer preto + camisa branca", gender: "FEMININO", garment: "BLAZER", jacketColor: C.black, shirtColor: C.white, tags: ["EXECUTIVO", "FORMAL_CLASSICO"] },
  { name: "Blazer azul-marinho + camisa branca", gender: "FEMININO", garment: "BLAZER", jacketColor: C.navy, shirtColor: C.white, tags: ["CORPORATIVO", "ENTREVISTA", "FORMAL_CLASSICO"] },
  { name: "Blazer cinza + camisa branca", gender: "FEMININO", garment: "BLAZER", jacketColor: C.midGrey, shirtColor: C.white, tags: ["EXECUTIVO_MODERNO", "CORPORATIVO"] },
  { name: "Blazer bege + camisa branca", gender: "FEMININO", garment: "BLAZER", jacketColor: C.femBeige, shirtColor: C.white, tags: ["ACADEMICO", "CORPORATIVO_DISCRETO"] },
  { name: "Blazer vinho escuro + blusa neutra", gender: "FEMININO", garment: "BLAZER", jacketColor: C.wine, shirtColor: C.neutralBlouse, tags: ["EXECUTIVO_MODERNO"] },
  { name: "Blazer castanho + camisa clara", gender: "FEMININO", garment: "BLAZER", jacketColor: C.brown, shirtColor: "#f7f3ec", tags: ["ACADEMICO"] },
  // Mulher — só blusa
  { name: "Blusa branca", gender: "FEMININO", garment: "BLUSA", shirtColor: C.white, tags: ["PRIMEIRO_EMPREGO", "ENTREVISTA", "CORPORATIVO_DISCRETO"] },
  { name: "Blusa azul clara", gender: "FEMININO", garment: "BLUSA", shirtColor: C.lightBlue, tags: ["PRIMEIRO_EMPREGO", "CORPORATIVO_DISCRETO"] },
  { name: "Blusa bege", gender: "FEMININO", garment: "BLUSA", shirtColor: C.beige, tags: ["ACADEMICO", "PRIMEIRO_EMPREGO"] },
  { name: "Blusa rosa suave", gender: "FEMININO", garment: "BLUSA", shirtColor: C.softPink, tags: ["PRIMEIRO_EMPREGO"] },
  { name: "Blusa cinza clara", gender: "FEMININO", garment: "BLUSA", shirtColor: C.lightGrey, tags: ["CORPORATIVO_DISCRETO"] },
];
