import { beforeEach, describe, expect, it } from "vitest";
import { cvContentSchema } from "@/cv/schema";
import { SAMPLE_CV } from "@/cv/sample";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { createCv, deleteCv, duplicateCv, getUserCv, MAX_CVS_PER_USER, saveCv, setCvPhoto, setCvTemplate, toCvContent } from "@/server/cv";
import { createTemplate, createUser, resetDatabase } from "../support/db";
import { TINY_PNG } from "../support/documents";

beforeEach(resetDatabase);

describe("criação de CV", () => {
  it("pré-preenche apenas com os dados da própria conta e usa o modelo pedido", async () => {
    const u = await createUser({ name: "Carla Nhantumbo", email: "carla@teste.co.mz" });
    await createTemplate({ slug: "classico" });
    const t = await createTemplate({ slug: "moderno", layout: "MODERNO" });
    const { id } = await createCv(u.id, { templateSlug: "moderno" });
    const cv = await getUserCv(u.id, id);
    expect(cv?.templateId).toBe(t.id);
    expect(cv?.fullName).toBe("Carla Nhantumbo");
    expect(cv?.email).toBe("carla@teste.co.mz");
    expect(cv?.summary).toBe("");
    expect(cv?.experiences).toHaveLength(0);
  });

  it("respeita o limite de CVs por utilizador", async () => {
    const u = await createUser();
    await db.cV.createMany({ data: Array.from({ length: MAX_CVS_PER_USER }, (_, i) => ({ userId: u.id, title: `CV ${i}` })) });
    await expect(createCv(u.id, {})).rejects.toMatchObject({ code: "LIMIT" });
  });
});

describe("edição de CV", () => {
  it("guarda todo o conteúdo e mantém a ordem das listas", async () => {
    const u = await createUser();
    const t = await createTemplate();
    const { id } = await createCv(u.id, {});
    const content = cvContentSchema.parse({ ...SAMPLE_CV, templateId: t.id });
    await saveCv(u.id, id, content, 4);
    const cv = (await getUserCv(u.id, id))!;
    const back = toCvContent(cv);
    expect(back.personal.fullName).toBe("Ana Maria Machava");
    expect(back.experiences.map((e) => e.position)).toEqual(SAMPLE_CV.experiences.map((e) => e.position));
    expect(back.skills).toHaveLength(SAMPLE_CV.skills.length);
    expect(back.referencesOnRequest).toBe(true);
    expect(cv.currentStep).toBe(4);

    // Remover e reordenar
    const edited = cvContentSchema.parse({ ...content, experiences: [SAMPLE_CV.experiences[1]], skills: [] });
    await saveCv(u.id, id, edited);
    const after = toCvContent((await getUserCv(u.id, id))!);
    expect(after.experiences.map((e) => e.position)).toEqual([SAMPLE_CV.experiences[1]!.position]);
    expect(after.skills).toHaveLength(0);
  });

  it("ignora modelos inexistentes ou inativos", async () => {
    const u = await createUser();
    const inactive = await createTemplate({ isActive: false });
    const { id } = await createCv(u.id, {});
    await saveCv(u.id, id, cvContentSchema.parse({ ...SAMPLE_CV, templateId: inactive.id }));
    expect((await getUserCv(u.id, id))?.templateId).toBeNull();
    await expect(setCvTemplate(u.id, id, inactive.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("showPhoto só fica ativo quando existe fotografia", async () => {
    const u = await createUser();
    const { id } = await createCv(u.id, {});
    await saveCv(u.id, id, cvContentSchema.parse({ ...SAMPLE_CV, personal: { ...SAMPLE_CV.personal, showPhoto: true } }));
    expect((await getUserCv(u.id, id))?.showPhoto).toBe(false);
  });
});

describe("privacidade: acesso apenas ao dono", () => {
  it("outro utilizador não consegue ler, editar, duplicar nem apagar", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const { id } = await createCv(owner.id, {});
    expect(await getUserCv(intruder.id, id)).toBeNull();
    await expect(saveCv(intruder.id, id, cvContentSchema.parse(SAMPLE_CV))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(duplicateCv(intruder.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteCv(intruder.id, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(setCvPhoto(intruder.id, id, TINY_PNG)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await getUserCv(owner.id, id)).not.toBeNull();
  });
});

describe("duplicar e eliminar", () => {
  it("duplica o CV com todas as secções e uma cópia independente da foto", async () => {
    const u = await createUser();
    const { id } = await createCv(u.id, { title: "CV Banco" });
    await saveCv(u.id, id, cvContentSchema.parse({ ...SAMPLE_CV, title: "CV Banco" }));
    await setCvPhoto(u.id, id, TINY_PNG);

    const copy = await duplicateCv(u.id, id);
    const original = (await getUserCv(u.id, id))!;
    const dup = (await getUserCv(u.id, copy.id))!;
    expect(dup.title).toBe("CV Banco (cópia)");
    expect(dup.experiences).toHaveLength(original.experiences.length);
    expect(dup.photoKey).not.toBe(original.photoKey);
    expect(await storage().get(dup.photoKey!)).not.toBeNull();

    // Editar a cópia não altera o original
    await saveCv(u.id, copy.id, cvContentSchema.parse({ ...SAMPLE_CV, summary: "Outro resumo" }));
    expect((await getUserCv(u.id, id))!.summary).toBe(SAMPLE_CV.summary);
  });

  it("eliminar remove o CV, as secções e a fotografia", async () => {
    const u = await createUser();
    const { id } = await createCv(u.id, {});
    await saveCv(u.id, id, cvContentSchema.parse(SAMPLE_CV));
    await setCvPhoto(u.id, id, TINY_PNG);
    const key = (await getUserCv(u.id, id))!.photoKey!;
    await deleteCv(u.id, id);
    expect(await db.cV.count({ where: { id } })).toBe(0);
    expect(await db.cVExperience.count({ where: { cvId: id } })).toBe(0);
    expect(await storage().get(key)).toBeNull();
  });
});
