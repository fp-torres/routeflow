# RouteFlow

**Gestão inteligente de operações em campo.**

RouteFlow centraliza a operação de um promotor que visita lojas (inicialmente farmácias das redes **Drogaria Venancio** e **Cristal**, no Rio de Janeiro): agenda, rotas Casa → lojas → Casa, visitas com fotos e observações, cartas de autorização em PDF com controle de vencimento, transporte e despesas, histórico, dashboards, relatórios em PDF/Excel e um painel público somente leitura para o empregador.

- Repositório: https://github.com/fp-torres/routeflow
- Produção: https://routeflow.forgedevapps.com (configurável via `APP_URL`)

---

## O que foi validado

| Verificação                                                                | Resultado                                                                                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Importação da planilha real (`data/Controle_Profissional_de_Visitas.xlsx`) | 43 lojas, 43 visitas, 5 rotas, roteiro semanal e endereço de casa — em **PostgreSQL e MariaDB**                                   |
| Idempotência (reimportar)                                                  | 2ª execução: 0 criados / 0 atualizados nos dois bancos                                                                            |
| Testes de API ponta a ponta (20 cenários)                                  | 20/20 no PostgreSQL 16 e 20/20 no MariaDB 10.11 (inclui “Lembrar acesso”, foto de perfil, cartas multi-loja, usuários/permissões) |
| Testes unitários                                                           | API 7/7, tipos/domínio 29/29 (carta, otimizador, saudação/fuso), design system 8/8 (máscaras), web 2/2                            |
| Sessão no navegador (Chromium)                                             | 4 cenários: desmarcado → pede login ao reabrir; marcado → entra direto ao reabrir; Sair → pede login; sessão inválida → login     |
| Lint (ESLint) e tipos (TypeScript strict)                                  | sem erros                                                                                                                         |
| Responsividade (Chromium)                                                  | 16 telas × 10 larguras (320–1920 px): 0 rolagens horizontais, 0 erros de console                                                  |
| Carta real da Drogaria Venancio (PDF)                                      | 41 filiais e datas lidas no navegador; 29/34 lojas da operação cobertas; V95, V120, V134, V34 e V108 apontadas como fora da carta |
| Pacote de produção                                                         | `npm install --omit=dev` + `NODE_ENV=production` + MariaDB: API, SPA e PDF funcionando                                            |

## Funcionalidades

- **Dashboard do funcionário** — saudação, rota de hoje (linha Casa → lojas → Casa), próxima visita, progresso, gastos do dia/mês, distância, alertas (autorizações vencendo, lojas sem carta, feriados), gráficos e linha do tempo.
- **Visão gerencial** — programadas, concluídas, pendentes, não realizadas, reagendadas, taxa de conclusão, visitas por rede/região/dia, despesas, distância e situação das autorizações.
- **Agenda** — Hoje, Semana, Mês e Personalizado; visitas previstas pelo roteiro aparecem antes de existirem.
- **Rotas em transporte público** — roteiro padrão (semanal), semanal em ciclo, mensal e alterações por data; arrastar para reordenar; cada trecho Casa → lojas → Casa com itinerário (a pé, ônibus, metrô, trem, VLT), tempo e custo; botão **“Ir para a próxima loja”** (Google Maps em transporte público a partir da localização atual); **otimização opcional e exata** pela soma dos tempos de transporte público (Held-Karp até 13 paradas), mantendo no lugar as visitas já feitas. Com a chave do Google Routes, linhas, estações e tempos reais aparecem no app.
- **Visitas no celular** — endereço + “Como chegar (transporte público)”, carta de autorização, iniciar (com localização aproximada opcional, sem rastreamento contínuo), fotos (câmera/galeria, várias, pré-visualização, progresso), observações, atividades, gastos, finalizar, não realizada, reagendar.
- **Fotos** — validação do tipo real (magic bytes) e tamanho, compressão no navegador e no servidor (WebP), miniatura, remoção de metadados EXIF (inclui GPS), tamanhos original/otimizado registrados.
- **Cartas de autorização** — **uma carta vale para várias lojas** (ex.: carta trimestral da Drogaria Venancio): ao enviar o PDF, as filiais e as datas da ação são **lidas automaticamente** e o sistema aponta as lojas da rede que ficaram fora da carta. Exigência por rede (Venancio exige; Cristal aparece como “Não exigida”) com exceção por loja. Abrir, baixar, substituir (versão anterior preservada), editar lojas/datas, excluir (lógica) e histórico. Vencimento: verde (> 30 dias), amarelo (30–8), vermelho (7–0) e vermelho crítico (expirada). Por padrão **não bloqueia** visitas (configurável).
- **Lojas** — CRUD, busca e filtros, mapa (OpenStreetMap), geocodificação e **cadastro rápido** (a aba "Cadastro Rápido" da planilha virou funcionalidade).
- **Despesas** — ônibus, metrô, trem, integração, táxi, aplicativo e outros; valor estimado e valor pago; totais diário/semanal/mensal e média por visita.
- **Relatórios** — Visitas, Rotas, Despesas, Autorizações, Histórico e Consolidado, em **PDF** (cabeçalho com marca, indicadores, gráfico, tabelas, paginação, rodapé) e **Excel** (abas Resumo/Visitas/Rotas/Lojas/Despesas/Autorizações, filtros, larguras, datas, moeda, status coloridos, cabeçalho congelado).
- **Edição depois de finalizar** — resultado, motivo, observações e horários de uma visita finalizada podem ser corrigidos; fotos, atividades e gastos podem ser adicionados depois. Tudo fica no histórico e na auditoria.
- **Usuários e permissões** — Administrador (tudo), Gestor (acompanha a operação, relatórios e links públicos) e Funcionário (opera o próprio dia). O administrador cria usuários, redefine senhas, desativa acessos, **transfere a operação** (roteiros, rotas, visitas e endereço de casa) e acompanha o dia de cada funcionário (“visualizando”).
- **Painel público** — `/public/dashboard/:token`, somente leitura, sem login e **sem expiração**: funciona até ser desativado (reversível) ou revogado (definitivo); o link pode ser copiado de novo a qualquer momento. Escopos: visitas, fotos, autorizações, despesas, rotas.
- **Geocodificação automática** — latitude/longitude das lojas e da casa obtidas sozinhas (OpenStreetMap, gratuito; ou Google), restritas ao município do Rio, ao iniciar a API e a cada 6 horas.
- **Acesso e perfil** — “Lembrar acesso” de verdade: marcado, o refresh token fica em cookie HttpOnly com validade (30 dias, renovado a cada uso) e a pessoa entra direto ao reabrir o navegador; desmarcado, o cookie é de sessão (some ao fechar o navegador). “Sair” revoga a sessão no servidor. Foto de perfil otimizada (WebP 384×384, sem metadados) no topo, no menu, no dashboard e na lista de usuários, com iniciais quando não há foto. Saudação por horário de Brasília: “Bom dia/Boa tarde/Boa noite, Maria — Quarta-feira, 07 de outubro”.
- **Máscaras de digitação** — valores em reais digitando só números (470 → R$ 4,70; 50000 → R$ 500,00), CEP (00000-000), UF, código de loja e coordenadas. Confirmações em diálogo próprio (funcionam também no app instalado).
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
- **Coordenadas:** obtidas automaticamente (OpenStreetMap) alguns segundos após a API iniciar — ~1 minuto para as 43 lojas. Endereços sem número (V104, V127) ficam com localização aproximada da rua; complete-os no cadastro da loja.
- **Tarifas:** a planilha não traz valores de transporte. O seed cria tarifas de **referência marcadas como não confirmadas** (ônibus R$ 4,70, MetrôRio R$ 7,90, SuperVia R$ 7,60); confirme os valores vigentes em Configurações › Tarifas.
- **Transporte público:** o Google Maps não aceita uma rota de transporte público com várias paradas num único link — por isso cada trecho (e o botão “próxima loja”) abre o trajeto real de transporte público no Google Maps. Dentro do app, sem chave, tempos e custos são **estimativas** rotuladas; com `ROUTE_PROVIDER=google` + `GOOGLE_MAPS_API_KEY` (Routes API) aparecem linhas, estações e tempos reais, e a otimização usa esses tempos (veja docs/deployment.md).
- **Domínio:** `routeflow.forgedevapps.com` precisa estar apontado para a Hostinger e com SSL ativo.
- **Privacidade:** a planilha contém o endereço residencial. Em repositório público, considere manter `data/` fora do Git (use `SEED_SPREADSHEET_PATH`).
- **Armazenamento S3/R2** e **offline completo** ainda não estão implementados (a interface `StorageDriver` e o PWA já estão preparados).
