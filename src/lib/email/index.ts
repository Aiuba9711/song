import "server-only";
import { env } from "@/lib/env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/** Desenvolvimento/testes: escreve o email no log do servidor. Guarda o último para testes. */
export class ConsoleEmailProvider implements EmailProvider {
  static outbox: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    ConsoleEmailProvider.outbox.push(message);
    if (ConsoleEmailProvider.outbox.length > 50) ConsoleEmailProvider.outbox.shift();
    if (process.env.NODE_ENV !== "test") {
      console.info(`[email:console] Para: ${message.to}\nAssunto: ${message.subject}\n\n${message.text}\n`);
    }
  }
}

/** Resend — API HTTP documentada em https://resend.com/docs/api-reference/emails/send-email */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    });
    if (!res.ok) {
      throw new Error(`Falha ao enviar email (Resend ${res.status})`);
    }
  }
}

let instance: EmailProvider | null = null;

export function emailProvider(): EmailProvider {
  if (instance) return instance;
  const e = env();
  if (e.EMAIL_DRIVER === "resend") {
    if (!e.RESEND_API_KEY) throw new Error("EMAIL_DRIVER=resend requer RESEND_API_KEY");
    instance = new ResendEmailProvider(e.RESEND_API_KEY, e.EMAIL_FROM);
  } else {
    instance = new ConsoleEmailProvider();
  }
  return instance;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  try {
    await emailProvider().send(message);
    return true;
  } catch (error) {
    console.error("[email] erro ao enviar", error);
    return false;
  }
}
