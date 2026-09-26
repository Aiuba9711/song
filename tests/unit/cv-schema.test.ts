import { describe, expect, it } from "vitest";
import { cvContentSchema } from "@/cv/schema";
import { SAMPLE_CV } from "@/cv/sample";

describe("validação do conteúdo do CV", () => {
  it("aceita um CV completo", () => {
    expect(cvContentSchema.safeParse(SAMPLE_CV).success).toBe(true);
  });
  it("exige cargo e empresa em cada experiência", () => {
    const r = cvContentSchema.safeParse({ ...SAMPLE_CV, experiences: [{ ...SAMPLE_CV.experiences[0], position: "" }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]!.path.join(".")).toBe("experiences.0.position");
  });
  it("rejeita email inválido mas aceita vazio", () => {
    expect(cvContentSchema.safeParse({ ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, email: "x" } }).success).toBe(false);
    expect(cvContentSchema.safeParse({ ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, email: "" } }).success).toBe(true);
  });
  it("limita tamanhos e quantidades", () => {
    expect(cvContentSchema.safeParse({ ...SAMPLE_CV, summary: "a".repeat(2001) }).success).toBe(false);
    expect(cvContentSchema.safeParse({ ...SAMPLE_CV, references: Array(7).fill({ name: "X", position: "", company: "", phone: "", email: "" }) }).success).toBe(false);
  });
  it("rejeita secções ocultas desconhecidas", () => {
    expect(cvContentSchema.safeParse({ ...SAMPLE_CV, hiddenSections: ["hack"] }).success).toBe(false);
  });
});
