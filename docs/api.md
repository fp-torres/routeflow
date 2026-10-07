# API REST

- Base: `/api` (mesma origem do frontend). Health check: `GET /health` → `{"status":"ok"}`.
- Autenticação: `Authorization: Bearer <accessToken>` (obtido em `/api/auth/login`).
- Datas de negócio: `YYYY-MM-DD`; instantes: ISO 8601 UTC; dinheiro: número em reais.
- Erros: `{ "statusCode": 400, "message": "Alguns dados estão inválidos...", "errors": [{ "path": "date", "message": "Data inválida" }], "requestId": "..." }` — mensagens sempre em português, sem detalhes técnicos.
- Listas paginadas: `{ items, page, pageSize, total, totalPages }`.

## Autenticação e usuário

| Método    | Rota                 | Descrição                                         |
| --------- | -------------------- | ------------------------------------------------- |
| POST      | `/auth/login`        | e-mail e senha → access token + cookie de refresh |
| POST      | `/auth/refresh`      | renova a sessão (cookie)                          |
| POST      | `/auth/logout`       | encerra a sessão                                  |
| GET       | `/auth/me`           | usuário atual                                     |
| GET/PATCH | `/users/me`          | perfil                                            |
| POST      | `/users/me/password` | troca de senha                                    |
| GET       | `/users`             | usuários (MANAGER/ADMIN)                          |

## Operação

| Método                | Rota                                    | Descrição                                                                                          |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET                   | `/dashboard`                            | dashboard do funcionário                                                                           |
| GET                   | `/dashboard/manager?from&to&employeeId` | indicadores do gestor                                                                              |
| GET                   | `/agenda?from&to`                       | dias com visitas e visitas previstas pelo roteiro                                                  |
| GET/POST              | `/routes`                               | listar (`from`,`to`) / criar rota de uma data                                                      |
| POST                  | `/routes/generate`                      | gerar rotas do período pelo roteiro                                                                |
| GET/PATCH             | `/routes/:id`                           | detalhe (paradas, trechos, links do Maps) / atualizar                                              |
| POST                  | `/routes/:id/stops`                     | adicionar loja                                                                                     |
| DELETE                | `/routes/:id/stops/:stopId`             | remover parada (somente pendente e sem fotos)                                                      |
| PUT                   | `/routes/:id/stops/order`               | reordenar (`stopIds`)                                                                              |
| POST                  | `/routes/:id/optimize`                  | proposta de ordem (`apply: true` aplica)                                                           |
| POST                  | `/routes/:id/recalculate`               | recalcular trechos com o RouteProvider                                                             |
| GET/POST/PATCH/DELETE | `/route-templates[/:id]`                | roteiros                                                                                           |
| PUT                   | `/route-templates/:id/days/:weekday`    | lojas de um dia do roteiro                                                                         |
| GET/POST              | `/visits`                               | listar (filtros: `date`, `from`, `to`, `status`, `storeId`, `network`, `region`, `search`) / criar |
| GET/PATCH             | `/visits/:id`                           | detalhe / observações e status                                                                     |
| POST                  | `/visits/:id/start`                     | iniciar (lat/lng opcionais)                                                                        |
| POST                  | `/visits/:id/finish`                    | finalizar (`COMPLETED` ou `NOT_COMPLETED` + motivo)                                                |
| POST                  | `/visits/:id/activities`                | observação ou atividade                                                                            |
| POST                  | `/visits/:id/reschedule`                | reagendar                                                                                          |
| POST                  | `/visits/:id/photos`                    | multipart `files[]`, `category`, `originalSizes`                                                   |
| DELETE                | `/visits/:id/photos/:photoId`           | remover foto                                                                                       |

## Lojas e autorizações

| Método           | Rota                                                         | Descrição                                                  |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| GET/POST         | `/stores`                                                    | listar (busca/filtros) / criar                             |
| GET              | `/stores/catalog`                                            | redes, regiões e bairros                                   |
| POST             | `/stores/quick-add/preview` · `/stores/quick-add`            | cadastro rápido                                            |
| POST             | `/stores/geocode` · `/stores/:id/geocode`                    | coordenadas                                                |
| GET/PATCH/DELETE | `/stores/:id`                                                | detalhe / editar / desativar                               |
| GET              | `/authorizations?validity&search&storeId&expiringWithinDays` | cartas                                                     |
| GET/POST         | `/stores/:storeId/authorizations`                            | cartas da loja / enviar PDF (multipart `file` + metadados) |
| GET/PATCH/DELETE | `/authorizations/:id`                                        | detalhe / editar datas / excluir (lógica)                  |
| POST             | `/authorizations/:id/file`                                   | substituir PDF                                             |
| GET              | `/authorizations/:id/history`                                | histórico                                                  |

## Despesas, transporte, relatórios

| Método                | Rota                                | Descrição                                                                                                                                             |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET/POST              | `/expenses`                         | listar / registrar                                                                                                                                    |
| PATCH/DELETE          | `/expenses/:id`                     | editar / excluir                                                                                                                                      |
| GET                   | `/expenses/summary`                 | dia, semana, mês, média por visita, por tipo                                                                                                          |
| GET/POST/PATCH/DELETE | `/transport/fares[/:id]`            | tarifas                                                                                                                                               |
| GET                   | `/transport/providers`              | provedores configurados                                                                                                                               |
| GET                   | `/reports/:type/preview\|pdf\|xlsx` | `type`: visits, routes, expenses, authorizations, history, consolidated; filtros `from`, `to`, `network`, `region`, `storeId`, `status`, `employeeId` |

## Administração

| Método    | Rota                                                                                                                    | Descrição                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| GET/PATCH | `/settings`                                                                                                             | regras da operação                                 |
| GET/PUT   | `/me/home-address`                                                                                                      | endereço de casa                                   |
| GET/POST  | `/notifications` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `GET /notifications/unread-count` | notificações                                       |
| GET/POST  | `/shared-access` · `POST /shared-access/:id/revoke`                                                                     | links públicos (MANAGER/ADMIN)                     |
| POST      | `/import/spreadsheet`                                                                                                   | importar XLSX (`dryRun`, `updateExisting`) — ADMIN |
| GET       | `/import/runs`                                                                                                          | importações anteriores                             |
| GET       | `/audit`                                                                                                                | auditoria                                          |
| GET       | `/files/:chave?e&s`                                                                                                     | arquivo por URL assinada (público, temporário)     |

## Painel público (sem login, somente leitura)

`GET /public/:token` (indicadores e visitas recentes), `/public/:token/visits[/:id]`, `/public/:token/authorizations`, `/public/:token/expenses`, `/public/:token/routes` — cada recurso exige o escopo correspondente; tokens revogados ou expirados respondem 404.

## Exemplo

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"felipe@routeflow.local","password":"RouteFlow@2026"}' | jq -r .accessToken)
curl -s "http://localhost:3000/api/visits?date=2026-10-07" -H "Authorization: Bearer $TOKEN" | jq '.items[].store.name'
```
