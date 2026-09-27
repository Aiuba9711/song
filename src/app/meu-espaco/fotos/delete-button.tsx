"use client";

import { useId, useRef } from "react";
import { Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { deletePhotoAction } from "./actions";

/** «Eliminar fotografia» com confirmação; opcionalmente retira-a também dos CVs. */
export function DeletePhotoButton({ photoId, usedInCvs, size = "sm" }: { photoId: string; usedInCvs: number; size?: "sm" | "md" | "lg" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const checkId = useId();
  return (
    <>
      <button type="button" className={buttonClass("ghost", size, "text-red-700 hover:bg-red-50")} onClick={() => ref.current?.showModal()}>
        <Trash2 className="size-4" aria-hidden /> Eliminar fotografia
      </button>
      <dialog ref={ref} aria-labelledby={titleId} className="m-auto w-[min(92vw,26rem)] rounded-2xl p-0 shadow-lift backdrop:bg-slate-900/50">
        <form action={deletePhotoAction} className="p-6">
          <input type="hidden" name="photoId" value={photoId} />
          <h2 id={titleId} className="text-lg font-semibold">
            Eliminar esta fotografia?
          </h2>
          <p className="mt-2 text-sm text-slate-600">A fotografia original e a editada são apagadas permanentemente do armazenamento.</p>
          {usedInCvs > 0 && (
            <label htmlFor={checkId} className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm">
              <input id={checkId} type="checkbox" name="alsoFromCvs" defaultChecked className="mt-0.5 size-4.5 accent-brand-700" />
              <span>
                Remover também dos CVs onde é usada ({usedInCvs}). Se não marcar, os CVs mantêm a sua cópia da fotografia.
              </span>
            </label>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={buttonClass("outline")} onClick={() => ref.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={buttonClass("danger")}>
              Eliminar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
