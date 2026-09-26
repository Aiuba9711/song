import { Document, renderToBuffer } from "@react-pdf/renderer";
import { safeAccent } from "../format";
import type { CvContent, CvPhoto, CvTheme } from "../types";
import { ClassicoPdfPage } from "./classico";
import { ExecutivoPdfPage } from "./executivo";
import { ModernoPdfPage } from "./moderno";

/** Gera o PDF do CV (A4, texto selecionável — adequado para email e portais de emprego). */
export async function renderCvPdf(cv: CvContent, theme: CvTheme, photo: CvPhoto | null = null): Promise<Buffer> {
  const accent = safeAccent(theme.accentColor);
  const usePhoto = cv.personal.showPhoto ? photo : null;
  const page =
    theme.layout === "MODERNO" ? (
      <ModernoPdfPage cv={cv} accent={accent} photo={usePhoto} />
    ) : theme.layout === "EXECUTIVO" ? (
      <ExecutivoPdfPage cv={cv} accent={accent} photo={usePhoto} />
    ) : (
      <ClassicoPdfPage cv={cv} accent={accent} photo={usePhoto} />
    );

  const doc = (
    <Document
      title={`CV — ${cv.personal.fullName || cv.title}`}
      author={cv.personal.fullName || undefined}
      subject={cv.personal.jobTitle || "Curriculum Vitae"}
      creator="Emprego Fácil MZ"
      producer="Emprego Fácil MZ"
      language="pt"
    >
      {page}
    </Document>
  );
  return renderToBuffer(doc);
}
