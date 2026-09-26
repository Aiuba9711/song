import { contactItems, formatRange, isSectionVisible, joinNonEmpty, SECTION_LABELS, tint } from "../format";
import type { CvContent } from "../types";
import { Photo, RichText, Sheet } from "./shared";

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };

function Heading({ children, accent }: { children: string; accent: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <h2 className="text-[15px] font-bold whitespace-nowrap text-slate-900" style={serif}>
        {children}
      </h2>
      <span className="h-px flex-1" style={{ background: tint(accent, 0.5) }} />
    </div>
  );
}

export function ExecutivoPreview({ cv, accent, photoUrl }: { cv: CvContent; accent: string; photoUrl?: string | null }) {
  const p = cv.personal;
  const contacts = contactItems(cv);
  return (
    <Sheet>
      <div className="h-2.5" style={{ background: accent }} />
      <div className="flex items-center gap-6 px-[56px] pt-9 pb-6" style={{ background: tint(accent, 0.94) }}>
        {photoUrl && <Photo url={photoUrl} name={p.fullName} size={100} rounded="lg" />}
        <div className="flex-1">
          <h1 className="text-[31px] leading-tight font-bold tracking-tight text-slate-900" style={serif}>
            {p.fullName || "O seu nome"}
          </h1>
          {p.jobTitle && (
            <p className="mt-1 text-[14px] font-semibold tracking-[0.14em] uppercase" style={{ color: accent }}>
              {p.jobTitle}
            </p>
          )}
        </div>
        {contacts.length > 0 && (
          <ul className="max-w-[230px] space-y-0.5 text-right text-[12px] break-words text-slate-700">
            {contacts.map((c) => (
              <li key={c.key}>{c.value}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-5 px-[56px] pt-6 pb-12">
        {isSectionVisible(cv, "summary") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.summary}</Heading>
            <RichText text={cv.summary} className="text-slate-700" />
          </section>
        )}
        {isSectionVisible(cv, "experience") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.experience}</Heading>
            <div className="space-y-4">
              {cv.experiences.map((e, i) => (
                <article key={i} className="grid grid-cols-[140px_1fr] gap-4">
                  <div className="text-[12px] font-semibold text-slate-600">
                    {formatRange(e.startDate, e.endDate, e.isCurrent)}
                    {e.location && <span className="block font-normal">{e.location}</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{e.position}</h3>
                    <p className="font-semibold" style={{ color: accent }}>
                      {e.employer}
                    </p>
                    <RichText text={e.description} className="mt-1" />
                  </div>
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
                <article key={i} className="grid grid-cols-[140px_1fr] gap-4">
                  <div className="text-[12px] font-semibold text-slate-600">
                    {formatRange(e.startDate, e.endDate, e.isCurrent)}
                    {e.location && <span className="block font-normal">{e.location}</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{e.degree}</h3>
                    <p className="font-semibold" style={{ color: accent }}>
                      {e.institution}
                    </p>
                    <RichText text={e.description} className="mt-1" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {isSectionVisible(cv, "skills") && (
          <section>
            <Heading accent={accent}>{SECTION_LABELS.skills}</Heading>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1">
              {cv.skills.map((s, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="inline-block size-1.5 shrink-0 translate-y-[-2px] rounded-full" style={{ background: accent }} />
                  <span>
                    {s.name}
                    {s.level && <span className="text-slate-500"> — {s.level}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(isSectionVisible(cv, "languages") || isSectionVisible(cv, "courses")) && (
          <div className="grid grid-cols-2 gap-8">
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
            {isSectionVisible(cv, "courses") && (
              <section>
                <Heading accent={accent}>{SECTION_LABELS.courses}</Heading>
                <ul className="space-y-1">
                  {cv.courses.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">{c.name}</span>
                      <span className="block text-[12.5px] text-slate-600">{joinNonEmpty([c.institution, c.year], ", ")}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
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
              <p>Disponíveis mediante solicitação.</p>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}
