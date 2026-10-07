# Banco de dados

## Estratégia PostgreSQL (dev) × MySQL/MariaDB (produção)

|                  | Desenvolvimento                            | Produção (Hostinger)                        |
| ---------------- | ------------------------------------------ | ------------------------------------------- |
| Banco            | PostgreSQL 16 (Docker)                     | MySQL/MariaDB do plano                      |
| Schema           | `prisma/postgresql/schema.prisma`          | `prisma/mysql/schema.prisma`                |
| Migrations       | `prisma/postgresql/migrations`             | `prisma/mysql/migrations`                   |
| Client gerado    | `apps/api/src/generated/prisma/postgresql` | `apps/api/src/generated/prisma/mysql`       |
| Driver (runtime) | `@prisma/adapter-pg`                       | `@prisma/adapter-mariadb` (MySQL e MariaDB) |

Os dois schemas representam **a mesma modelagem**: só diferem no `provider` e no `output`. `npm run db:check` compara modelo a modelo e roda no CI; `npm run db:sync-schemas` gera o schema MySQL a partir do PostgreSQL.

O código é tipado com o client PostgreSQL; o client MySQL tem a mesma API em runtime. **Só** `apps/api/src/database/database.factory.ts` sabe qual provider está ativo (`DATABASE_PROVIDER`). Prisma 7 roda sem binários nativos (query compiler em WebAssembly + drivers JavaScript), o que evita problemas de compatibilidade em hospedagem compartilhada.

## Convenções de portabilidade

- IDs UUID gerados pelo Prisma em `VARCHAR(36)`;
- todo texto com tipo explícito (`@db.VarChar(n)` ou `@db.Text`); nada de índice em `TEXT`;
- dinheiro em `DECIMAL(10,2)`; datas de negócio em `DATE`; instantes em `TIMESTAMP(3)`/`DATETIME(3)` (UTC);
- JSON guardado como `TEXT` (serializado pela aplicação) — máxima compatibilidade com MariaDB;
- tabelas em `snake_case` minúsculo (evita problemas de `lower_case_table_names` no MySQL);
- busca sem diferenciar maiúsculas: `mode: insensitive` no PostgreSQL, collation `utf8mb4_unicode_ci` no MySQL;
- nenhum SQL específico de banco na aplicação.

## Modelo (20 tabelas)

| Tabela                                     | Conteúdo                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `users`                                    | usuários (EMPLOYEE, MANAGER, ADMIN)                                                                 |
| `refresh_tokens`                           | sessões (hash do token, rotação, revogação)                                                         |
| `home_addresses`                           | endereço de casa (origem/destino das rotas), com histórico                                          |
| `stores`                                   | lojas (código único, rede, endereço, bairro, região, coordenadas, `importKey`)                      |
| `authorization_letters`                    | cartas (PDF, emissão, início, vencimento, status ACTIVE/REVOKED, exclusão lógica)                   |
| `authorization_letter_history`             | histórico das cartas (criação, edição, substituição, exclusão)                                      |
| `routes`                                   | rota do dia por funcionário (`@@unique(employeeId, date)`), totais estimados e reais, último trecho |
| `route_stops`                              | paradas ordenadas, trecho até a parada (distância, tempo, modo, custo)                              |
| `route_templates` / `route_template_stops` | roteiros STANDARD / WEEKLY (ciclo) / MONTHLY (semana do mês)                                        |
| `visits`                                   | visitas (status, horários, localização no início/fim, motivo, reagendamento)                        |
| `visit_photos`                             | fotos (chaves de armazenamento, tamanhos, dimensões, categoria)                                     |
| `visit_activities`                         | observações, atividades, mudanças de status e fotos                                                 |
| `transport_expenses`                       | despesas (estimado, pago e valor considerado)                                                       |
| `transport_fares`                          | tarifas por tipo e vigência (`verified` indica valor confirmado)                                    |
| `notifications`                            | notificações internas (`dedupeKey` evita duplicidade)                                               |
| `audit_logs`                               | auditoria                                                                                           |
| `shared_accesses`                          | links públicos (hash do token, escopo, expiração, revogação)                                        |
| `company_settings`                         | configurações chave/valor                                                                           |
| `import_runs`                              | registro de cada importação (resumo e inconsistências)                                              |

Status de visita: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `NOT_COMPLETED`, `RESCHEDULED`, `CANCELLED`, `BLOCKED`. Categorias de foto: `FACADE`, `DISPLAY`, `PRODUCT`, `MATERIAL`, `RECEIPT`, `OTHER`.

Os campos `fileUrl`/`thumbnailUrl` guardam a **chave** do arquivo no StorageService; a API converte em URL assinada.

## Migrations

- A migration inicial PostgreSQL foi gerada pelo motor oficial do Prisma.
- A migration inicial MySQL segue as convenções de DDL do Prisma para MySQL e foi validada aplicando-a no MariaDB 10.11 e executando seed e os 16 testes de API. O CI confirma, com o motor oficial, que as migrations geram exatamente o schema (`prisma migrate diff --from-migrations ... --to-schema ... --exit-code`).
- Produção: `npm run db:migrate:mysql` (`prisma migrate deploy`). Nunca use `migrate dev` em produção (o script bloqueia).

## Seed

`npm run db:seed:postgres` / `npm run db:seed:mysql`: usuário inicial (ADMIN), configurações padrão, tarifas de referência (não confirmadas) e importação da planilha. É idempotente — rode quantas vezes quiser.
