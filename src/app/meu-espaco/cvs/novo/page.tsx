import type { Metadata } from "next";
import { TemplateThumb } from "@/components/cv/template-thumb";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { LAYOUTS } from "@/cv/layouts";
import { requireUser } from "@/lib/auth/guards";
import { CATEGORY_LABELS, listActiveTemplates } from "@/server/catalog";
import { createCvAction } from "../actions";

export const metadata: Metadata = { title: "Criar CV" };

export default async function NewCvPage({ searchParams }: { searchParams: Promise<{ modelo?: string }> }) {
  const [{ modelo }] = await Promise.all([searchParams, requireUser("/meu-espaco/cvs/novo")]);
  const templates = await listActiveTemplates();
  const selected = templates.find((t) => t.slug === modelo)?.slug ?? templates[0]?.slug;

  return (
    <>
      <PageHeader title="Criar novo CV" description="Escolha um modelo para começar. Pode trocar de modelo a qualquer momento sem perder os dados." />
      <form action={createCvAction} className="space-y-6">
        <Field id="title" label="Nome do CV" optional hint="Só para si — ex.: «CV Contabilidade» ou «CV para bancos».">
          {(a) => <Input {...a} name="title" maxLength={80} placeholder="O meu CV" className="max-w-md" />}
        </Field>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-slate-800">Modelo</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {templates.map((t) => (
              <label
                key={t.id}
                className="group relative cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-2.5 transition-colors has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-brand-200"
              >
                <input type="radio" name="modelo" value={t.slug} defaultChecked={t.slug === selected} className="sr-only" />
                <div className="flex justify-center overflow-hidden rounded-lg bg-slate-100 py-2">
                  <TemplateThumb layout={t.layout} accentColor={t.accentColor} width={130} />
                </div>
                <span className="mt-2 block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-slate-500">
                  {LAYOUTS[t.layout].name} · {CATEGORY_LABELS[t.category]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="sticky bottom-20 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lift backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <SubmitButton size="lg" className="w-full md:w-auto" pendingLabel="A criar…">
            Começar a preencher
          </SubmitButton>
        </div>
      </form>
    </>
  );
}
