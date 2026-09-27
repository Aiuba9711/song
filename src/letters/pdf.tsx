import { Document, Font, Page, renderToBuffer, Text, View } from "@react-pdf/renderer";
import { toWinAnsi } from "@/lib/pdf-text";
import { letterLayout } from "./compose";
import type { LetterContent } from "./types";

Font.registerHyphenationCallback((word) => [word]);

const t = (s: string) => toWinAnsi(s);

/** Carta em PDF (A4, margens de 2,5 cm, Helvetica 11 pt) — mesma estrutura da pré-visualização. */
export async function renderLetterPdf(c: LetterContent, date: Date): Promise<Buffer> {
  const l = letterLayout(c, date);
  const doc = (
    <Document title={t(c.subject || c.title)} author={t(c.senderName)} language="pt">
      <Page size="A4" style={{ paddingVertical: 64, paddingHorizontal: 70, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.45, color: "#1e293b" }}>
        <View style={{ marginBottom: 22 }}>
          {l.sender.map((line, i) => (
            <Text key={i} style={i === 0 ? { fontFamily: "Helvetica-Bold", fontSize: 12.5, color: "#0f172a" } : { color: "#475569" }}>
              {t(line)}
            </Text>
          ))}
        </View>
        {l.recipient.length > 0 && (
          <View style={{ marginBottom: 18, alignSelf: "flex-end", maxWidth: 260 }}>
            {l.recipient.map((line, i) => (
              <Text key={i}>{t(line)}</Text>
            ))}
          </View>
        )}
        <Text style={{ textAlign: "right", marginBottom: 20 }}>{t(l.dateLine)}</Text>
        {l.subject ? <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 16 }}>{t(`Assunto: ${l.subject}`)}</Text> : null}
        {l.paragraphs.map((p, i) => (
          <Text key={i} style={{ marginBottom: 10, textAlign: "justify" }}>
            {t(p.join("\n"))}
          </Text>
        ))}
        {l.signature ? <Text style={{ marginTop: 26, fontFamily: "Helvetica-Bold" }}>{t(l.signature)}</Text> : null}
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
