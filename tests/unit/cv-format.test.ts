import { describe, expect, it } from "vitest";
import { contactItems, formatRange, initials, isSectionVisible, safeAccent, tint, toBlocks } from "@/cv/format";
import { SAMPLE_CV } from "@/cv/sample";
import { emptyCvContent } from "@/cv/types";

describe("formatação do CV", () => {
  it("formatRange", () => {
    expect(formatRange("Mar 2021", "Dez 2022", false)).toBe("Mar 2021 – Dez 2022");
    expect(formatRange("Mar 2021", "qualquer", true)).toBe("Mar 2021 – Presente");
    expect(formatRange("2019", "", false)).toBe("2019");
    expect(formatRange("", "", false)).toBe("");
  });
  it("toBlocks converte linhas com «-» em listas", () => {
    expect(toBlocks("Introdução\n- um\n• dois\n\nFim")).toEqual([
      { kind: "paragraph", text: "Introdução" },
      { kind: "bullets", items: ["um", "dois"] },
      { kind: "paragraph", text: "Fim" },
    ]);
  });
  it("secções vazias ou ocultas não aparecem", () => {
    const cv = emptyCvContent();
    expect(isSectionVisible(cv, "experience")).toBe(false);
    expect(isSectionVisible(SAMPLE_CV, "experience")).toBe(true);
    expect(isSectionVisible({ ...SAMPLE_CV, hiddenSections: ["experience"] }, "experience")).toBe(false);
    expect(isSectionVisible({ ...cv, referencesOnRequest: true }, "references")).toBe(true);
  });
  it("contactos só incluem campos preenchidos", () => {
    expect(contactItems(SAMPLE_CV).map((c) => c.key)).toEqual(["phone", "email", "location"]);
  });
  it("cor de destaque segura", () => {
    expect(safeAccent("#123456")).toBe("#123456");
    expect(safeAccent("red; background:url(x)")).toBe("#1d40d8");
    expect(tint("#000000", 0.5)).toBe("#808080");
  });
  it("iniciais", () => {
    expect(initials("ana maria machava")).toBe("AM");
    expect(initials("")).toBe("");
  });
});
