# RouteFlow

**Gestão inteligente de operações em campo.**

RouteFlow centraliza a operação de um promotor que visita lojas (inicialmente farmácias das redes **Drogaria Venancio** e **Cristal**, no Rio de Janeiro): agenda, rotas Casa → lojas → Casa, visitas com fotos e observações, cartas de autorização em PDF com controle de vencimento, transporte e despesas, histórico, dashboards, relatórios em PDF/Excel e um painel público somente leitura para o empregador.

- Repositório: https://github.com/fp-torres/routeflow
- Produção: https://routeflow.forgedevapps.com.br (configurável via `APP_URL`)

---

## O que foi validado

| Verificação                                                                | Resultado                                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Importação da planilha real (`data/Controle_Profissional_de_Visitas.xlsx`) | 43 lojas, 43 visitas, 5 rotas, roteiro semanal e endereço de casa — em **PostgreSQL e MariaDB** |
| Idempotência (reimportar)                                                  | 2ª execução: 0 criados / 0 atualizados nos dois bancos                                          |
| Testes de API ponta a ponta (16 cenários)                                  | 16/16 no PostgreSQL 16 e 16/16 no MariaDB 10.11                                                 |
| Testes unitários                                                           | API 4/4, tipos/domínio 12/12, design system 5/5, web 2/2                                        |
| Lint (ESLint) e tipos (TypeScript strict)                                  | sem erros                                                                                       |
| Responsividade (Chromium)                                                  | 16 telas × 10 larguras (320–1920 px): 0 rolagens horizontais, 0 erros de console                |
| Pacote de produção                                                         | `npm install --omit=dev` + `NODE_ENV=production` + MariaDB: API, SPA e PDF funcionando          |

## Funcionalidades

- **Dashboard do funcionário** — saudação, rota de hoje (linha Casa → lojas → Casa), próxima visita, progresso, gastos do dia/mês, distância, alertas (autorizações vencendo, lojas sem carta, feriados), gráficos e linha do tempo.
- **Visão gerencial** — programadas, concluídas, pendentes, não realizadas, reagendadas, taxa de conclusão, visitas por rede/região/dia, despesas, distância e situação das autorizações.
- **Agenda** — Hoje, Semana, Mês e Personalizado; visitas previstas pelo roteiro aparecem antes de existirem.
- **Rotas** — roteiro padrão (semanal), roteiro semanal em ciclo (ex.: semanas A/B), roteiro mensal (semana do mês) e alterações por data; arrastar para reordenar; adicionar/remover lojas; **otimização opcional** (vizinho mais próximo + 2-opt); trechos com modo, tempo e custo; links do Google Maps (rota completa dividida em até 9 paradas por link e um link de transporte público por trecho).
- **Visitas no celular** — endereço + Google Maps, carta de autorização, iniciar (com localização aproximada opcional, sem rastreamento contínuo), fotos (câmera/galeria, várias, pré-visualização, progresso), observações, atividades, gastos, finalizar, não realizada, reagendar.
- **Fotos** — validação do tipo real (magic bytes) e tamanho, compressão no navegador e no servidor (WebP), miniatura, remoção de metadados EXIF (inclui GPS), tamanhos original/otimizado registrados.
- **Cartas de autorização** — várias por loja; enviar, abrir, baixar, substituir (versão anterior preservada), editar, excluir (lógica) e histórico. Vencimento: verde (> 30 dias), amarelo (30–8), vermelho (7–0) e vermelho crítico (expirada). Por padrão **não bloqueia** visitas (configurável).
- **Lojas** — CRUD, busca e filtros, mapa (OpenStreetMap), geocodificação e **cadastro rápido** (a aba "Cadastro Rápido" da planilha virou funcionalidade).
- **Despesas** — ônibus, metrô, trem, integração, táxi, aplicativo e outros; valor estimado e valor pago; totais diário/semanal/mensal e média por visita.
- **Relatórios** — Visitas, Rotas, Despesas, Autorizações, Histórico e Consolidado, em **PDF** (cabeçalho com marca, indicadores, gráfico, tabelas, paginação, rodapé) e **Excel** (abas Resumo/Visitas/Rotas/Lojas/Despesas/Autorizações, filtros, larguras, datas, moeda, status coloridos, cabeçalho congelado).
- **Painel público** — `/public/dashboard/:token`, somente leitura, token imprevisível (256 bits, só o hash é salvo), revogável, expiração opcional e escopos (visitas, fotos, autorizações, despesas, rotas).
- **Notificações internas, auditoria, PWA, dark/light/sistema, mobile-first.**

## Stack

| Camada   | Tecnologias                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, componentes no padrão shadcn/ui (Radix), Lucide, TanStack Query, React Hook Form, Zod, Recharts, dnd-kit, PWA (Workbox) |
| Backend  | Node.js 22, NestJS 11, TypeScript 5.9, Zod, sharp, pdfkit, ExcelJS                                                                                                    |
| Banco    | Prisma 7 (driver adapters, sem binários nativos em runtime) — **PostgreSQL** no desenvolvimento, **MySQL/MariaDB** em produção                                        |
| Testes   | Jest + Supertest (API), Vitest + Testing Library (web/UI/domínio)                                                                                                     |
| Infra    | Docker Compose (PostgreSQL local), GitHub Actions (CI/CD), Hostinger Business Web Hosting (sem VPS)                                                                   |

## Arquitetura (resumo)

```
                 Navegador / PWA (React + Vite)
                            │  HTTPS (mesma origem)
                            ▼
   ┌──────────────── Processo Node.js único (NestJS) ────────────────┐
   │  /api/*  REST (módulos: auth, stores, visits, routes, ...)      │
   │  /health                                                        │
   │  /*      build do React (fallback da SPA)                       │
   │  StorageService (fotos/PDFs em disco, URLs assinadas)           │
   └───────────────┬─────────────────────────────────────────────────┘
                   │ Prisma 7 + driver adapter (pg | mariadb)
                   ▼
     PostgreSQL (dev, Docker)      MySQL/MariaDB (produção, Hostinger)
```

Detalhes em [docs/architecture.md](docs/architecture.md).

## Estrutura do monorepo

```
apps/api          NestJS (API + serve o frontend em produção)
apps/web          React + Vite (PWA)
packages/types    contratos Zod, enums, DTOs e regras de domínio (datas, feriados, vencimentos, mapas, otimizador)
packages/ui       design system (Button, Card, Dialog, Drawer, DataTable, Calendar, PhotoUploader, RouteLine, ...)
packages/config   tsconfig e ESLint compartilhados
prisma/postgresql schema + migrations (PostgreSQL)
prisma/mysql      schema + migrations (MySQL/MariaDB) — mesma modelagem
scripts/          db.mjs (comandos de banco protegidos), import-spreadsheet.ts, prepare-release.mjs, check-prisma-schemas.mjs
data/             planilha inicial (fonte dos dados reais)
docs/             documentação
.github/workflows CI e deploy
```

## Começando (desenvolvimento local — Ubuntu/Linux)

Pré-requisitos: **Node.js 22** (veja `.nvmrc`), npm 10+, Docker.

```bash
cp .env.example .env              # ajuste JWT_SECRET
docker compose up -d              # PostgreSQL 16 (volume persistente)
npm ci                            # use "npm ci" (veja a observação sobre npm abaixo)
npm run db:generate               # gera os Prisma Clients (PostgreSQL e MySQL)
npm run db:migrate:postgres       # aplica as migrations
npm run db:seed:postgres          # usuário inicial + configurações + planilha real
npm run dev                       # API em :3000 e web em http://localhost:5173
```

Login inicial: `felipe@routeflow.local` / senha de `SEED_USER_PASSWORD` (vazia em desenvolvimento = `RouteFlow@2026`; **troque no primeiro acesso** em Configurações › Perfil).

Guia completo: [docs/local-development.md](docs/local-development.md).

## Scripts principais

| Script                                                           | O que faz                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                                                    | API (watch) + Vite                                     |
| `npm run build`                                                  | gera clients Prisma, compila pacotes, web e API        |
| `npm start`                                                      | inicia a aplicação compilada (`apps/api/dist/main.js`) |
| `npm test` / `npm run test:unit` / `npm run test:e2e`            | testes                                                 |
| `npm run lint` / `npm run typecheck`                             | qualidade                                              |
| `npm run db:generate[:postgres\|:mysql]`                         | Prisma Client                                          |
| `npm run db:migrate:postgres` / `npm run db:migrate:mysql`       | aplica migrations (`migrate deploy`)                   |
| `npm run db:migrate:dev:postgres` / `:mysql`                     | cria novas migrations em desenvolvimento               |
| `npm run db:seed:postgres` / `npm run db:seed:mysql`             | seed (idempotente)                                     |
| `npm run db:check`                                               | garante que os dois schemas são equivalentes           |
| `npm run import:xlsx -- --file <arquivo> [--dry-run] [--update]` | importa uma planilha                                   |
| `npm run geocode:stores`                                         | preenche latitude/longitude (OpenStreetMap ou Google)  |
| `npm run release:prepare`                                        | gera o pacote de produção em `release/`                |

Os comandos de banco recusam a URL errada (ex.: migration PostgreSQL apontando para MySQL) e bloqueiam PostgreSQL com `NODE_ENV=production`.

## Banco de dados

Dois schemas Prisma com **a mesma modelagem** (20 tabelas): `prisma/postgresql` (desenvolvimento) e `prisma/mysql` (produção). Eles só podem diferir no `provider` e no `output`; `npm run db:check` (também no CI) garante isso. A aplicação usa um único ponto de criação do client (`apps/api/src/database/database.factory.ts`) que escolhe o client e o driver conforme `DATABASE_PROVIDER`. Veja [docs/database.md](docs/database.md).

## Planilha

A planilha anexada é a **fonte dos dados iniciais**; depois disso o banco é a fonte oficial. A importação é idempotente, preserva redes/regiões/endereços/dias/ordem e **registra** (sem apagar) as inconsistências encontradas — 11 na planilha atual (ex.: Farmácia Drogakar e V104 estão na aba Visitas de 08/10 mas não na aba Rotas). Veja [docs/import-spreadsheet.md](docs/import-spreadsheet.md).

## Produção (Hostinger Business, sem VPS)

Um único processo Node.js serve API e frontend; banco MySQL/MariaDB do plano; arquivos em disco (pasta persistente). Duas formas de deploy: branch `deploy` pré-compilada pelo GitHub Actions (recomendada) ou build no próprio hPanel. Passo a passo em [docs/deployment.md](docs/deployment.md).

## CI/CD

- `ci.yml`: lint, tipos, testes unitários e build; integração real em PostgreSQL **e** MariaDB (migrations, verificação de divergência migrations × schema, e2e, seed 2×).
- `deploy.yml`: após o CI na `main`, publica o pacote na branch `deploy` (Hostinger) e, opcionalmente, envia por SSH e roda migrations. Segredos documentados em [docs/deployment.md](docs/deployment.md#cicd-github-actions).

## Observações importantes

- **npm 10:** o `npm install` sem lockfile do npm 10 (que acompanha o Node 22) tem um bug interno com dependências opcionais deste monorepo. Use `npm ci` (o `package-lock.json` está incluído). Para **alterar** dependências, use `npx npm@11 install <pacote>`.
- **Coordenadas:** a planilha não traz latitude/longitude. Distâncias, custos estimados e otimização dependem delas: rode `npm run geocode:stores` (OpenStreetMap, gratuito, ~1 loja/s) ou informe manualmente. Os links do Google Maps funcionam sem coordenadas.
- **Tarifas:** a planilha não traz valores de transporte. O seed cria tarifas de **referência marcadas como não confirmadas** (ônibus R$ 4,70, MetrôRio R$ 7,90, SuperVia R$ 7,60); confirme os valores vigentes em Configurações › Tarifas.
- **Transporte público real** (linhas, horários) exige `ROUTE_PROVIDER=google` + `GOOGLE_MAPS_API_KEY` (Routes API). Sem chave, o sistema usa e rotula claramente uma **estimativa local**.
- **Domínio:** o domínio principal informado é `forgedevapps.com`, mas a aplicação usa `routeflow.forgedevapps.com.br`; o `.com.br` precisa estar registrado e apontado para a Hostinger.
- **Privacidade:** a planilha contém o endereço residencial. Em repositório público, considere manter `data/` fora do Git (use `SEED_SPREADSHEET_PATH`).
- **Armazenamento S3/R2** e **offline completo** ainda não estão implementados (a interface `StorageDriver` e o PWA já estão preparados).
