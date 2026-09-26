import { Page, Text, View } from "@react-pdf/renderer";
import { contactItems, formatRange, isSectionVisible, joinNonEmpty, SECTION_LABELS, tint } from "../format";
import type { CvContent, CvPhoto } from "../types";
import { FONT, MUTED, PdfPhoto, PdfRichText, SERIF, TEXT } from "./shared";

function Heading({ children, accent }: { children: string; accent: string }) {
  return (
    <View minPresenceAhead={50} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Text style={{ fontFamily: SERIF.bold, fontSize: 12, color: "#0f172a", marginRight: 8 }}>{children}</Text>
      <View style={{ flex: 1, height: 0.8, backgroundColor: tint(accent, 0.5) }} />
    </View>
  );
}

function Entry({ date, location, title, org, description, accent }: { date: string; location: string; title: string; org: string; description: string; accent: string }) {
  return (
    <View style={{ flexDirection: "row", marginBottom: 9 }}>
      <View style={{ width: 105, paddingRight: 10 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 8.8, color: MUTED }}>{date}</Text>
        {location ? <Text style={{ fontSize: 8.8, color: MUTED }}>{location}</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View wrap={false}>
          <Text style={{ fontFamily: FONT.bold, color: "#0f172a" }}>{title}</Text>
          {org ? <Text style={{ fontFamily: FONT.bold, color: accent }}>{org}</Text> : null}
        </View>
        <PdfRichText text={description} style={{ marginTop: 2 }} />
      </View>
    </View>
  );
}

export function ExecutivoPdfPage({ cv, accent, photo }: { cv: CvContent; accent: string; photo: CvPhoto | null }) {
  const p = cv.personal;
  const contacts = contactItems(cv);
  return (
    <Page size="A4" style={{ fontFamily: FONT.regular, fontSize: 10, lineHeight: 1.4, color: TEXT, paddingBottom: 36 }}>
      <View style={{ height: 7, backgroundColor: accent }} />
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: tint(accent, 0.94), paddingHorizontal: 42, paddingTop: 22, paddingBottom: 16 }}>
        {photo && (
          <View style={{ marginRight: 16 }}>
            <PdfPhoto photo={photo} size={74} radius={6} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: SERIF.bold, fontSize: 24, color: "#0f172a", lineHeight: 1.15 }}>{p.fullName || "O seu nome"}</Text>
          {p.jobTitle ? (
            <Text style={{ fontFamily: FONT.bold, fontSize: 10, letterSpacing: 1.3, color: accent, textTransform: "uppercase", marginTop: 3 }}>{p.jobTitle}</Text>
          ) : null}
        </View>
        {contacts.length > 0 && (
          <View style={{ maxWidth: 175, alignItems: "flex-end" }}>
            {contacts.map((c) => (
              <Text key={c.key} style={{ fontSize: 8.8, color: "#334155", textAlign: "right" }}>
                {c.value}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 42, paddingTop: 16 }}>
        {isSectionVisible(cv, "summary") && (
          <View style={{ marginBottom: 12 }}>
            <Heading accent={accent}>{SECTION_LABELS.summary}</Heading>
            <PdfRichText text={cv.summary} style={{ color: "#334155" }} />
          </View>
        )}
        {isSectionVisible(cv, "experience") && (
          <View style={{ marginBottom: 12 }}>
            <Heading accent={accent}>{SECTION_LABELS.experience}</Heading>
            {cv.experiences.map((e, i) => (
              <Entry key={i} accent={accent} date={formatRange(e.startDate, e.endDate, e.isCurrent)} location={e.location} title={e.position} org={e.employer} description={e.description} />
            ))}
          </View>
        )}
        {isSectionVisible(cv, "education") && (
          <View style={{ marginBottom: 12 }}>
            <Heading accent={accent}>{SECTION_LABELS.education}</Heading>
            {cv.educations.map((e, i) => (
              <Entry key={i} accent={accent} date={formatRange(e.startDate, e.endDate, e.isCurrent)} location={e.location} title={e.degree} org={e.institution} description={e.description} />
            ))}
          </View>
        )}
        {isSectionVisible(cv, "skills") && (
          <View style={{ marginBottom: 12 }}>
            <Heading accent={accent}>{SECTION_LABELS.skills}</Heading>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cv.skills.map((s, i) => (
                <View key={i} style={{ width: "50%", flexDirection: "row", alignItems: "center", paddingRight: 10, marginBottom: 2 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accent, marginRight: 6 }} />
                  <Text style={{ flex: 1 }}>
                    {s.name}
                    {s.level ? <Text style={{ color: "#64748b" }}> — {s.level}</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {(isSectionVisible(cv, "languages") || isSectionVisible(cv, "courses")) && (
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            {isSectionVisible(cv, "languages") && (
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Heading accent={accent}>{SECTION_LABELS.languages}</Heading>
                {cv.languages.map((l, i) => (
                  <Text key={i}>
                    <Text style={{ fontFamily: FONT.bold }}>{l.name}</Text>
                    {l.level ? <Text style={{ color: MUTED }}> — {l.level}</Text> : null}
                  </Text>
                ))}
              </View>
            )}
            {isSectionVisible(cv, "courses") && (
              <View style={{ flex: 1, paddingLeft: isSectionVisible(cv, "languages") ? 12 : 0 }}>
                <Heading accent={accent}>{SECTION_LABELS.courses}</Heading>
                {cv.courses.map((c, i) => (
                  <View key={i} style={{ marginBottom: 3 }} wrap={false}>
                    <Text style={{ fontFamily: FONT.bold }}>{c.name}</Text>
                    {joinNonEmpty([c.institution, c.year], ", ") ? <Text style={{ fontSize: 9, color: MUTED }}>{joinNonEmpty([c.institution, c.year], ", ")}</Text> : null}
                  </View>
                ))}
              </View>
            )}
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
      </View>
    </Page>
  );
}
