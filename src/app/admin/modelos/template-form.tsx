"use client";

import { useActionState, useMemo, useState } from "react";
import { ScanText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  DENSITIES,
  designSchema,
  ENTRY_LABELS,
  ENTRY_STYLES,
  FONTS,
  HEADER_LABELS,
  HEADERS,
  HEADING_LABELS,
  HEADING_STYLES,
  isAtsCompatible,
  PHOTO_POSITIONS,
  PHOTO_SHAPES,
  SIDEBAR_TONES,
  SKILL_LABELS,
  SKILL_STYLES,
  STRUCTURE_LABELS,
  STRUCTURES,
  type TemplateDesign,
} from "@/cv/design";
import { CvPreview } from "@/cv/preview";
import { ScaledSheet } from "@/cv/preview/scaled";
import { FULL_SAMPLE_CV } from "@/cv/sample";
import type { ActionState } from "@/lib/validation";

export type TemplateFormValues = {
  name: string;
  slug: string;
  description: string;
  category: string;
  style: string;
  accentColor: string;
  sortOrder: number;
  isActive: boolean;
  isPremium: boolean;
  /** Preço próprio em MT (texto do formulário); vazio = valor padrão */
  price: string;
  design: TemplateDesign;
};

const FONT_LABELS: Record<TemplateDesign["font"], string> = { sans: "Sem serifa", serif: "Serifada", mixed: "Títulos serifados" };
const TONE_LABELS: Record<TemplateDesign["sidebarTone"], string> = { accent: "Cor de destaque", dark: "Escura", tint: "Clara com cor", light: "Cinzento claro" };
const DENSITY_LABELS: Record<TemplateDesign["density"], string> = { compact: "Compacta", normal: "Normal", airy: "Arejada" };
const SHAPE_LABELS: Record<TemplateDesign["photoShape"], string> = { circle: "Círculo", rounded: "Cantos arredondados", square: "Quadrada" };
const POSITION_LABELS: Record<TemplateDesign["photoPosition"], string> = { left: "Esquerda", right: "Direita", center: "Centro / barra lateral" };
const SIDE_SECTIONS = [
  ["skills", "Competências"],
  ["languages", "Idiomas"],
  ["courses", "Cursos"],
  ["certifications", "Certificações"],
  ["references", "Referências"],
] as const;
export const STYLE_SUGGESTIONS = [
  "Minimal", "Executive", "Modern", "Professional", "Classic", "Corporate", "Elegant", "Compact", "Academic", "Creative",
  "ATS Friendly", "Clean", "Timeline", "Sidebar", "Modern Blue", "Professional Green", "Black & White",
];

/** Silhueta neutra usada só na pré-visualização do admin (nenhuma foto real). */
const SILHOUETTE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#cbd5e1"/><circle cx="100" cy="78" r="38" fill="#94a3b8"/><path d="M30 200c6-44 36-68 70-68s64 24 70 68z" fill="#94a3b8"/></svg>`,
  );

function Options<T extends string>({ values, labels }: { values: readonly T[]; labels?: Record<T, string> }) {
  return values.map((v) => (
    <option key={v} value={v}>
      {labels?.[v] ?? v}
    </option>
  ));
}

export function TemplateForm({
  action,
  defaults,
  categories,
  submitLabel,
  defaultPriceLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: TemplateFormValues;
  categories: Array<{ value: string; label: string }>;
  submitLabel: string;
  defaultPriceLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [color, setColor] = useState(defaults.accentColor);
  const [design, setDesign] = useState<TemplateDesign>(defaults.design);
  const [withPhoto, setWithPhoto] = useState(true);
  const e = state.fieldErrors ?? {};

  const live = useMemo(() => {
    const parsed = designSchema.safeParse({ ...design, accent: /^#[0-9a-fA-F]{6}$/.test(color) ? color : design.accent });
    return parsed.success ? parsed.data : design;
  }, [design, color]);
  const ats = isAtsCompatible(live);
  const sidebar = live.structure !== "single";
  const set = <K extends keyof TemplateDesign>(key: K, value: TemplateDesign[K]) => setDesign((d) => ({ ...d, [key]: value }));
  const sampleCv = { ...FULL_SAMPLE_CV, personal: { ...FULL_SAMPLE_CV.personal, showPhoto: withPhoto } };

  const select = <K extends "structure" | "header" | "headingStyle" | "font" | "sidebarTone" | "density" | "entryStyle" | "skillsStyle" | "photoShape" | "photoPosition" | "palette">(
    key: K,
    label: string,
    values: readonly TemplateDesign[K][],
    labels?: Record<TemplateDesign[K], string>,
    disabled?: boolean,
  ) => (
    <Field id={key} label={label}>
      {(a) => (
        <Select {...a} name={key} value={design[key]} onChange={(ev) => set(key, ev.target.value as TemplateDesign[K])} disabled={disabled}>
          <Options values={values} labels={labels} />
        </Select>
      )}
    </Field>
  );

  return (
    <form action={formAction} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 space-y-6">
        {state.ok && <Alert tone="success">{state.message}</Alert>}
        {e.design && <Alert tone="error">{e.design[0]}</Alert>}

        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Dados do modelo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Nome" error={e.name} required>
              {(a) => <Input {...a} name="name" defaultValue={defaults.name} maxLength={60} />}
            </Field>
            <Field id="slug" label="Slug" hint="Endereço do modelo: /cv-modelos/slug" error={e.slug} required>
              {(a) => <Input {...a} name="slug" defaultValue={defaults.slug} maxLength={60} />}
            </Field>
            <Field id="category" label="Categoria" error={e.category}>
              {(a) => (
                <Select {...a} name="category" defaultValue={defaults.category}>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="style" label="Estilo" hint="Ex.: Minimal, Executive, Modern Blue" error={e.style} required>
              {(a) => (
                <>
                  <Input {...a} name="style" defaultValue={defaults.style} maxLength={40} list="style-suggestions" />
                  <datalist id="style-suggestions">
                    {STYLE_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
            <Field id="price" label="Preço do CV (MT)" optional hint={`Vazio = valor padrão (${defaultPriceLabel}), definido em Configurações › Pagamentos.`} error={e.price}>
              {(a) => <Input {...a} name="price" inputMode="decimal" defaultValue={defaults.price} placeholder="199" maxLength={12} />}
            </Field>
            <Field id="sortOrder" label="Ordem na galeria" hint="Menor = aparece primeiro." error={e.sortOrder}>
              {(a) => <Input {...a} name="sortOrder" type="number" min={0} defaultValue={defaults.sortOrder} />}
            </Field>
          </div>
          <Field id="description" label="Descrição" error={e.description} required>
            {(a) => <Textarea {...a} name="description" rows={3} defaultValue={defaults.description} maxLength={300} />}
          </Field>
          <div className="flex flex-wrap gap-6">
            <Checkbox id="isActive" name="isActive" defaultChecked={defaults.isActive} label="Ativo (visível na galeria)" />
            <Checkbox id="isPremium" name="isPremium" defaultChecked={defaults.isPremium} label="Premium (reservado para planos futuros)" />
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Design</h2>
            {ats ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-go-50 px-2.5 py-1 text-xs font-semibold text-go-700">
                <ScanText className="size-3.5" aria-hidden /> Compatível com ATS
              </span>
            ) : (
              <span className="text-xs text-slate-500">Não compatível com ATS (colunas, faixas ou elementos gráficos)</span>
            )}
          </div>
          <p className="text-sm text-slate-600">
            O selo «Compatível com ATS» é atribuído automaticamente quando o design tem uma coluna, sem faixas de cor, tabelas nem etiquetas gráficas.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="accentColor" label="Cor de destaque" error={e.accentColor}>
              {(a) => (
                <div className="flex gap-2">
                  <input type="color" value={color} onChange={(ev) => setColor(ev.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300" aria-label="Escolher cor" />
                  <Input {...a} name="accentColor" value={color} onChange={(ev) => setColor(ev.target.value)} maxLength={7} />
                </div>
              )}
            </Field>
            {select("palette", "Paleta", ["color", "mono"] as const, { color: "Com cor", mono: "Preto e branco" })}
            {select("structure", "Estrutura", STRUCTURES, STRUCTURE_LABELS)}
            {select("header", "Cabeçalho", HEADERS, HEADER_LABELS)}
            {select("headingStyle", "Títulos das secções", HEADING_STYLES, HEADING_LABELS)}
            {select("font", "Tipografia", FONTS, FONT_LABELS)}
            {select("entryStyle", "Experiência e formação", ENTRY_STYLES, ENTRY_LABELS)}
            {select("skillsStyle", "Competências", SKILL_STYLES, SKILL_LABELS)}
            {select("density", "Densidade", DENSITIES, DENSITY_LABELS)}
            {select("sidebarTone", "Cor da barra lateral", SIDEBAR_TONES, TONE_LABELS, live.structure !== "sidebar-left" && live.structure !== "sidebar-right")}
            {select("photoShape", "Forma da fotografia", PHOTO_SHAPES, SHAPE_LABELS)}
            {select("photoPosition", "Posição da fotografia", PHOTO_POSITIONS, POSITION_LABELS)}
          </div>
          <Checkbox
            id="pairs"
            name="pairs"
            checked={design.pairs}
            onChange={(ev) => set("pairs", ev.target.checked)}
            disabled={sidebar}
            label="Competências e idiomas lado a lado (só numa coluna)"
          />
          {/* Um campo desativado não é enviado: mantém o valor para quando voltar a uma coluna. */}
          {sidebar && design.pairs && <input type="hidden" name="pairs" value="on" />}
          <fieldset disabled={!sidebar} className="disabled:opacity-60">
            <legend className="text-sm font-medium text-slate-800">Secções na coluna lateral</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {SIDE_SECTIONS.map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="sidebarSections"
                    value={key}
                    checked={design.sidebarSections.includes(key)}
                    onChange={(ev) => set("sidebarSections", ev.target.checked ? [...design.sidebarSections, key] : design.sidebarSections.filter((s) => s !== key))}
                    className="size-4.5 accent-brand-700"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          {!sidebar && design.sidebarSections.map((s) => <input key={s} type="hidden" name="sidebarSections" value={s} />)}
        </Card>

        <div className="sticky bottom-4 z-10">
          <SubmitButton pendingLabel="A guardar…" className="shadow-lift">
            {submitLabel}
          </SubmitButton>
        </div>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start" aria-label="Pré-visualização do modelo">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-600">Pré-visualização (dados fictícios)</p>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={withPhoto} onChange={(ev) => setWithPhoto(ev.target.checked)} className="size-4 accent-brand-700" />
            Com foto
          </label>
        </div>
        <div className="rounded-xl bg-slate-200/60 p-2">
          <ScaledSheet label="Pré-visualização do modelo">
            <CvPreview cv={sampleCv} design={live} photoUrl={withPhoto ? SILHOUETTE : null} />
          </ScaledSheet>
        </div>
      </aside>
    </form>
  );
}
