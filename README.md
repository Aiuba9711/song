# Emprego Fácil MZ 🇲🇿

> **"O teu próximo emprego começa com uma boa candidatura."**

Plataforma web (PWA) para quem procura emprego em Moçambique: criação de CVs profissionais em
PDF e Word, modelos por profissão, kits digitais de candidatura e painel administrativo.
Pensada para smartphones Android e internet limitada.

- Arquitetura e plano por fases: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Base de dados: [DATABASE.md](./DATABASE.md)
- Pagamentos (Fase 2): [PAYMENTS.md](./PAYMENTS.md)
- Segurança e privacidade: [SECURITY.md](./SECURITY.md)

---

## Estado atual — Fase 1 (MVP) ✅ · Fase 2: pagamentos manuais ✅

| Funcionalidade | Estado |
|---|---|
| Landing page, catálogo de modelos, catálogo de kits, página de produto | ✅ |
| Conselhos de carreira, contactos, política de privacidade, termos | ✅ |
| Registo, login, logout, recuperação de senha, sessões seguras | ✅ |
| Meu Espaço: CVs, kits, downloads, compras, perfil, eliminar conta | ✅ |
| Gerador de CV em 10 etapas (guardar, voltar, editar, duplicar, trocar modelo, pré-visualizar) | ✅ |
| 3 layouts (Clássico, Moderno, Executivo) × 10 modelos por profissão | ✅ |
| Download em PDF e Word (DOCX editável) | ✅ |
| Modelo gratuito (CV + carta em Word) com fluxo pedido → entrega | ✅ |
| Painel admin: dashboard, produtos/preços/ficheiros, modelos, utilizadores, pedidos, definições, auditoria | ✅ |
| PWA (manifest, service worker, offline, instalação), SEO básico, botão WhatsApp configurável | ✅ |
| Checkout mobile-first com pagamento **manual** M-Pesa / e-Mola / mKesh (`/checkout`, `/pending`, `/success`, `/failed`) | ✅ |
| Admin: Definições → Pagamentos (números, instruções, moeda, valor padrão, métodos ativos) | ✅ |
| Admin: Pagamentos pendentes (confirmar, rejeitar, pedir novo comprovativo) com auditoria | ✅ |
| Download pago de CVs (opcional, desligado por omissão) | ✅ |
| Cartão bancário | ⏳ placeholder — requer gateway oficial |
| Integração por API com operadores, cartas, modelos de email/WhatsApp, cupões | ⏳ Fase 2 (restante) |

O pagamento é manual: o cliente transfere para o número configurado no admin e informa a
transação; **só um administrador pode confirmar** e só então o produto é libertado.
Detalhes em [PAYMENTS.md](./PAYMENTS.md).

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 7 ·
zod · @react-pdf/renderer (PDF) · docx (Word) · Vitest · Playwright.
Justificação das escolhas em [ARCHITECTURE.md](./ARCHITECTURE.md#2-stack-tecnológica-e-porquê).

## Requisitos

- Node.js ≥ 20.9 (recomendado 22)
- PostgreSQL ≥ 14
- npm

## Instalação (desenvolvimento)

```bash
npm install                      # instala dependências e gera o Prisma Client
cp .env.example .env             # configurar DATABASE_URL e APP_SECRET
npx prisma migrate dev           # cria as tabelas
npm run db:seed                  # modelos de CV, produtos, kit gratuito, definições
ADMIN_EMAIL=admin@exemplo.com ADMIN_PASSWORD='uma-senha-longa-e-segura' npm run admin:create
npm run dev                      # http://localhost:3000
```

Gerar um `APP_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Em desenvolvimento os emails (boas-vindas, recuperação de senha) aparecem no terminal
(`EMAIL_DRIVER=console`) e os ficheiros ficam em `./storage` (`STORAGE_DRIVER=local`).

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](./.env.example). Resumo:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `APP_URL` | sim | URL pública (links de email, sitemap, Open Graph) |
| `DATABASE_URL` | sim | Ligação PostgreSQL |
| `APP_SECRET` | sim | ≥ 32 caracteres aleatórios (hash de IPs, links assinados) |
| `STORAGE_DRIVER` | não | `local` (dev) ou `s3` (produção) |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | se `s3` | Armazenamento compatível com S3 (AWS, Cloudflare R2, Backblaze B2, MinIO) |
| `EMAIL_DRIVER` | não | `console` (dev) ou `resend` |
| `EMAIL_FROM`, `RESEND_API_KEY` | se `resend` | Envio de emails |
| `RATE_LIMIT_SCALE` | não | Multiplicador de limites (manter `1` em produção) |
| `SEED_MPESA_NUMBER`, `SEED_EMOLA_NUMBER`, `SEED_MKESH_NUMBER` | não | Só usados pelo seed para criar a configuração de pagamentos inicial |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | só no `admin:create` | Remover do ambiente depois de criar a conta |

Preços, números de pagamento, número de WhatsApp e redes sociais **não** estão no código:
são geridos no painel `/admin` (os `SEED_*` servem apenas para a configuração inicial).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Testes unitários e de integração (Vitest, PostgreSQL de teste) |
| `npm run test:e2e` | Testes end-to-end (Playwright, desktop + Android) |
| `npm run db:migrate` / `npm run db:deploy` | Migrações (dev / produção) |
| `npm run db:seed` | Dados iniciais (idempotente) |
| `npm run admin:create` | Cria ou promove o administrador principal |
| `npx tsx scripts/generate-brand-assets.ts` | Regenera ícones PWA, favicon e imagem Open Graph |

## Testes

Os testes de integração e e2e usam uma base de dados **separada** (o nome tem de conter `test`).

```bash
createdb emprego_test                 # uma vez
# .env.test (versionado, sem segredos) aponta para emprego_test e ./storage-test
npm test                              # 159 testes: auth, CV, PDF, DOCX, pedidos, pagamentos, downloads, permissões…
npx playwright install chromium       # uma vez (ou CHROMIUM_PATH=/caminho/para/chrome)
npm run test:e2e                      # prepara a BD de teste, faz build e testa em desktop e Pixel 7
```

Cobertura principal:

- **Autenticação**: hash scrypt, sessões (token só em hash na BD), expiração, logout, recuperação de senha de uso único, rate limiting contra força bruta, redirecionamentos seguros.
- **CV**: criar, guardar, reordenar, duplicar (foto copiada), eliminar, isolamento entre utilizadores.
- **PDF / DOCX**: os 3 layouts geram ficheiros válidos (A4, margens, estilos, marcadores, acentos, fotografia opcional), CVs vazios não inventam conteúdo.
- **Pedidos e downloads**: produto gratuito → pedido pago de 0 MT → entrega; só quem tem pedido pago descarrega.
- **Permissões**: USER/EDITOR/ADMIN nas ações administrativas; auditoria das alterações de preço.
- **Pagamentos manuais**: criação do pedido e preço vindo da BD, troca de método, limites, instruções da configuração central, envio do comprovativo (→ `PENDING_VERIFICATION`, sem acesso), só ADMIN confirma (→ `PAID` + auditoria), rejeição, pedido de novo comprovativo, códigos repetidos, cancelamento, downloads de kits e de CV bloqueados até à confirmação.
- **E2E (desktop + Android)**: compra com M-Pesa → pendente → admin confirma → acesso; pedido de novo comprovativo → rejeição; configuração de pagamentos; jornada completa (registo → CV em 10 etapas → PDF/Word → duplicar → eliminar), kit gratuito, isolamento entre contas, admin altera preço e WhatsApp, PWA, cabeçalhos de segurança, acessibilidade (axe, WCAG 2 AA) e ausência de scroll horizontal no telemóvel.

## Produção e deploy

Configuração recomendada (baixo custo):

1. **PostgreSQL gerido** — Neon, Supabase ou Railway (plano gratuito serve para começar). Usar `sslmode=require`.
2. **Armazenamento S3-compatível** — Cloudflare R2 (sem custos de saída) ou Backblaze B2. Criar um bucket **privado**.
3. **Email** — Resend com domínio verificado (SPF/DKIM).
4. **Hosting** — Vercel (ou outro serviço Node.js):
   - Definir todas as variáveis de ambiente de produção (`STORAGE_DRIVER=s3`, `EMAIL_DRIVER=resend`).
   - Build command: `npx prisma migrate deploy && npm run build`
   - A base de dados tem de estar acessível durante o build (as páginas públicas são pré-renderizadas).
5. Depois do primeiro deploy: `npm run db:seed` e `npm run admin:create` apontando para a base de produção.
6. No painel `/admin`: configurar WhatsApp e redes sociais, **Definições → Pagamentos** (números, métodos ativos, instruções), carregar os ficheiros de cada kit e só então ativá-los.
7. Configurar o email de contacto (Definições → Site): recebe o aviso de cada pagamento por verificar.

Checklist antes do lançamento: ver [SECURITY.md](./SECURITY.md#checklist-de-produção).

> O driver `local` de armazenamento **não** funciona em plataformas serverless (disco efémero).
> Os uploads via Server Actions estão limitados a 4 MB por ficheiro (limite de corpo da Vercel ≈ 4,5 MB);
> ficheiros maiores exigirão upload direto com URL assinado (planeado).

## Estrutura

```
prisma/            esquema, migrações, seed
public/            ícones, logo, avatar, og.png, service worker
scripts/           create-admin, generate-brand-assets, e2e-prepare
src/app/           rotas (marketing, auth, meu-espaco, admin, api)
src/components/    UI, layout, admin, marketing
src/cv/            modelo do CV, validação, layouts (HTML, PDF, DOCX), gerador em etapas
src/server/        serviços de domínio (cv, users, orders, catalog, admin, settings)
src/lib/           auth, segurança, storage, email, i18n, dinheiro, validação, pagamentos (interface)
tests/             unit, integration, e2e
```

## Próximos passos

1. Integração por API com os operadores (M-Pesa primeiro) quando houver contrato e documentação oficial — mesma interface `PaymentProvider` ([PAYMENTS.md](./PAYMENTS.md)).
2. Gateway de cartão oficial (`CardPaymentProvider`).
3. Cupões (o modelo `Coupon` já existe).
4. Geradores de carta de candidatura e de motivação (modelo `CoverLetter` já existe).
5. Modelos de email e WhatsApp com "Copiar mensagem".
