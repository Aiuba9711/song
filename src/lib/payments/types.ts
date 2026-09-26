/**
 * Camada abstrata de pagamentos — FASE 2 (ainda não ligada à interface).
 * Ver PAYMENTS.md. Nenhum fornecedor real está implementado: as APIs de M-Pesa, e-Mola,
 * mKesh e cartão só serão integradas com documentação oficial e credenciais do comerciante.
 */
import type { PaymentProviderId } from "@/generated/prisma/enums";

export type PaymentMethod = "MPESA" | "EMOLA" | "MKESH" | "CARD";

export type InitiatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  /** Telefone do pagador (carteiras móveis), formato 2588XXXXXXXX */
  payerPhone?: string;
  customerEmail: string;
  /** URL para onde o cliente volta (pagamentos com redirecionamento, ex.: cartão) */
  returnUrl: string;
  /** Chave de idempotência — o mesmo pedido nunca é cobrado duas vezes */
  idempotencyKey: string;
};

export type InitiatePaymentResult =
  /** Pagamento concluído de imediato (ex.: USSD push confirmado de forma síncrona) */
  | { status: "SUCCEEDED"; providerReference: string }
  /** O cliente tem de confirmar no telemóvel (PIN) — aguardar callback/consulta */
  | { status: "PENDING"; providerReference: string; instructions: string }
  /** O cliente tem de ser redirecionado (ex.: página segura do gateway de cartão) */
  | { status: "REDIRECT"; providerReference: string; redirectUrl: string }
  | { status: "FAILED"; reason: string };

export type PaymentStatusResult = { status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; reason?: string };

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly label: string;
  /** true apenas quando todas as variáveis de ambiente necessárias existem */
  isConfigured(): boolean;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  /** Consulta o estado junto do fornecedor (fonte de verdade — nunca confiar só no browser) */
  getStatus(providerReference: string): Promise<PaymentStatusResult>;
  /** Valida a assinatura/autenticidade de um callback do fornecedor */
  verifyWebhook?(request: Request): Promise<{ providerReference: string; status: PaymentStatusResult["status"] } | null>;
}
