import { CvPreview } from "@/cv/preview";
import { SAMPLE_CV } from "@/cv/sample";
import type { TemplateDesign } from "@/cv/design";
import type { CvContent } from "@/cv/types";

/**
 * Miniatura de um modelo (HTML reduzido por CSS). Usa o CV de exemplo fictício.
 * Quando existe uma imagem de pré-visualização (gerada ou carregada no admin), usa-a — mais leve.
 */
export function TemplateThumb({
  design,
  width = 238,
  cv = SAMPLE_CV,
  label,
  imageUrl,
  photoUrl,
}: {
  design: TemplateDesign;
  width?: number;
  cv?: CvContent;
  label?: string;
  imageUrl?: string | null;
  photoUrl?: string | null;
}) {
  const scale = width / 794;
  const height = Math.round(1123 * scale);
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagens estáticas pequenas, carregamento diferido
      <img src={imageUrl} alt={label ?? ""} width={width} height={height} loading="lazy" decoding="async" className="rounded-lg bg-white ring-1 ring-slate-200" style={{ width, height }} />
    );
  }
  return (
    <div
      className="relative overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"
      style={{ width, height, contentVisibility: "auto", containIntrinsicSize: `${width}px ${height}px` }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div style={{ width: 794, transform: `scale(${scale})`, transformOrigin: "top left" }} className="pointer-events-none select-none" inert>
        <CvPreview cv={cv} design={design} photoUrl={photoUrl} />
      </div>
    </div>
  );
}
