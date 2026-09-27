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
| Modelos de CV | Biblioteca de 40 modelos originais (22 áreas, 17 estilos) num motor de design declarativo; admin completo | 1 ✅ |
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
- A IA apenas corrige, reorganiza, reduz e melhora texto fornecido pelo utilizador, com aviso
  "Revise o conteúdo antes de utilizar. A IA não deve substituir informações verdadeiras sobre a sua experiência."

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
        ├─ src/cv/* ........ modelo de dados do CV + motor de design (HTML, PDF, DOCX)
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
4. **Um motor de design para os 3 formatos**: cada modelo é um `TemplateDesign` declarativo
   (`src/cv/design.ts`: estrutura, cabeçalho, títulos, tipografia, cor, densidade, entradas,
   competências, forma/posição da foto…). `planDocument` (`src/cv/plan.ts`) decide o conteúdo e a
   ordem; três renderizadores (HTML `src/cv/preview`, PDF `src/cv/pdf`, DOCX `src/cv/docx`) desenham
   o mesmo plano com as mesmas medidas (pt) — a pré-visualização corresponde ao documento final.
   Os testes verificam, para cada um dos modelos, que nenhum campo desaparece em nenhum formato.
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
│  │  ├─ design.ts, plan.ts    # motor de design (TemplateDesign → plano do documento)
│  │  ├─ catalog.ts            # os 40 modelos originais (seed)
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
| IA | `AIProvider` com `AnthropicProvider` (SDK oficial) e `MockAiProvider` (demonstração) | `ANTHROPIC_API_KEY` + `AI_MODEL` no ambiente |

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


## Biblioteca de CVs

**Fluxo.** «Criar meu CV» → `/cv-modelos` (galeria pública, filtros por área/ATS/com-sem foto) →
«Usar este modelo» (`chooseTemplateAction`; sem sessão → registo e volta) → editor
`/meu-espaco/cvs/[id]/editar`. A conta guarda `currentCvTemplateId`. Com o CV pago ativo existe no
máximo **um CV por comprar** (`DRAFT_EXISTS`): escolher outro modelo troca o modelo desse CV (os dados
mantêm-se). Após a compra (`CV.purchasedAt`) o modelo fica fixo e pode começar-se outro CV.

**Editor.** Formulário à esquerda e pré-visualização HTML em tempo real à direita (`lg+`); no
telemóvel o formulário vem primeiro e a pré-visualização logo abaixo. Barra: SALVAR, PRÉ-VISUALIZAR
(ecrã inteiro + PDF `/api/cv/[id]/preview`), COMPRAR CV — preço do modelo. Antes da compra a
pré-visualização (HTML e PDF) tem marca d'água discreta; depois há PDF limpo e DOCX editável.

**Fotografia.** No telemóvel é reduzida (≤1400 px) e comprimida antes do envio; no servidor
(`src/lib/photo.ts`, sharp) é validada, rodada pelo EXIF, **sem metadados**, ≤1200 px, JPEG. O
enquadramento (zoom, deslocação X/Y) usa a mesma fórmula (`src/lib/photo-framing.ts`) no editor (CSS)
e no servidor (recorte 600 px para PDF; PNG com máscara circular/arredondada para o Word).

**Imagens da galeria.** `npm run templates:previews` gera `public/templates/<slug>.jpg` e
`<slug>-sem-foto.jpg` (400 px, ~20 KB) com o próprio motor, dados fictícios e uma silhueta; o admin
pode carregar uma imagem própria (`/api/templates/[id]/preview`). Sem imagem, a galeria desenha o
modelo ao vivo.

**Selo ATS.** `isAtsCompatible(design)`: uma coluna, cabeçalho simples, títulos em texto, entradas
clássicas, competências em lista/linha, sem tabelas nem etiquetas. Calculado — não é escolha manual.

## Assistente de IA

```
editor (cliente)                  servidor                                        provedor
«✨ Melhorar com IA» ──► aiAssistAction ──► runAiTask ─┬─ valida (zod, limites, vazio)
  (texto do campo,                                     ├─ consentimento (provedor externo)
   contexto mínimo,                                    ├─ rate limit (40/h)
   vaga opcional)                                      ├─ redact(): emails/telefones/links → ⟦TEL1⟧…
                                                       ├─ buildPrompt(): regras fixas + <blocos> ──► AIProvider.complete()
                                                       └─ checkResult(): esquema + anti-invenção ◄── JSON (ferramenta «responder»)
«Aplicar sugestão» ◄── sugestão (nada é gravado) ◄──────┘
```

- **`AIProvider`** (`src/lib/ai/provider.ts`): `complete({ request, prompt, signal })`. Implementações:
  `AnthropicProvider` (SDK oficial `@anthropic-ai/sdk`, resposta forçada por ferramenta com esquema JSON)
  e `MockAiProvider` (regras locais, para demonstração e testes). Escolha por `AI_PROVIDER` no `.env`;
  sem configuração → «Assistente de IA temporariamente indisponível.» e o resto do editor funciona.
- **Tarefas**: `rewrite` (resumo, objetivo, descrição de funções; modos melhorar / corrigir português /
  reduzir / mais objetivo; adaptar à vaga), `suggest_skills` (cada sugestão com citação do CV),
  `analyze_job` (cargo, competências, requisitos, palavras-chave, experiência pedida, conselhos com
  citação do CV; correspondência vaga ↔ CV calculada localmente).
- **Anti-invenção** (`src/lib/ai/guard.ts`), igual para qualquer provedor: a sugestão é rejeitada se
  tiver números, nomes próprios, siglas, emails ou links que não estejam no texto do utilizador (a
  descrição da vaga **não** conta como prova); competências e conselhos precisam de uma citação real
  do CV; itens «da vaga» têm de estar na vaga.
- **Anti-injeção**: instruções fixas no servidor; o texto do utilizador e a vaga vão em blocos
  delimitados que não podem ser fechados (`<`/`>` neutralizados) e são declarados como dados; a
  verificação da resposta apanha o que um provedor «enganado» devolva.
- **Sem alterações automáticas**: a ação devolve só a sugestão; o CV muda apenas quando o utilizador
  clica «Aplicar sugestão» (e depois guarda). A descrição da vaga fica só no `sessionStorage`.

## Documentos de candidatura

- **Cartas** (`src/letters/`): `generateLetter()` monta assunto e corpo por regras, só com os dados do
  utilizador e as fórmulas de cortesia habituais (campos vazios não aparecem). `letterLayout()` é a
  estrutura única usada pela pré-visualização HTML, pelo PDF (`@react-pdf/renderer`, texto convertido
  para WinAnsi por `toWinAnsi`) e pelo DOCX (`docx`), e por «Copiar carta» (`letterPlainText`).
  Páginas: `/meu-espaco/cartas` e `/meu-espaco/cartas/[id]/editar`; downloads em `/api/cartas/[id]/{pdf,docx}`.
- **Email e WhatsApp** (`src/letters/messages.ts`): modelos por categoria; o texto acompanha os dados
  até o utilizador o editar («Repor texto do modelo» volta ao modelo). Página `/meu-espaco/mensagens`.
- **Links WhatsApp** (`src/lib/whatsapp.ts`): base fixa `https://wa.me/`, número reduzido a dígitos e
  validado (8–15 dígitos, indicativo do admin quando falta), texto limpo e codificado.
- **IA**: os mesmos `AiImprove`/`runAiTask` do CV, com os campos `letter_body`, `email_body` e
  `whatsapp_message`; os dados do formulário vão em `context.facts` e são a única prova aceite.

## Foto Profissional

Detalhes em [PHOTO_MODULE.md](./PHOTO_MODULE.md). Resumo:

- `src/photo/`: funções puras (geometria, ajustes de píxeis, máscara de fundo liso, roupa em SVG) e o
  editor por etapas, que desenha em `<canvas>` no navegador. O servidor valida e volta a codificar o
  resultado (`src/server/photos.ts`).
- `src/lib/image-editing/`: `BackgroundRemovalProvider`, `ClothingProvider`, `ImageEditingProvider`;
  hoje só a implementação local (sharp, sem IA). Serviços externos: nenhum implementado; estado
  visível no admin; `APP_ENV` separa DEV / STAGING / PRODUCTION.
- Páginas: `/meu-espaco/fotos`, `/nova`, `/[id]`, `/[id]/editar`; imagens privadas em `/api/fotos/[id]`;
  admin em `/admin/foto` (processadores, fundos, roupas, preços).
- Compra pelo checkout existente (`PHOTO_UNLOCK`, `CV_PHOTO_BUNDLE`).
