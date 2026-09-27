import { letterLayout } from "./compose";
import type { LetterContent } from "./types";

const px = (pt: number) => `${Math.round(pt * (4 / 3) * 100) / 100}px`;

/** Pré-visualização A4 (794 px) com a mesma estrutura e medidas do PDF. */
export function LetterPreview({ content, date }: { content: LetterContent; date: Date }) {
  const l = letterLayout(content, date);
  return (
    <div
      data-letter-document=""
      style={{ width: 794, minHeight: 1123, background: "#fff", color: "#1e293b", fontFamily: "Helvetica, Arial, sans-serif", fontSize: px(11), lineHeight: 1.45, padding: `${px(64)} ${px(70)}` }}
    >
      <div style={{ marginBottom: px(22) }}>
        {l.sender.map((line, i) => (
          <div key={i} style={i === 0 ? { fontWeight: 700, fontSize: px(12.5), color: "#0f172a" } : { color: "#475569" }}>
            {line}
          </div>
        ))}
      </div>
      {l.recipient.length > 0 && (
        <div style={{ marginBottom: px(18), marginLeft: "auto", maxWidth: px(260) }}>
          {l.recipient.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      <div style={{ textAlign: "right", marginBottom: px(20) }}>{l.dateLine}</div>
      {l.subject && <div style={{ fontWeight: 700, marginBottom: px(16) }}>Assunto: {l.subject}</div>}
      {l.paragraphs.map((p, i) => (
        <p key={i} style={{ marginBottom: px(10), textAlign: "justify", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {p.join("\n")}
        </p>
      ))}
      {l.signature && <div style={{ marginTop: px(26), fontWeight: 700 }}>{l.signature}</div>}
    </div>
  );
}
