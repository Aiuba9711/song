import { safeAccent } from "../format";
import type { CvContent, CvTheme } from "../types";
import { ClassicoPreview } from "./classico";
import { ExecutivoPreview } from "./executivo";
import { ModernoPreview } from "./moderno";

/** Pré-visualização HTML do CV (mesma estrutura do PDF/DOCX). */
export function CvPreview({ cv, theme, photoUrl }: { cv: CvContent; theme: CvTheme; photoUrl?: string | null }) {
  const accent = safeAccent(theme.accentColor);
  const photo = cv.personal.showPhoto ? photoUrl : null;
  switch (theme.layout) {
    case "MODERNO":
      return <ModernoPreview cv={cv} accent={accent} photoUrl={photo} />;
    case "EXECUTIVO":
      return <ExecutivoPreview cv={cv} accent={accent} photoUrl={photo} />;
    default:
      return <ClassicoPreview cv={cv} accent={accent} photoUrl={photo} />;
  }
}
