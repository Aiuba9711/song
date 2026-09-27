# Auditoria antes da produção — Emprego Fácil MZ

Data: 27/09/2026 · Ramo: `claude/emprego-facil-mz-snrsaz`

Classificação: **CRÍTICO** (bloqueia produção / perda de dados ou dinheiro) · **ALTO** · **MÉDIO** · **BAIXO**.

## Resumo

| | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ sem erros |
| ESLint (`eslint . --max-warnings=0`) | ✅ sem erros nem avisos |
| `npm audit` | 6 vulnerabilidades → **2** (moderadas, só na ferramenta de testes; ver 3) |
| Build (`npm run build`) | ✅ |
| Testes unitários e de integração (Vitest) | ✅ 376 (31 ficheiros) |
| Testes E2E (Playwright, computador + Android) | ver secção final |
| Esquema ↔ migrações (drift) | ✅ sem diferenças; nenhuma migração destrutiva |
| Problemas CRÍTICOS encontrados | **nenhum** no código |

Não foram encontrados problemas críticos no código. A aplicação está pronta para produção **depois** de
configurar os serviços externos obrigatórios (base de dados gerida, armazenamento S3 privado e email
Resend) — o novo comando `npm run check:prod` verifica essa configuração.

---

## 1. Problemas encontrados e corrigidos

| # | Área | Problema | Nível | Correção |
|---|---|---|---|---|
| 1 | Dependências | `prisma` (CLI) dependia de `mysql2` < 3.22 (fuga de credenciais / DoS por descompressão) e `deepmerge-ts` < 8 (esgotamento de pilha). Só usados pela CLI, não pela aplicação, mas presentes no deploy. | ALTO (4 alertas «high») | `overrides` no `package.json`: `mysql2@^3.24.4`, `deepmerge-ts@^8.0.2`. `prisma validate/generate/migrate` verificados. |
| 2 | Dependências / uploads | `sharp` 0.35.4 processa imagens enviadas por utilizadores; havia correção 0.35.5. | BAIXO | Atualizado para 0.35.5 (inclui libvips 1.3.4). |
| 3 | Pagamentos | A verificação de «código de transação já usado» só existia no envio e **não era atómica**: dois pedidos enviados ao mesmo tempo com o mesmo código M-Pesa podiam chegar ambos à verificação e ser confirmados. | MÉDIO | Segunda verificação dentro da transação de confirmação (`markPaymentSucceeded`): o mesmo código nunca confirma dois pedidos. Teste de integração. |
| 4 | Privacidade / uploads | Comprovativos de pagamento em imagem eram guardados com metadados EXIF (podem incluir localização GPS de quem pagou). | MÉDIO | Imagens re-codificadas sem metadados (`sharp`); PDFs continuam servidos em «sandbox». Teste. |
| 5 | Logs | Erros da base de dados eram registados completos (`console.error(error)`): as mensagens do Prisma podem conter o conteúdo enviado (textos do CV, emails). | MÉDIO | Novo `logError()` (`src/lib/log.ts`): em produção regista só tipo e código do erro. Aplicado em CV, fotos, cartas, downloads, auditoria, email, definições, sitemap. Teste. |
| 6 | Logs / email | Com `EMAIL_DRIVER=console` em produção, o corpo dos emails — incluindo **links de recuperação de senha** — ia para os logs. | MÉDIO | Em produção o driver «console» só regista um aviso (sem corpo). `check:prod` exige `resend`. Teste. |
| 7 | Base de dados / performance | 10 chaves estrangeiras sem índice (`Download.cvId/photoId/letterId/productFileId`, `CV.templateId/professionalPhotoId`, `AuditLog.actorId`, `Order.couponId`, `ProfessionalPhoto.backgroundId/outfitId`): eliminar um CV, foto, modelo ou utilizador fazia varrimento completo dessas tabelas. | MÉDIO | Migração aditiva `20260927223855_audit_fk_indexes` (só `CREATE INDEX`). |
| 8 | Performance (mobile) | A página inicial, a galeria e as 40 páginas de modelos carregavam a biblioteca `zod` (**87 KB gzip**) sem precisarem dela (vinha de `src/cv/design.ts` através da pré-visualização). | MÉDIO | Funções de tema movidas para `src/cv/theme.ts` (sem zod); `design.ts` reexporta-as. Confirmado no build: as páginas públicas já não carregam esse ficheiro. |
| 9 | SEO | O `sitemap.xml` não incluía as 40 páginas de modelos (`/cv-modelos/[slug]`), o conteúdo mais pesquisável do site. | MÉDIO | Modelos ativos adicionados ao sitemap; teste E2E atualizado. |
| 10 | Uploads (hosting) | Em alojamento serverless (Vercel) o corpo de um pedido está limitado a ~4,5 MB; fotografias grandes que o navegador não conseguisse reduzir o suficiente falhariam com erro genérico. | MÉDIO | O telemóvel comprime progressivamente (qualidade/tamanho) até ≤ 3,5 MB; imagens de fundo do admin limitadas a 4 MB. |
| 11 | Tratamento de erros | Não existia `global-error.tsx`: um erro no layout raiz mostraria uma página em branco. | BAIXO | Página de erro global acessível, com «Tentar novamente». |
| 12 | Base de dados | Sessões expiradas e links de recuperação expirados nunca eram apagados. | BAIXO | Limpeza ocasional ao criar sessões (índice `expiresAt` já existia). |
| 13 | Admin | Desativar um utilizador inexistente dava erro 500. | BAIXO | Erro claro «Utilizador não encontrado.» Teste. |
| 14 | Variáveis de ambiente | `.env.example` tinha nomes inventados para APIs não implementadas (`MPESA_*`, `PAYMENTS_ENABLED_PROVIDERS`) e um bloco de IA antigo que contradizia a configuração atual (`AI_API_KEY`). | BAIXO | Removidos; nota a dizer que os nomes serão definidos com a documentação oficial de cada operador. |
| 15 | Documentação | `DATABASE.md` dizia «10 modelos» e «esquema completo na migração inicial». | BAIXO | Atualizado (40 modelos, catálogo da foto, lista de migrações, verificação de drift, backups antes de migrar). |
| 16 | Produção | Não havia forma rápida de validar a configuração de produção. | MÉDIO | `npm run check:prod` (`scripts/check-production.ts`): falha se faltar HTTPS, segredo forte, S3, Resend, ou se houver variáveis de teste (`RATE_LIMIT_SCALE≠1`, `AI_MOCK_EXTERNAL`, `IMAGE_*_PROVIDER`). Testes unitários. |
| 17 | Segredos | `.gitignore` não excluía `.env.production` / `.env.staging`: um ficheiro de segredos de produção podia ser enviado para o GitHub por engano. (Verificado: nenhum segredo real no repositório nem no histórico.) | ALTO | Adicionados ao `.gitignore`. |

---

## 2. Verificado sem problemas (por área)

1. **TypeScript** — `strict`, sem erros.
2. **ESLint** — sem erros nem avisos (inclui regras de hooks e de acessibilidade do Next).
3. **Dependências** — versões atuais nas linhas usadas; `@react-pdf/renderer`, `docx`, `sharp`, `@anthropic-ai/sdk` só no servidor (confirmado nos ficheiros enviados ao navegador).
4. **npm audit** — ver 1 e 3.
5. **Autenticação** — senhas com scrypt (N=2¹⁵), comparação em tempo constante e hash fictício para emails inexistentes; sessões com token aleatório de 256 bits guardado só como SHA-256; cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`; redefinir/alterar a senha termina as outras sessões; rate limit por IP e por email; `next` validado contra redirecionamentos abertos.
6. **Autorização** — todas as 58 Server Actions verificam sessão/permissão (`assertUser`/`assertPermission`); rotas de ficheiros verificam o dono em cada pedido; área admin responde 404 a quem não tem permissão; só ADMIN confirma pagamentos e altera preços; não é possível remover o último administrador nem alterar o próprio papel.
7. **Base de dados** — sem drift; migrações só aditivas; transações e updates condicionais nas mudanças de estado; limites de tamanho em todos os campos.
8. **Uploads** — tipo real por *magic bytes*, extensão, tamanho, dimensões e limite de píxeis; EXIF removido (fotos do CV, foto profissional e agora comprovativos); chaves de armazenamento aleatórias; caminho do disco local protegido contra *path traversal*.
9. **Downloads** — só com sessão, dono e pagamento confirmado (402 antes); rate limit; `Content-Disposition` com nome sanitizado; registo em `Download`; S3 com URL assinado de 5 min.
10. **PDF** — 40 modelos × (com/sem foto) testados: todo o texto presente, A4, 1 página sem foto, fontes base com conversão WinAnsi.
11. **DOCX** — mesmos testes; modelos ATS sem tabelas nem gráficos.
12. **CV builder** — gravação validada no servidor (zod), rascunho local offline, pré-visualização = documento final.
13. **Modelos** — 40 modelos, filtros ATS e com/sem fotografia, admin de modelos.
14. **Fotografia** — ver PHOTO_MODULE.md; privada, `noindex`, eliminação, testes de acesso cruzado.
15. **IA** — desligada sem configuração; chave só em variáveis de ambiente; consentimento; minimização de dados; proteção contra injeção e contra invenção; nunca altera o CV sem «Aplicar sugestão».
16. **Checkout** — preço sempre da base de dados; limite de pedidos abertos; troca de método; cancelamento.
17. **Pagamentos** — estados com updates condicionais (idempotentes); auditoria de cada decisão; ver correção 3.
18. **Cupões** — ver secção 3 (não implementado).
19. **Painel administrativo** — permissões por papel (ADMIN/EDITOR), auditoria das alterações.
20. **Proteção de ficheiros** — nada privado em `public/`; `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, `nosniff`; comprovativos servidos com CSP `sandbox`.
21. **Mobile** — testes E2E em Android (Pixel 7): sem scroll horizontal, botões ≥ 44 px, navegação inferior.
22. **PWA** — manifest com ícones *maskable*, service worker que **nunca** guarda em cache áreas privadas, página offline.
23. **SEO** — metadados, Open Graph, `robots.txt` bloqueia áreas privadas, dados estruturados na galeria, sitemap (corrigido).
24. **Performance** — páginas públicas estáticas com revalidação (ISR), imagens de pré-visualização pequenas (~20 KB) com *lazy loading*; ver correção 8.
25. **Acessibilidade** — axe (WCAG 2 A/AA) nas páginas principais sem violações graves; etiquetas, foco, `aria-live`, contraste.
26. **Variáveis de ambiente** — validadas no arranque (`src/lib/env.ts`); ver correções 14 e 16.
27. **Tratamento de erros** — páginas `error`, `not-found` e (agora) `global-error`; mensagens claras nas ações.
28. **Logs** — IPs guardados só como HMAC; ver correções 5 e 6.
29. **Segurança** — CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`; CSRF: Server Actions verificam a origem.
30. **Backup / migrações** — documentado em DATABASE.md (PITR, `pg_dump`, versionamento do bucket, teste de reposição, backup antes de migrar).

---

## 3. Problemas que ainda dependem de decisões, credenciais ou documentação externa

| Item | Nível | Estado / o que é necessário |
|---|---|---|
| **Armazenamento S3 privado** (fotos, comprovativos, ficheiros dos kits) | CRÍTICO para produção | Obrigatório em serverless (o disco é efémero). Precisa de `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (R2/B2/AWS) — bucket **privado** com versionamento. |
| **Email (Resend)** | CRÍTICO para produção | Sem ele não há recuperação de senha nem avisos de pagamento. Precisa de `RESEND_API_KEY` e domínio verificado (SPF/DKIM). |
| **PostgreSQL gerido** com SSL e backups/PITR | CRÍTICO para produção | `DATABASE_URL` com `sslmode=require`. |
| **Cupões** | MÉDIO | **Não implementados** (só existe a tabela `Coupon` no esquema). Não é um erro — está listado como Fase 2 no README. Implementar exige definir regras de negócio (percentagem/valor, validade, limites, produtos). |
| **Pagamento por API** (M-Pesa, e-Mola, mKesh) e **cartão** | — | Não implementados; exigem contrato e documentação oficial de cada operador. O pagamento manual com confirmação do administrador funciona. |
| **IA real** | — | Opcional. Precisa de `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `AI_MODEL`. Sem isso o assistente mostra «temporariamente indisponível» e o resto funciona. |
| **Remoção automática de fundo / roupa por IA** | — | Não implementadas (sem fornecedor escolhido). Ver PHOTO_MODULE.md §10. |
| **`vitest` 3.2.7** (2 alertas moderados: leitura de ficheiros via servidor de *mocks*) | BAIXO na prática | Só afeta a ferramenta de testes em desenvolvimento, nunca a aplicação. A correção exige vitest 4 (mudança de versão maior) e o `npm` atual falha a resolver as novas dependências *peer*; forçar (`--legacy-peer-deps`) poderia partir o `npm ci`. Atualizar quando o npm for atualizado. |
| **IP do cliente atrás de proxy** | MÉDIO (depende do alojamento) | O rate limit por IP usa o primeiro `X-Forwarded-For`. Na Vercel este cabeçalho é definido pela plataforma (seguro). Noutro alojamento, garantir que o proxy **substitui** (não acrescenta) esse cabeçalho. Os limites por email/conta não dependem disto. |

---

## 4. Recomendações para produção

1. Correr `npm run check:prod` com as variáveis de produção até não haver erros.
2. Deploy: `npx prisma migrate deploy && npm run build` (fazer backup antes das migrações). Depois `npm run db:seed` e `npm run admin:create` (e remover `ADMIN_PASSWORD` do ambiente).
3. No admin: números de pagamento, instruções, preços (CV, carta, foto, pacote), contactos e WhatsApp.
4. Monitorização: apontar um serviço de *uptime* a `/api/health` (responde 503 se a base de dados falhar) e ativar a recolha de logs do alojamento (os logs já não contêm dados pessoais).
5. **CSP com `nonce`** (MÉDIO, melhoria futura): hoje `script-src` usa `'unsafe-inline'` porque as páginas públicas são estáticas; nonces obrigariam a renderização dinâmica. Rever se forem adicionados scripts de terceiros (analytics).
6. Registo: a mensagem «Já existe uma conta com este email» permite saber se um email está registado (BAIXO, escolha de usabilidade; mitigada por rate limit). Pode passar a mensagem genérica se preferir privacidade máxima.
7. A pré-visualização em PDF antes da compra tem marca de água, mas qualquer PDF pode ser editado (BAIXO, risco de negócio aceite).
8. Testar a reposição de um backup antes do lançamento.
9. Atualizar o `npm` e depois o `vitest` para 4.x.

---

## 5. Resultado final dos testes

Ver o fim deste ficheiro (atualizado após a execução completa).
