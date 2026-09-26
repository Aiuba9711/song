import type { EmailMessage } from "./index";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="pt"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:18px;font-weight:bold;color:#1d4ed8;padding-bottom:16px">Emprego Fácil MZ</td></tr>
<tr><td><h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="font-size:12px;color:#64748b;padding-top:24px">Recebeu este email porque existe uma conta Emprego Fácil MZ associada a este endereço.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${escapeHtml(label)}</a></p>`;
}

export function passwordResetEmail(to: string, name: string, url: string): EmailMessage {
  const subject = "Redefinir a sua senha — Emprego Fácil MZ";
  const text = `Olá ${name},\n\nRecebemos um pedido para redefinir a senha da sua conta.\nAbra este link (válido durante 1 hora):\n${url}\n\nSe não fez este pedido, ignore este email — a sua senha continua a mesma.`;
  const html = layout(
    "Redefinir a sua senha",
    `<p>Olá ${escapeHtml(name)},</p><p>Recebemos um pedido para redefinir a senha da sua conta. O link é válido durante 1 hora.</p>${button(url, "Definir nova senha")}<p style="font-size:13px;color:#475569">Se não fez este pedido, ignore este email — a sua senha continua a mesma.</p>`,
  );
  return { to, subject, text, html };
}

export function welcomeEmail(to: string, name: string, url: string): EmailMessage {
  const subject = "Bem-vindo(a) ao Emprego Fácil MZ";
  const text = `Olá ${name},\n\nA sua conta foi criada. Já pode criar o seu CV profissional:\n${url}\n\nBoa sorte nas suas candidaturas!`;
  const html = layout(
    "A sua conta está pronta",
    `<p>Olá ${escapeHtml(name)},</p><p>A sua conta foi criada. Já pode criar o seu CV profissional, escolher um modelo e descarregar em PDF ou Word.</p>${button(url, "Criar o meu CV")}<p>Boa sorte nas suas candidaturas!</p>`,
  );
  return { to, subject, text, html };
}

export function orderDeliveredEmail(
  to: string,
  name: string,
  orderNumber: string,
  products: string[],
  url: string,
): EmailMessage {
  const subject = `Pedido ${orderNumber} — acesso aos seus materiais`;
  const list = products.map((p) => `• ${p}`).join("\n");
  const text = `Olá ${name},\n\nObrigado! O seu pedido ${orderNumber} está confirmado.\n\nProdutos:\n${list}\n\nAceda aos seus materiais em:\n${url}`;
  const html = layout(
    "Pedido confirmado",
    `<p>Olá ${escapeHtml(name)},</p><p>Obrigado! O seu pedido <strong>${escapeHtml(orderNumber)}</strong> está confirmado.</p><ul>${products
      .map((p) => `<li>${escapeHtml(p)}</li>`)
      .join("")}</ul>${button(url, "Aceder ao meu kit")}<p style="font-size:13px;color:#475569">Por segurança, os ficheiros são descarregados a partir da sua conta.</p>`,
  );
  return { to, subject, text, html };
}
