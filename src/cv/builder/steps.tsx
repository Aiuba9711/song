"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LEVELS, SECTION_LABELS, SKILL_LEVELS } from "../format";
import type { CvContent, CvCourse, CvCustomSection, CvEducation, CvExperience, CvReference, SectionKey } from "../types";
import { AiImprove, AiSkillSuggestions } from "./ai";
import { ListEditor, SelectField, TextAreaField, TextField, Tip, Toggle } from "./fields";

export type StepProps = {
  cv: CvContent;
  set: (updater: (cv: CvContent) => CvContent) => void;
  errors: Record<string, string>;
};

// ─── 1. Dados pessoais ──────────────────────────────────────
export function PersonalStep({ cv, set, errors }: StepProps) {
  const p = cv.personal;
  const setP = (patch: Partial<CvContent["personal"]>) => set((c) => ({ ...c, personal: { ...c.personal, ...patch } }));
  return (
    <div className="space-y-5">
      <TextField id="title" label="Nome interno do CV" hint="Só você vê este nome. Ex.: «CV Contabilidade»." value={cv.title} onChange={(v) => set((c) => ({ ...c, title: v }))} error={errors.title} maxLength={80} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="fullName" label="Nome completo" value={p.fullName} onChange={(v) => setP({ fullName: v })} error={errors["personal.fullName"]} autoComplete="name" maxLength={80} required />
        <TextField id="jobTitle" label="Profissão ou cargo pretendido" placeholder="Ex.: Técnico de Contabilidade" value={p.jobTitle} onChange={(v) => setP({ jobTitle: v })} error={errors["personal.jobTitle"]} maxLength={100} />
        <TextField id="phone" label="Telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+258 84 000 0000" value={p.phone} onChange={(v) => setP({ phone: v })} error={errors["personal.phone"]} maxLength={30} />
        <TextField id="email" label="Email" type="email" inputMode="email" autoComplete="email" value={p.email} onChange={(v) => setP({ email: v })} error={errors["personal.email"]} maxLength={254} />
        <TextField id="location" label="Localização" placeholder="Ex.: Maputo, Moçambique" value={p.location} onChange={(v) => setP({ location: v })} error={errors["personal.location"]} maxLength={100} />
        <TextField id="linkedin" label="LinkedIn" optional placeholder="linkedin.com/in/o-seu-nome" value={p.linkedin} onChange={(v) => setP({ linkedin: v })} error={errors["personal.linkedin"]} maxLength={200} />
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="font-medium text-slate-800">Mais dados (opcionais)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="nationality" label="Nacionalidade" optional value={p.nationality} onChange={(v) => setP({ nationality: v })} maxLength={60} />
          <TextField id="birthDate" label="Data de nascimento" optional hint="Não é obrigatório num CV." value={p.birthDate} onChange={(v) => setP({ birthDate: v })} maxLength={40} />
          <TextField id="website" label="Website / portefólio" optional value={p.website} onChange={(v) => setP({ website: v })} maxLength={200} />
        </div>
      </details>
    </div>
  );
}

// ─── 2. Resumo ──────────────────────────────────────────────
export function SummaryStep({ cv, set, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>
        <strong>Como escrever:</strong> 3 a 4 linhas sobre a sua área, a sua experiência (ou formação, se procura o primeiro emprego), 2 ou 3 pontos fortes e o tipo de
        função que procura. Escreva apenas o que é verdade.
      </Tip>
      <TextAreaField
        id="summary"
        label="Perfil profissional"
        rows={7}
        maxLength={2000}
        placeholder="Ex.: Licenciado em Gestão com 2 anos de experiência em atendimento ao cliente e apoio administrativo..."
        value={cv.summary}
        onChange={(v) => set((c) => ({ ...c, summary: v }))}
        error={errors.summary}
      />
      <AiImprove id="summary" field="summary" text={cv.summary} context={{ jobTitle: cv.personal.jobTitle }} onApply={(v) => set((c) => ({ ...c, summary: v }))} />
      <div className="border-t border-slate-200 pt-5">
        <TextAreaField
          id="objective"
          label="Objetivo profissional"
          optional
          hint="1 a 2 frases sobre a função que procura. Aparece no CV logo a seguir ao perfil."
          rows={3}
          maxLength={600}
          placeholder="Ex.: Integrar a equipa de atendimento de uma empresa de telecomunicações, contribuindo com a minha experiência em apoio ao cliente."
          value={cv.objective}
          onChange={(v) => set((c) => ({ ...c, objective: v }))}
          error={errors.objective}
        />
        <AiImprove id="objective" field="objective" text={cv.objective} context={{ jobTitle: cv.personal.jobTitle }} onApply={(v) => set((c) => ({ ...c, objective: v }))} />
      </div>
    </div>
  );
}

// ─── 3. Experiência ─────────────────────────────────────────
const emptyExperience = (): CvExperience => ({ position: "", employer: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" });

export function ExperienceStep({ cv, set, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>
        Comece pela experiência mais recente. Estágios, trabalho voluntário e trabalhos temporários também contam. Na descrição, use uma linha por tarefa, começando com
        «-» para criar uma lista.
      </Tip>
      <ListEditor
        items={cv.experiences}
        onChange={(experiences) => set((c) => ({ ...c, experiences }))}
        createItem={emptyExperience}
        itemTitle={(e, i) => e.position || `Experiência ${i + 1}`}
        addLabel="Adicionar experiência"
        emptyText="Ainda não adicionou experiência. Se procura o primeiro emprego, pode saltar esta etapa."
        max={20}
        renderItem={(e, i, update) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id={`exp-${i}-position`} label="Cargo" value={e.position} onChange={(v) => update({ position: v })} error={errors[`experiences.${i}.position`]} required maxLength={100} />
              <TextField id={`exp-${i}-employer`} label="Empresa / organização" value={e.employer} onChange={(v) => update({ employer: v })} error={errors[`experiences.${i}.employer`]} required maxLength={120} />
              <TextField id={`exp-${i}-location`} label="Local" optional value={e.location} onChange={(v) => update({ location: v })} maxLength={100} />
              <div className="grid grid-cols-2 gap-3">
                <TextField id={`exp-${i}-start`} label="Início" placeholder="Mar 2022" value={e.startDate} onChange={(v) => update({ startDate: v })} maxLength={30} />
                {!e.isCurrent && <TextField id={`exp-${i}-end`} label="Fim" placeholder="Dez 2023" value={e.endDate} onChange={(v) => update({ endDate: v })} maxLength={30} />}
              </div>
            </div>
            <Toggle id={`exp-${i}-current`} label="Trabalho aqui atualmente" checked={e.isCurrent} onChange={(v) => update({ isCurrent: v, endDate: v ? "" : e.endDate })} />
            <TextAreaField
              id={`exp-${i}-description`}
              label="Responsabilidades e resultados"
              optional
              rows={5}
              maxLength={2500}
              placeholder={"- Atendimento a clientes\n- Controlo de stock semanal"}
              value={e.description}
              onChange={(v) => update({ description: v })}
              error={errors[`experiences.${i}.description`]}
            />
            <AiImprove
              id={`exp-${i}-description`}
              field="experience_description"
              text={e.description}
              context={{ jobTitle: cv.personal.jobTitle, position: e.position }}
              onApply={(v) => update({ description: v })}
            />
          </>
        )}
      />
    </div>
  );
}

// ─── 4. Formação ────────────────────────────────────────────
const emptyEducation = (): CvEducation => ({ degree: "", institution: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" });

export function EducationStep({ cv, set, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>Inclua o ensino superior, técnico-profissional ou o ensino secundário (12.ª classe), do mais recente para o mais antigo.</Tip>
      <ListEditor
        items={cv.educations}
        onChange={(educations) => set((c) => ({ ...c, educations }))}
        createItem={emptyEducation}
        itemTitle={(e, i) => e.degree || `Formação ${i + 1}`}
        addLabel="Adicionar formação"
        emptyText="Adicione a sua formação académica."
        max={20}
        renderItem={(e, i, update) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id={`edu-${i}-degree`} label="Curso / grau" placeholder="Ex.: Licenciatura em Contabilidade" value={e.degree} onChange={(v) => update({ degree: v })} error={errors[`educations.${i}.degree`]} required maxLength={120} />
              <TextField id={`edu-${i}-institution`} label="Instituição" value={e.institution} onChange={(v) => update({ institution: v })} error={errors[`educations.${i}.institution`]} required maxLength={120} />
              <TextField id={`edu-${i}-location`} label="Local" optional value={e.location} onChange={(v) => update({ location: v })} maxLength={100} />
              <div className="grid grid-cols-2 gap-3">
                <TextField id={`edu-${i}-start`} label="Início" placeholder="2018" value={e.startDate} onChange={(v) => update({ startDate: v })} maxLength={30} />
                {!e.isCurrent && <TextField id={`edu-${i}-end`} label="Fim" placeholder="2022" value={e.endDate} onChange={(v) => update({ endDate: v })} maxLength={30} />}
              </div>
            </div>
            <Toggle id={`edu-${i}-current`} label="Ainda a frequentar" checked={e.isCurrent} onChange={(v) => update({ isCurrent: v, endDate: v ? "" : e.endDate })} />
            <TextAreaField id={`edu-${i}-description`} label="Detalhes" optional rows={3} maxLength={1500} placeholder="Ex.: Média final, tema do trabalho de fim de curso" value={e.description} onChange={(v) => update({ description: v })} />
          </>
        )}
      />
    </div>
  );
}

// ─── 5. Competências ────────────────────────────────────────
export function SkillsStep({ cv, set }: StepProps) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const add = () => {
    const n = name.trim();
    if (!n || cv.skills.length >= 40 || cv.skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return;
    set((c) => ({ ...c, skills: [...c.skills, { name: n.slice(0, 80), level }] }));
    setName("");
    setLevel("");
  };
  return (
    <div className="space-y-5">
      <Tip>Inclua competências técnicas (programas, ferramentas, línguas técnicas) e pessoais (comunicação, organização). Prefira as que o anúncio da vaga pede — e que tem de facto.</Tip>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        >
          <TextField id="skill-name" label="Competência" placeholder="Ex.: Microsoft Excel" value={name} onChange={setName} maxLength={80} />
        </div>
        <SelectField id="skill-level" label="Nível" optional value={level} onChange={setLevel} options={SKILL_LEVELS.map((l) => ({ value: l, label: l || "Sem nível" }))} />
        <Button onClick={add} icon={<Plus className="size-5" aria-hidden />} disabled={!name.trim()}>
          Adicionar
        </Button>
      </div>
      <AiSkillSuggestions
        cv={cv}
        onApply={(names) =>
          set((c) => {
            const have = new Set(c.skills.map((s) => s.name.toLowerCase()));
            const added = names.filter((n) => !have.has(n.toLowerCase())).map((name) => ({ name, level: "" }));
            return { ...c, skills: [...c.skills, ...added].slice(0, 40) };
          })
        }
      />
      {cv.skills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-slate-500">Ainda não adicionou competências.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Competências adicionadas">
          {cv.skills.map((s, i) => (
            <li key={`${s.name}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1.5 pr-1.5 pl-3.5 text-sm font-medium text-brand-900">
              {s.name}
              {s.level && <span className="text-brand-700/70">· {s.level}</span>}
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full hover:bg-brand-100"
                aria-label={`Remover ${s.name}`}
                onClick={() => set((c) => ({ ...c, skills: c.skills.filter((_, j) => j !== i) }))}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── 6. Idiomas ─────────────────────────────────────────────
export function LanguagesStep({ cv, set, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>Indique também as línguas nacionais que fala (ex.: Changana, Macua, Sena) — são valorizadas em muitas funções de atendimento.</Tip>
      <ListEditor
        items={cv.languages}
        onChange={(languages) => set((c) => ({ ...c, languages }))}
        createItem={() => ({ name: "", level: "Intermédio" })}
        itemTitle={(l, i) => l.name || `Idioma ${i + 1}`}
        addLabel="Adicionar idioma"
        emptyText="Adicione os idiomas que fala."
        max={10}
        renderItem={(l, i, update) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id={`lang-${i}-name`} label="Idioma" placeholder="Ex.: Inglês" value={l.name} onChange={(v) => update({ name: v })} error={errors[`languages.${i}.name`]} required maxLength={40} />
            <SelectField id={`lang-${i}-level`} label="Nível" value={l.level} onChange={(v) => update({ level: v })} options={LANGUAGE_LEVELS.map((x) => ({ value: x, label: x }))} />
          </div>
        )}
      />
    </div>
  );
}

// ─── Cursos ─────────────────────────────────────────────────
function NamedList({ kind, cv, set, errors }: StepProps & { kind: "courses" | "certifications" }) {
  const isCourse = kind === "courses";
  const noun = isCourse ? "Curso" : "Certificação";
  return (
    <ListEditor<CvCourse>
      items={cv[kind]}
      onChange={(items) => set((c) => ({ ...c, [kind]: items }))}
      createItem={() => ({ name: "", institution: "", year: "" })}
      itemTitle={(c, i) => c.name || `${noun} ${i + 1}`}
      addLabel={isCourse ? "Adicionar curso" : "Adicionar certificação"}
      emptyText={isCourse ? "Sem cursos adicionados (opcional)." : "Sem certificações adicionadas (opcional)."}
      max={20}
      renderItem={(c, i, update) => (
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
          <TextField id={`${kind}-${i}-name`} label={noun} value={c.name} onChange={(v) => update({ name: v })} error={errors[`${kind}.${i}.name`]} required maxLength={150} />
          <TextField id={`${kind}-${i}-inst`} label={isCourse ? "Entidade formadora" : "Entidade emissora"} optional value={c.institution} onChange={(v) => update({ institution: v })} maxLength={120} />
          <TextField id={`${kind}-${i}-year`} label="Ano" optional value={c.year} onChange={(v) => update({ year: v })} maxLength={20} />
        </div>
      )}
    />
  );
}

export function CoursesStep(props: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>Cursos de curta duração e formações profissionais que concluiu (ex.: Informática na óptica do utilizador, Primeiros socorros).</Tip>
      <NamedList kind="courses" {...props} />
    </div>
  );
}

// ─── Certificações ──────────────────────────────────────────
export function CertificationsStep(props: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>Certificações e carteiras profissionais reconhecidas (ex.: ordem profissional, carta de condução profissional, certificação de fornecedor).</Tip>
      <NamedList kind="certifications" {...props} />
    </div>
  );
}

// ─── Secções adicionais + visibilidade ──────────────────────
export function MoreStep({ cv, set, errors }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Secções adicionais (opcional)</h3>
        <p className="text-sm text-slate-600">Ex.: Voluntariado, Prémios, Atividades extracurriculares, Carta de condução.</p>
        <ListEditor<CvCustomSection>
          items={cv.customSections}
          onChange={(customSections) => set((c) => ({ ...c, customSections }))}
          createItem={() => ({ title: "", content: "" })}
          itemTitle={(s, i) => s.title || `Secção ${i + 1}`}
          addLabel="Adicionar secção"
          emptyText="Sem secções adicionais."
          max={5}
          renderItem={(s, i, update) => (
            <>
              <TextField id={`custom-${i}-title`} label="Título" value={s.title} onChange={(v) => update({ title: v })} error={errors[`customSections.${i}.title`]} required maxLength={60} />
              <TextAreaField id={`custom-${i}-content`} label="Conteúdo" rows={3} maxLength={2000} value={s.content} onChange={(v) => update({ content: v })} />
            </>
          )}
        />
      </div>
      <SectionVisibility cv={cv} set={set} />
    </div>
  );
}

// ─── 8. Referências ─────────────────────────────────────────
export function ReferencesStep({ cv, set, errors }: StepProps) {
  return (
    <div className="space-y-5">
      <Tip>Peça sempre autorização às pessoas antes de as indicar como referência. Se preferir, indique apenas «Disponíveis mediante solicitação».</Tip>
      <Toggle
        id="refOnRequest"
        label="Mostrar «Referências disponíveis mediante solicitação»"
        description="Usado quando não adiciona referências abaixo."
        checked={cv.referencesOnRequest}
        onChange={(v) => set((c) => ({ ...c, referencesOnRequest: v }))}
      />
      <ListEditor<CvReference>
        items={cv.references}
        onChange={(references) => set((c) => ({ ...c, references }))}
        createItem={() => ({ name: "", position: "", company: "", phone: "", email: "" })}
        itemTitle={(r, i) => r.name || `Referência ${i + 1}`}
        addLabel="Adicionar referência"
        emptyText="Sem referências adicionadas."
        max={6}
        renderItem={(r, i, update) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id={`ref-${i}-name`} label="Nome" value={r.name} onChange={(v) => update({ name: v })} error={errors[`references.${i}.name`]} required maxLength={80} />
            <TextField id={`ref-${i}-position`} label="Cargo" optional value={r.position} onChange={(v) => update({ position: v })} maxLength={100} />
            <TextField id={`ref-${i}-company`} label="Empresa" optional value={r.company} onChange={(v) => update({ company: v })} maxLength={120} />
            <TextField id={`ref-${i}-phone`} label="Telefone" optional type="tel" value={r.phone} onChange={(v) => update({ phone: v })} maxLength={30} />
            <TextField id={`ref-${i}-email`} label="Email" optional type="email" value={r.email} onChange={(v) => update({ email: v })} error={errors[`references.${i}.email`]} maxLength={254} />
          </div>
        )}
      />
    </div>
  );
}

// ─── Secções visíveis ───────────────────────────────────
const TOGGLEABLE: SectionKey[] = ["summary", "objective", "experience", "education", "skills", "languages", "courses", "certifications", "references", "custom"];

export function SectionVisibility({ cv, set }: Pick<StepProps, "cv" | "set">) {
  return (
    <fieldset>
      <legend className="font-semibold">Secções a mostrar</legend>
      <p className="text-sm text-slate-500">Secções vazias não aparecem no CV.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {TOGGLEABLE.map((key) => (
          <Toggle
            key={key}
            id={`show-${key}`}
            label={SECTION_LABELS[key]}
            checked={!cv.hiddenSections.includes(key)}
            onChange={(visible) =>
              set((c) => ({ ...c, hiddenSections: visible ? c.hiddenSections.filter((s) => s !== key) : [...c.hiddenSections, key] }))
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
