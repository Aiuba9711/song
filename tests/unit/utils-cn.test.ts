import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn: conflitos de cor", () => {
  it("a cor definida pela página substitui a do componente", () => {
    expect(cn("rounded-2xl border border-slate-200/80 bg-white shadow-soft", "flex bg-brand-700 p-5 text-white group-hover:bg-brand-800")).toBe(
      "rounded-2xl border border-slate-200/80 shadow-soft flex bg-brand-700 p-5 text-white group-hover:bg-brand-800",
    );
    expect(cn("text-slate-700 hover:bg-slate-100", "text-red-700 hover:bg-red-50")).toBe("text-red-700 hover:bg-red-50");
    expect(cn("border border-slate-200/80", "border-red-200")).toBe("border border-red-200");
  });

  it("tamanhos arbitrários não são cores (botão: text-white + text-[15px])", () => {
    expect(cn("bg-brand-700 text-white hover:bg-brand-800", "min-h-11 px-4 text-[15px]")).toBe("bg-brand-700 text-white hover:bg-brand-800 min-h-11 px-4 text-[15px]");
    expect(cn("text-slate-700", "text-[#1d40d8]")).toBe("text-[#1d40d8]");
    expect(cn("bg-white", "bg-[var(--cor)]")).toBe("bg-[var(--cor)]");
  });

  it("não mexe em classes que não são cores", () => {
    expect(cn("text-sm text-slate-600", "text-lg font-bold")).toBe("text-sm text-slate-600 text-lg font-bold");
    expect(cn("bg-cover bg-center", false, null, "border-2 border-dashed")).toBe("bg-cover bg-center border-2 border-dashed");
    expect(cn("bg-white", "hover:bg-slate-50", "md:bg-transparent")).toBe("bg-white hover:bg-slate-50 md:bg-transparent");
  });
});
