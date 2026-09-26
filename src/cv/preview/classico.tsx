import { contactItems, formatRange, isSectionVisible, joinNonEmpty, SECTION_LABELS } from "../format";
import type { CvContent } from "../types";
import { Photo, RichText, Sheet } from "./shared";

function Heading({ children, accent }: { children: string; accent: string }) {
  return (
    <h2
      className="mb-2 border-b pb-1 text-[12.5px] font-bold tracking-[0.12em] uppercase"
      style={{ color: accent, borderColor: accent }}
    >
      {children}
    </h2>
  );
}

export function ClassicoPreview({ cv, accent, photoUrl }: { cv: CvContent; accent: string; photoUrl?: string | null }) {
  const p = cv.personal;
  const contacts = contactItems(cv);
  return (
    <Sheet className="px-[60px] py-[52px]">
      <div className="flex items-center gap-6 text-center">
        {photoUrl && <Photo url={photoUrl} name={p.fullName} size={96} />}
        <div className={photoUrl ? "flex-1 text-left" : "flex-1"}>
          <h1 className="text-[28px] leading-tight font-bold text-slate-900">{p.fullName || "O seu nome"}</h1>
          {p.jobTitle && (
            <p className="mt-1 text-[15px] font-semibold" style={{ color: accent }}>
              {p.jobTitle}
            </p>
          )}
          {contacts.length > 0 && (
            <p className="mt-2 text-[12.5px] text-slate-600">{contacts.map((c) => c.value).join("  ·  ")}</p>
          )}
        </div>
      </div>

      <div className="mt-7 space-y-5">
        {isSectionVisible(cv, "summary") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.summary}</Heading>
            <RichText text={cv.summary} />
          </section>
        )}
        {isSectionVisible(cv, "experience") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.experience}</Heading>
            <div className="space-y-3.5">
              {cv.experiences.map((e, i) => (
                <article key={i}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-bold text-slate-900">{e.position}</h3>
                    <span className="shrink-0 text-[12.5px] text-slate-600">{formatRange(e.startDate, e.endDate, e.isCurrent)}</span>
                  </div>
                  <p className="text-slate-700 italic">{joinNonEmpty([e.employer, e.location], ", ")}</p>
                  <RichText text={e.description} className="mt-1" />
                </article>
              ))}
            </div>
          </section>
        )}
        {isSectionVisible(cv, "education") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.education}</Heading>
            <div className="space-y-3">
              {cv.educations.map((e, i) => (
                <article key={i}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-bold text-slate-900">{e.degree}</h3>
                    <span className="shrink-0 text-[12.5px] text-slate-600">{formatRange(e.startDate, e.endDate, e.isCurrent)}</span>
                  </div>
                  <p className="text-slate-700 italic">{joinNonEmpty([e.institution, e.location], ", ")}</p>
                  <RichText text={e.description} className="mt-1" />
                </article>
              ))}
            </div>
          </section>
        )}
        {(isSectionVisible(cv, "skills") || isSectionVisible(cv, "languages")) && (
          <div className="grid grid-cols-2 gap-8">
            {isSectionVisible(cv, "skills") && (
              <section>
                <Heading accent={accent}>{SECTION_LABELS.skills}</Heading>
                <ul className="list-disc space-y-0.5 pl-5">
                  {cv.skills.map((s, i) => (
                    <li key={i}>
                      {s.name}
                      {s.level && <span className="text-slate-500"> — {s.level}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {isSectionVisible(cv, "languages") && (
              <section>
                <Heading accent={accent}>{SECTION_LABELS.languages}</Heading>
                <ul className="space-y-0.5">
                  {cv.languages.map((l, i) => (
                    <li key={i}>
                      <span className="font-semibold">{l.name}</span>
                      {l.level && <span className="text-slate-600"> — {l.level}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        {isSectionVisible(cv, "courses") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.courses}</Heading>
            <ul className="space-y-1">
              {cv.courses.map((c, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>
                    <span className="font-semibold">{c.name}</span>
                    {c.institution && <span className="text-slate-600"> — {c.institution}</span>}
                  </span>
                  {c.year && <span className="shrink-0 text-[12.5px] text-slate-600">{c.year}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {isSectionVisible(cv, "custom") &&
          cv.customSections.map((s, i) => (
            <section key={i}>
              <Heading accent={accent}>{s.title}</Heading>
              <RichText text={s.content} />
            </section>
          ))}
        {isSectionVisible(cv, "references") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.references}</Heading>
            {cv.references.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {cv.references.map((r, i) => (
                  <div key={i}>
                    <p className="font-bold text-slate-900">{r.name}</p>
                    <p className="text-slate-700">{joinNonEmpty([r.position, r.company], ", ")}</p>
                    <p className="text-[12.5px] text-slate-600">{joinNonEmpty([r.phone, r.email])}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-700">Disponíveis mediante solicitação.</p>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}
