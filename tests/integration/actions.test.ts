import { beforeEach, describe, expect, it } from "vitest";
import { forgotPasswordAction, loginAction, registerAction } from "@/app/(auth)/actions";
import { saveCvAction } from "@/app/meu-espaco/cvs/actions";
import { SAMPLE_CV } from "@/cv/sample";
import { ConsoleEmailProvider } from "@/lib/email";
import { sessionCookieName } from "@/lib/auth/session";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createCv } from "@/server/cv";
import { createUser, resetDatabase } from "../support/db";
import { cookieJar, resetCookies } from "../support/next-mocks";

beforeEach(async () => {
  await resetDatabase();
  resetCookies();
  ConsoleEmailProvider.outbox.length = 0;
});

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

/** redirect() do Next.js lança um erro especial com o destino no digest. */
async function expectRedirect(p: Promise<unknown>, to: string | RegExp) {
  const error = await p.then(
    () => null,
    (e: { digest?: string }) => e,
  );
  expect(error?.digest).toMatch(/^NEXT_REDIRECT/);
  const url = error!.digest!.split(";")[2]!;
  if (typeof to === "string") expect(url).toBe(to);
  else expect(url).toMatch(to);
}

describe("ações de autenticação", () => {
  it("registo cria conta, sessão e envia email de boas-vindas", async () => {
    await expectRedirect(
      registerAction({}, form({ name: "Paulo Cossa", email: "paulo@teste.co.mz", password: "Senha1234", acceptTerms: "on" })),
      "/meu-espaco?bem-vindo=1",
    );
    expect(cookieJar.has(sessionCookieName())).toBe(true);
    expect(await db.user.count({ where: { email: "paulo@teste.co.mz" } })).toBe(1);
    expect(ConsoleEmailProvider.outbox.at(-1)?.to).toBe("paulo@teste.co.mz");
  });

  it("login com senha errada devolve erro genérico (sem revelar se o email existe)", async () => {
    await createUser({ email: "maria@teste.co.mz", password: "Senha1234" });
    const wrong = await loginAction({}, form({ email: "maria@teste.co.mz", password: "errada" }));
    const unknown = await loginAction({}, form({ email: "x@teste.co.mz", password: "errada" }));
    expect(wrong.error).toBe(unknown.error);
    await expectRedirect(loginAction({}, form({ email: "maria@teste.co.mz", password: "Senha1234", next: "/meu-espaco/cvs" })), "/meu-espaco/cvs");
  });

  it("login ignora redirecionamentos externos", async () => {
    await createUser({ email: "rui@teste.co.mz", password: "Senha1234" });
    await expectRedirect(loginAction({}, form({ email: "rui@teste.co.mz", password: "Senha1234", next: "https://evil.com" })), "/meu-espaco");
  });

  it("recuperação de senha responde igual para emails existentes e inexistentes", async () => {
    await createUser({ email: "sim@teste.co.mz" });
    const a = await forgotPasswordAction({}, form({ email: "sim@teste.co.mz" }));
    const b = await forgotPasswordAction({}, form({ email: "nao@teste.co.mz" }));
    expect(a).toEqual(b);
    expect(ConsoleEmailProvider.outbox).toHaveLength(1);
    expect(ConsoleEmailProvider.outbox[0]!.text).toMatch(/\/redefinir-senha\?token=/);
  });

  it("bloqueia força bruta no login", async () => {
    await createUser({ email: "alvo@teste.co.mz", password: "Senha1234" });
    let last;
    for (let i = 0; i < 11; i++) last = await loginAction({}, form({ email: "alvo@teste.co.mz", password: `errada${i}` }));
    expect(last!.error).toMatch(/Demasiadas tentativas/);
  });
});

describe("guardar CV (server action)", () => {
  it("devolve erros por campo para o wizard", async () => {
    const u = await createUser();
    await createSession(u.id);
    const { id } = await createCv(u.id, {});
    const res = await saveCvAction(id, { ...SAMPLE_CV, experiences: [{ ...SAMPLE_CV.experiences[0]!, employer: "" }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.fieldErrors?.["experiences.0.employer"]).toBeTruthy();
  });

  it("guarda com sucesso e recusa sem sessão", async () => {
    const u = await createUser();
    await createSession(u.id);
    const { id } = await createCv(u.id, {});
    expect((await saveCvAction(id, SAMPLE_CV, 3)).ok).toBe(true);
    resetCookies();
    const res = await saveCvAction(id, SAMPLE_CV, 3);
    expect(res.ok).toBe(false);
  });
});
