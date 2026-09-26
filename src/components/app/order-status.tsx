import type { OrderStatus, PaymentProviderId } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/card";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" }> = {
  PENDING: { label: "Pendente", tone: "neutral" },
  AWAITING_PAYMENT: { label: "A aguardar pagamento", tone: "warning" },
  PAID: { label: "Pago", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
  REFUNDED: { label: "Reembolsado", tone: "brand" },
};

export const PAYMENT_LABELS: Record<PaymentProviderId, string> = {
  FREE: "Gratuito",
  MOCK: "Teste (simulado)",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  MKESH: "mKesh",
  CARD: "Cartão",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
