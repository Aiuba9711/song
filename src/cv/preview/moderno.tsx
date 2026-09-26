import { contactItems, formatRange, initials, isSectionVisible, joinNonEmpty, SECTION_LABELS, tint } from "../format";
import type { CvContent } from "../types";
import { Photo, RichText, Sheet } from "./shared";

function SideHeading({ children }: { children: string }) {
  return <h2 className="mb-2 text-[11.5px] font-bold tracking-[0.14em] text-white/80 uppercase">{children}</h2>;
}

function MainHeading({ children, accent }: { children: string; accent: string }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-bold tracking-[0.1em] uppercase" style={{ color: accent }}>
      <span className="inline-block h-[3px] w-5 rounded" style={{ background: accent }} />
      {children}
    </h2>
  );
}

export function ModernoPreview({ cv, accent, photoUrl }: { cv: CvContent; accent: string; photoUrl?: string | null }) {
  const p = cv.personal;
  const contacts = contactItems(cv);
  return (
    <Sheet className="flex">
      <div className="w-[250px] shrink-0 space-y-6 px-6 py-10 text-white" style={{ background: accent }}>
        <div className="flex justify-center">
          {photoUrl ? (
            <Photo url={photoUrl} name={p.fullName} size={120} border="4px solid rgba(255,255,255,0.35)" />
          ) : (
            <div className="grid size-[92px] place-items-center rounded-full bg-white/15 text-[30px] font-bold">
              {initials(p.fullName) || "CV"}
            </div>
          )}
        </div>
        {contacts.length > 0 && (
          <section>
            <SideHeading>Contactos</SideHeading>
            <ul className="space-y-2 text-[12.5px] break-words">
              {contacts.map((c) => (
                <li key={c.key}>
                  <span className="block text-[10.5px] tracking-wide text-white/70 uppercase">{c.label}</span>
                  {c.value}
                </li>
              ))}
            </ul>
          </section>
        )}
        {isSectionVisible(cv, "skills") && (
          <section>
            <SideHeading>{SECTION_LABELS.skills}</SideHeading>
            <ul className="space-y-1.5 text-[12.5px]">
              {cv.skills.map((s, i) => (
                <li key={i}>
                  {s.name}
                  {s.level && <span className="block text-[11px] text-white/70">{s.level}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {isSectionVisible(cv, "languages") && (
          <section>
            <SideHeading>{SECTION_LABELS.languages}</SideHeading>
            <ul className="space-y-1.5 text-[12.5px]">
              {cv.languages.map((l, i) => (
                <li key={i}>
                  <span className="font-semibold">{l.name}</span>
                  {l.level && <span className="block text-[11px] text-white/70">{l.level}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="flex-1 px-9 py-10">
        <div className="mb-6">
          <h1 className="text-[30px] leading-tight font-bold text-slate-900">{p.fullName || "O seu nome"}</h1>
          {p.jobTitle && (
            <p className="mt-1 inline-block rounded-md px-2 py-0.5 text-[14px] font-semibold" style={{ color: accent, background: tint(accent, 0.9) }}>
              {p.jobTitle}
            </p>
          )}
        </div>
        <div className="space-y-5">
          {isSectionVisible(cv, "summary") && (
            <section>
              <MainHeading accent={accent}>{SECTION_LABELS.summary}</MainHeading>
              <RichText text={cv.summary} />
            </section>
          )}
          {isSectionVisible(cv, "experience") && (
            <section>
              <MainHeading accent={accent}>{SECTION_LABELS.experience}</MainHeading>
              <div className="space-y-3.5">
                {cv.experiences.map((e, i) => (
                  <article key={i} className="border-l-2 pl-3" style={{ borderColor: tint(accent, 0.7) }}>
                    <h3 className="font-bold text-slate-900">{e.position}</h3>
                    <p className="text-[12.5px] text-slate-600">
                      {joinNonEmpty([e.employer, e.location], ", ")}
                      {formatRange(e.startDate, e.endDate, e.isCurrent) && (
                        <span className="font-semibold" style={{ color: accent }}>
                          {"  ·  "}
                          {formatRange(e.startDate, e.endDate, e.isCurrent)}
                        </span>
                      )}
                    </p>
                    <RichText text={e.description} className="mt-1" />
                  </article>
                ))}
              </div>
            </section>
          )}
          {isSectionVisible(cv, "education") && (
            <section>
              <MainHeading accent={accent}>{SECTION_LABELS.education}</MainHeading>
              <div className="space-y-3">
                {cv.educations.map((e, i) => (
                  <article key={i} className="border-l-2 pl-3" style={{ borderColor: tint(accent, 0.7) }}>
                    <h3 className="font-bold text-slate-900">{e.degree}</h3>
                    <p className="text-[12.5px] text-slate-600">
                      {joinNonEmpty([e.institution, e.location], ", ")}
                      {formatRange(e.startDate, e.endDate, e.isCurrent) && (
                        <span className="font-semibold" style={{ color: accent }}>
                          {"  ·  "}
                          {formatRange(e.startDate, e.endDate, e.isCurrent)}
                        </span>
                      )}
                    </p>
                    <RichText text={e.description} className="mt-1" />
                  </article>
                ))}
              </div>
            </section>
          )}
          {isSectionVisible(cv, "courses") && (
            <section>
              <MainHeading accent={accent}>{SECTION_LABELS.courses}</MainHeading>
              <ul className="space-y-1">
                {cv.courses.map((c, i) => (
                  <li key={i}>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-slate-600">{c.institution || c.year ? ` — ${joinNonEmpty([c.institution, c.year], ", ")}` : ""}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {isSectionVisible(cv, "custom") &&
            cv.customSections.map((s, i) => (
              <section key={i}>
                <MainHeading accent={accent}>{s.title}</MainHeading>
                <RichText text={s.content} />
              </section>
            ))}
          {isSectionVisible(cv, "references") && (
            <section>
              <MainHeading accent={accent}>{SECTION_LABELS.references}</MainHeading>
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
      </div>
    </Sheet>
  );
}
