# Segurança e privacidade — Emprego Fácil MZ

Os CVs contêm dados pessoais. O princípio é simples: **cada documento só é acessível ao seu dono**,
e todas as verificações acontecem no servidor.

## Autenticação

| Medida | Implementação |
|---|---|
| Hash de senhas | `scrypt` (node:crypto), N=2¹⁵, r=8, p=1, sal de 16 bytes, comparação em tempo constante — `src/lib/auth/password.ts` |
| Política de senha | ≥ 8 caracteres, letras e números (admin inicial ≥ 12) |
| Sessões | Token aleatório de 256 bits no cookie; na BD só o SHA-256. 30 dias. Revogáveis. |
| Cookie | `HttpOnly`, `SameSite=Lax`, `Secure` e prefixo `__Host-` em produção |
| Login | Mensagem genérica (não revela se o email existe); tempo constante com hash de referência |
| Recuperação de senha | Token de uso único, 1 hora, em hash; pedido novo invalida o anterior; redefinir termina todas as sessões; resposta idêntica exista ou não a conta |
| Alterar senha | Exige a senha atual; termina as outras sessões |
| Contas desativadas | Sessões apagadas; login recusado |
| Login por telefone | Previsto (campo `phone` normalizado já existe) |

## Autorização

- Papéis: `USER`, `EDITOR`, `ADMIN` com permissões explícitas em `src/lib/auth/roles.ts`
  (EDITOR: modelos/conteúdo; ADMIN: tudo, incluindo produtos, preços, pedidos, utilizadores, definições).
- `proxy.ts` só faz um redirecionamento rápido para `/entrar`; **cada** página, Server Action e rota
  verifica sessão e permissão (`requireUser`, `requirePermission`, `assertPermission`).
- Recursos do utilizador consultados sempre com `where: { id, userId }` → CVs, fotos e downloads de
  outras contas devolvem **404** (não revelam existência). A área `/admin` devolve 404 a não-admins.
- Salvaguardas: não é possível remover o último administrador nem alterar o próprio papel.

## Proteção de dados

- **CVs nunca públicos**: sem URLs partilháveis; PDF/DOCX gerados a pedido para o dono; respostas com `Cache-Control: private, no-store` e `X-Robots-Tag: noindex`.
- **Fotografias** e **ficheiros de kits** em armazenamento privado (bucket S3 privado); chaves aleatórias (UUID); servidos após verificação de posse / pedido pago; com S3, URL assinado de 5 minutos.
- **Service worker** nunca guarda em cache `/meu-espaco`, `/admin`, `/api` nem páginas de autenticação.
- **Eliminação de conta** (Perfil): apaga CVs, fotos, sessões, downloads e perfil; pedidos pagos mantidos por obrigações contabilísticas, desligados da conta; pedidos não pagos anonimizados.
- **Logs**: IPs guardados apenas como HMAC (`APP_SECRET`); `AuditLog` para login, alterações administrativas (incluindo preço antes/depois) e pedidos.
- **Consentimento**: aceitação de termos/privacidade registada (`termsAcceptedAt`); marketing opcional e revogável; analytics (Fase 3) só com consentimento.

## Pagamentos manuais

- Informar um código de transação **nunca** liberta um produto: o pedido fica `PENDING_VERIFICATION`.
- Só a permissão `payments.verify` (apenas `ADMIN`) — ou, no futuro, uma API oficial — muda um pedido para `PAID`, através de uma única função (`markPaymentSucceeded`) com atualizações condicionais e registo em `AuditLog` (estado de/para, autor, valor, código).
- Preço calculado no servidor a partir da BD; valores enviados pelo cliente são ignorados.
- O cliente só atua sobre os seus pedidos; códigos de transação repetidos são recusados/assinalados.
- Comprovativos privados (JPG/PNG/PDF ≤ 3 MB, *magic bytes*), visíveis só a administradores, servidos com CSP `sandbox`.
- Números de destino na configuração central (BD), nunca no código; alterações auditadas.
- `/checkout` nunca é guardado em cache pelo service worker nem indexado.
- Downloads de kits (e de CVs, quando pagos) verificam o pedido `PAID` em cada pedido de ficheiro.

## Validação de entradas e XSS

- Todas as entradas validadas com **zod** no servidor (tamanhos máximos, formatos, enums).
- React escapa todo o conteúdo; não há `dangerouslySetInnerHTML` com dados de utilizador. JSON-LD escapa `<`.
- Cores de modelos validadas (`#RRGGBB`) antes de chegar a estilos/PDF/DOCX.
- URLs de redes sociais: apenas `https://`.
- Uploads validados por **magic bytes** (não pela extensão): fotos JPG/PNG ≤ 1,5 MB; ficheiros de produto PDF/DOCX/XLSX/PPTX/ZIP ≤ 4 MB. SVG/HTML rejeitados.
- `Content-Disposition` com nomes sanitizados; `X-Content-Type-Options: nosniff`.
- Parâmetros de erro no URL usam **códigos** mapeados para mensagens (sem texto arbitrário refletido).
- Storage local protegido contra path traversal.

## CSRF

- **Server Actions**: o Next.js compara `Origin` com `Host`/`X-Forwarded-Host` e rejeita pedidos de outra origem.
- Cookies `SameSite=Lax`.
- Rotas GET da API não alteram estado relevante (apenas registam downloads).
- Para futuros Route Handlers com POST (ex.: webhooks de pagamento): `isSameOrigin()` ou verificação de assinatura do fornecedor.

## Rate limiting

Janela fixa guardada no PostgreSQL (`RateLimitBucket`, uma query atómica — funciona com várias
instâncias serverless sem Redis):

| Ação | Limite |
|---|---|
| Login | 10 / 15 min por email; 30 / 15 min por IP |
| Registo | 5 / hora por IP |
| Recuperação de senha | 3 / hora por email; 10 / hora por IP |
| Downloads/exportações | 60 / hora por utilizador |
| Uploads de fotos | 30 / hora por utilizador |
| Início de checkout | 20 / hora por utilizador (máx. 5 pedidos em aberto) |
| Envio de dados de pagamento | 10 / hora por utilizador |

`RATE_LIMIT_SCALE` (padrão 1) só deve ser aumentado em ambientes de teste.

## Cabeçalhos HTTP

Definidos em `next.config.ts`: `Content-Security-Policy` (origem própria; `frame-ancestors 'none'`,
`object-src 'none'`, `form-action 'self'`), `Strict-Transport-Security` (produção),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`; `X-Powered-By` removido.
A CSP inclui `'unsafe-inline'` para scripts porque o Next.js injeta scripts de hidratação; evoluir
para CSP com nonce quando o custo de renderização dinâmica for aceitável.

## Segredos e configuração

- Todos os segredos em variáveis de ambiente (ver `.env.example`); `.env*` no `.gitignore`.
- A aplicação recusa arrancar com `APP_SECRET` curto, e recusa o segredo de exemplo num domínio `https://`.
- O administrador inicial é criado por `npm run admin:create` a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD` — nenhuma senha no código.

## Dependências

`npm audit` reporta vulnerabilidades em `mysql2`/`deepmerge-ts` puxadas pelo **CLI** `prisma`
(ferramenta de desenvolvimento/migrações), não pelo runtime da aplicação (o projeto usa PostgreSQL).
Rever a cada atualização do Prisma.

## Checklist de produção

- [ ] `APP_URL` com `https://`, `APP_SECRET` novo e aleatório (≥ 48 bytes)
- [ ] `DATABASE_URL` com `sslmode=require`; backups automáticos ativos (ver DATABASE.md)
- [ ] `STORAGE_DRIVER=s3` com bucket **privado** e versionamento
- [ ] `EMAIL_DRIVER=resend` com domínio verificado (SPF, DKIM, DMARC)
- [ ] `RATE_LIMIT_SCALE=1`
- [ ] Administrador criado e `ADMIN_PASSWORD` removida do ambiente
- [ ] Política de privacidade e termos revistos por um jurista (legislação moçambicana aplicável)
- [ ] Monitorização de `/api/health` e alertas de erros
- [ ] Rever `AuditLog` periodicamente
- [ ] Definições → Pagamentos: confirmar números, titular e instruções; email de contacto configurado para os avisos
- [ ] Só contas de confiança com papel `ADMIN` (podem confirmar pagamentos)

## Reportar vulnerabilidades

Contacte a equipa através do email configurado em `/contactos`, sem divulgar publicamente o problema
até existir correção.
