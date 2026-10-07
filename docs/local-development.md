# Desenvolvimento local (Ubuntu/Linux)

## Pré-requisitos

- Node.js **22** (`nvm use` lê o `.nvmrc`) e npm 10+
- Docker + Docker Compose (para o PostgreSQL)
- Portas livres: 3000 (API), 5173 (Vite), 5432 (PostgreSQL)

## Primeira execução

```bash
cp .env.example .env
# gere um segredo: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# e cole em JWT_SECRET no .env

docker compose up -d                 # PostgreSQL 16 com volume persistente (routeflow-postgres-data)
npm ci
npm run db:generate
npm run db:migrate:postgres
npm run db:seed:postgres
npm run dev
```

- Web: http://localhost:5173 (o Vite encaminha `/api` para a API)
- API: http://localhost:3000/api — health check em http://localhost:3000/health
- Login: `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` (padrão de desenvolvimento: `felipe@routeflow.local` / `RouteFlow@2026`)

O fluxo é: **Docker → PostgreSQL → Prisma → NestJS → React/Vite**.

## Sem Docker: PostgreSQL já instalado (ex.: pgAdmin 4)

1. Crie um banco vazio (ex.: `routeflow`) no pgAdmin (Databases › Create › Database).
2. Veja usuário/porta em _Server › Properties › Connection_ (normalmente `postgres` / `5432`).
3. No `.env`: `DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/routeflow?schema=public` (caracteres especiais da senha em URL encoding: `@` → `%40`, `#` → `%23`).
4. Siga a partir de `npm ci` (pule o `docker compose`).

Se a porta 3000 estiver ocupada por outro projeto, mude `PORT` no `.env`: a API e o proxy do Vite passam a usar a nova porta.

## Por que `npm ci`?

O npm 10 (que vem com o Node 22) falha com `Cannot read properties of null (reading 'edgesOut')` ao **resolver** a árvore deste monorepo do zero (bug do npm com dependências opcionais de pares). O `package-lock.json` incluído foi gerado com npm 11 e o `npm ci` do npm 10 instala a partir dele normalmente. Para adicionar/atualizar dependências use `npx npm@11 install <pacote> -w <workspace>`.

## Banco de produção localmente (MariaDB)

Para reproduzir a produção (MySQL/MariaDB) na sua máquina:

```bash
docker compose --profile mysql up -d mariadb
# no .env:
# DATABASE_URL_MYSQL=mysql://routeflow:routeflow@localhost:3306/routeflow
npm run db:migrate:mysql
npm run db:seed:mysql
# para rodar a API contra o MariaDB:
DATABASE_PROVIDER=mysql DATABASE_URL=mysql://routeflow:routeflow@localhost:3306/routeflow npm run dev:api
```

## Criando novas migrations

1. Altere `prisma/postgresql/schema.prisma`.
2. Replique no MySQL: `npm run db:sync-schemas` (ou edite os dois e confira com `npm run db:check`).
3. PostgreSQL: `npm run db:migrate:dev:postgres -- --name nome_da_mudanca` (precisa de `SHADOW_DATABASE_URL` ou permissão de criar bancos).
4. MySQL/MariaDB: com o MariaDB local ativo, `npm run db:migrate:dev:mysql -- --name nome_da_mudanca` (defina `SHADOW_DATABASE_URL=mysql://root:...@localhost:3306/routeflow_shadow`).
5. Rode os testes nos dois bancos. O CI verifica se as migrations geram exatamente o schema (`prisma migrate diff --exit-code`).

## Testes

```bash
npm run test:unit                 # tipos/domínio, UI, web e unitários da API

# Integração/API (usa um banco de TESTE — ele é limpo no início; o nome precisa conter "test")
createdb -h localhost -U routeflow routeflow_test   # ou via docker exec
DATABASE_URL=postgresql://routeflow:routeflow@localhost:5432/routeflow_test npm run db:migrate:postgres
E2E_DATABASE_PROVIDER=postgresql E2E_DATABASE_URL=postgresql://routeflow:routeflow@localhost:5432/routeflow_test npm run test:e2e

E2E_DATABASE_PROVIDER=mysql E2E_DATABASE_URL=mysql://root:routeflow-root@localhost:3306/routeflow_test npm run test:e2e
```

## Build e execução como em produção

```bash
npm run build      # clients Prisma + pacotes + web + API
npm start          # a API serve o React (http://localhost:3000)
```

## Problemas comuns

| Sintoma                                                                  | Solução                                                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `Configuração inválida ... DATABASE_URL`                                 | crie o `.env` a partir do `.env.example`                                                                       |
| `DATABASE_URL (mysql://) não corresponde a DATABASE_PROVIDER=postgresql` | ajuste o provider ou a URL — é uma proteção                                                                    |
| Prisma não baixa o "schema engine"                                       | `prisma migrate` precisa baixar o motor de `binaries.prisma.sh` na primeira execução; verifique proxy/firewall |
| Distâncias/custos aparecem como "—"                                      | as lojas não têm coordenadas: `npm run geocode:stores` (ou edite a loja)                                       |
| Porta 5432 ocupada                                                       | altere `POSTGRES_PORT` no `.env` e a porta da `DATABASE_URL`                                                   |
