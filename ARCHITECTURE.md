# Arquitetura — Emprego Fácil MZ

> "O teu próximo emprego começa com uma boa candidatura."

Este documento regista a análise de requisitos, a arquitetura escolhida, a estrutura de pastas,
as dependências, as integrações externas e o plano de implementação por fases.
Ver também: [DATABASE.md](./DATABASE.md), [PAYMENTS.md](./PAYMENTS.md), [SECURITY.md](./SECURITY.md).

---

## 1. Análise de requisitos

### 1.1 Requisitos funcionais (resumo por domínio)

| Domínio | Requisitos | Fase |
|---|---|---|
| Marketing | Landing page (hero, problema, solução, CTA), páginas legais, contactos | 1 |
| Catálogo | Lista de modelos de CV, catálogo de kits, página de produto | 1 |
| Autenticação | Registo email+senha, login, logout, recuperação de senha, sessão segura | 1 |
| Meu Espaço | Meus CVs, documentos, kits, downloads, compras, perfil, eliminação de conta | 1 |
| Gerador de CV | Formulário em 10 etapas, guardar, voltar, editar, duplicar, trocar modelo, pré-visualizar | 1 |
| Modelos de CV | 3 layouts base (Fase 1) com variantes por profissão; ativar/desativar/categorizar | 1 (+3) |
| Exportação | PDF (envio por email/portais) e DOCX editável | 1 |
| Admin | Dashboard, produtos, preços, ficheiros, modelos, utilizadores, pedidos, definições | 1 (básico) |
| Cartas | Carta de candidatura e de motivação, PDF e DOCX | 2 |
| Emails / WhatsApp | Modelos personalizáveis com "Copiar mensagem" | 2 |
| Loja | Kits digitais, checkout, pagamentos (M-Pesa, e-Mola, mKesh, cartão), pedidos, cupões | 2 |
| Entrega digital | Confirmação, "Aceder ao meu kit", email com links temporários | 2 |
| Entrevista | Perguntas por categoria com orientação (sem incentivar mentiras) | 2/3 |
| Conteúdo | Blog "Conselho de Carreira", páginas SEO, landing /kit-emprego | 3 |
| Marketing | Analytics (GA, Meta Pixel) com consentimento, afiliados, captação de leads | 3 |
| IA | Assistente de CV que nunca inventa informação | 4 |
| Assinatura | "Emprego Fácil Pro" (cobrança recorrente só quando os pagamentos o suportarem) | 4 |
| Android | Empacotamento da PWA (TWA) | 5 |

### 1.2 Requisitos não funcionais

- **Mobile first**: Android de gama baixa/média, botões grandes (≥ 44px), formulários curtos, navegação inferior no Meu Espaço.
- **Internet limitada**: páginas públicas pré-renderizadas (estáticas/ISR), sem fontes web externas (stack de fontes do sistema), ícones SVG inline, imagens pequenas, JS mínimo no cliente (Server Components por omissão), service worker com cache.
- **PWA**: manifest, service worker, ícones, instalação, página offline.
- **Segurança e privacidade**: CVs nunca públicos, sessões com cookie `HttpOnly`, hash de senha `scrypt`, validação `zod` em todas as entradas, rate limiting, autorização por papel, cabeçalhos de segurança, logs de auditoria, eliminação de conta.
- **Acessibilidade**: labels em todos os campos, foco visível, contraste AA, `aria-live` para mensagens, navegação por teclado.
- **Internacionalização**: `pt-MZ` inicial; arquitetura preparada para `pt-PT`, `pt-BR`, `en`.
- **Moeda**: valores guardados em unidades mínimas (centavos) + código ISO 4217; formatação `399 MT`; preparado para MZN, ZAR, USD, BRL, EUR.
- **Custos baixos**: Vercel (ou equivalente) + PostgreSQL gerido (Neon/Supabase/Railway) + armazenamento S3-compatível (Cloudflare R2, Backblaze B2…).
- **Manutenção**: TypeScript estrito, módulos por domínio, poucas dependências, testes automatizados.

### 1.3 Regras de conteúdo

- Nunca inventar dados do utilizador; nunca prometer emprego.
- A IA (futura) apenas reorganiza/melhora texto fornecido pelo utilizador, com aviso
  "Revise todas as informações antes de enviar a candidatura."

---

## 2. Stack tecnológica (e porquê)

| Camada | Escolha | Razão |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19** | SSR/SSG/ISR para páginas leves e indexáveis, Server Components (menos JS no telemóvel), Server Actions para mutações com proteção de origem integrada, rotas API no mesmo projeto. |
| Linguagem | **TypeScript** (strict) | Segurança de tipos ponta a ponta com Prisma e zod. |
| Estilos | **Tailwind CSS 4** | CSS gerado apenas com as classes usadas (bundle pequeno), tokens de design em `@theme`. |
| Base de dados | **PostgreSQL** | Relacional, barato em serviços geridos, adequado a pedidos/pagamentos. |
| ORM | **Prisma 7** (driver adapter `pg`) | Migrações versionadas, tipos gerados, sem motor Rust em runtime (query compiler). |
| Validação | **zod 4** | Validação partilhada entre formulários e servidor. |
| Autenticação | **Implementação própria** (sessões em BD + `scrypt` do Node) | Sem dependências extra; controlo total sobre cookies, expiração e revogação; login por telefone fácil de adicionar. Ver SECURITY.md. |
| PDF | **@react-pdf/renderer** | Gera PDF no servidor sem browser headless (funciona em serverless), texto selecionável, fontes padrão com acentos portugueses. |
| DOCX | **docx** | Documento Word nativo e editável (títulos, estilos, margens, tabulações). |
| Ícones | **lucide-react** | SVG, tree-shaking — apenas os ícones usados entram no bundle. |
| Testes | **Vitest** (unit/integração) + **Playwright** (e2e, incluindo viewport móvel) | Rápidos e standard. |
| Armazenamento | Abstração `StorageProvider` → `local` (dev) / `s3` (produção) | S3-compatível é barato e portável. |
| Email | Abstração `EmailProvider` → `console` (dev) / `resend` (API HTTP) | Sem SDK; pode trocar por SMTP. |
| Pagamentos | Abstração `PaymentProvider`: pagamento manual verificado pelo admin; APIs oficiais no futuro | Ver PAYMENTS.md. |

**Não usado de propósito**: next-auth (desnecessário para email+senha), next-pwa (service worker
escrito à mão é mais pequeno e previsível), fontes Google (poupança de dados), bibliotecas de UI
pesadas.

---

## 3. Arquitetura

```
 Browser / PWA (Android, iPhone, desktop)
   │  HTML pré-renderizado + JS mínimo; service worker (cache estático + página offline)
   ▼
 Next.js (Vercel)
   ├─ proxy.ts ............ redireciona rotas privadas sem cookie de sessão (verificação rápida)
   ├─ app/(marketing) ..... páginas públicas estáticas/ISR (landing, modelos, kits, legais)
   ├─ app/(auth) .......... entrar, registar, recuperar/redefinir senha
   ├─ app/meu-espaco ...... área privada (sessão validada no servidor em cada pedido)
   ├─ app/admin ........... painel (papéis ADMIN / EDITOR)
   ├─ app/api ............. downloads de CV (PDF/DOCX), fotos, ficheiros de produtos
   └─ Server Actions ...... mutações (validação zod + autorização + auditoria)
        │
        ├─ src/server/* .... serviços de domínio (cv, produtos, pedidos, utilizadores, definições)
        ├─ src/cv/* ........ modelo de dados do CV + renderizadores (HTML, PDF, DOCX) por layout
        ├─ src/lib/* ....... auth, segurança, dinheiro, i18n, storage, email, auditoria
        ▼
 PostgreSQL (Prisma)      Armazenamento S3 (ficheiros de kits, fotos)      Email (Resend)
```

Princípios:

1. **Server-first**: dados lidos em Server Components; o cliente só recebe JS onde há interação
   (gerador de CV, formulários).
2. **Autorização no servidor, sempre**: o `proxy.ts` é só conveniência; cada página/ação/rota
   verifica sessão e papel (`requireUser`, `requireRole`) e a posse do recurso (`cv.userId === user.id`).
3. **Domínio isolado da UI**: `src/server/*` não conhece React; é testado diretamente contra a BD de teste.
4. **Renderização de CV por layout**: cada layout implementa `Preview` (HTML), `renderPdf` e
   `renderDocx` a partir do mesmo `CvData` normalizado — garante consistência entre pré-visualização,
   PDF e Word.
5. **Integrações por interfaces** (`StorageProvider`, `EmailProvider`, `PaymentProvider`, futuro
   `AiProvider`), escolhidas por variáveis de ambiente. Integrações não disponíveis ficam como mocks
   **claramente identificados**.
6. **Configuração sem hardcode**: preços, número de WhatsApp e redes sociais vivem na BD
   (`Product`, `SiteSettings`) e são editáveis no admin; segredos em variáveis de ambiente.

### Estratégia de cache/desempenho

- Páginas públicas: `revalidate` (ISR) + `revalidatePath`/`revalidateTag` quando o admin altera dados.
- Definições do site: `unstable_cache` com tag `site-settings`.
- Área privada e admin: dinâmicas (dependem de cookies), nunca em cache partilhada.
- Service worker: *cache-first* para assets estáticos versionados (`/_next/static`, ícones),
  *network-first* para navegação com fallback `/offline`; nunca guarda respostas de `/api`,
  `/meu-espaco` ou `/admin` (dados pessoais).

---

## 4. Estrutura de pastas

```
.
├─ prisma/
│  ├─ schema.prisma            # esquema completo (todas as fases)
│  ├─ migrations/              # migrações versionadas
│  └─ seed.ts                  # modelos de CV, produtos, definições (sem utilizadores)
├─ prisma.config.ts
├─ public/
│  ├─ icons/                   # ícones PWA (192, 512, maskable, apple-touch)
│  ├─ og.png                   # imagem Open Graph / redes sociais
│  ├─ logo.svg, avatar.svg, favicon.svg
│  └─ sw.js                    # service worker
├─ scripts/
│  ├─ create-admin.ts          # cria/promove administrador a partir de env vars
│  └─ generate-brand-assets.ts # gera PNGs a partir dos SVG (Chromium)
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/          # landing, cv-modelos, kits, contactos, privacidade, termos
│  │  ├─ (auth)/               # entrar, registar, recuperar-senha, redefinir-senha
│  │  ├─ meu-espaco/           # área do utilizador (CVs, kits, downloads, compras, perfil)
│  │  ├─ admin/                # painel administrativo
│  │  ├─ api/                  # rotas de download (PDF, DOCX, ficheiros, fotos)
│  │  ├─ offline/              # página offline da PWA
│  │  ├─ layout.tsx, globals.css, manifest.ts, robots.ts, sitemap.ts
│  ├─ components/
│  │  ├─ ui/                   # Button, Field, Card, Alert, EmptyState, …
│  │  ├─ layout/               # Header, Footer, BottomNav, WhatsAppButton, Logo
│  │  └─ marketing/            # secções da landing
│  ├─ cv/
│  │  ├─ types.ts, schema.ts   # CvData + validação
│  │  ├─ layouts/              # registo de layouts (classico, moderno, executivo)
│  │  ├─ preview/              # componentes HTML de pré-visualização
│  │  ├─ pdf/                  # documentos @react-pdf
│  │  ├─ docx/                 # geradores docx
│  │  └─ builder/              # wizard (client components)
│  ├─ server/                  # serviços de domínio (server-only)
│  │  ├─ cv.ts, products.ts, orders.ts, users.ts, settings.ts, stats.ts
│  └─ lib/
│     ├─ db.ts, env.ts, audit.ts, money.ts, utils.ts
│     ├─ auth/                 # password, session, guards, tokens
│     ├─ security/             # rate-limit, request (IP/origem), headers
│     ├─ storage/              # StorageProvider (local, s3)
│     ├─ email/                # EmailProvider (console, resend) + modelos de email
│     └─ i18n/                 # locales, dicionários, formatação
├─ tests/
│  ├─ unit/                    # funções puras (dinheiro, validação, password, PDF, DOCX)
│  ├─ integration/             # serviços contra PostgreSQL de teste
│  └─ e2e/                     # Playwright (desktop + Android)
├─ README.md, ARCHITECTURE.md, DATABASE.md, PAYMENTS.md, SECURITY.md
└─ .env.example
```

---

## 5. Esquema da base de dados

Resumo (detalhe completo em [DATABASE.md](./DATABASE.md) e `prisma/schema.prisma`):

- **Identidade**: `User` (papel USER/EDITOR/ADMIN), `Profile`, `Session`, `PasswordResetToken`
- **CV**: `CVTemplate`, `CV`, `CVExperience`, `CVEducation`, `CVSkill`, `CVLanguage`, `CVCourse`,
  `CVReference`, `CVCustomSection`
- **Documentos**: `CoverLetter`, `Document`
- **Loja**: `Product`, `ProductFile`, `Order`, `OrderItem`, `Payment`, `Coupon`, `Download`
- **Crescimento**: `Affiliate`, `Lead`
- **Conteúdo/configuração**: `BlogPost`, `SiteSettings`, `AuditLog`

O esquema é criado completo desde o início (migração inicial) para evitar migrações destrutivas
depois; as funcionalidades são ativadas por fases.

---

## 6. Dependências

**Runtime**: `next`, `react`, `react-dom`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `zod`,
`@react-pdf/renderer`, `docx`, `lucide-react`, `server-only`.
Opcional em produção: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (só se `STORAGE_DRIVER=s3`).

**Desenvolvimento**: `prisma`, `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`,
`eslint-config-next`, `vitest`, `@playwright/test`, `tsx`, `dotenv`.

---

## 7. Integrações externas

| Integração | Estado | O que falta |
|---|---|---|
| PostgreSQL gerido | Pronto (qualquer Postgres ≥ 14) | Criar instância e definir `DATABASE_URL` |
| Armazenamento S3 | Implementado (`STORAGE_DRIVER=s3`) | Bucket + credenciais |
| Email (Resend) | Implementado via API HTTP | Conta, domínio verificado, `RESEND_API_KEY` |
| M-Pesa (Vodacom) | **Pagamento manual** (número configurado no admin) · API por integrar | Contrato e documentação oficial para a integração por API |
| e-Mola (Movitel) | **Pagamento manual** · API por integrar | Contrato e documentação técnica oficial |
| mKesh (Tmcel) | **Pagamento manual** · API por integrar | Contrato e documentação técnica oficial |
| Cartão bancário | Placeholder (`CardPaymentProvider`) | Escolha de gateway oficial em MZN |
| Google Analytics / Meta Pixel | **Fase 3** | IDs de medição + banner de consentimento |
| IA | **Fase 4** | Fornecedor de modelo + chave de API |

Nenhuma API de pagamento foi inventada: a interface `PaymentProvider` tem hoje o
`ManualMobileMoneyProvider` (transferência para números configurados no admin, confirmada por um
administrador) e o `CardPaymentProvider` (placeholder indisponível). Ver PAYMENTS.md.

---

## 8. Plano de implementação

### Fase 1 — MVP (este entregável)
1. Configuração do projeto, esquema da BD e migração inicial, seed.
2. Autenticação (registo, login, logout, recuperação de senha), papéis e proteção de rotas.
3. UI base + landing + catálogo de modelos + catálogo/página de produto + páginas legais + PWA.
4. Gerador de CV em 10 etapas, 3 layouts (com variantes por profissão), pré-visualização.
5. Geração de PDF e DOCX.
6. Meu Espaço: CVs (criar/editar/duplicar/eliminar), kits, downloads, compras, perfil, eliminar conta.
7. Produto gratuito ("1 modelo de CV + 1 carta") obtido sem pagamento → prova o fluxo pedido → entrega.
8. Painel admin básico: dashboard, produtos/preços/ficheiros, modelos, utilizadores, pedidos, definições.
9. Testes unitários, de integração e e2e (desktop + móvel); documentação.

### Fase 2
- ✅ Checkout mobile-first, `PaymentProvider` com `ManualMobileMoneyProvider` (M-Pesa, e-Mola, mKesh
  verificados por um administrador), `CardPaymentProvider` (placeholder), configuração central de
  pagamentos, pagamentos pendentes no admin, download pago de CVs (opcional), emails de estado.
- ⏳ Integração por API com operadores (quando houver documentação oficial), cartas
  (candidatura/motivação), modelos de email e WhatsApp, cupões.

### Fase 3
Mais modelos (10+ layouts), blog, páginas SEO (`/cv-primeiro-emprego`, …, `/kit-emprego`),
analytics com consentimento, afiliados (`?ref=`), captação de leads.

### Fase 4
Assistente de IA (sem inventar dados), personalização avançada de CV, assinatura, marketplace.

### Fase 5
App Android (Trusted Web Activity a partir da PWA).
