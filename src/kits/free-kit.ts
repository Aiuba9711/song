import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { renderCvDocx } from "@/cv/docx";
import type { CvContent } from "@/cv/types";

/**
 * Conteúdo do produto gratuito "1 modelo de CV + 1 carta de candidatura".
 * Os ficheiros contêm apenas espaços reservados [entre parênteses retos] e dicas —
 * o utilizador preenche com as suas informações verdadeiras.
 */
const PLACEHOLDER_CV: CvContent = {
  title: "Modelo de CV",
  templateId: null,
  personal: {
    fullName: "[Nome Completo]",
    jobTitle: "[Cargo pretendido]",
    email: "[email@exemplo.com]",
    phone: "[+258 8X XXX XXXX]",
    location: "[Cidade, Província]",
    nationality: "",
    birthDate: "",
    linkedin: "",
    website: "",
    showPhoto: false,
  },
  summary:
    "[Escreva 3 a 4 linhas sobre si: a sua área, anos de experiência (ou formação, se for o primeiro emprego), 2 ou 3 pontos fortes e o tipo de função que procura. Seja específico e verdadeiro.]",
  experiences: [
    {
      position: "[Cargo]",
      employer: "[Nome da empresa ou organização]",
      location: "[Cidade]",
      startDate: "[Mês Ano]",
      endDate: "[Mês Ano]",
      isCurrent: false,
      description:
        "- [Principal responsabilidade ou tarefa]\n- [Outra responsabilidade relevante para a vaga]\n- [Um resultado concreto, se existir — ex.: melhorou um processo]",
    },
    {
      position: "[Cargo anterior / estágio / voluntariado]",
      employer: "[Nome da organização]",
      location: "[Cidade]",
      startDate: "[Mês Ano]",
      endDate: "[Mês Ano]",
      isCurrent: false,
      description: "- [Responsabilidade]\n- [Responsabilidade]",
    },
  ],
  educations: [
    {
      degree: "[Curso / Grau — ex.: Licenciatura em ...]",
      institution: "[Instituição de ensino]",
      location: "[Cidade]",
      startDate: "[Ano]",
      endDate: "[Ano]",
      isCurrent: false,
      description: "",
    },
  ],
  skills: [
    { name: "[Competência técnica relacionada com a vaga]", level: "" },
    { name: "[Programa informático — ex.: Excel, Word]", level: "" },
    { name: "[Competência pessoal — ex.: trabalho em equipa]", level: "" },
  ],
  languages: [
    { name: "Português", level: "[Nível]" },
    { name: "[Outra língua]", level: "[Nível]" },
  ],
  courses: [{ name: "[Nome do curso ou certificação]", institution: "[Entidade formadora]", year: "[Ano]" }],
  references: [],
  referencesOnRequest: true,
  customSections: [],
  hiddenSections: [],
};

export function buildFreeCvTemplateDocx(): Promise<Buffer> {
  return renderCvDocx(PLACEHOLDER_CV, { layout: "CLASSICO", accentColor: "#1d40d8" });
}

const LETTER_PARAGRAPHS = [
  "Exmo(a). Senhor(a) [Nome do responsável pelo recrutamento],",
  "Assunto: Candidatura à vaga de [Cargo] — [Referência do anúncio, se existir]",
  "Venho por este meio apresentar a minha candidatura à vaga de [Cargo], publicada em [local onde viu o anúncio — ex.: site da empresa, jornal, LinkedIn] no dia [data].",
  "Sou [a sua formação ou profissão — ex.: licenciado(a) em ...] e tenho [experiência verdadeira — ex.: 2 anos de experiência em ...]. Nas minhas funções em [empresa/estágio], fui responsável por [uma ou duas tarefas relevantes para esta vaga].",
  "Considero que posso contribuir para a [Nome da empresa] através de [2 ou 3 competências que a vaga pede e que realmente possui]. Tenho interesse nesta organização porque [motivo específico — ex.: a sua área de atuação, os seus projetos].",
  "Junto envio o meu Curriculum Vitae e fico disponível para uma entrevista, na data que for mais conveniente, para apresentar com mais detalhe o meu percurso.",
  "Agradeço desde já a atenção dispensada.",
  "Com os melhores cumprimentos,",
];

const TIPS = [
  "Dicas antes de enviar:",
  "• Substitua todos os campos [entre parênteses retos] e apague esta secção de dicas.",
  "• Adapte a carta a cada vaga — mencione o cargo e a empresa corretos.",
  "• Mantenha a carta numa página e revise a ortografia.",
  "• Não inclua informações que não sejam verdadeiras.",
];

export async function buildFreeCoverLetterDocx(): Promise<Buffer> {
  const p = (text: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; color?: string; size?: number } = {}) =>
    new Paragraph({
      alignment: opts.align,
      spacing: { after: opts.after ?? 200, line: 300 },
      children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: opts.size })],
    });

  const doc = new Document({
    creator: "Emprego Fácil MZ",
    title: "Modelo de carta de candidatura",
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: "1E293B" } } } },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, bottom: 1200, left: 1300, right: 1300 } } },
        children: [
          p("[Nome Completo]", { bold: true, after: 0 }),
          p("[Endereço — Bairro, Cidade]", { after: 0 }),
          p("[Telefone]  ·  [Email]", { after: 360 }),
          p("[Nome da Empresa]", { bold: true, after: 0 }),
          p("[Departamento de Recursos Humanos]", { after: 0 }),
          p("[Endereço da empresa]", { after: 360 }),
          p("[Cidade], [dia] de [mês] de [ano]", { align: AlignmentType.RIGHT, after: 360 }),
          ...LETTER_PARAGRAPHS.map((t, i) => p(t, { bold: i === 1, align: i >= 2 && i <= 5 ? AlignmentType.JUSTIFIED : undefined })),
          p("", { after: 480 }),
          p("[Assinatura]", { after: 0 }),
          p("[Nome Completo]", { after: 600 }),
          ...TIPS.map((t, i) => p(t, { bold: i === 0, color: "64748B", size: 19, after: 60 })),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
