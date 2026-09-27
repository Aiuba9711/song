import type { CSSProperties, ReactNode } from "react";
import { buildTheme, tintHex, type TemplateDesign, type Theme } from "../design";
import { toBlocks } from "../format";
import { planDocument, type Entry, type PlanSection, type Row } from "../plan";
import type { CvContent } from "../types";
import { framingToCss, type Framing } from "@/lib/photo-framing";

/**
 * Renderizador HTML (pré-visualização). Segue o mesmo plano e as mesmas medidas (em pt) do
 * PDF e do DOCX. Página A4: 794 × 1123 px (1 pt = 4/3 px).
 */
const px = (pt: number) => `${Math.round(pt * (4 / 3) * 100) / 100}px`;

const SANS = "Helvetica, Arial, sans-serif";
const SERIF = "'Times New Roman', Times, Georgia, serif";

type Ctx = { d: TemplateDesign; t: Theme; inSide: boolean };

function RichText({ text, t, color }: { text: string; t: Theme; color?: string }) {
  const blocks = toBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <div style={{ color: color ?? t.text }}>
      {blocks.map((b, i) =>
        b.kind === "paragraph" ? (
          <p key={i} style={{ marginTop: i ? px(2) : 0 }}>
            {b.text}
          </p>
        ) : (
          <div key={i} style={{ marginTop: i ? px(2) : 0 }}>
            {b.items.map((item, j) => (
              <div key={j} style={{ display: "flex", marginTop: j ? px(1.5) : 0 }}>
                <span style={{ width: px(10), flexShrink: 0 }}>•</span>
                <span style={{ flex: 1 }}>{item}</span>
              </div>
            ))}
          </div>
        ),
      )}
    </div>
  );
}

function Heading({ title, ctx }: { title: string; ctx: Ctx }) {
  const { d, t, inSide } = ctx;
  const base: CSSProperties = { fontWeight: 700, marginBottom: px(6), breakAfter: "avoid" };
  if (inSide && t.sidebar) {
    return <h2 style={{ ...base, fontSize: px(8.6), letterSpacing: px(1.1), textTransform: "uppercase", color: t.sidebar.heading }}>{title}</h2>;
  }
  const fontFamily = t.serifHeadings ? SERIF : SANS;
  switch (d.headingStyle) {
    case "rule":
      return (
        <h2 style={{ ...base, fontFamily, fontSize: px(t.size.heading), letterSpacing: px(1.1), textTransform: "uppercase", color: t.accent, borderBottom: `${px(0.8)} solid ${t.accent}`, paddingBottom: px(2) }}>
          {title}
        </h2>
      );
    case "caps":
      return <h2 style={{ ...base, fontFamily, fontSize: px(t.size.heading), letterSpacing: px(1.4), textTransform: "uppercase", color: t.ink }}>{title}</h2>;
    case "bar":
      return (
        <h2 style={{ ...base, fontFamily, fontSize: px(t.size.heading), letterSpacing: px(0.9), textTransform: "uppercase", color: t.accent, display: "flex", alignItems: "center" }}>
          <span style={{ width: px(14), height: px(2.2), background: t.accent, marginRight: px(6), display: "inline-block" }} />
          {title}
        </h2>
      );
    case "box":
      return (
        <h2 style={{ ...base, fontFamily, fontSize: px(t.size.heading), letterSpacing: px(1), textTransform: "uppercase", color: "#ffffff", background: t.accent, padding: `${px(3)} ${px(6)}` }}>
          {title}
        </h2>
      );
    case "serif-line":
      return (
        <h2 style={{ ...base, display: "flex", alignItems: "center", fontFamily: SERIF, fontSize: px(t.size.heading), color: t.ink }}>
          <span style={{ marginRight: px(8), whiteSpace: "nowrap" }}>{title}</span>
          <span style={{ flex: 1, height: px(0.8), background: t.rule }} />
        </h2>
      );
    case "dot":
      return (
        <h2 style={{ ...base, fontFamily, fontSize: px(t.size.heading + 0.6), color: t.ink, display: "flex", alignItems: "center" }}>
          <span style={{ width: px(6), height: px(6), borderRadius: "50%", background: t.accent, marginRight: px(6), display: "inline-block" }} />
          {title}
        </h2>
      );
    case "underline":
      return (
        <h2 style={{ ...base, fontFamily, fontSize: px(t.size.heading + 1), color: t.ink }}>
          {title}
          <span style={{ display: "block", width: px(28), height: px(2), background: t.accent, marginTop: px(3) }} />
        </h2>
      );
  }
}

function EntryView({ e, ctx }: { e: Entry; ctx: Ctx }) {
  const { d, t, inSide } = ctx;
  const sub = [e.org, e.location].filter(Boolean).join(", ");
  const titleStyle: CSSProperties = { fontWeight: 700, color: inSide ? t.sidebar?.text : t.ink };
  const muted = inSide ? t.sidebar?.muted : t.muted;
  const style = inSide ? "stacked" : d.entryStyle;
  const desc = e.description ? (
    <div style={{ marginTop: px(2) }}>
      <RichText text={e.description} t={t} color={inSide ? t.sidebar?.text : undefined} />
    </div>
  ) : null;

  if (style === "date-left") {
    return (
      <div style={{ display: "flex", marginBottom: px(t.space.entry + 2) }}>
        <div style={{ width: px(98), flexShrink: 0, paddingRight: px(10), fontSize: px(t.size.small), color: t.muted, fontWeight: 700 }}>
          {e.dates}
          {e.location && <div style={{ fontWeight: 400 }}>{e.location}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={titleStyle}>{e.title}</div>
          {e.org && <div style={{ fontWeight: 700, color: t.accent }}>{e.org}</div>}
          {desc}
        </div>
      </div>
    );
  }
  if (style === "timeline") {
    return (
      <div style={{ position: "relative", borderLeft: `${px(1.5)} solid ${t.rule}`, paddingLeft: px(10), marginLeft: px(3), paddingBottom: px(t.space.entry) }}>
        <span style={{ position: "absolute", left: px(-4.5), top: px(2), width: px(7), height: px(7), borderRadius: "50%", background: t.accent }} />
        <div style={titleStyle}>{e.title}</div>
        <div style={{ fontSize: px(t.size.small), color: muted }}>
          {sub}
          {e.dates && (
            <span style={{ fontWeight: 700, color: t.accent }}>
              {sub ? "  ·  " : ""}
              {e.dates}
            </span>
          )}
        </div>
        {desc}
      </div>
    );
  }
  if (style === "stacked") {
    return (
      <div style={{ marginBottom: px(t.space.entry) }}>
        <div style={titleStyle}>{e.title}</div>
        <div style={{ fontSize: px(t.size.small), color: muted }}>{[e.org, e.location, e.dates].filter(Boolean).join(" | ")}</div>
        {desc}
      </div>
    );
  }
  // classic
  return (
    <div style={{ marginBottom: px(t.space.entry) }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: px(8) }}>
        <span style={{ ...titleStyle, flex: 1 }}>{e.title}</span>
        {e.dates && <span style={{ fontSize: px(t.size.small), color: t.muted, whiteSpace: "nowrap" }}>{e.dates}</span>}
      </div>
      {sub && <div style={{ fontStyle: "italic", color: "#334155" }}>{sub}</div>}
      {desc}
    </div>
  );
}

function NamedItems({ items, ctx, kind }: { items: { name: string; level: string }[]; ctx: Ctx; kind: "skills" | "languages" }) {
  const { d, t, inSide } = ctx;
  const color = inSide ? t.sidebar!.text : t.text;
  const muted = inSide ? t.sidebar!.muted : t.muted;
  const style = inSide ? "list" : kind === "languages" ? (d.skillsStyle === "inline" ? "inline" : "list") : d.skillsStyle;

  if (style === "inline") {
    return <p style={{ color }}>{items.map((i) => (i.level ? `${i.name} (${i.level})` : i.name)).join(" · ")}</p>;
  }
  if (style === "tags") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: px(4) }}>
        {items.map((i, k) => (
          <span key={k} style={{ background: t.soft, color: t.ink, borderRadius: px(3), padding: `${px(1.5)} ${px(5)}`, fontSize: px(t.size.small) }}>
            {i.name}
            {i.level ? ` · ${i.level}` : ""}
          </span>
        ))}
      </div>
    );
  }
  if (style === "columns") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {items.map((i, k) => (
          <div key={k} style={{ width: "50%", display: "flex", paddingRight: px(8), marginBottom: px(1.5) }}>
            <span style={{ width: px(9), flexShrink: 0, color: t.accent }}>•</span>
            <span>
              {i.name}
              {i.level && <span style={{ color: muted }}> — {i.level}</span>}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      {items.map((i, k) =>
        inSide ? (
          <div key={k} style={{ marginBottom: px(3.5), color }}>
            {kind === "languages" ? <strong>{i.name}</strong> : i.name}
            {i.level && <div style={{ fontSize: px(t.size.small - 0.8), color: muted }}>{i.level}</div>}
          </div>
        ) : (
          <div key={k} style={{ display: "flex", marginBottom: px(1.5), color }}>
            <span style={{ width: px(9), flexShrink: 0 }}>•</span>
            <span>
              {kind === "languages" ? <strong>{i.name}</strong> : i.name}
              {i.level && <span style={{ color: muted }}> — {i.level}</span>}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

function SectionBody({ s, ctx }: { s: PlanSection; ctx: Ctx }) {
  const { t, inSide } = ctx;
  const color = inSide ? t.sidebar!.text : t.text;
  const muted = inSide ? t.sidebar!.muted : t.muted;
  switch (s.key) {
    case "summary":
    case "objective":
    case "custom":
      return <RichText text={s.text} t={t} color={color} />;
    case "experience":
    case "education":
      return (
        <div>
          {s.entries.map((e, i) => (
            <EntryView key={i} e={e} ctx={ctx} />
          ))}
        </div>
      );
    case "skills":
    case "languages":
      return <NamedItems items={s.items} ctx={ctx} kind={s.key} />;
    case "courses":
    case "certifications":
      return (
        <div>
          {s.items.map((c, i) => (
            <div key={i} style={{ marginBottom: px(3), color }}>
              <strong>{c.name}</strong>
              {(c.detail || c.year) && <div style={{ fontSize: px(t.size.small), color: muted }}>{[c.detail, c.year].filter(Boolean).join(", ")}</div>}
            </div>
          ))}
        </div>
      );
    case "references":
      if (s.onRequest) return <p style={{ color }}>Disponíveis mediante solicitação.</p>;
      return (
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {s.items.map((r, i) => (
            <div key={i} style={{ width: inSide ? "100%" : "50%", paddingRight: px(10), marginBottom: px(6), color }}>
              <strong>{r.name}</strong>
              {r.role && <div>{r.role}</div>}
              {r.contact && <div style={{ fontSize: px(t.size.small), color: muted }}>{r.contact}</div>}
            </div>
          ))}
        </div>
      );
    case "contacts":
      return (
        <div>
          {s.items.map((c) => (
            <div key={c.key} style={{ marginBottom: px(5), color, wordBreak: "break-word" }}>
              <div style={{ fontSize: px(7.4), letterSpacing: px(0.5), textTransform: "uppercase", color: muted }}>{c.label}</div>
              {c.value}
            </div>
          ))}
        </div>
      );
  }
}

function Section({ s, ctx }: { s: PlanSection; ctx: Ctx }) {
  return (
    <section style={{ marginBottom: px(ctx.t.space.section) }}>
      <Heading title={s.title} ctx={ctx} />
      <SectionBody s={s} ctx={ctx} />
    </section>
  );
}

function RowView({ row, ctx }: { row: Row; ctx: Ctx }) {
  if (row.type === "section") return <Section s={row.section} ctx={ctx} />;
  return (
    <div style={{ display: "flex", gap: px(20) }}>
      <div style={{ flex: 1 }}>
        <Section s={row.left} ctx={ctx} />
      </div>
      <div style={{ flex: 1 }}>
        <Section s={row.right} ctx={ctx} />
      </div>
    </div>
  );
}

/** Recorte ao vivo (editor): a imagem original + enquadramento, calculado como no servidor. */
export type PhotoCrop = { naturalWidth: number; naturalHeight: number; framing: Framing };

function Photo({ url, size, shape, border, crop }: { url: string; size: number; shape: TemplateDesign["photoShape"]; border?: string; crop?: PhotoCrop | null }) {
  const radius = shape === "circle" ? "50%" : shape === "rounded" ? px(8) : "0";
  if (crop) {
    const box = size * (4 / 3);
    const bg = framingToCss(crop.naturalWidth, crop.naturalHeight, crop.framing, box);
    return (
      <div
        role="img"
        aria-label="Fotografia do candidato"
        style={{ width: px(size), height: px(size), borderRadius: radius, border, flexShrink: 0, backgroundImage: `url("${url}")`, backgroundRepeat: "no-repeat", ...bg, boxSizing: "content-box" }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ficheiro privado servido pela API
    <img src={url} alt="Fotografia do candidato" style={{ width: px(size), height: px(size), borderRadius: radius, objectFit: "cover", border, flexShrink: 0 }} />
  );
}

function Watermark() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "space-around",
          justifyContent: "space-around",
          transform: "rotate(-30deg)",
          color: "rgba(15,23,42,0.07)",
          fontSize: "26px",
          fontWeight: 700,
          letterSpacing: "2px",
          fontFamily: SANS,
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ padding: "40px 30px", whiteSpace: "nowrap" }}>
            PRÉ-VISUALIZAÇÃO · Emprego Fácil MZ
          </span>
        ))}
      </div>
    </div>
  );
}

function Header({ plan, ctx, photoUrl, crop, flush, children }: { plan: ReturnType<typeof planDocument>; ctx: Ctx; photoUrl: string | null; crop?: PhotoCrop | null; flush?: boolean; children?: ReactNode }) {
  const { d, t } = ctx;
  const nameFont = t.serifHeadings ? SERIF : SANS;
  const band = t.band;
  const nameColor = band ? band.text : t.ink;
  const titleColor = band ? band.muted : t.accent;
  const contactColor = band ? band.muted : t.muted;
  const center = d.header === "center";
  const photo = photoUrl && plan.photo && plan.photo !== "sidebar" ? plan.photo : null;
  const photoEl = photo ? <Photo url={photoUrl!} size={center && photo === "center" ? 78 : 70} shape={plan.photoShape} border={band ? `${px(2)} solid rgba(255,255,255,0.5)` : undefined} crop={crop} /> : null;

  const nameBlock = (
    <div style={{ flex: 1, textAlign: center ? "center" : "left", minWidth: 0 }}>
      <h1 style={{ fontFamily: nameFont, fontSize: px(t.size.name), lineHeight: 1.15, fontWeight: 700, color: nameColor }}>{plan.name || "O seu nome"}</h1>
      {plan.jobTitle && (
        <p style={{ marginTop: px(3), fontSize: px(t.size.title), fontWeight: 700, color: titleColor, letterSpacing: d.header === "band" ? px(0.8) : undefined, textTransform: d.header === "band" ? "uppercase" : undefined }}>
          {plan.jobTitle}
        </p>
      )}
      {plan.contactsInHeader && d.header !== "split" && d.header !== "stacked" && plan.contacts.length > 0 && (
        <p style={{ marginTop: px(5), fontSize: px(t.size.small), color: contactColor }}>{plan.contacts.map((c) => c.value).join("  ·  ")}</p>
      )}
      {plan.contactsInHeader && d.header === "stacked" && plan.contacts.length > 0 && (
        <div style={{ marginTop: px(6), fontSize: px(t.size.small), color: t.text }}>
          {plan.contacts.map((c) => (
            <div key={c.key}>
              <strong>{c.label}:</strong> {c.value}
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );

  const contactsRight =
    plan.contactsInHeader && d.header === "split" && plan.contacts.length > 0 ? (
      <div style={{ maxWidth: px(170), textAlign: "right", fontSize: px(t.size.small), color: contactColor, wordBreak: "break-word" }}>
        {plan.contacts.map((c) => (
          <div key={c.key}>{c.value}</div>
        ))}
      </div>
    ) : null;

  const inner = (
    <div style={{ display: "flex", flexDirection: center && photo === "center" ? "column" : "row", alignItems: "center", gap: px(14) }}>
      {photo === "left" || photo === "center" ? photoEl : null}
      {nameBlock}
      {photo === "right" ? photoEl : null}
      {contactsRight}
    </div>
  );

  if (band) {
    return <div style={{ background: band.bg, padding: `${px(22)} ${px(t.space.pageX)}`, marginBottom: flush ? 0 : px(14) }}>{inner}</div>;
  }
  return <div style={{ padding: `${px(t.space.pageY)} ${px(t.space.pageX)} 0`, marginBottom: px(16) }}>{inner}</div>;
}

type DocProps = { cv: CvContent; design: TemplateDesign; photoUrl?: string | null; watermark?: boolean; photoCrop?: PhotoCrop | null };

export function CvDocument({ cv, design, photoUrl, watermark, photoCrop }: DocProps) {
  const t = buildTheme(design);
  const plan = planDocument(cv, design, { hasPhoto: !!photoUrl });
  const mainCtx: Ctx = { d: design, t, inSide: false };
  const sideCtx: Ctx = { d: design, t, inSide: true };
  const sidebar = t.sidebar;
  const bodyFont = t.serifBody ? SERIF : SANS;
  const sheet: CSSProperties = {
    position: "relative",
    width: 794,
    minHeight: 1123,
    background: "#ffffff",
    color: t.text,
    fontFamily: bodyFont,
    fontSize: px(t.size.base),
    lineHeight: 1.4,
    overflow: "hidden",
  };

  if (sidebar) {
    const left = design.structure === "sidebar-left";
    // Com faixa no topo, a barra lateral começa logo abaixo da faixa (como no PDF).
    const bandTop = design.header === "band";
    const sideCol = (
      <div style={{ width: px(t.sidebarWidthPt), flexShrink: 0, background: sidebar.bg, color: sidebar.text, padding: `${px(bandTop ? 14 : t.space.pageY)} ${px(18)} ${px(t.space.pageY)}` }}>
        {photoUrl && plan.photo === "sidebar" && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: px(16) }}>
            <Photo url={photoUrl} size={88} shape={plan.photoShape} border={`${px(3)} solid rgba(255,255,255,0.35)`} crop={photoCrop} />
          </div>
        )}
        {plan.side.map((s, i) => (
          <Section key={i} s={s} ctx={sideCtx} />
        ))}
      </div>
    );
    const mainCol = (
      <div style={{ flex: 1, minWidth: 0 }}>
        {!bandTop && <Header plan={plan} ctx={mainCtx} photoUrl={photoUrl ?? null} crop={photoCrop} />}
        <div style={{ padding: `${bandTop ? px(14) : 0} ${px(t.space.pageX)} ${px(t.space.pageY)}` }}>
          {plan.main.map((r, i) => (
            <RowView key={i} row={r} ctx={mainCtx} />
          ))}
        </div>
      </div>
    );
    return (
      <div style={sheet} data-cv-document="">
        {bandTop && <Header plan={plan} ctx={mainCtx} photoUrl={photoUrl ?? null} crop={photoCrop} flush />}
        <div style={{ display: "flex", minHeight: bandTop ? 980 : 1123 }}>
          {left ? sideCol : mainCol}
          {left ? mainCol : sideCol}
        </div>
        {watermark && <Watermark />}
      </div>
    );
  }

  const mainRows = plan.main.map((r, i) => <RowView key={i} row={r} ctx={mainCtx} />);
  return (
    <div style={sheet} data-cv-document="">
      <Header plan={plan} ctx={mainCtx} photoUrl={photoUrl ?? null} crop={photoCrop} />
      <div style={{ padding: `0 ${px(t.space.pageX)} ${px(t.space.pageY)}` }}>
        {design.structure === "split" ? (
          <div style={{ display: "flex", gap: px(18) }}>
            <div style={{ flex: 1.65, minWidth: 0 }}>{mainRows}</div>
            <div style={{ flex: 1, minWidth: 0, borderLeft: `${px(0.8)} solid ${tintHex(t.accent, 0.7)}`, paddingLeft: px(14) }}>
              {plan.side.map((s, i) => (
                <Section key={i} s={s} ctx={mainCtx} />
              ))}
            </div>
          </div>
        ) : (
          mainRows
        )}
      </div>
      {watermark && <Watermark />}
    </div>
  );
}

/** Compatibilidade: nome usado no resto da aplicação. */
export function CvPreview(props: DocProps) {
  return <CvDocument {...props} />;
}
