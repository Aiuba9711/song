import { Document, Font, Image, Page, renderToBuffer, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/stylesheet";
import { buildTheme, tintHex, type TemplateDesign, type Theme } from "../design";
import { toBlocks } from "../format";
import { planDocument, type DocumentPlan, type Entry, type PlanSection, type Row } from "../plan";
import type { CvContent, CvPhoto } from "../types";

// Sem hifenização automática (as regras por omissão são inglesas).
Font.registerHyphenationCallback((word) => [word]);

const SANS = { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique" };
const SERIF = { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic" };

type Ctx = { d: TemplateDesign; t: Theme; inSide: boolean; f: typeof SANS; hf: typeof SANS };

function RichText({ text, color, style }: { text: string; color: string; style?: Style }) {
  const blocks = toBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <View style={{ color, ...style }}>
      {blocks.map((b, i) =>
        b.kind === "paragraph" ? (
          <Text key={i} style={{ marginTop: i ? 2 : 0 }}>
            {b.text}
          </Text>
        ) : (
          <View key={i} style={{ marginTop: i ? 2 : 0 }}>
            {b.items.map((item, j) => (
              <View key={j} style={{ flexDirection: "row", marginTop: j ? 1.5 : 0 }}>
                <Text style={{ width: 10 }}>•</Text>
                <Text style={{ flex: 1 }}>{item}</Text>
              </View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}

function Heading({ title, ctx }: { title: string; ctx: Ctx }) {
  const { d, t, inSide, hf } = ctx;
  if (inSide && t.sidebar) {
    return (
      <Text minPresenceAhead={30} style={{ fontFamily: SANS.bold, fontSize: 8.6, letterSpacing: 1.1, textTransform: "uppercase", color: t.sidebar.heading, marginBottom: 6 }}>
        {title}
      </Text>
    );
  }
  const common = { marginBottom: 6 };
  switch (d.headingStyle) {
    case "rule":
      return (
        <View minPresenceAhead={50} style={{ ...common, borderBottom: `0.8pt solid ${t.accent}`, paddingBottom: 2 }}>
          <Text style={{ fontFamily: hf.bold, fontSize: t.size.heading, letterSpacing: 1.1, textTransform: "uppercase", color: t.accent }}>{title}</Text>
        </View>
      );
    case "caps":
      return (
        <View minPresenceAhead={50} style={common}>
          <Text style={{ fontFamily: hf.bold, fontSize: t.size.heading, letterSpacing: 1.4, textTransform: "uppercase", color: t.ink }}>{title}</Text>
        </View>
      );
    case "bar":
      return (
        <View minPresenceAhead={50} style={{ ...common, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 14, height: 2.2, backgroundColor: t.accent, marginRight: 6 }} />
          <Text style={{ fontFamily: hf.bold, fontSize: t.size.heading, letterSpacing: 0.9, textTransform: "uppercase", color: t.accent }}>{title}</Text>
        </View>
      );
    case "box":
      return (
        <View minPresenceAhead={50} style={{ ...common, backgroundColor: t.accent, paddingVertical: 3, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: hf.bold, fontSize: t.size.heading, letterSpacing: 1, textTransform: "uppercase", color: "#ffffff" }}>{title}</Text>
        </View>
      );
    case "serif-line":
      return (
        <View minPresenceAhead={50} style={{ ...common, flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontFamily: SERIF.bold, fontSize: t.size.heading, color: t.ink, marginRight: 8 }}>{title}</Text>
          <View style={{ flex: 1, height: 0.8, backgroundColor: t.rule }} />
        </View>
      );
    case "dot":
      return (
        <View minPresenceAhead={50} style={{ ...common, flexDirection: "row", alignItems: "center" }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent, marginRight: 6 }} />
          <Text style={{ fontFamily: hf.bold, fontSize: t.size.heading + 0.6, color: t.ink }}>{title}</Text>
        </View>
      );
    case "underline":
      return (
        <View minPresenceAhead={50} style={common}>
          <Text style={{ fontFamily: hf.bold, fontSize: t.size.heading + 1, color: t.ink }}>{title}</Text>
          <View style={{ width: 28, height: 2, backgroundColor: t.accent, marginTop: 3 }} />
        </View>
      );
  }
}

function EntryView({ e, ctx }: { e: Entry; ctx: Ctx }) {
  const { d, t, inSide, f } = ctx;
  const sub = [e.org, e.location].filter(Boolean).join(", ");
  const ink = inSide ? t.sidebar!.text : t.ink;
  const muted = inSide ? t.sidebar!.muted : t.muted;
  const text = inSide ? t.sidebar!.text : t.text;
  const style = inSide ? "stacked" : d.entryStyle;
  const desc = e.description ? <RichText text={e.description} color={text} style={{ marginTop: 2 }} /> : null;

  if (style === "date-left") {
    return (
      <View style={{ flexDirection: "row", marginBottom: t.space.entry + 2 }}>
        <View style={{ width: 98, paddingRight: 10 }}>
          <Text style={{ fontFamily: f.bold, fontSize: t.size.small, color: t.muted }}>{e.dates}</Text>
          {e.location ? <Text style={{ fontSize: t.size.small, color: t.muted }}>{e.location}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <View wrap={false}>
            <Text style={{ fontFamily: f.bold, color: ink }}>{e.title}</Text>
            {e.org ? <Text style={{ fontFamily: f.bold, color: t.accent }}>{e.org}</Text> : null}
          </View>
          {desc}
        </View>
      </View>
    );
  }
  if (style === "timeline") {
    return (
      <View style={{ borderLeft: `1.5pt solid ${t.rule}`, paddingLeft: 10, marginLeft: 3, paddingBottom: t.space.entry, position: "relative" }}>
        <View style={{ position: "absolute", left: -4.5, top: 2, width: 7, height: 7, borderRadius: 3.5, backgroundColor: t.accent }} />
        <View wrap={false}>
          <Text style={{ fontFamily: f.bold, color: ink }}>{e.title}</Text>
          <Text style={{ fontSize: t.size.small, color: muted }}>
            {sub}
            {e.dates ? (
              <Text style={{ fontFamily: f.bold, color: t.accent }}>
                {sub ? "  ·  " : ""}
                {e.dates}
              </Text>
            ) : null}
          </Text>
        </View>
        {desc}
      </View>
    );
  }
  if (style === "stacked") {
    const line = [e.org, e.location, e.dates].filter(Boolean).join(" | ");
    return (
      <View style={{ marginBottom: t.space.entry }}>
        <View wrap={false}>
          <Text style={{ fontFamily: f.bold, color: ink }}>{e.title}</Text>
          {line ? <Text style={{ fontSize: t.size.small, color: muted }}>{line}</Text> : null}
        </View>
        {desc}
      </View>
    );
  }
  return (
    <View style={{ marginBottom: t.space.entry }}>
      <View wrap={false}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: f.bold, color: ink, flex: 1, paddingRight: 8 }}>{e.title}</Text>
          {e.dates ? <Text style={{ fontSize: t.size.small, color: t.muted }}>{e.dates}</Text> : null}
        </View>
        {sub ? <Text style={{ fontFamily: f.italic, color: "#334155" }}>{sub}</Text> : null}
      </View>
      {desc}
    </View>
  );
}

function NamedItems({ items, ctx, kind }: { items: { name: string; level: string }[]; ctx: Ctx; kind: "skills" | "languages" }) {
  const { d, t, inSide, f } = ctx;
  const color = inSide ? t.sidebar!.text : t.text;
  const muted = inSide ? t.sidebar!.muted : t.muted;
  const style = inSide ? "list" : kind === "languages" ? (d.skillsStyle === "inline" ? "inline" : "list") : d.skillsStyle;

  if (style === "inline") {
    return <Text style={{ color }}>{items.map((i) => (i.level ? `${i.name} (${i.level})` : i.name)).join(" · ")}</Text>;
  }
  if (style === "tags") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {items.map((i, k) => (
          <Text key={k} style={{ backgroundColor: t.soft, color: t.ink, borderRadius: 3, paddingVertical: 1.5, paddingHorizontal: 5, fontSize: t.size.small, marginRight: 4, marginBottom: 4 }}>
            {i.name}
            {i.level ? ` · ${i.level}` : ""}
          </Text>
        ))}
      </View>
    );
  }
  if (style === "columns") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {items.map((i, k) => (
          <View key={k} style={{ width: "50%", flexDirection: "row", paddingRight: 8, marginBottom: 1.5 }}>
            <Text style={{ width: 9, color: t.accent }}>•</Text>
            <Text style={{ flex: 1, color }}>
              {i.name}
              {i.level ? <Text style={{ color: muted }}> — {i.level}</Text> : null}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View>
      {items.map((i, k) =>
        inSide ? (
          <View key={k} style={{ marginBottom: 3.5 }} wrap={false}>
            <Text style={{ fontFamily: kind === "languages" ? f.bold : f.regular, color }}>{i.name}</Text>
            {i.level ? <Text style={{ fontSize: t.size.small - 0.8, color: muted }}>{i.level}</Text> : null}
          </View>
        ) : (
          <View key={k} style={{ flexDirection: "row", marginBottom: 1.5 }}>
            <Text style={{ width: 9, color }}>•</Text>
            <Text style={{ flex: 1, color }}>
              <Text style={{ fontFamily: kind === "languages" ? f.bold : f.regular }}>{i.name}</Text>
              {i.level ? <Text style={{ color: muted }}> — {i.level}</Text> : null}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

function SectionBody({ s, ctx }: { s: PlanSection; ctx: Ctx }) {
  const { t, inSide, f } = ctx;
  const color = inSide ? t.sidebar!.text : t.text;
  const muted = inSide ? t.sidebar!.muted : t.muted;
  switch (s.key) {
    case "summary":
    case "objective":
    case "custom":
      return <RichText text={s.text} color={color} />;
    case "experience":
    case "education":
      return (
        <View>
          {s.entries.map((e, i) => (
            <EntryView key={i} e={e} ctx={ctx} />
          ))}
        </View>
      );
    case "skills":
    case "languages":
      return <NamedItems items={s.items} ctx={ctx} kind={s.key} />;
    case "courses":
    case "certifications":
      return (
        <View>
          {s.items.map((c, i) => (
            <View key={i} style={{ marginBottom: 3 }} wrap={false}>
              <Text style={{ fontFamily: f.bold, color }}>{c.name}</Text>
              {c.detail || c.year ? <Text style={{ fontSize: t.size.small, color: muted }}>{[c.detail, c.year].filter(Boolean).join(", ")}</Text> : null}
            </View>
          ))}
        </View>
      );
    case "references":
      if (s.onRequest) return <Text style={{ color }}>Disponíveis mediante solicitação.</Text>;
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {s.items.map((r, i) => (
            <View key={i} style={{ width: inSide ? "100%" : "50%", paddingRight: 10, marginBottom: 6 }} wrap={false}>
              <Text style={{ fontFamily: f.bold, color }}>{r.name}</Text>
              {r.role ? <Text style={{ color }}>{r.role}</Text> : null}
              {r.contact ? <Text style={{ fontSize: t.size.small, color: muted }}>{r.contact}</Text> : null}
            </View>
          ))}
        </View>
      );
    case "contacts":
      return (
        <View>
          {s.items.map((c) => (
            <View key={c.key} style={{ marginBottom: 5 }} wrap={false}>
              <Text style={{ fontSize: 7.4, letterSpacing: 0.5, textTransform: "uppercase", color: muted }}>{c.label}</Text>
              <Text style={{ color }}>{c.value}</Text>
            </View>
          ))}
        </View>
      );
  }
}

function Section({ s, ctx }: { s: PlanSection; ctx: Ctx }) {
  return (
    <View style={{ marginBottom: ctx.t.space.section }}>
      <Heading title={s.title} ctx={ctx} />
      <SectionBody s={s} ctx={ctx} />
    </View>
  );
}

function RowView({ row, ctx }: { row: Row; ctx: Ctx }) {
  if (row.type === "section") return <Section s={row.section} ctx={ctx} />;
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Section s={row.left} ctx={ctx} />
      </View>
      <View style={{ flex: 1, paddingLeft: 10 }}>
        <Section s={row.right} ctx={ctx} />
      </View>
    </View>
  );
}

function PdfPhoto({ photo, size, shape, border }: { photo: CvPhoto; size: number; shape: TemplateDesign["photoShape"]; border?: string }) {
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image não suporta alt
    <Image
      src={{ data: photo.data, format: photo.mime === "image/png" ? "png" : "jpg" }}
      style={{ width: size, height: size, objectFit: "cover", borderRadius: shape === "circle" ? size / 2 : shape === "rounded" ? 6 : 0, ...(border ? { border } : {}) }}
    />
  );
}

function Header({ plan, ctx, photo, padTop = true }: { plan: DocumentPlan; ctx: Ctx; photo: CvPhoto | null; padTop?: boolean }) {
  const { d, t, f, hf } = ctx;
  const band = t.band;
  const center = d.header === "center";
  const pos = photo && plan.photo && plan.photo !== "sidebar" ? plan.photo : null;
  const nameColor = band ? band.text : t.ink;
  const titleColor = band ? band.muted : t.accent;
  const contactColor = band ? band.muted : t.muted;
  const photoEl = pos ? <PdfPhoto photo={photo!} size={center && pos === "center" ? 78 : 70} shape={plan.photoShape} border={band ? "2pt solid rgba(255,255,255,0.5)" : undefined} /> : null;
  const align = center ? "center" : "left";

  const stack = center && pos === "center";
  const nameBlock = (
    // Em coluna (foto por cima do nome) não usar flex: 1 — colapsaria a altura do bloco.
    <View style={stack ? { width: "100%", alignItems: "center" } : { flex: 1, alignItems: center ? "center" : "flex-start" }}>
      <Text style={{ fontFamily: hf.bold, fontSize: t.size.name, lineHeight: 1.15, color: nameColor, textAlign: align }}>{plan.name || "O seu nome"}</Text>
      {plan.jobTitle ? (
        <Text style={{ marginTop: 3, fontFamily: f.bold, fontSize: t.size.title, color: titleColor, textAlign: align, ...(d.header === "band" ? { letterSpacing: 0.8, textTransform: "uppercase" } : {}) }}>
          {plan.jobTitle}
        </Text>
      ) : null}
      {plan.contactsInHeader && d.header !== "split" && d.header !== "stacked" && plan.contacts.length > 0 ? (
        <Text style={{ marginTop: 5, fontSize: t.size.small, color: contactColor, textAlign: align }}>{plan.contacts.map((c) => c.value).join("  ·  ")}</Text>
      ) : null}
      {plan.contactsInHeader && d.header === "stacked" && plan.contacts.length > 0 ? (
        <View style={{ marginTop: 6 }}>
          {plan.contacts.map((c) => (
            <Text key={c.key} style={{ fontSize: t.size.small, color: t.text }}>
              <Text style={{ fontFamily: f.bold }}>{c.label}:</Text> {c.value}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
  const contactsRight =
    plan.contactsInHeader && d.header === "split" && plan.contacts.length > 0 ? (
      <View style={{ maxWidth: 170, alignItems: "flex-end", marginLeft: 12 }}>
        {plan.contacts.map((c) => (
          <Text key={c.key} style={{ fontSize: t.size.small, color: contactColor, textAlign: "right" }}>
            {c.value}
          </Text>
        ))}
      </View>
    ) : null;

  const inner = (
    <View style={{ flexDirection: stack ? "column" : "row", alignItems: "center" }}>
      {pos === "left" || pos === "center" ? <View style={stack ? { marginBottom: 10 } : { marginRight: 14 }}>{photoEl}</View> : null}
      {nameBlock}
      {pos === "right" ? <View style={{ marginLeft: 14 }}>{photoEl}</View> : null}
      {contactsRight}
    </View>
  );
  if (band) return <View style={{ backgroundColor: band.bg, paddingVertical: 22, paddingHorizontal: t.space.pageX, marginBottom: 14 }}>{inner}</View>;
  return <View style={{ paddingTop: padTop ? t.space.pageY : 0, paddingHorizontal: t.space.pageX, marginBottom: 16 }}>{inner}</View>;
}

function Watermark() {
  return (
    <View fixed style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Text
          key={i}
          style={{
            position: "absolute",
            top: 40 + i * 120,
            left: -40,
            width: 700,
            fontFamily: SANS.bold,
            fontSize: 22,
            letterSpacing: 2,
            color: "#0f172a",
            opacity: 0.07,
            transform: "rotate(-30deg)",
          }}
        >
          PRÉ-VISUALIZAÇÃO · Emprego Fácil MZ · PRÉ-VISUALIZAÇÃO
        </Text>
      ))}
    </View>
  );
}

export type RenderOptions = { watermark?: boolean };

/** Gera o PDF do CV (A4, texto selecionável — adequado para email e portais de emprego). */
export async function renderCvPdf(cv: CvContent, design: TemplateDesign, photo: CvPhoto | null = null, options: RenderOptions = {}): Promise<Buffer> {
  const t = buildTheme(design);
  const plan = planDocument(cv, design, { hasPhoto: !!photo });
  const f = t.serifBody ? SERIF : SANS;
  const hf = t.serifHeadings ? SERIF : SANS;
  const mainCtx: Ctx = { d: design, t, inSide: false, f, hf };
  const sideCtx: Ctx = { d: design, t, inSide: true, f: SANS, hf: SANS };
  const pageStyle: Style = { fontFamily: f.regular, fontSize: t.size.base, lineHeight: 1.4, color: t.text, paddingBottom: t.space.pageY };
  const rows = plan.main.map((r, i) => <RowView key={i} row={r} ctx={mainCtx} />);

  let body;
  if (t.sidebar) {
    const left = design.structure === "sidebar-left";
    const sw = t.sidebarWidthPt;
    const bandTop = design.header === "band";
    const sideCol = (
      <View style={{ width: sw, paddingHorizontal: 18 }}>
        {photo && plan.photo === "sidebar" ? (
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <PdfPhoto photo={photo} size={88} shape={plan.photoShape} border="3pt solid rgba(255,255,255,0.35)" />
          </View>
        ) : null}
        {plan.side.map((s, i) => (
          <Section key={i} s={s} ctx={sideCtx} />
        ))}
      </View>
    );
    const mainCol = (
      <View style={{ flex: 1 }}>
        {!bandTop ? <Header plan={plan} ctx={mainCtx} photo={photo} padTop={false} /> : null}
        <View style={{ paddingHorizontal: t.space.pageX }}>{rows}</View>
      </View>
    );
    body = (
      <Page size="A4" style={{ ...pageStyle, paddingTop: bandTop ? 0 : t.space.pageY }}>
        {/* Fundo da barra lateral repetido em todas as páginas */}
        <View fixed style={{ position: "absolute", top: 0, bottom: 0, width: sw, backgroundColor: t.sidebar.bg, ...(left ? { left: 0 } : { right: 0 }) }} />
        {bandTop ? <Header plan={plan} ctx={mainCtx} photo={photo} /> : null}
        <View style={{ flexDirection: "row" }}>
          {left ? sideCol : mainCol}
          {left ? mainCol : sideCol}
        </View>
        {options.watermark ? <Watermark /> : null}
      </Page>
    );
  } else {
    body = (
      <Page size="A4" style={pageStyle}>
        <Header plan={plan} ctx={mainCtx} photo={photo} />
        <View style={{ paddingHorizontal: t.space.pageX }}>
          {design.structure === "split" ? (
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1.65, paddingRight: 14 }}>{rows}</View>
              <View style={{ flex: 1, borderLeft: `0.8pt solid ${tintHex(t.accent, 0.7)}`, paddingLeft: 14 }}>
                {plan.side.map((s, i) => (
                  <Section key={i} s={s} ctx={mainCtx} />
                ))}
              </View>
            </View>
          ) : (
            rows
          )}
        </View>
        {options.watermark ? <Watermark /> : null}
      </Page>
    );
  }

  return renderToBuffer(
    <Document
      title={`CV — ${cv.personal.fullName || cv.title}`}
      author={cv.personal.fullName || undefined}
      subject={cv.personal.jobTitle || "Curriculum Vitae"}
      creator="Emprego Fácil MZ"
      producer="Emprego Fácil MZ"
      language="pt"
    >
      {body}
    </Document>,
  );
}
