/**
 * Modelo de dados normalizado de um CV — partilhado pela pré-visualização (HTML),
 * pelo PDF e pelo DOCX. Todos os campos vêm do utilizador; nada é inventado.
 */
export type CvLayoutId = "CLASSICO" | "MODERNO" | "EXECUTIVO";

export const SECTION_KEYS = [
  "summary",
  "objective",
  "experience",
  "education",
  "skills",
  "languages",
  "courses",
  "certifications",
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

/** Enquadramento e posição da fotografia (escolhidos pelo utilizador). */
export type CvPhotoSettings = {
  zoom: number; // 1–3
  offsetX: number; // -1 … 1
  offsetY: number; // -1 … 1
  position: "auto" | "left" | "right" | "center";
};

export const DEFAULT_PHOTO_SETTINGS: CvPhotoSettings = { zoom: 1, offsetX: 0, offsetY: 0, position: "auto" };

export type CvContent = {
  title: string;
  templateId: string | null;
  personal: CvPersonal;
  summary: string;
  /** Objetivo profissional (opcional) */
  objective: string;
  experiences: CvExperience[];
  educations: CvEducation[];
  skills: CvSkill[];
  languages: CvLanguage[];
  courses: CvCourse[];
  certifications: CvCourse[];
  references: CvReference[];
  referencesOnRequest: boolean;
  customSections: CvCustomSection[];
  hiddenSections: SectionKey[];
  photoSettings: CvPhotoSettings;
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
    objective: "",
    experiences: [],
    educations: [],
    skills: [],
    languages: [],
    courses: [],
    certifications: [],
    references: [],
    referencesOnRequest: false,
    customSections: [],
    hiddenSections: [],
    photoSettings: { ...DEFAULT_PHOTO_SETTINGS },
  };
}
