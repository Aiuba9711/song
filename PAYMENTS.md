# Pagamentos — Emprego Fácil MZ

> **Estado: Fase 2 — ainda não implementado.** Nenhuma API de pagamento foi inventada nem usada.
> A Fase 1 inclui apenas produtos gratuitos (pedido `PAID` de 0 MT com fornecedor `FREE`),
> o que já exercita o fluxo pedido → entrega → download.

## Objetivo

Aceitar pagamentos em Meticais pelos métodos usados em Moçambique — **M-Pesa**, **e-Mola**,
**mKesh** e **cartão bancário** — através de uma camada abstrata que permite adicionar ou trocar
gateways sem alterar o resto da aplicação.

## Arquitetura

```
PaymentProvider (interface — src/lib/payments/types.ts)
 ├─ MpesaProvider    (Vodacom M-Pesa)       ← a implementar com documentação oficial
 ├─ EmolaProvider    (Movitel e-Mola)       ← a implementar com documentação oficial
 ├─ MkeshProvider    (Tmcel mKesh)          ← a implementar com documentação oficial
 ├─ CardProvider     (gateway de cartões)   ← a escolher
 └─ MockPaymentProvider                     ← SÓ desenvolvimento/testes, claramente identificado
```

Interface (já definida em código):

```ts
interface PaymentProvider {
  id: PaymentProviderId;               // MPESA | EMOLA | MKESH | CARD | MOCK
  label: string;
  isConfigured(): boolean;              // credenciais presentes nas variáveis de ambiente
  initiate(input): Promise<SUCCEEDED | PENDING | REDIRECT | FAILED>;
  getStatus(providerReference): Promise<PaymentStatusResult>;
  verifyWebhook?(request): Promise<{ providerReference, status } | null>;
}
```

- `PENDING` cobre carteiras móveis em que o cliente confirma com PIN no telemóvel (push/USSD).
- `REDIRECT` cobre gateways de cartão com página segura alojada pelo fornecedor (não tocamos em dados de cartão).
- O registo `Payment` guarda `provider`, `status`, `providerReference` (único por fornecedor) e metadados **sem segredos**.

## Fluxo de compra (Fase 2)

```
Produto → Checkout (nome, email, telefone, método, cupão)
  → Order(status=AWAITING_PAYMENT) + Payment(status=PENDING)   [transação]
  → provider.initiate()
      SUCCEEDED → confirmar
      PENDING   → página "Confirme no seu telemóvel" + consulta periódica getStatus()
      REDIRECT  → gateway → returnUrl → getStatus()
  → callback/webhook do fornecedor → verifyWebhook() → getStatus()   (fonte de verdade)
  → Confirmação (idempotente): Payment=SUCCEEDED, Order=PAID, paidAt, cupão +1
  → "Pagamento confirmado! Obrigado pela compra." + botão "Aceder ao meu kit"
  → Email (orderDeliveredEmail) com a lista de produtos e link para a conta
```

Regras:

1. **Nunca** marcar um pedido como pago com base apenas no redirecionamento do browser — confirmar sempre no servidor (`getStatus` ou webhook verificado).
2. **Idempotência**: `@@unique([provider, providerReference])` em `Payment`; a confirmação só muda o estado se ainda não estiver `PAID`.
3. O **valor é recalculado no servidor** (preço atual na BD − cupão válido); o cliente nunca envia o total.
4. Os ficheiros não são enviados por email: o email tem um link para "Meus kits" (downloads protegidos por sessão; com S3, URL assinado de 5 minutos). `signPayload/verifySignedPayload` (src/lib/auth/tokens.ts) permite links temporários sem sessão se necessário.
5. Registar cada transição em `AuditLog`.
6. Callbacks devem ter rate limiting e validação de origem/assinatura conforme a documentação de cada fornecedor.

## Variáveis de ambiente (previstas)

```
PAYMENTS_ENABLED_PROVIDERS="mpesa,emola"   # quais aparecem no checkout
MPESA_API_KEY=""
MPESA_PUBLIC_KEY=""
MPESA_SERVICE_PROVIDER_CODE=""
MPESA_ENVIRONMENT="sandbox"                # sandbox | production
EMOLA_*   MKESH_*   CARD_*                 # definidos quando houver documentação oficial
```

Credenciais **apenas** em variáveis de ambiente do servidor; nunca em código, BD ou cliente.

## O que falta para cada fornecedor

| Fornecedor | Necessário antes de implementar |
|---|---|
| **M-Pesa (Vodacom Moçambique)** | Conta de comerciante/empresa, registo no portal oficial de programadores da Vodacom M-Pesa, credenciais de sandbox e produção, código de prestador de serviço, documentação oficial da API (endpoints, cifra da chave, formatos de resposta e callback). |
| **e-Mola (Movitel)** | Contrato de comerciante e documentação técnica oficial fornecida pela Movitel. |
| **mKesh (Tmcel)** | Contrato de comerciante e documentação técnica oficial fornecida pela Tmcel. |
| **Cartão bancário** | Escolha de um gateway que opere com MZN (banco local ou agregador), contrato, documentação e ambiente de testes. Preferir página de pagamento alojada pelo gateway (reduz obrigações PCI). |

Até lá, a página de produto mostra o botão **Comprar** desativado e a alternativa "Encomendar pelo
WhatsApp" (número configurado no admin); o administrador pode acompanhar pedidos em `/admin/pedidos`.

## Assinatura futura (Emprego Fácil Pro)

Não será implementada cobrança recorrente até que o fornecedor escolhido suporte débitos
recorrentes ou pré-autorizações de forma fiável. O modelo previsto: `Product.type = SUBSCRIPTION`
+ tabela `Subscription` (utilizador, plano, período, estado) a acrescentar nessa fase; renovação por
pagamento manual mensal (lembrete por email/WhatsApp) é a alternativa realista para carteiras móveis.
