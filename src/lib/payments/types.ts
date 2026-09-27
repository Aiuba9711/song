/**
 * Camada abstrata de pagamentos. Ver PAYMENTS.md.
 *
 * Implementações:
 *  - ManualMobileMoneyProvider (M-Pesa, e-Mola, mKesh): o cliente transfere para um número
 *    configurado no admin e informa a transação; um ADMINISTRADOR verifica e confirma.
 *  - CardPaymentProvider: placeholder — indisponível até existir um gateway oficial.
 *
 * Nenhuma API de operador foi implementada ou inventada. Uma futura integração oficial
 * implementa esta mesma interface com mode = "API".
 */
import type { OrderStatus, PaymentProviderId, PaymentStatus, Role } from "@/generated/prisma/enums";

export type ManualMethod = "MPESA" | "EMOLA" | "MKESH";
export const MANUAL_METHODS: readonly ManualMethod[] = ["MPESA", "EMOLA", "MKESH"];

export type PaymentInstructions = {
  method: PaymentProviderId;
  label: string;
  mode: "MANUAL" | "API";
  /** Número de destino (pagamento manual) — vem da configuração central, nunca do código */
  payeeNumber: string | null;
  accountHolderName: string | null;
  amountMinor: number;
  currency: string;
  /** Referência a indicar no pagamento (número do pedido) */
  reference: string;
  steps: string[];
};

export type Reviewer = { id: string; role: Role };

export type VerifyPaymentInput =
  | { decision: "CONFIRM"; reviewer: Reviewer; note?: string }
  | { decision: "REJECT"; reviewer: Reviewer; note: string }
  | { decision: "REQUEST_NEW_PROOF"; reviewer: Reviewer; note: string };

export type VerifyPaymentResult = { paymentStatus: PaymentStatus; orderStatus: OrderStatus; orderId: string };

export type PaymentStatusView = {
  paymentId: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  reviewNote: string | null;
};

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly mode: "MANUAL" | "API";
  readonly label: string;
  /** Método configurado e ativo (números/credenciais presentes, moeda suportada) */
  isAvailable(): Promise<boolean>;
  /** O que o cliente tem de fazer para pagar este pedido */
  getPaymentInstructions(order: { number: string; totalMinor: number; currency: string }): Promise<PaymentInstructions>;
  /** Regista uma tentativa de pagamento para um pedido que aguarda pagamento */
  createPayment(input: { orderId: string }): Promise<{ paymentId: string }>;
  /**
   * Verificação do pagamento. No modo MANUAL só um administrador (permissão payments.verify)
   * pode confirmar; numa integração API seria a confirmação oficial do fornecedor.
   * É a ÚNICA via que muda um pedido para PAID.
   */
  verifyPayment(paymentId: string, input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatusView>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly code:
      | "UNAVAILABLE"
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "FORBIDDEN"
      | "DUPLICATE_TRANSACTION"
      | "CURRENCY_NOT_SUPPORTED"
      | "LIMIT"
      | "INVALID_ITEM",
  ) {
    super(message);
  }
}

export const METHOD_LABELS: Record<PaymentProviderId, string> = {
  FREE: "Gratuito",
  MOCK: "Teste (simulado)",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  MKESH: "mKesh",
  CARD: "Cartão bancário",
};
