import { CvPreview } from "@/cv/preview";
import { SAMPLE_CV } from "@/cv/sample";
import type { CvContent, CvLayoutId } from "@/cv/types";

/**
 * Miniatura estática de um modelo (HTML reduzido por CSS — sem imagens, leve).
 * Usa o CV de exemplo fictício, claramente identificado.
 */
export function TemplateThumb({ layout, accentColor, width = 238, cv = SAMPLE_CV, label }: { layout: CvLayoutId; accentColor: string; width?: number; cv?: CvContent; label?: string }) {
  const scale = width / 794;
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"
      style={{ width, height: Math.round(1123 * scale), contentVisibility: "auto", containIntrinsicSize: `${width}px ${Math.round(1123 * scale)}px` }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div style={{ width: 794, transform: `scale(${scale})`, transformOrigin: "top left" }} className="pointer-events-none select-none" inert>
        <CvPreview cv={cv} theme={{ layout, accentColor }} />
      </div>
    </div>
  );
}
