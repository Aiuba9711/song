import { Page, Text, View } from "@react-pdf/renderer";
import { contactItems, formatRange, isSectionVisible, joinNonEmpty, SECTION_LABELS } from "../format";
import type { CvContent, CvPhoto } from "../types";
import { FONT, MUTED, PdfPhoto, PdfRichText, TEXT } from "./shared";

function Heading({ children, accent }: { children: string; accent: string }) {
  return (
    <View minPresenceAhead={50} style={{ borderBottom: `0.8pt solid ${accent}`, paddingBottom: 2, marginBottom: 6 }}>
      <Text style={{ fontFamily: FONT.bold, fontSize: 9.5, letterSpacing: 1.1, color: accent, textTransform: "uppercase" }}>
        {children}
      </Text>
    </View>
  );
}

function ItemHeader({ title, date, sub }: { title: string; date: string; sub: string }) {
  return (
    <View wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: FONT.bold, color: "#0f172a", flex: 1, paddingRight: 8 }}>{title}</Text>
        {date ? <Text style={{ fontSize: 9, color: MUTED }}>{date}</Text> : null}
      </View>
      {sub ? <Text style={{ fontFamily: FONT.italic, color: "#334155" }}>{sub}</Text> : null}
    </View>
  );
}

export function ClassicoPdfPage({ cv, accent, photo }: { cv: CvContent; accent: string; photo: CvPhoto | null }) {
  const p = cv.personal;
  const contacts = contactItems(cv);
  return (
    <Page size="A4" style={{ paddingVertical: 40, paddingHorizontal: 45, fontFamily: FONT.regular, fontSize: 10, lineHeight: 1.4, color: TEXT }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
        {photo && (
          <View style={{ marginRight: 16 }}>
            <PdfPhoto photo={photo} size={72} />
          </View>
        )}
        <View style={{ flex: 1, alignItems: photo ? "flex-start" : "center" }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 21, color: "#0f172a", lineHeight: 1.2 }}>{p.fullName || "O seu nome"}</Text>
          {p.jobTitle ? <Text style={{ fontFamily: FONT.bold, fontSize: 11, color: accent, marginTop: 2 }}>{p.jobTitle}</Text> : null}
          {contacts.length > 0 && (
            <Text style={{ fontSize: 9, color: MUTED, marginTop: 5, textAlign: photo ? "left" : "center" }}>
              {contacts.map((c) => c.value).join("  ·  ")}
            </Text>
          )}
        </View>
      </View>

      {isSectionVisible(cv, "summary") && (
        <View style={{ marginBottom: 12 }}>
          <Heading accent={accent}>{SECTION_LABELS.summary}</Heading>
          <PdfRichText text={cv.summary} />
        </View>
      )}
      {isSectionVisible(cv, "experience") && (
        <View style={{ marginBottom: 12 }}>
          <Heading accent={accent}>{SECTION_LABELS.experience}</Heading>
          {cv.experiences.map((e, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <ItemHeader title={e.position} date={formatRange(e.startDate, e.endDate, e.isCurrent)} sub={joinNonEmpty([e.employer, e.location], ", ")} />
              <PdfRichText text={e.description} style={{ marginTop: 2 }} />
            </View>
          ))}
        </View>
      )}
      {isSectionVisible(cv, "education") && (
        <View style={{ marginBottom: 12 }}>
          <Heading accent={accent}>{SECTION_LABELS.education}</Heading>
          {cv.educations.map((e, i) => (
            <View key={i} style={{ marginBottom: 7 }}>
              <ItemHeader title={e.degree} date={formatRange(e.startDate, e.endDate, e.isCurrent)} sub={joinNonEmpty([e.institution, e.location], ", ")} />
              <PdfRichText text={e.description} style={{ marginTop: 2 }} />
            </View>
          ))}
        </View>
      )}
      {(isSectionVisible(cv, "skills") || isSectionVisible(cv, "languages")) && (
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {isSectionVisible(cv, "skills") && (
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Heading accent={accent}>{SECTION_LABELS.skills}</Heading>
              {cv.skills.map((s, i) => (
                <View key={i} style={{ flexDirection: "row" }}>
                  <Text style={{ width: 10 }}>•</Text>
                  <Text style={{ flex: 1 }}>
                    {s.name}
                    {s.level ? <Text style={{ color: "#64748b" }}> — {s.level}</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {isSectionVisible(cv, "languages") && (
            <View style={{ flex: 1, paddingLeft: isSectionVisible(cv, "skills") ? 12 : 0 }}>
              <Heading accent={accent}>{SECTION_LABELS.languages}</Heading>
              {cv.languages.map((l, i) => (
                <Text key={i}>
                  <Text style={{ fontFamily: FONT.bold }}>{l.name}</Text>
                  {l.level ? <Text style={{ color: MUTED }}> — {l.level}</Text> : null}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
      {isSectionVisible(cv, "courses") && (
        <View style={{ marginBottom: 12 }}>
          <Heading accent={accent}>{SECTION_LABELS.courses}</Heading>
          {cv.courses.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }} wrap={false}>
              <Text style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontFamily: FONT.bold }}>{c.name}</Text>
                {c.institution ? <Text style={{ color: MUTED }}> — {c.institution}</Text> : null}
              </Text>
              {c.year ? <Text style={{ fontSize: 9, color: MUTED }}>{c.year}</Text> : null}
            </View>
          ))}
        </View>
      )}
      {isSectionVisible(cv, "custom") &&
        cv.customSections.map((s, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Heading accent={accent}>{s.title}</Heading>
            <PdfRichText text={s.content} />
          </View>
        ))}
      {isSectionVisible(cv, "references") && (
        <View>
          <Heading accent={accent}>{SECTION_LABELS.references}</Heading>
          {cv.references.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cv.references.map((r, i) => (
                <View key={i} style={{ width: "50%", paddingRight: 10, marginBottom: 6 }} wrap={false}>
                  <Text style={{ fontFamily: FONT.bold }}>{r.name}</Text>
                  {joinNonEmpty([r.position, r.company], ", ") ? <Text>{joinNonEmpty([r.position, r.company], ", ")}</Text> : null}
                  {joinNonEmpty([r.phone, r.email]) ? <Text style={{ fontSize: 9, color: MUTED }}>{joinNonEmpty([r.phone, r.email])}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <Text>Disponíveis mediante solicitação.</Text>
          )}
        </View>
      )}
    </Page>
  );
}
