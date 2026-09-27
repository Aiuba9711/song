# Pagamentos — Emprego Fácil MZ

> **Estado (Fase 2): pagamento MANUAL por M-Pesa, e-Mola e mKesh, verificado por um administrador.**
> Nenhuma API de operador foi implementada ou inventada. O cartão bancário está preparado apenas
> como interface (`CardPaymentProvider`), indisponível até existir um gateway oficial.

## Princípios

1. **Os números de pagamento não estão no código.** Vivem na tabela `PaymentSettings` e são
   editados em **Admin → Definições → Pagamentos**. Na instalação, o seed pode lê-los das variáveis
   `SEED_MPESA_NUMBER`, `SEED_EMOLA_NUMBER` e `SEED_MKESH_NUMBER` (só na primeira criação).
2. **Informar um código de transação NUNCA liberta o produto.** O pedido fica
   `PENDING_VERIFICATION` até um administrador confirmar a transação no extrato do operador.
3. **Só duas vias podem mudar um pedido para `PAID`**: a confirmação de um administrador
   (permissão `payments.verify`, apenas `ADMIN`) ou, no futuro, a confirmação de uma API oficial.
   Ambas passam por `markPaymentSucceeded()` (`src/server/payments/transitions.ts`), que regista a
   alteração em `AuditLog`.
4. **O preço é sempre calculado no servidor** a partir da base de dados.

## Arquitetura

```
PaymentProvider (interface — src/lib/payments/types.ts)
  getPaymentInstructions() · createPayment() · verifyPayment() · getPaymentStatus() · isAvailable()
 ├─ ManualMobileMoneyProvider("MPESA" | "EMOLA" | "MKESH")   src/server/payments/manual.ts
 │     + submitCustomerReport()  — dados informados pelo cliente
 └─ CardPaymentProvider (placeholder, isAvailable() = false)  src/server/payments/card.ts

registry.ts        getPaymentProvider(), listAvailableMethods()
settings.ts        getPaymentSettings() (configuração central), resumo público em cache
transitions.ts     markPaymentSucceeded() — única transição para PAID
review.ts          listas para o admin (por verificar / a aguardar / histórico, alerta de códigos repetidos)
src/server/checkout.ts   resolução do item e preço, criação/cancelamento do pedido, acesso a downloads de CV
src/lib/pricing.ts       calculateTotals() (funções puras, testadas)
```

## Fluxo

```
Produto (ou CV com download pago)
  → /checkout?produto=… | ?cv=…        escolher M-Pesa / e-Mola / mKesh + nome, email, telefone
  → Order AWAITING_PAYMENT + Payment PENDING (mode MANUAL, cópia do número de destino)
  → /checkout?pedido=EF-…              número, valor exato, referência (com "Copiar") e instruções
  → cliente paga no operador
  → cliente informa: titular, número usado, código da transação, data/hora, comprovativo (opcional)
  → Payment + Order PENDING_VERIFICATION  → /checkout/pending (atualiza-se sozinha)
      email ao cliente + email ao contacto do site (Definições → Site)
  → Admin → Pagamentos pendentes:
      CONFIRMAR PAGAMENTO       → Payment SUCCEEDED, Order PAID → /checkout/success, email com acesso
      REJEITAR PAGAMENTO        → Payment REJECTED, Order FAILED → /checkout/failed (com o motivo), email
      PEDIR NOVO COMPROVATIVO   → Payment RESUBMISSION_REQUESTED, Order AWAITING_PAYMENT, email;
                                  o cliente reenvia na mesma página
  → Produto liberado: "Meus kits" (downloads protegidos) ou download do CV
```

### Estados

| Order | Significado |
|---|---|
| `AWAITING_PAYMENT` | Pedido criado; o cliente ainda não informou o pagamento (ou foi pedido novo comprovativo) |
| `PENDING_VERIFICATION` | O cliente informou a transação; aguarda o administrador |
| `PAID` | Confirmado por um administrador (ou, no futuro, por API oficial) |
| `FAILED` | Pagamento rejeitado |
| `CANCELLED` | Cancelado pelo cliente antes de informar o pagamento |

| Payment | Significado |
|---|---|
| `PENDING` | À espera dos dados do cliente |
| `PENDING_VERIFICATION` | Dados recebidos, por verificar |
| `RESUBMISSION_REQUESTED` | O administrador pediu novo comprovativo |
| `SUCCEEDED` / `REJECTED` | Decisão do administrador |
| `CANCELLED` | Substituído (mudança de método) ou pedido cancelado |

### Proteções

- Atualizações condicionais (`updateMany where status = …`) dentro de transações: não há confirmação dupla nem corridas entre dois administradores.
- O cliente só pode informar pagamentos dos **seus** pedidos; só uma vez enquanto está em verificação.
- O mesmo código de transação não pode ser usado em dois pedidos do mesmo operador; códigos repetidos aparecem com alerta ao administrador.
- Comprovativos: JPG, PNG ou PDF até 3 MB, validados por *magic bytes*, guardados em armazenamento privado e visíveis só para administradores (`/api/admin/payments/[id]/proof`, com `Content-Security-Policy: sandbox`).
- Números de destino validados por operador (M-Pesa 84/85, e-Mola 86/87, mKesh 82/83) e copiados para cada pagamento (auditoria).
- Limites: 20 inícios de checkout e 10 envios de comprovativo por hora por utilizador; máx. 5 pedidos em aberto.
- Pedidos em aberto para o mesmo item são reutilizados (sem duplicados); trocar de método mantém o mesmo número de pedido.
- `AuditLog`: `order.create`, `order.cancel`, `payment.submitted`, `payment.confirm` (com estados de/para), `payment.reject`, `payment.request_new_proof`, `settings.payments_update`.

## Configuração (Admin → Definições → Pagamentos)

| Campo | Descrição |
|---|---|
| Número M-Pesa / e-Mola / mKesh | Número de destino de cada operador |
| Método ativo | Ativa/desativa cada método (não é possível ativar sem número) |
| Nome do titular | Opcional — mostrado ao cliente |
| Instruções de pagamento | Uma instrução por linha, mostradas no checkout |
| Moeda | Os pagamentos por carteira móvel só funcionam em MZN |
| Valor padrão | Preço do download de um CV (ex.: 199 MT) |
| Cobrar o download de CVs | Desligado por omissão. Quando ligado, criar/editar/pré-visualizar continuam grátis e a "geração final" (PDF/DOCX) exige pagamento confirmado **por CV** |
| Cartão bancário | Sempre desativado até existir integração oficial |

## Download pago de CVs

Com "Cobrar o download de CVs" ativo:

- as rotas `/api/cv/[id]/pdf` e `/api/cv/[id]/docx` devolvem **402** sem um pedido `PAID` de desbloqueio para esse CV;
- a interface mostra "Desbloquear download · 199 MT" (lista, pré-visualização e última etapa do assistente);
- o desbloqueio é por CV: uma cópia duplicada é um novo CV.

## Cartão bancário (futuro)

`CardPaymentProvider` fixa o contrato. Para ativar:

1. Escolher um gateway **oficial** que opere em MZN (banco local ou agregador); obter contrato, documentação e ambiente de testes.
2. Preferir página de pagamento alojada pelo gateway — esta aplicação nunca deve receber dados de cartão.
3. Implementar `createPayment` (sessão no gateway, `providerReference`), `getPaymentStatus` (consulta no servidor) e um webhook com assinatura verificada que chame `markPaymentSucceeded(..., source: "api")`.
4. Credenciais apenas em variáveis de ambiente (`CARD_*`).

## Integração futura por API (M-Pesa, e-Mola, mKesh)

Quando houver contrato de comerciante e documentação técnica **oficial** de cada operador, criar um
provider com `mode = "API"` que implemente a mesma interface; o checkout e a área de administração
continuam a funcionar sem alterações. Até lá, o pagamento manual é o único suportado.

| Operador | Necessário antes de integrar por API |
|---|---|
| M-Pesa (Vodacom) | Conta de comerciante, acesso ao portal oficial de programadores, credenciais de sandbox/produção, documentação oficial |
| e-Mola (Movitel) | Contrato de comerciante e documentação técnica oficial |
| mKesh (Tmcel) | Contrato de comerciante e documentação técnica oficial |

## Assinatura futura (Emprego Fácil Pro)

Sem cobrança recorrente até um fornecedor a suportar de forma fiável. Alternativa realista com
carteiras móveis: renovação manual mensal com lembrete por email/WhatsApp.

## Operação diária (administrador)

1. Abrir **Pagamentos pendentes** (o menu mostra quantos estão por verificar).
2. Para cada pedido, confirmar no extrato/app do operador: valor exato, código da transação, número de origem e data.
3. Se o código aparecer com alerta de repetido, investigar antes de confirmar.
4. Confirmar, rejeitar (com motivo) ou pedir novo comprovativo (com mensagem).
