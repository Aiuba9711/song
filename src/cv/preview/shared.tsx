import type { ReactNode } from "react";
import { toBlocks } from "../format";

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = toBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.kind === "paragraph" ? (
          <p key={i} className="mt-1 first:mt-0">
            {b.text}
          </p>
        ) : (
          <ul key={i} className="mt-1 list-disc space-y-0.5 pl-5 first:mt-0">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export function Photo({ url, name, size, rounded = "full", border }: { url: string; name: string; size: number; rounded?: "full" | "lg"; border?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ficheiro privado servido pela API, sem otimização
    <img
      src={url}
      alt={`Fotografia de ${name || "candidato"}`}
      width={size}
      height={size}
      className={rounded === "full" ? "rounded-full object-cover" : "rounded-lg object-cover"}
      style={{ width: size, height: size, border }}
    />
  );
}

/** Página A4 (794×1123 px a 96 dpi). */
export function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative bg-white text-[13.5px] leading-[1.45] text-slate-800 ${className ?? ""}`}
      style={{ width: 794, minHeight: 1123, fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      {children}
    </div>
  );
}
