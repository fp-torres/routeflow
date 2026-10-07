# Deploy — Hostinger Business Web Hosting (sem VPS)

A produção é **um único Node.js Web App** (NestJS servindo API e o build do React) + **banco MySQL/MariaDB do plano**. Não exige root, Docker, Redis, Nginx próprio nem PostgreSQL.

## 1. Banco de dados

1. hPanel › **Bancos de dados › MySQL** › criar banco e usuário (anote nome, usuário e senha).
2. A URL fica: `mysql://USUARIO:SENHA@localhost:3306/NOME_DO_BANCO` (use o host informado pelo hPanel se não for `localhost`). Codifique caracteres especiais da senha (ex.: `@` → `%40`).

## 2. Variáveis de ambiente (hPanel › Node.js › Environment variables)

| Variável                                 | Valor                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`                               | `production`                                                           |
| `DATABASE_PROVIDER`                      | `mysql`                                                                |
| `DATABASE_URL`                           | `mysql://...` (passo 1)                                                |
| `DB_POOL_SIZE`                           | `5`                                                                    |
| `JWT_SECRET`                             | segredo aleatório com 48+ caracteres (obrigatório ≥ 32)                |
| `APP_URL`                                | `https://routeflow.forgedevapps.com.br`                                |
| `TRUST_PROXY`                            | `true` (a Hostinger termina o HTTPS no proxy)                          |
| `STORAGE_PATH`                           | pasta **fora** da aplicação, ex.: `/home/u123456789/routeflow-storage` |
| `APP_TIMEZONE`                           | `America/Sao_Paulo`                                                    |
| `GEOCODING_PROVIDER`                     | `nominatim` (ou `google`) e `NOMINATIM_EMAIL`                          |
| `ROUTE_PROVIDER` / `GOOGLE_MAPS_API_KEY` | opcional (transporte público real)                                     |
| `SEED_USER_PASSWORD`                     | obrigatória para o seed em produção                                    |
| `RATE_LIMIT_PER_MINUTE`                  | `600`                                                                  |

A porta (`PORT`) é definida pela Hostinger. **Nunca** suba o arquivo `.env` para o repositório.

## 3. Aplicação Node.js — opção A (recomendada): pacote pré-compilado

O GitHub Actions compila tudo e publica o pacote de produção na branch **`deploy`** (sem builds pesados no servidor compartilhado).

1. hPanel › **Websites › Adicionar › Node.js Web App** › importar do GitHub `fp-torres/routeflow`, branch **`deploy`**.
2. Versão do Node: **22.x**. Diretório raiz: `/`.
3. Comando de build: `npm install --omit=dev` (o `build` do pacote é um no-op).
4. Comando de start: `npm start` — arquivo de entrada: `dist/main.js`.
5. Configure as variáveis (passo 2) e publique.
6. Primeira vez, pelo terminal SSH do hPanel (Business inclui SSH, porta 65002), na pasta da aplicação:
   ```bash
   npm run db:deploy                       # migrations MySQL/MariaDB
   SEED_USER_PASSWORD='senha-forte' npm run db:seed   # usuário + configurações + planilha
   npm run geocode:stores                  # opcional: coordenadas das lojas
   ```
   O `db:deploy` usa o Prisma CLI, que baixa o "schema engine" de `binaries.prisma.sh` na primeira execução.

O pacote também pode ser gerado localmente (`npm run build && npm run release:prepare -- --zip`) e enviado como ZIP pelo hPanel.

## 3. Aplicação Node.js — opção B: build no servidor

Conecte a branch **`main`** e use:

- Build: `npm ci && npm run build`
- Start: `npm run start:prod` (entrada `apps/api/dist/main.js`)

É mais pesada (instala dependências de desenvolvimento e compila no plano compartilhado); prefira a opção A.

## 4. Domínio, HTTPS e cookies

- Aponte `routeflow.forgedevapps.com.br` para a Hostinger (atenção: o domínio principal informado é `forgedevapps.com`; o **`.com.br`** precisa estar registrado e com DNS apontado — ou use `routeflow.forgedevapps.com` e ajuste `APP_URL`).
- Ative o SSL gratuito no hPanel. Com `TRUST_PROXY=true` os cookies de sessão são `Secure`, `HttpOnly` e `SameSite=Strict`.

## 5. Arquivos (fotos e PDFs)

Ficam em `STORAGE_PATH`, com URLs assinadas e temporárias. Use uma pasta **fora** da pasta do app para não perder arquivos em novos deploys, e inclua-a na rotina de backup. Fotos otimizadas ocupam ~200 KB–1 MB cada.

## 6. Recursos

O pacote instalado tem ~420 MB e ~19 mil arquivos (≈3% do limite de 600 mil inodes do plano). O processo é único e usa pool pequeno de conexões (`DB_POOL_SIZE=5`).

## CI/CD (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`) — em push/PR: lint, tipos, testes unitários, build; integração em PostgreSQL e MariaDB (migrations, divergência migrations × schema, e2e, seed 2×). Não precisa de segredos.
- **Deploy** (`.github/workflows/deploy.yml`) — após CI verde na `main` (ou manual): build, pacote `release/`, artefato `routeflow-release.zip` e push da branch `deploy`. Usa apenas o `GITHUB_TOKEN`.

Segredos **opcionais** (Settings › Secrets › Actions, ambiente `production`) para deploy por SSH:

| Segredo                     | Exemplo                                 |
| --------------------------- | --------------------------------------- |
| `HOSTINGER_SSH_HOST`        | IP/host SSH do hPanel                   |
| `HOSTINGER_SSH_PORT`        | `65002`                                 |
| `HOSTINGER_SSH_USER`        | `u123456789`                            |
| `HOSTINGER_SSH_KEY`         | chave privada autorizada no hPanel      |
| `HOSTINGER_APP_PATH`        | caminho da aplicação no servidor        |
| `HOSTINGER_RESTART_COMMAND` | comando de reinício, se o painel exigir |

Com esses segredos o workflow envia o pacote por `rsync`, roda `npm install --omit=dev` e `npm run db:deploy` no servidor. Sem eles, o deploy acontece pela integração Git da Hostinger com a branch `deploy` — confirme no hPanel se o redeploy automático está ativo.

## Atualizações e rollback

- Cada deploy é um commit na branch `deploy`; para voltar, redeploy de um commit anterior pelo hPanel (ou rode o workflow manualmente em uma versão anterior).
- Migrations são aditivas; faça backup (o plano tem backup diário) antes de mudanças de schema.

## Transporte público com dados reais (Google Routes API) — opcional

Sem chave, o RouteFlow já abre o trajeto real de transporte público no Google Maps (por trecho e pelo botão “Ir para a próxima loja”) e mostra estimativas rotuladas dentro do app. Para ver **linhas, estações e tempos reais no app** e otimizar com eles:

1. Google Cloud Console › crie um projeto › ative a **Routes API** (e, se quiser, a **Geocoding API**).
2. Crie uma chave de API e restrinja-a às APIs acima (e, em produção, ao IP do servidor).
3. Configure `ROUTE_PROVIDER=google` e `GOOGLE_MAPS_API_KEY=...` (opcional: `GEOCODING_PROVIDER=google`).
4. Reinicie a aplicação e use “Recalcular” na rota.

O Google cobra por uso, com uma cota mensal gratuita — confira os valores atuais no console. Cada rota consulta cada trecho uma vez (recalculado só quando a rota muda), e a otimização usa uma matriz de tempos guardada por 10 minutos. Em qualquer falha do Google, o sistema volta para a estimativa e avisa.

## Atualizando uma instalação existente

`npm run db:deploy` aplica as migrations pendentes (ex.: `20261008000000_multistore_letters_transit`, que converte as cartas existentes para o modelo “uma carta, várias lojas” sem perder dados).
