import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-100 aria-invalid:border-red-500 aria-invalid:ring-red-100 disabled:bg-slate-100";

type FieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | string[];
  required?: boolean;
  optional?: boolean;
  children: (a11y: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
};

/** Campo acessível: label associada, dica e erro ligados via aria-describedby. */
export function Field({ id, label, hint, error, required, optional, children, className }: FieldProps) {
  const errorText = Array.isArray(error) ? error[0] : error;
  const describedBy = [hint ? `${id}-hint` : null, errorText ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
        {optional && <span className="font-normal text-slate-500"> (opcional)</span>}
      </label>
      {children({ id, "aria-describedby": describedBy || undefined, "aria-invalid": errorText ? true : undefined })}
      {hint && !errorText && (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      )}
      {errorText && (
        <p id={`${id}-error`} className="text-sm font-medium text-red-600">
          {errorText}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-28 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "appearance-auto pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, id, className, ...props }: ComponentProps<"input"> & { label: ReactNode; id: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 rounded border-slate-300 accent-brand-700"
        {...props}
      />
      <label htmlFor={id} className="text-sm leading-snug text-slate-700">
        {label}
      </label>
    </div>
  );
}
