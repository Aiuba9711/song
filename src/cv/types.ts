/**
 * Modelo de dados normalizado de um CV — partilhado pela pré-visualização (HTML),
 * pelo PDF e pelo DOCX. Todos os campos vêm do utilizador; nada é inventado.
 */
export type CvLayoutId = "CLASSICO" | "MODERNO" | "EXECUTIVO";

export const SECTION_KEYS = [
  "summary",
  "experience",
  "education",
  "skills",
  "languages",
  "courses",
  "references",
  "custom",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type CvPersonal = {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  nationality: string;
  birthDate: string;
  linkedin: string;
  website: string;
  showPhoto: boolean;
};

export type CvExperience = {
  position: string;
  employer: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

export type CvEducation = {
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

export type CvSkill = { name: string; level: string };
export type CvLanguage = { name: string; level: string };
export type CvCourse = { name: string; institution: string; year: string };
export type CvReference = { name: string; position: string; company: string; phone: string; email: string };
export type CvCustomSection = { title: string; content: string };

export type CvContent = {
  title: string;
  templateId: string | null;
  personal: CvPersonal;
  summary: string;
  experiences: CvExperience[];
  educations: CvEducation[];
  skills: CvSkill[];
  languages: CvLanguage[];
  courses: CvCourse[];
  references: CvReference[];
  referencesOnRequest: boolean;
  customSections: CvCustomSection[];
  hiddenSections: SectionKey[];
};

export type CvTheme = {
  layout: CvLayoutId;
  accentColor: string;
};

/** Foto já carregada (para PDF/DOCX). */
export type CvPhoto = { data: Buffer; mime: "image/jpeg" | "image/png" };

export function emptyCvContent(title = "O meu CV"): CvContent {
  return {
    title,
    templateId: null,
    personal: {
      fullName: "",
      jobTitle: "",
      email: "",
      phone: "",
      location: "",
      nationality: "",
      birthDate: "",
      linkedin: "",
      website: "",
      showPhoto: false,
    },
    summary: "",
    experiences: [],
    educations: [],
    skills: [],
    languages: [],
    courses: [],
    references: [],
    referencesOnRequest: false,
    customSections: [],
    hiddenSections: [],
  };
}
