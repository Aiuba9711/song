# Foto Profissional — módulo

> «Prepare a sua fotografia para uma candidatura profissional.»

Módulo integrado no Emprego Fácil MZ (não é uma aplicação separada): páginas em
`/meu-espaco/fotos`, integração no editor de CV, checkout e admin existentes.

**Importante — o que é e o que não é.** Todo o processamento atual é **local e sem IA**:
ajustes de imagem, recortes, substituição de *fundos lisos* por um algoritmo de preenchimento
por cor, e «roupa digital» que é uma **ilustração vetorial** sobreposta (identificada no ecrã
como edição digital). Não existe nenhuma integração com serviços externos de imagem; a
arquitetura para os ligar está pronta, mas nenhum fornecedor foi inventado ou simulado como real.

---

## 1. Fluxo do utilizador

`CARREGAR FOTO → AJUSTAR → FORMATO → FUNDO → ROUPA FORMAL → POSIÇÃO → PRÉ-VISUALIZAR → USAR NO CV`

O utilizador pode saltar para qualquer etapa (barra de etapas no topo) e voltar atrás.

| Etapa | O que faz |
|---|---|
| Carregar | «Tirar fotografia» (`capture="user"` abre a câmara do telemóvel), «Escolher da galeria», arrastar e largar no computador. JPG/JPEG/PNG/WEBP; validação no navegador e no servidor; fotografias grandes são reduzidas no telemóvel antes do envio. |
| Ajustar | Rodar (±90°) e endireitar (±15°), brilho, contraste, exposição, saturação, nitidez, **Melhoria automática** (limites baixos), repor. Sem filtros de beleza. |
| Formato | Tipo passe (700×900, 7:9), CV (800×1000, 4:5), quadrada (1000×1000), personalizada (3:4, 2:3, 4:5, 5:7, 1:1, 4:3). «Preparar foto tipo passe» escolhe o formato, um fundo claro e centra o rosto com espaço acima da cabeça. |
| Fundo | «Original» (mantém o fundo), Neutros (branco, claro, cinza claro, azul muito claro, …), Corporativos (escritório desfocado, parede corporativa, ambiente profissional subtil — desenhados pela aplicação), Gradientes, e imagens carregadas no admin. Sensibilidade ajustável e aviso quando o fundo da fotografia não é liso. «Remover fundo (automático)» mostra *«Remoção automática de fundo ainda não configurada.»* |
| Roupa | Filtros Homem, Mulher, Blazer, Fato, Camisa, Blusa, Gravata, Corporativo, Executivo, Primeiro emprego, Entrevista, Académico; sugestões «Escolha uma aparência profissional» (Formal clássico, Executivo moderno, Corporativo discreto, Primeiro emprego, Académico — sem dizer que uma é melhor); gravata sim/não e cor; cartão «Foto original (sem roupa digital)». |
| Posição | Arrastar na pré-visualização, zoom, deslocação, tamanho/posição da roupa, **Centralizar automaticamente**. |
| Pré-visualizar | Comparação **Antes \| Depois**; guardar. |
| Usar no CV | Escolher versão (editada/original), lista dos CVs → «Adicionar fotografia», compra (foto ou pacote CV + Foto) e downloads (JPG, PNG, Tipo passe, Para CV). |

Aviso mostrado no formato tipo passe (nunca se afirma conformidade com requisitos oficiais):

> Formato visual preparado para fotografia profissional. Confirme sempre os requisitos específicos da instituição onde irá utilizar a fotografia.

**Minhas Fotos Profissionais** (`/meu-espaco/fotos`): miniatura, data, tipo (original / editada /
profissional), formato e modelo utilizado (ex.: «Foto tipo passe · Fundo branco · Camisa branca»),
CVs onde é usada; ações Usar no CV, Editar, Baixar, **Eliminar fotografia** (com opção de a retirar
também dos CVs). Detalhe em `/meu-espaco/fotos/[id]`.

---

## 2. Arquitetura

```
src/photo/                      ← biblioteca pura (testável em Node) + UI
  types.ts        formatos, definições do editor (zod), textos fixos, filtros e sugestões
  geometry.ts     cobertura com rotação, colocação, «Centralizar automaticamente», posição da roupa
  pixels.ts       brilho/contraste/exposição/saturação/nitidez, estatísticas, melhoria automática
  background.ts   máscara de fundo liso (preenchimento a partir das margens + suavização)
  outfit.ts       roupa digital em SVG (400×300), cores validadas
  catalog.ts      catálogo inicial de fundos (13) e roupas (26) — usado pelo seed
  render.ts       desenho em <canvas> (navegador); deteção de rosto do navegador (só posição)
  editor.tsx      editor por etapas (cliente)
  uploader.tsx    câmara / galeria / arrastar, validação e compressão no navegador
src/lib/image-editing/          ← fornecedores
  types.ts        BackgroundRemovalProvider, ClothingProvider, ImageEditingProvider
  local.ts        LocalImageEditingProvider (sharp): removeBackground, applyClothing, improveLighting, cropPortrait
  index.ts        registo por variáveis de ambiente, estado CONFIGURADO / NÃO CONFIGURADO / ERRO, APP_ENV
src/server/photos.ts            ← validação, armazenamento, resultado, download, preço, usar no CV
src/server/photos-admin.ts      ← fundos, roupas e preços (admin)
src/app/meu-espaco/fotos/       ← páginas e server actions do utilizador
src/app/api/fotos/[id]/         ← imagem privada (?v=original|resultado|miniatura) e download
src/app/api/foto-fundos/[id]/   ← imagens de fundo carregadas no admin (conteúdo da plataforma)
src/app/admin/foto/             ← Admin › Foto Profissional
```

**Onde acontece o processamento.** O editor desenha no navegador (canvas) a partir da fotografia
original reduzida a ≤ 1400 px; ao guardar, envia um PNG com as dimensões do formato e as definições
(JSON). O servidor **não confia** no resultado: verifica que é PNG real, dimensões 200–2000 px,
proporção do formato (±2 %), fundo e roupa existentes; volta a codificar (sem metadados) e gera a
miniatura. As definições ficam guardadas para voltar a editar a partir da original.

**Deteção de rosto.** Usa a Shape Detection API do navegador (`FaceDetector`) quando existe, apenas
para obter a **caixa** do rosto (posição e tamanho) e enquadrar. Sem ela, usa uma estimativa
geométrica e informa o utilizador. Não há reconhecimento facial nem identificação, e **nenhuma
inferência** sobre raça, etnia, religião, personalidade, saúde, idade ou género. O género das peças
de roupa é um filtro que o próprio utilizador escolhe.

**Roupa digital.** Ilustração vetorial posicionada por baixo do queixo; não altera rosto, olhos,
nariz, boca, cabelo nem formato corporal (a fotografia não é deformada). Decotes discretos, sem
sexualização. Sempre identificada: «Roupa digital (edição digital)».

---

## 3. Armazenamento

| Dado | Onde | Notas |
|---|---|---|
| Original | `photos/<userId>/<uuid>.jpg` | EXIF/GPS removidos, orientação aplicada, ≤ 2000 px, JPEG q90 |
| Resultado | `photos/<userId>/<uuid>.png` | PNG sem metadados, dimensões do formato |
| Miniatura | `photos/<userId>/<uuid>.jpg` | 320 px |
| Registo | `ProfessionalPhoto` | chaves, formato, dimensões, definições (JSON), fundo/roupa, etiqueta, `purchasedAt` |
| Fundos / roupas | `PhotoBackground`, `PhotoOutfit` | geridos no admin; imagens de fundo em `photo-backgrounds/` |

O armazenamento é o mesmo `StorageProvider` do resto da aplicação (local ou S3 privado). Não há URLs
públicos: as imagens passam sempre por `/api/fotos/[id]`, que verifica a sessão e o dono em cada
pedido. Ao guardar um novo resultado, os ficheiros anteriores são apagados.

Usar no CV copia a imagem para o espaço de fotografia do CV (`CV.photoKey`, a mesma via do upload
normal) e guarda `CV.professionalPhotoId`; o enquadramento vertical é calculado a partir do rosto.
Eliminar a fotografia pode também retirá-la dos CVs; eliminar a conta apaga todas as fotografias.

---

## 4. Segurança e privacidade

- **Fotografias são dados pessoais**: acesso só do dono (`where: { id, userId }`), outro utilizador
  recebe 404; `Cache-Control: private, no-store`; `X-Robots-Tag: noindex, nofollow, noimageindex`.
- Validação no servidor: extensão (jpg/jpeg/png/webp), MIME declarado, **conteúdo real** (magic
  bytes), correspondência extensão↔conteúdo, tamanho (`PHOTO_MAX_UPLOAD_MB`), dimensão mínima,
  limite de píxeis na descodificação, máximo de 30 fotografias por conta.
- Rate limiting: envios (`upload`), gravações (`photoSave`, 60/h), downloads (`export`).
- Nada é enviado para serviços externos; as fotografias **não** são usadas para treinar modelos.
  Quando existir um fornecedor externo, o envio exige consentimento explícito
  (`User.imageAiConsentAt`), HTTPS e eliminação dos ficheiros temporários do fornecedor.
- Logs de erro sem imagens (só o tipo de erro).
- Cores de roupas e fundos validadas (`#rrggbb`) antes de entrar no SVG/CSS.
- Auditoria: `photo.upload`, `photo.save`, `photo.delete`, `photo.use_in_cv`, alterações no admin e nos preços.

---

## 5. Fornecedores (providers)

```ts
interface BackgroundRemovalProvider { removeBackground(image, { tolerance? }) }
interface ClothingProvider          { applyClothing(image, clothing, face) }
interface ImageEditingProvider extends BackgroundRemovalProvider, ClothingProvider {
  improveLighting(image); cropPortrait(image, { width, height, face, headroom? })
}
```

| Processador | Local (hoje) | Externo |
|---|---|---|
| BackgroundRemovalProvider | CONFIGURADO — fundos lisos, sem IA | NÃO CONFIGURADO |
| ClothingProvider | CONFIGURADO — ilustração sobreposta, sem IA | NÃO CONFIGURADO |
| ImageEditingProvider | CONFIGURADO — recorte, iluminação | NÃO CONFIGURADO |

O estado aparece em **Admin › Foto Profissional › Processadores**. `IMAGE_BG_PROVIDER` /
`IMAGE_CLOTHING_PROVIDER` preenchidos com um valor sem integração implementada aparecem como **ERRO**
(nunca fingem funcionar).

**Ambientes.** `APP_ENV` = `development` | `staging` | `production` (vazio → `NODE_ENV`). Em testes
e2e/integração não há serviços externos; o provider local é o mesmo em todos os ambientes.

---

## 6. Preços e pagamento

Configuráveis em **Admin › Foto Profissional › Preços** (só administradores), guardados em
`PaymentSettings`: `photoPriceMinor` (0 = gratuita), `photoPromoPriceMinor` + `photoPromoEndsAt`
(promoção), `photoBundlePriceMinor` (pacote CV + Foto; vazio = indisponível). Nada está fixo no código.

Usa o mesmo checkout e `PaymentProvider` (M-Pesa / e-Mola / mKesh manual):
`/checkout?foto=<id>` (`PHOTO_UNLOCK`) e `/checkout?pacote=<cvId>.<photoId>` (`CV_PHOTO_BUNDLE`).
Só a confirmação do administrador liberta: `ProfessionalPhoto.purchasedAt` (e `CV.purchasedAt` no pacote).
Editar e pré-visualizar é sempre gratuito; download e uso no CV exigem pagamento quando o preço > 0.
Downloads finais **sem marca de água**.

---

## 7. Integração com o CV

- Editor de CV › Fotografia: «Escolher das minhas fotos profissionais» (usar editada ou original),
  «Criar foto profissional», «Editar foto profissional» (quando o CV usa uma); trocar, remover,
  reposicionar e zoom como antes.
- A fotografia é redimensionada/recortada automaticamente para o espaço do modelo (forma e posição
  definidas no design do modelo).
- Modelos «Sem fotografia»: novo campo `photo` no design (`true` por omissão). Os modelos
  Balanço, Auditoria e Essencial são criados sem fotografia em instalações novas (o seed não altera
  modelos já existentes). A galeria `/cv-modelos` tem o filtro **Fotografia: Com / Sem**; o admin de
  modelos tem a opção «Com espaço para fotografia / Sem fotografia».

---

## 8. Configuração

```env
APP_ENV=""                 # development | staging | production
PHOTO_MAX_UPLOAD_MB="10"   # 1–25
IMAGE_BG_PROVIDER=""       # vazio — nenhuma integração implementada
IMAGE_CLOTHING_PROVIDER="" # vazio — nenhuma integração implementada
```

Migração: `prisma/migrations/20260927145718_professional_photo`. O seed cria 13 fundos e 26 roupas
quando as tabelas estão vazias. `next.config.ts`: `serverActions.bodySizeLimit = "12mb"`.

---

## 9. Limitações conhecidas

- A troca de fundo local funciona bem com **fundos lisos** (parede de cor uniforme). Com fundos
  complexos (pessoas, objetos, janelas) o recorte falha — o editor avisa e sugere «Original».
  Cabelo fino e contornos suaves podem ficar com uma orla.
- A roupa digital é uma ilustração: não se adapta à postura, aos ombros inclinados nem à iluminação
  da fotografia; o utilizador ajusta tamanho e posição à mão.
- `FaceDetector` só existe em alguns navegadores (ex.: Chrome em Android/ChromeOS com a
  funcionalidade ativa). Nos outros, o enquadramento automático usa uma estimativa.
- O processamento no telemóvel usa memória: a fotografia é reduzida a ≤ 1400 px no editor.
- O tipo passe é apenas um **formato visual**; não garante requisitos de nenhuma instituição.

---

## 10. Futuras APIs (o que será necessário)

Para remoção automática de fundo ou roupa gerada:

1. Escolher o fornecedor e ler a **documentação oficial** (API, limites, retenção de dados,
   localização dos servidores, uso dos dados para treino — tem de ser possível desativar).
2. Contrato / termos de tratamento de dados; atualizar a política de privacidade.
3. Credenciais em variáveis de ambiente (nunca no código), por ambiente (STAGING ≠ PRODUCTION).
4. Implementar uma classe `…Provider` em `src/lib/image-editing/` com essa documentação, registá-la
   em `EXTERNAL_BG` / `EXTERNAL_CLOTHING` (`index.ts`) e ligar `requestAutoBackgroundRemovalAction`.
5. Pedir **consentimento explícito** antes do primeiro envio (`User.imageAiConsentAt`), explicar
   para onde vai a imagem, enviar só por HTTPS, apagar temporários, e rotular o resultado como
   edição digital / gerado por IA.
6. Testes com o fornecedor em STAGING.
