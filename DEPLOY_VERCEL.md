# Publicar no Vercel — passo a passo

O projeto já está preparado para o Vercel: em cada deploy o script `vercel-build` aplica as migrações,
carrega os dados iniciais (40 modelos de CV, kits, fundos e roupas da foto profissional), cria o
administrador (se configurado) e faz o build. Só falta **configurar 2 coisas no painel do Vercel**
(não podem estar no código): a base de dados e o segredo da aplicação.

Sem elas o build pára com a mensagem «Configuração do Vercel incompleta» a explicar o que falta.

---

## 0. Configuração no repositório

O ficheiro `vercel.json` fixa o *framework* **Next.js** e o comando de build (`npm run vercel-build`).
Sem ele, um projeto criado no Vercel antes de existir código Next.js fica como site estático
(«Framework Preset: Other»): o build termina com sucesso mas todas as páginas dão **404: NOT_FOUND**.

## 1. Um só projeto

O repositório está ligado a **dois** projetos no Vercel («song» e «teste»); cada envio para o GitHub
gera dois builds. Fique com um (ex.: «song») e apague o outro em *Settings → Delete Project*.

## 2. Base de dados PostgreSQL (obrigatório)

No projeto: separador **Storage** → **Create Database** → escolha um PostgreSQL (ex.: **Neon**) →
região mais próxima de Moçambique disponível (ex.: Europa – Frankfurt) → **Connect** ao projeto,
marcando os ambientes *Production* e *Preview*.

A integração cria automaticamente as variáveis de ligação (`DATABASE_URL` ou `POSTGRES_URL`…) — a
aplicação reconhece ambas. Não é preciso copiar nada.

## 3. Variáveis de ambiente (Settings → Environment Variables)

Marque *Production* e *Preview* em cada uma:

| Nome | Valor | Obrigatória |
|---|---|---|
| `APP_SECRET` | 40 ou mais caracteres aleatórios (letras e números), só seus | **sim** |
| `ADMIN_EMAIL` | o email com que vai entrar no painel `/admin` | recomendado |
| `ADMIN_PASSWORD` | senha forte (mínimo 12 caracteres, com letras e números) | recomendado |
| `SEED_MPESA_NUMBER` / `SEED_EMOLA_NUMBER` / `SEED_MKESH_NUMBER` | números que recebem os pagamentos (também podem ser definidos depois no admin) | não |

Nunca publique estes valores no GitHub nem em conversas.

## 4. Publicar

**Deployments** → último deploy → **⋯ → Redeploy**. O build demora alguns minutos. No fim, **Visit**
abre o site.

- Os links de pré-visualização (*Preview*) do Vercel pedem, por omissão, login no Vercel
  (*Deployment Protection*). Para partilhar com outras pessoas: publique em *Production* (ramo de
  produção do projeto, normalmente `main`) ou desative a proteção em *Settings → Deployment Protection*.
- Depois de entrar como administrador pela primeira vez, pode remover `ADMIN_PASSWORD`.

## 5. Modo de teste vs. produção

Com apenas os passos acima o site funciona para **testar**, com duas limitações:

| Serviço | Sem configurar | Para produção |
|---|---|---|
| Armazenamento de ficheiros (fotografias, comprovativos, ficheiros dos kits carregados no admin) | guardados em `/tmp` do servidor — **temporários**, podem desaparecer a qualquer momento | `STORAGE_DRIVER=s3` + `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (+ `S3_ENDPOINT`/`S3_REGION` para R2/B2) — bucket **privado** |
| Email (recuperação de senha, avisos de pagamento) | não é enviado | `EMAIL_DRIVER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` (domínio verificado) |

O modelo gratuito (CV e carta em Word) funciona sempre: os ficheiros são gerados pela própria aplicação.

Antes de abrir ao público: `npm run check:prod` com as variáveis de produção (ver README) e
[AUDIT_REPORT.md](./AUDIT_REPORT.md).
