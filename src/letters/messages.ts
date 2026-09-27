/**
 * Modelos de email e de mensagem de WhatsApp para candidaturas.
 * Só usam os dados que o utilizador indica; campos vazios não aparecem (nada é inventado).
 */

export type MessageVars = {
  name: string;
  phone: string;
  email: string;
  position: string;
  company: string;
  recruiterName: string;
  /** Referência da vaga (ex.: REF-2026/15) */
  reference: string;
  /** Onde viu o anúncio (ex.: jornal Notícias, LinkedIn) */
  source: string;
  /** Data/hora da entrevista, como o utilizador a escrever */
  interviewDate: string;
};

export type VarKey = keyof MessageVars;

export const VAR_LABELS: Record<VarKey, string> = {
  name: "O seu nome",
  phone: "O seu telefone",
  email: "O seu email",
  position: "Cargo / vaga",
  company: "Empresa",
  recruiterName: "Nome do recrutador",
  reference: "Referência da vaga",
  source: "Onde viu a vaga",
  interviewDate: "Data da entrevista",
};

export const VAR_PLACEHOLDERS: Partial<Record<VarKey, string>> = {
  position: "Ex.: Técnico de Contabilidade",
  company: "Ex.: Banco Exemplo, S.A.",
  recruiterName: "Ex.: Dra. Maria Sitoe",
  reference: "Ex.: REF-2026/15",
  source: "Ex.: jornal Notícias",
  interviewDate: "Ex.: 3 de outubro, às 10h",
};

export const VAR_MAX = 120;

export const EMPTY_VARS: MessageVars = { name: "", phone: "", email: "", position: "", company: "", recruiterName: "", reference: "", source: "", interviewDate: "" };

const t = (v: string) => v.trim();
const stop = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

function emailGreeting(v: MessageVars): string {
  return t(v.recruiterName) ? `Exmo.(a) Sr.(a) ${t(v.recruiterName)},` : "Exmos. Senhores,";
}

function signature(v: MessageVars): string {
  return ["Com os melhores cumprimentos,", t(v.name), t(v.phone), t(v.email)].filter(Boolean).join("\n");
}

const vaga = (v: MessageVars) => (t(v.position) ? `à vaga de ${t(v.position)}` : "à vaga anunciada");
const ref = (v: MessageVars) => (t(v.reference) ? ` (Ref.ª ${t(v.reference)})` : "");

export type EmailTemplate = {
  id: string;
  label: string;
  description: string;
  fields: VarKey[];
  subject: (v: MessageVars) => string;
  body: (v: MessageVars) => string;
};

const lines = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join("\n\n");

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "candidatura",
    label: "Candidatura",
    description: "Responder a um anúncio de vaga, com o CV e a carta em anexo.",
    fields: ["position", "company", "reference", "source", "recruiterName"],
    subject: (v) => `Candidatura ${vaga(v)}${ref(v)}`,
    body: (v) =>
      lines(
        emailGreeting(v),
        stop(`Venho, por este meio, apresentar a minha candidatura ${vaga(v)}${ref(v)}${t(v.source) ? `, publicada em ${t(v.source)}` : ""}`) +
          " Em anexo envio o meu CV e a carta de candidatura.",
        "Fico ao dispor para uma entrevista e para prestar qualquer esclarecimento adicional.",
        signature(v),
      ),
  },
  {
    id: "espontanea",
    label: "Candidatura espontânea",
    description: "Oferecer os seus serviços a uma empresa, mesmo sem vaga anunciada.",
    fields: ["position", "company", "recruiterName"],
    subject: (v) => `Candidatura espontânea${t(v.position) ? ` — ${t(v.position)}` : ""}`,
    body: (v) =>
      lines(
        emailGreeting(v),
        stop(`Gostaria de manifestar o meu interesse em integrar a equipa${t(v.company) ? ` de ${t(v.company)}` : " da vossa organização"}${t(v.position) ? `, na área de ${t(v.position)}` : ""}`) +
          " Envio em anexo o meu CV para apreciação, caso surja uma oportunidade adequada ao meu perfil.",
        "Agradeço a atenção e fico ao dispor para qualquer esclarecimento.",
        signature(v),
      ),
  },
  {
    id: "envio-cv",
    label: "Envio de CV",
    description: "Enviar o CV que lhe foi pedido por um recrutador ou contacto.",
    fields: ["position", "recruiterName"],
    subject: (v) => `Envio de CV${t(v.name) ? ` — ${t(v.name)}` : ""}${t(v.position) ? ` — ${t(v.position)}` : ""}`,
    body: (v) =>
      lines(
        emailGreeting(v),
        stop(`Conforme solicitado, envio em anexo o meu CV${t(v.position) ? ` para a vaga de ${t(v.position)}` : ""}`),
        "Fico ao dispor para qualquer informação adicional.",
        signature(v),
      ),
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    description: "Pedir notícias sobre uma candidatura já enviada.",
    fields: ["position", "reference", "recruiterName"],
    subject: (v) => `Acompanhamento da candidatura${t(v.position) ? ` — ${t(v.position)}` : ""}${ref(v)}`,
    body: (v) =>
      lines(
        emailGreeting(v),
        stop(`No seguimento da candidatura que enviei ${vaga(v)}${ref(v)}, gostaria de saber se há novidades sobre o processo de recrutamento`),
        "Mantenho o meu interesse na função e estou disponível para uma entrevista.",
        signature(v),
      ),
  },
  {
    id: "agradecimento",
    label: "Agradecimento",
    description: "Agradecer a entrevista e reforçar o interesse na vaga.",
    fields: ["position", "company", "interviewDate", "recruiterName"],
    subject: (v) => `Agradecimento pela entrevista${t(v.position) ? ` — ${t(v.position)}` : ""}`,
    body: (v) =>
      lines(
        emailGreeting(v),
        stop(`Agradeço a oportunidade da entrevista${t(v.interviewDate) ? ` realizada em ${t(v.interviewDate)}` : ""}${t(v.position) ? ` para a vaga de ${t(v.position)}` : ""}`) +
          ` Foi um prazer conhecer melhor ${t(v.company) || "a vossa organização"} e reforço o meu interesse na função.`,
        "Fico ao dispor para qualquer informação adicional.",
        signature(v),
      ),
  },
  {
    id: "resposta",
    label: "Resposta a recrutador",
    description: "Responder a um recrutador que o contactou (ex.: convite para entrevista).",
    fields: ["position", "interviewDate", "recruiterName"],
    subject: (v) => `Re: ${t(v.position) ? `Vaga de ${t(v.position)}` : "Processo de recrutamento"}`,
    body: (v) =>
      lines(
        emailGreeting(v),
        "Agradeço o seu contacto.",
        stop(
          `Confirmo o meu interesse${t(v.position) ? ` na vaga de ${t(v.position)}` : ""} e a minha disponibilidade para ${
            t(v.interviewDate) ? `a entrevista em ${t(v.interviewDate)}` : "uma entrevista na data e hora que forem mais convenientes"
          }`,
        ),
        t(v.phone) || t(v.email) ? stop(`Pode contactar-me através de ${[t(v.phone), t(v.email)].filter(Boolean).join(" ou ")}`) : "",
        signature(v),
      ),
  },
];

// ─── WhatsApp ───────────────────────────────────────────────

/** Cumprimento pela hora local (Bom dia / Boa tarde / Boa noite). */
export function greetingForHour(hour: number): string {
  return hour < 12 ? "Bom dia" : hour < 19 ? "Boa tarde" : "Boa noite";
}

export type WhatsAppTemplate = {
  id: string;
  label: string;
  fields: VarKey[];
  message: (v: MessageVars, hour: number) => string;
};

const hello = (v: MessageVars, hour: number) => `${greetingForHour(hour)}${t(v.recruiterName) ? `, ${t(v.recruiterName)}` : ""}.`;
const me = (v: MessageVars) => (t(v.name) ? ` O meu nome é ${t(v.name)}.` : "");
const wa = (...parts: string[]) => parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "informacao",
    label: "Pedir informação",
    fields: ["position", "source", "recruiterName"],
    message: (v, h) =>
      wa(hello(v, h) + me(v), stop(`Vi o anúncio da vaga de ${t(v.position) || "emprego"}${t(v.source) ? ` (${t(v.source)})` : ""} e gostaria de saber como posso enviar a minha candidatura`), "Obrigado(a)."),
  },
  {
    id: "enviar-cv",
    label: "Enviar CV",
    fields: ["position", "recruiterName"],
    message: (v, h) => wa(hello(v, h) + me(v), stop(`Envio o meu CV${t(v.position) ? ` para a vaga de ${t(v.position)}` : ""}`), "Fico disponível para uma entrevista. Obrigado(a) pela atenção."),
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    fields: ["position", "recruiterName"],
    message: (v, h) => wa(hello(v, h) + me(v), stop(`Candidatei-me ${vaga(v)} e gostaria de saber se há novidades sobre o processo`), "Obrigado(a)."),
  },
  {
    id: "confirmar-entrevista",
    label: "Confirmar entrevista",
    fields: ["interviewDate", "position", "recruiterName"],
    message: (v, h) =>
      wa(hello(v, h), stop(`Confirmo a minha presença na entrevista${t(v.interviewDate) ? ` de ${t(v.interviewDate)}` : ""}${t(v.position) ? ` para a vaga de ${t(v.position)}` : ""}`), "Obrigado(a) pelo convite.", t(v.name)),
  },
  {
    id: "agradecimento",
    label: "Agradecimento",
    fields: ["position", "recruiterName"],
    message: (v, h) =>
      wa(hello(v, h), stop(`Obrigado(a) pela oportunidade da entrevista${t(v.position) ? ` para a vaga de ${t(v.position)}` : ""}`), "Reforço o meu interesse na função.", t(v.name)),
  },
  {
    id: "espontanea",
    label: "Candidatura espontânea",
    fields: ["position", "company", "recruiterName"],
    message: (v, h) =>
      wa(
        hello(v, h) + me(v),
        stop(`Gostaria de saber se posso enviar o meu CV para futuras oportunidades${t(v.position) ? ` na área de ${t(v.position)}` : ""}${t(v.company) ? ` em ${t(v.company)}` : ""}`),
        "Obrigado(a).",
      ),
  },
];
