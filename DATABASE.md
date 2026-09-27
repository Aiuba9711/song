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
| `CV` | Dados pessoais, resumo, `hiddenSections`, `referencesOnRequest`, `photoKey` (ficheiro privado, JPEG sem metadados), enquadramento `photoZoom`/`photoOffsetX`/`photoOffsetY`, `photoPosition`, `currentStep` do editor, `purchasedAt` (compra confirmada → modelo fixo), `objective` (objetivo profissional). |
| `CVExperience`, `CVEducation` | Datas em texto livre ("Mar 2022"), `isCurrent`, descrição com marcadores. `sortOrder`. |
| `CVSkill`, `CVLanguage`, `CVCourse`, `CVReference`, `CVCustomSection` | Listas ordenadas. `CVCourse.kind` = `COURSE` ou `CERTIFICATION`. |

`User.currentCvTemplateId` guarda o modelo atual escolhido na galeria. `User.aiConsentAt` regista o consentimento para enviar texto a um provedor de IA externo (`null` = sem consentimento; retirável no Perfil). O texto enviado à IA e as sugestões **não** são guardados; o `AuditLog` regista apenas `ai.request` com tarefa, provedor e resultado.

Guardar um CV substitui todas as listas numa transação (simples e consistente com o assistente).

### Foto Profissional

| Modelo | Descrição |
|---|---|
| `ProfessionalPhoto` | Fotografia do utilizador: `originalKey`, `resultKey`, `thumbKey` (armazenamento privado), `format` (`PASSE`, `CV`, `QUADRADA`, `PERSONALIZADA`), `width`/`height`, `settings` (JSON do editor, inclui a caixa do rosto na saída), `backgroundId`, `outfitId`, `styleLabel`, `purchasedAt`. |
| `PhotoBackground` | Fundo: `category` (`NEUTRO`, `CORPORATIVO`, `GRADIENTE`), `kind` (`SOLID`, `GRADIENT`, `PATTERN`, `IMAGE`), cores, `pattern`, `imageKey`, `passport` (recomendado para tipo passe), `isActive`, `sortOrder`. |
| `PhotoOutfit` | Roupa digital: `gender`, `garment` (`BLAZER`, `FATO`, `CAMISA`, `BLUSA`), `jacketColor`, `shirtColor`, `tieColor`, `tags` (estilos), `isActive`, `sortOrder`. |

`CV.professionalPhotoId` liga o CV à foto profissional usada (SetNull ao eliminar). `User.imageAiConsentAt`
fica reservado para o consentimento de envio de imagens a um serviço externo (nenhum configurado).
`OrderItem.photoId` + tipos `PHOTO_UNLOCK` / `CV_PHOTO_BUNDLE`; `Download.photoId` + `PHOTO_JPG` / `PHOTO_PNG`.
Preços em `PaymentSettings` (`photoPriceMinor`, `photoPromoPriceMinor`, `photoPromoEndsAt`, `photoBundlePriceMinor`).

### Loja

| Modelo | Descrição |
|---|---|
| `Product` | Kits. `priceMinor` (0 = gratuito), `compareAtPriceMinor`, `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`), `features[]`, `faq` (JSON), `tier`, `isFeatured`. Preços **editáveis no admin**. |
| `ProductFile` | Ficheiro entregue (chave privada no storage). |
| `Order` | `number` legível (`EF-AAAAMMDD-XXXX`), dados do cliente copiados, totais, estado (`PENDING`, `AWAITING_PAYMENT`, `PENDING_VERIFICATION`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`), `paidAt`, `cancelledAt`. |
| `OrderItem` | `kind` (`PRODUCT`, `CV_UNLOCK` ou `LETTER_UNLOCK`), `productId`, `cvId` ou `letterId`, cópia do nome e preço no momento da compra. |
| `Payment` | Tentativa de pagamento: `provider` (`FREE`, `MOCK`, `MPESA`, `EMOLA`, `MKESH`, `CARD`), `mode` (`MANUAL`/`API`), `status` (`PENDING`, `PENDING_VERIFICATION`, `RESUBMISSION_REQUESTED`, `SUCCEEDED`, `REJECTED`, `FAILED`, `CANCELLED`, `REFUNDED`). Manual: `payeeNumber` (cópia do número de destino), `payerName`, `payerPhone`, `transactionId`, `reportedPaidAt`, `proofKey`/`proofMime` (comprovativo privado), `submittedAt`, `reviewedAt`, `reviewedById`, `reviewNote`. API: `providerReference` (único por fornecedor). |
| `PaymentSettings` | Linha única: números e estado de M-Pesa/e-Mola/mKesh, titular, instruções, moeda, valor padrão do CV (199 MT no seed), `cvPaywallEnabled` (ligado por omissão), `letterPriceMinor` (preço do download de uma carta; 0 = gratuito), `cardEnabled` (sempre falso sem gateway). Editável no admin. |
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
| `CoverLetter` | Carta de candidatura (`CANDIDATURA`) ou de motivação (`MOTIVACAO`): dados (`senderName`, `senderContact`, `recipientName`, `company`, `position`, `education`, `experience`, `skills`, `motivation`, `city`), `subject` e `body` (texto final editado pelo utilizador), `purchasedAt` (quando a carta é paga). |
| `Document` | Documentos guardados (reservado). |
| `SiteSettings` | WhatsApp, email, telefone, horário, redes sociais; `whatsappCountryCode` (indicativo dos links «Abrir WhatsApp», 258) e `whatsappLinksEnabled` — editável em `/admin/definicoes`. |
| `AuditLog` | Eventos de autenticação e administração (autor, ação, entidade, metadados, IP em hash). |
| `RateLimitBucket` | Contadores de rate limiting partilhados entre instâncias. |

## Migrações

```bash
npx prisma migrate dev --name descricao   # desenvolvimento: cria e aplica
npx prisma migrate deploy                 # produção/CI: aplica pendentes
npx prisma studio                         # inspeção local
```

As migrações estão em `prisma/migrations/` (uma por fase: esquema inicial, pagamentos manuais,
biblioteca de CVs, IA, cartas, foto profissional, índices). Todas são **aditivas** (sem `DROP` de dados).
Em produção usar sempre `prisma migrate deploy` (nunca `migrate dev` nem `migrate reset`).

Verificar que o esquema e as migrações coincidem (sem «drift»), com uma base sombra vazia:

```bash
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script
# (requer datasource.shadowDatabaseUrl no prisma.config.ts) → deve imprimir «This is an empty migration.»
```

## Seed

`npm run db:seed` é idempotente e **não cria utilizadores**. Cria:

- 40 modelos de CV da biblioteca (`src/cv/catalog.ts`) — modelos já existentes não são alterados (edições do admin preservadas);
- Foto Profissional: 13 fundos e 26 roupas digitais (só quando as tabelas estão vazias);
- produtos: Modelo Gratuito (0 MT, com 2 ficheiros Word gerados), Kit Básico (199 MT), Kit Profissional (399 MT, destaque), Kit Premium (699 MT, rascunho);
- linha `SiteSettings`;
- linha `PaymentSettings` (números lidos de `SEED_*_NUMBER`, apenas na primeira criação; métodos ativos só se tiverem número).

Os valores iniciais são apenas dados — depois do seed, preços e conteúdos gerem-se no painel admin.

## Backups

- Ativar backups automáticos/PITR no fornecedor PostgreSQL (Neon, Supabase e Railway oferecem-no).
- Complemento semanal: `pg_dump --format=custom "$DATABASE_URL" > backup-$(date +%F).dump`, guardado num bucket separado e cifrado.
- Os ficheiros (S3/R2) devem ter versionamento ativo no bucket.
- Testar a reposição periodicamente (`pg_restore` para uma base temporária).
- Antes de cada deploy com migrações: fazer um backup (ou confirmar o PITR) e só depois `prisma migrate deploy`.
- Fotografias e comprovativos são dados pessoais: o bucket de backup também tem de ser privado e cifrado.
