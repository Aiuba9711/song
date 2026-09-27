"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type BaseProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
};

export function TextField({
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  autoComplete,
  inputMode,
  ...base
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
}) {
  return (
    <Field {...base}>
      {(a) => (
        <Input
          {...a}
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  value,
  onChange,
  rows = 4,
  placeholder,
  maxLength,
  ...base
}: BaseProps & { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; maxLength?: number }) {
  return (
    <Field {...base}>
      {(a) => (
        <div>
          <Textarea {...a} rows={rows} value={value} placeholder={placeholder} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
          {maxLength && (
            <p className={cn("mt-1 text-right text-xs", value.length > maxLength * 0.9 ? "text-amber-700" : "text-slate-500")} aria-live="polite">
              {value.length}/{maxLength}
            </p>
          )}
        </div>
      )}
    </Field>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  ...base
}: BaseProps & { value: string; onChange: (v: string) => void; options: readonly { value: string; label: string }[] }) {
  return (
    <Field {...base}>
      {(a) => (
        <Select {...a} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function Toggle({ id, label, checked, onChange, description }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-brand-700" />
      <span>
        <span className="block font-medium text-slate-800">{label}</span>
        {description && <span className="block text-sm text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

/** Editor de listas repetíveis (experiências, formação, cursos…). */
export function ListEditor<T>({
  items,
  onChange,
  createItem,
  renderItem,
  itemTitle,
  addLabel,
  emptyText,
  max,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  itemTitle: (item: T, index: number) => string;
  addLabel: string;
  emptyText: string;
  max: number;
}) {
  const update = (index: number, patch: Partial<T>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-slate-500">{emptyText}</p>}
      {items.map((item, index) => (
        <fieldset key={index} className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <legend className="min-w-0 flex-1 truncate font-semibold text-ink">{itemTitle(item, index)}</legend>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              aria-label="Mover para cima"
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              aria-label="Mover para baixo"
            >
              <ArrowDown className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              className="grid size-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"
              aria-label={`Remover ${itemTitle(item, index)}`}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
          <div className="space-y-4">{renderItem(item, index, (patch) => update(index, patch))}</div>
        </fieldset>
      ))}
      {items.length < max && (
        <Button variant="secondary" className="w-full" onClick={() => onChange([...items, createItem()])} icon={<Plus className="size-5" aria-hidden />}>
          {addLabel}
        </Button>
      )}
    </div>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm leading-relaxed text-brand-950">{children}</div>;
}
