# Base de dados — Emprego Fácil MZ

PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`). Fonte de verdade: [`prisma/schema.prisma`](./prisma/schema.prisma).

## Convenções

- **IDs**: `cuid()` (strings não sequenciais — não revelam volumes nem permitem adivinhar recursos).
- **Dinheiro**: inteiros em unidades mínimas (`priceMinor`, `totalMinor` — centavos) + `currency` ISO 4217 (`MZN` por omissão). Nunca `float`.
- **Datas**: UTC na BD; apresentadas em `Africa/Maputo`.
- **Emails**: sempre em minúsculas.
- **Segredos**: tokens de sessão e de recuperação guardados apenas como SHA-256; senhas com scrypt.
- **Eliminação**: dados pessoais apagados em cascata com o utilizador; pedidos mantidos (`userId → NULL`).

## Diagrama (resumo)

```
User ─1:1─ Profile
 │ ├─1:N─ Session, PasswordResetToken
 │ ├─1:N─ CV ─N:1─ CVTemplate
 │ │       └─1:N─ CVExperience, CVEducation, CVSkill, CVLanguage, CVCourse, CVReference, CVCustomSection
 │ ├─1:N─ CoverLetter, Document, Download
 │ ├─1:N─ Order ─1:N─ OrderItem ─N:1─ Product ─1:N─ ProductFile
 │ │        ├─1:N─ Payment
 │ │        ├─N:1─ Coupon ─N:M─ Product
 │ │        └─N:1─ Affiliate
 │ ├─1:1─ Affiliate
 │ ├─1:N─ BlogPost
 │ └─1:N─ AuditLog
SiteSettings (linha única "default") · Lead · RateLimitBucket
```

## Modelos

### Identidade

| Modelo | Descrição |
|---|---|
| `User` | Conta. `role` ∈ `USER`, `EDITOR`, `ADMIN`. `termsAcceptedAt` (consentimento), `marketingConsent`, `isActive`, `locale` (`pt-MZ`). |
| `Profile` | Profissão, localização, país (`MZ`), moeda preferida (`MZN`), WhatsApp. Pré-preenche novos CVs. |
| `Session` | Sessão de 30 dias. `tokenHash` = SHA-256 do cookie. `ipHash` pseudonimizado. |
| `PasswordResetToken` | Token de 1 hora, uso único (`usedAt`), em hash. |

### Currículos

| Modelo | Descrição |
|---|---|
| `CVTemplate` | Modelo da biblioteca: `slug`, `name`, `description`, `category` (22 áreas), `style`, `accentColor`, `design` (JSON `TemplateDesign`), `isAtsFriendly` (calculado do design), `priceMinor` (opcional; vazio = valor padrão de `PaymentSettings`), `previewImageUrl`/`previewImageKey`, `sortOrder`, `isActive`, `isPremium`. `layout` fica como família de base (compatibilidade). |
| `CV` | Dados pessoais, resumo, `hiddenSections`, `referencesOnRequest`, `photoKey` (ficheiro privado, JPEG sem metadados), enquadramento `photoZoom`/`photoOffsetX`/`photoOffsetY`, `photoPosition`, `currentStep` do editor, `purchasedAt` (compra confirmada → modelo fixo). |
| `CVExperience`, `CVEducation` | Datas em texto livre ("Mar 2022"), `isCurrent`, descrição com marcadores. `sortOrder`. |
| `CVSkill`, `CVLanguage`, `CVCourse`, `CVReference`, `CVCustomSection` | Listas ordenadas. `CVCourse.kind` = `COURSE` ou `CERTIFICATION`. |

`User.currentCvTemplateId` guarda o modelo atual escolhido na galeria.

Guardar um CV substitui todas as listas numa transação (simples e consistente com o assistente).

### Loja

| Modelo | Descrição |
|---|---|
| `Product` | Kits. `priceMinor` (0 = gratuito), `compareAtPriceMinor`, `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `features[]`, `faq` (JSON), `tier`, `isFeatured`. Preços **editáveis no admin**. |
| `ProductFile` | Ficheiro entregue (chave privada no storage). |
| `Order` | `number` legível (`EF-AAAAMMDD-XXXX`), dados do cliente copiados, totais, estado (`PENDING`, `AWAITING_PAYMENT`, `PENDING_VERIFICATION`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`), `paidAt`, `cancelledAt`. |
| `OrderItem` | `kind` (`PRODUCT` ou `CV_UNLOCK`), `productId` ou `cvId`, cópia do nome e preço no momento da compra. |
| `Payment` | Tentativa de pagamento: `provider` (`FREE`, `MOCK`, `MPESA`, `EMOLA`, `MKESH`, `CARD`), `mode` (`MANUAL`/`API`), `status` (`PENDING`, `PENDING_VERIFICATION`, `RESUBMISSION_REQUESTED`, `SUCCEEDED`, `REJECTED`, `FAILED`, `CANCELLED`, `REFUNDED`). Manual: `payeeNumber` (cópia do número de destino), `payerName`, `payerPhone`, `transactionId`, `reportedPaidAt`, `proofKey`/`proofMime` (comprovativo privado), `submittedAt`, `reviewedAt`, `reviewedById`, `reviewNote`. API: `providerReference` (único por fornecedor). |
| `PaymentSettings` | Linha única: números e estado de M-Pesa/e-Mola/mKesh, titular, instruções, moeda, valor padrão do CV (199 MT no seed), `cvPaywallEnabled` (ligado por omissão), `cardEnabled` (sempre falso sem gateway). Editável no admin. |
| `Coupon` | Percentagem **ou** valor fixo, validade, limite de utilizações, produtos aplicáveis (vazio = todos). *(Fase 2)* |
| `Download` | Histórico (CV PDF/DOCX, ficheiros de produto). |

O acesso a um produto (ou ao download de um CV, quando pago) é derivado de `OrderItem` com
`Order.status = PAID` e `Order.userId` do utilizador. Só um administrador (ou, no futuro, uma API
oficial) muda um pedido para `PAID` — ver PAYMENTS.md.

### Crescimento e conteúdo

| Modelo | Descrição |
|---|---|
| `Affiliate` | Código `?ref=`, cliques, comissão %, saldo. *(Fase 3 — pagamentos a afiliados fora do MVP)* |
| `Lead` | Contactos recolhidos com consentimento (ex.: modelo gratuito sem conta). *(Fase 3)* |
| `BlogPost` | Artigos "Conselho de Carreira" em Markdown, SEO. *(Fase 3)* |
| `CoverLetter`, `Document` | Cartas e documentos guardados. *(Fase 2)* |
| `SiteSettings` | WhatsApp, email, telefone, horário, redes sociais — editável em `/admin/definicoes`. |
| `AuditLog` | Eventos de autenticação e administração (autor, ação, entidade, metadados, IP em hash). |
| `RateLimitBucket` | Contadores de rate limiting partilhados entre instâncias. |

## Migrações

```bash
npx prisma migrate dev --name descricao   # desenvolvimento: cria e aplica
npx prisma migrate deploy                 # produção/CI: aplica pendentes
npx prisma studio                         # inspeção local
```

O esquema completo (todas as fases) foi criado na migração inicial para evitar migrações destrutivas
mais tarde; as funcionalidades são ativadas por fases.

## Seed

`npm run db:seed` é idempotente e **não cria utilizadores**. Cria:

- 10 modelos de CV (Primeiro emprego, Administrativo, Contabilidade, RH, Saúde, Educação, Informática, Engenharia, Vendas/Marketing, Executivo);
- produtos: Modelo Gratuito (0 MT, com 2 ficheiros Word gerados), Kit Básico (199 MT), Kit Profissional (399 MT, destaque), Kit Premium (699 MT, rascunho);
- linha `SiteSettings`;
- linha `PaymentSettings` (números lidos de `SEED_*_NUMBER`, apenas na primeira criação; métodos ativos só se tiverem número).

Os valores iniciais são apenas dados — depois do seed, preços e conteúdos gerem-se no painel admin.

## Backups

- Ativar backups automáticos/PITR no fornecedor PostgreSQL (Neon, Supabase e Railway oferecem-no).
- Complemento semanal: `pg_dump --format=custom "$DATABASE_URL" > backup-$(date +%F).dump`, guardado num bucket separado e cifrado.
- Os ficheiros (S3/R2) devem ter versionamento ativo no bucket.
- Testar a reposição periodicamente (`pg_restore` para uma base temporária).
