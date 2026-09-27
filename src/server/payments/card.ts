import "server-only";
import {
  PaymentError,
  type PaymentInstructions,
  type PaymentProvider,
  type PaymentStatusView,
  type VerifyPaymentResult,
} from "@/lib/payments/types";

/**
 * PLACEHOLDER — pagamento por cartão bancário.
 *
 * Não existe gateway integrado. Esta classe existe apenas para fixar o contrato: quando for
 * escolhido um gateway OFICIAL que opere em MZN (banco local ou agregador), implementar aqui:
 *   - createPayment: criar a sessão de pagamento no gateway (página alojada pelo gateway —
 *     nunca recolher dados de cartão nesta aplicação) e guardar providerReference;
 *   - verifyPayment/getPaymentStatus: confirmar SEMPRE no servidor (consulta à API do gateway
 *     ou webhook com assinatura verificada), chamando markPaymentSucceeded();
 *   - credenciais apenas em variáveis de ambiente (CARD_*).
 * Ver PAYMENTS.md. Enquanto isso, isAvailable() devolve sempre false.
 */
export class CardPaymentProvider implements PaymentProvider {
  readonly id = "CARD" as const;
  readonly mode = "API" as const;
  readonly label = "Cartão bancário";

  async isAvailable(): Promise<boolean> {
    return false;
  }

  private unavailable(): never {
    throw new PaymentError("O pagamento por cartão ainda não está disponível.", "UNAVAILABLE");
  }

  async getPaymentInstructions(): Promise<PaymentInstructions> {
    this.unavailable();
  }

  async createPayment(): Promise<{ paymentId: string }> {
    this.unavailable();
  }

  async verifyPayment(): Promise<VerifyPaymentResult> {
    this.unavailable();
  }

  async getPaymentStatus(): Promise<PaymentStatusView> {
    this.unavailable();
  }
}
