import { Page, Text, View } from "@react-pdf/renderer";
import { contactItems, formatRange, initials, isSectionVisible, joinNonEmpty, SECTION_LABELS, tint } from "../format";
import type { CvContent, CvPhoto } from "../types";
import { FONT, MUTED, PdfPhoto, PdfRichText, TEXT } from "./shared";

const SIDEBAR = 188;

function SideHeading({ children }: { children: string }) {
  return (
    <Text minPresenceAhead={30} style={{ fontFamily: FONT.bold, fontSize: 8.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", marginBottom: 5 }}>
      {children}
    </Text>
  );
}

function MainHeading({ children, accent }: { children: string; accent: string }) {
  return (
    <View minPresenceAhead={50} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <View style={{ width: 14, height: 2.2, backgroundColor: accent, marginRight: 6 }} />
      <Text style={{ fontFamily: FONT.bold, fontSize: 10, letterSpacing: 0.9, color: accent, textTransform: "uppercase" }}>{children}</Text>
    </View>
  );
}

function Entry({ title, sub, date, description, accent }: { title: string; sub: string; date: string; description: string; accent: string }) {
  return (
    <View style={{ borderLeft: `1.5pt solid ${tint(accent, 0.7)}`, paddingLeft: 8, marginBottom: 8 }}>
      <View wrap={false}>
        <Text style={{ fontFamily: FONT.bold, color: "#0f172a" }}>{title}</Text>
        <Text style={{ fontSize: 9, color: MUTED }}>
          {sub}
          {date ? <Text style={{ fontFamily: FONT.bold, color: accent }}>{sub ? "  ·  " : ""}{date}</Text> : null}
        </Text>
      </View>
      <PdfRichText text={description} style={{ marginTop: 2 }} />
    </View>
  );
}

export function ModernoPdfPage({ cv, accent, photo }: { cv: CvContent; accent: string; photo: CvPhoto | null }) {
  const p = cv.personal;
  const contacts = contactItems(cv);
  return (
    <Page size="A4" style={{ fontFamily: FONT.regular, fontSize: 10, lineHeight: 1.4, color: TEXT, paddingVertical: 30 }}>
      {/* Fundo da barra lateral repetido em todas as páginas */}
      <View fixed style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: SIDEBAR, backgroundColor: accent }} />
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: SIDEBAR, paddingHorizontal: 18, color: "#ffffff", fontSize: 9.2 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            {photo ? (
              <PdfPhoto photo={photo} size={88} border="3pt solid rgba(255,255,255,0.35)" />
            ) : (
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 22, color: "#ffffff" }}>{initials(p.fullName) || "CV"}</Text>
              </View>
            )}
          </View>
          {contacts.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <SideHeading>Contactos</SideHeading>
              {contacts.map((c) => (
                <View key={c.key} style={{ marginBottom: 5 }} wrap={false}>
                  <Text style={{ fontSize: 7.5, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</Text>
                  <Text>{c.value}</Text>
                </View>
              ))}
            </View>
          )}
          {isSectionVisible(cv, "skills") && (
            <View style={{ marginBottom: 14 }}>
              <SideHeading>{SECTION_LABELS.skills}</SideHeading>
              {cv.skills.map((s, i) => (
                <View key={i} style={{ marginBottom: 4 }} wrap={false}>
                  <Text>{s.name}</Text>
                  {s.level ? <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.72)" }}>{s.level}</Text> : null}
                </View>
              ))}
            </View>
          )}
          {isSectionVisible(cv, "languages") && (
            <View>
              <SideHeading>{SECTION_LABELS.languages}</SideHeading>
              {cv.languages.map((l, i) => (
                <View key={i} style={{ marginBottom: 4 }} wrap={false}>
                  <Text style={{ fontFamily: FONT.bold }}>{l.name}</Text>
                  {l.level ? <Text style={{ fontSize: 8, color: "rgba(255,255,255,0.72)" }}>{l.level}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ flex: 1, paddingHorizontal: 26 }}>
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 22, color: "#0f172a", lineHeight: 1.2 }}>{p.fullName || "O seu nome"}</Text>
            {p.jobTitle ? <Text style={{ fontFamily: FONT.bold, fontSize: 11, color: accent, marginTop: 3 }}>{p.jobTitle}</Text> : null}
          </View>
          {isSectionVisible(cv, "summary") && (
            <View style={{ marginBottom: 12 }}>
              <MainHeading accent={accent}>{SECTION_LABELS.summary}</MainHeading>
              <PdfRichText text={cv.summary} />
            </View>
          )}
          {isSectionVisible(cv, "experience") && (
            <View style={{ marginBottom: 12 }}>
              <MainHeading accent={accent}>{SECTION_LABELS.experience}</MainHeading>
              {cv.experiences.map((e, i) => (
                <Entry key={i} accent={accent} title={e.position} sub={joinNonEmpty([e.employer, e.location], ", ")} date={formatRange(e.startDate, e.endDate, e.isCurrent)} description={e.description} />
              ))}
            </View>
          )}
          {isSectionVisible(cv, "education") && (
            <View style={{ marginBottom: 12 }}>
              <MainHeading accent={accent}>{SECTION_LABELS.education}</MainHeading>
              {cv.educations.map((e, i) => (
                <Entry key={i} accent={accent} title={e.degree} sub={joinNonEmpty([e.institution, e.location], ", ")} date={formatRange(e.startDate, e.endDate, e.isCurrent)} description={e.description} />
              ))}
            </View>
          )}
          {isSectionVisible(cv, "courses") && (
            <View style={{ marginBottom: 12 }}>
              <MainHeading accent={accent}>{SECTION_LABELS.courses}</MainHeading>
              {cv.courses.map((c, i) => (
                <Text key={i} style={{ marginBottom: 2 }}>
                  <Text style={{ fontFamily: FONT.bold }}>{c.name}</Text>
                  {c.institution || c.year ? <Text style={{ color: MUTED }}> — {joinNonEmpty([c.institution, c.year], ", ")}</Text> : null}
                </Text>
              ))}
            </View>
          )}
          {isSectionVisible(cv, "custom") &&
            cv.customSections.map((s, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <MainHeading accent={accent}>{s.title}</MainHeading>
                <PdfRichText text={s.content} />
              </View>
            ))}
          {isSectionVisible(cv, "references") && (
            <View>
              <MainHeading accent={accent}>{SECTION_LABELS.references}</MainHeading>
              {cv.references.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {cv.references.map((r, i) => (
                    <View key={i} style={{ width: "50%", paddingRight: 8, marginBottom: 6 }} wrap={false}>
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
        </View>
      </View>
    </Page>
  );
}
