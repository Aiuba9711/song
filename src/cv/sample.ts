import type { CvContent } from "./types";

/**
 * CV de EXEMPLO (pessoa fictícia) usado apenas para mostrar os modelos no catálogo
 * e em testes. Nunca é copiado para o CV de um utilizador.
 */
export const SAMPLE_CV: CvContent = {
  title: "Exemplo",
  templateId: null,
  personal: {
    fullName: "Ana Maria Machava",
    jobTitle: "Técnica de Contabilidade",
    email: "ana.machava@exemplo.co.mz",
    phone: "+258 84 000 0000",
    location: "Maputo, Moçambique",
    nationality: "",
    birthDate: "",
    linkedin: "",
    website: "",
    showPhoto: false,
  },
  summary:
    "Técnica de contabilidade com 4 anos de experiência em lançamentos, reconciliações bancárias e apoio ao fecho mensal. Organizada, rigorosa com prazos e habituada a trabalhar com Primavera e Excel.",
  objective: "",
  experiences: [
    {
      position: "Assistente de Contabilidade",
      employer: "Empresa Exemplo, Lda.",
      location: "Maputo",
      startDate: "Mar 2022",
      endDate: "",
      isCurrent: true,
      description:
        "- Lançamento de faturas de fornecedores e clientes\n- Reconciliações bancárias mensais\n- Apoio na preparação de declarações fiscais",
    },
    {
      position: "Estagiária de Contabilidade",
      employer: "Gabinete de Contas Exemplo",
      location: "Matola",
      startDate: "Jan 2021",
      endDate: "Dez 2021",
      isCurrent: false,
      description: "Arquivo e organização de documentos contabilísticos; apoio ao controlo de caixa.",
    },
  ],
  educations: [
    {
      degree: "Licenciatura em Contabilidade e Auditoria",
      institution: "Universidade Exemplo",
      location: "Maputo",
      startDate: "2016",
      endDate: "2020",
      isCurrent: false,
      description: "",
    },
  ],
  skills: [
    { name: "Primavera ERP", level: "Avançado" },
    { name: "Microsoft Excel", level: "Avançado" },
    { name: "Reconciliações bancárias", level: "" },
    { name: "Legislação fiscal moçambicana", level: "Intermédio" },
  ],
  languages: [
    { name: "Português", level: "Nativo" },
    { name: "Inglês", level: "Intermédio" },
    { name: "Changana", level: "Fluente" },
  ],
  courses: [{ name: "Excel para Finanças", institution: "Centro de Formação Exemplo", year: "2023" }],
  certifications: [{ name: "Certificação em Contabilidade Pública", institution: "Instituto Exemplo", year: "2022" }],
  references: [],
  referencesOnRequest: true,
  customSections: [],
  hiddenSections: [],
  photoSettings: { zoom: 1, offsetX: 0, offsetY: 0, position: "auto" },
};

/**
 * CV de exemplo com TODOS os campos preenchidos — usado em testes para garantir que
 * nenhum campo desaparece em nenhum modelo (HTML, PDF e DOCX).
 */
export const FULL_SAMPLE_CV: CvContent = {
  ...SAMPLE_CV,
  personal: {
    ...SAMPLE_CV.personal,
    nationality: "Moçambicana",
    birthDate: "12/03/1996",
    linkedin: "linkedin.com/in/anamachava",
    website: "anamachava.exemplo.co.mz",
    showPhoto: true,
  },
  references: [{ name: "Carlos Nhantumbo", position: "Director Financeiro", company: "Empresa Exemplo, Lda.", phone: "+258 82 000 0000", email: "carlos@exemplo.co.mz" }],
  objective: "Integrar a equipa financeira de uma empresa em crescimento, contribuindo para relatórios fiáveis e dentro dos prazos.",
  referencesOnRequest: false,
  customSections: [{ title: "Voluntariado", content: "Apoio escolar a crianças da comunidade (2019–2020)." }],
};
