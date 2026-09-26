"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Reduz a página A4 (794px) para caber na largura disponível (ex.: telemóvel). */
export function ScaledSheet({ children, maxScale = 1, label }: { children: ReactNode; maxScale?: number; label?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [height, setHeight] = useState(1123 * 0.4);

  useEffect(() => {
    const el = outer.current;
    const content = inner.current;
    if (!el || !content) return;
    const update = () => {
      const s = Math.min(maxScale, el.clientWidth / 794);
      setScale(s);
      setHeight(content.scrollHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(content);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div ref={outer} className="w-full overflow-hidden" style={{ height }} role="region" aria-label={label ?? "Pré-visualização do CV"}>
      <div ref={inner} style={{ width: 794, transform: `scale(${scale})`, transformOrigin: "top left" }} className="shadow-lift">
        {children}
      </div>
    </div>
  );
}
