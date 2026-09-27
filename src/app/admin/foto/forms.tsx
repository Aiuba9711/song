"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/validation";
import { outfitDataUrl } from "@/photo/outfit";
import { BACKGROUND_CATEGORY_LABELS, BACKGROUND_PATTERNS, OUTFIT_TAG_LABELS, OUTFIT_TAGS, PATTERN_LABELS } from "@/photo/types";
import { saveBackgroundAction, saveOutfitAction, updatePhotoPricesAction } from "./actions";

const KIND_LABELS = { SOLID: "Cor lisa", GRADIENT: "Gradiente", PATTERN: "Cenário desfocado (desenhado)", IMAGE: "Imagem carregada" } as const;
const GENDER_LABELS = { MASCULINO: "Homem", FEMININO: "Mulher" } as const;
const GARMENT_LABELS = { BLAZER: "Blazer + camisa/blusa", FATO: "Fato", CAMISA: "Só camisa", BLUSA: "Só blusa" } as const;

function ColorField({ id, name, label, defaultValue, error, optional }: { id: string; name: string; label: string; defaultValue: string; error?: string[]; optional?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Field id={id} label={label} error={error} optional={optional}>
      {(a) => (
        <div className="flex gap-2">
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"} onChange={(e) => setValue(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-slate-300" aria-label={`${label}: escolher`} />
          <Input {...a} name={name} value={value} onChange={(e) => setValue(e.target.value)} maxLength={7} placeholder={optional ? "sem cor" : "#ffffff"} />
        </div>
      )}
    </Field>
  );
}

export type BackgroundValues = {
  name: string;
  category: string;
  kind: string;
  color1: string;
  color2: string;
  pattern: string;
  passport: boolean;
  isActive: boolean;
  sortOrder: number;
  hasImage: boolean;
};

export function BackgroundForm({ id, defaults }: { id: string | null; defaults: BackgroundValues }) {
  const [state, action] = useActionState(saveBackgroundAction.bind(null, id), {} as ActionState);
  const [kind, setKind] = useState(defaults.kind);
  const e = state.fieldErrors ?? {};
  const p = id ?? "novo";
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-name`} label="Nome" error={e.name} required>
          {(a) => <Input {...a} name="name" defaultValue={defaults.name} maxLength={60} />}
        </Field>
        <Field id={`${p}-category`} label="Categoria">
          {(a) => (
            <Select {...a} name="category" defaultValue={defaults.category}>
              {Object.entries(BACKGROUND_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id={`${p}-kind`} label="Tipo">
          {(a) => (
            <Select {...a} name="kind" value={kind} onChange={(ev) => setKind(ev.target.value)}>
              {Object.entries(KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id={`${p}-sortOrder`} label="Ordem" error={e.sortOrder}>
          {(a) => <Input {...a} name="sortOrder" type="number" min={0} defaultValue={defaults.sortOrder} />}
        </Field>
        <ColorField id={`${p}-color1`} name="color1" label="Cor principal" defaultValue={defaults.color1} error={e.color1} />
        {(kind === "GRADIENT" || kind === "PATTERN") && <ColorField id={`${p}-color2`} name="color2" label="Segunda cor" defaultValue={defaults.color2} error={e.color2} optional={kind === "PATTERN"} />}
        {kind === "PATTERN" && (
          <Field id={`${p}-pattern`} label="Cenário" error={e.pattern}>
            {(a) => (
              <Select {...a} name="pattern" defaultValue={defaults.pattern || "office"}>
                {BACKGROUND_PATTERNS.map((k) => (
                  <option key={k} value={k}>
                    {PATTERN_LABELS[k]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {kind === "IMAGE" && (
          <Field id={`${p}-image`} label="Imagem (JPG, PNG ou WEBP, até 5 MB)" error={e.image} hint={defaults.hasImage ? "Deixe vazio para manter a imagem atual." : "Use imagens discretas e com direitos de utilização."}>
            {(a) => <Input {...a} name="image" type="file" accept="image/jpeg,image/png,image/webp" />}
          </Field>
        )}
      </div>
      {e.image && kind !== "IMAGE" && <Alert tone="error">{e.image[0]}</Alert>}
      <div className="flex flex-wrap gap-6">
        <Checkbox id={`${p}-passport`} name="passport" defaultChecked={defaults.passport} label="Recomendado para tipo passe (fundos lisos e claros)" />
        <Checkbox id={`${p}-active`} name="isActive" defaultChecked={defaults.isActive} label="Ativo" />
      </div>
      {e.passport && <p className="text-sm font-medium text-red-600">{e.passport[0]}</p>}
      <SubmitButton pendingLabel="A guardar…">{id ? "Guardar fundo" : "Adicionar fundo"}</SubmitButton>
    </form>
  );
}

export type OutfitValues = {
  name: string;
  gender: "MASCULINO" | "FEMININO";
  garment: "BLAZER" | "FATO" | "CAMISA" | "BLUSA";
  jacketColor: string;
  shirtColor: string;
  tieColor: string;
  tags: string[];
  isActive: boolean;
  sortOrder: number;
};

export function OutfitForm({ id, defaults }: { id: string | null; defaults: OutfitValues }) {
  const [state, action] = useActionState(saveOutfitAction.bind(null, id), {} as ActionState);
  const [gender, setGender] = useState(defaults.gender);
  const [garment, setGarment] = useState(defaults.garment);
  const e = state.fieldErrors ?? {};
  const p = id ?? "nova";
  const jacket = garment === "BLAZER" || garment === "FATO";
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${p}-name`} label="Nome" error={e.name} required className="sm:col-span-2">
            {(a) => <Input {...a} name="name" defaultValue={defaults.name} maxLength={80} />}
          </Field>
          <Field id={`${p}-gender`} label="Género da peça">
            {(a) => (
              <Select {...a} name="gender" value={gender} onChange={(ev) => setGender(ev.target.value as OutfitValues["gender"])}>
                {Object.entries(GENDER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id={`${p}-garment`} label="Peça">
            {(a) => (
              <Select {...a} name="garment" value={garment} onChange={(ev) => setGarment(ev.target.value as OutfitValues["garment"])}>
                {Object.entries(GARMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <ColorField id={`${p}-shirtColor`} name="shirtColor" label={gender === "FEMININO" ? "Cor da camisa/blusa" : "Cor da camisa"} defaultValue={defaults.shirtColor} error={e.shirtColor} />
          {jacket && <ColorField id={`${p}-jacketColor`} name="jacketColor" label="Cor do blazer/casaco" defaultValue={defaults.jacketColor || "#1e2a4a"} error={e.jacketColor} />}
          {gender === "MASCULINO" && <ColorField id={`${p}-tieColor`} name="tieColor" label="Gravata sugerida" defaultValue={defaults.tieColor} error={e.tieColor} optional />}
          <Field id={`${p}-sortOrder`} label="Ordem" error={e.sortOrder}>
            {(a) => <Input {...a} name="sortOrder" type="number" min={0} defaultValue={defaults.sortOrder} />}
          </Field>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ilustração SVG gerada localmente */}
        <img
          src={outfitDataUrl({ gender, garment, jacketColor: jacket ? defaults.jacketColor || "#1e2a4a" : null, shirtColor: defaults.shirtColor, tieColor: defaults.tieColor || null }, { tie: gender === "MASCULINO" && !!defaults.tieColor, tieColor: defaults.tieColor || null })}
          alt="Pré-visualização da roupa (cores guardadas)"
          className="h-28 w-full rounded-xl bg-[#d8c7b4] object-contain sm:h-full"
        />
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Estilos (filtros e recomendações)</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {OUTFIT_TAGS.map((t) => (
            <label key={t} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="tags" value={t} defaultChecked={defaults.tags.includes(t)} className="size-4.5 accent-brand-700" />
              {OUTFIT_TAG_LABELS[t]}
            </label>
          ))}
        </div>
      </fieldset>
      <Checkbox id={`${p}-active`} name="isActive" defaultChecked={defaults.isActive} label="Ativa" />
      <SubmitButton pendingLabel="A guardar…">{id ? "Guardar roupa" : "Adicionar roupa"}</SubmitButton>
    </form>
  );
}

export type PriceValues = { photoPrice: string; photoPromoPrice: string; photoPromoEndsAt: string; photoBundlePrice: string; currency: string };

export function PhotoPricesForm({ defaults }: { defaults: PriceValues }) {
  const [state, action] = useActionState(updatePhotoPricesAction, {} as ActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="photoPrice" label={`Foto profissional (${defaults.currency})`} error={e.photoPrice} hint="Vazio ou 0 = gratuita (download e uso no CV sem pagamento).">
          {(a) => <Input {...a} name="photoPrice" inputMode="decimal" defaultValue={defaults.photoPrice} placeholder="0" />}
        </Field>
        <Field id="photoBundlePrice" label={`Pacote CV + Foto (${defaults.currency})`} error={e.photoBundlePrice} hint="Vazio = pacote indisponível." optional>
          {(a) => <Input {...a} name="photoBundlePrice" inputMode="decimal" defaultValue={defaults.photoBundlePrice} />}
        </Field>
        <Field id="photoPromoPrice" label={`Preço promocional (${defaults.currency})`} error={e.photoPromoPrice} hint="Menor que o preço normal. Vazio = sem promoção." optional>
          {(a) => <Input {...a} name="photoPromoPrice" inputMode="decimal" defaultValue={defaults.photoPromoPrice} />}
        </Field>
        <Field id="photoPromoEndsAt" label="Promoção termina em" error={e.photoPromoEndsAt} hint="Vazio = sem data de fim." optional>
          {(a) => <Input {...a} name="photoPromoEndsAt" type="date" defaultValue={defaults.photoPromoEndsAt} />}
        </Field>
      </div>
      <SubmitButton pendingLabel="A guardar…">Guardar preços</SubmitButton>
    </form>
  );
}
