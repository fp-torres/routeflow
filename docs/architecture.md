# Arquitetura

## Visão geral: monólito modular

Um único processo Node.js (NestJS 11) atende `/api/*`, `/health` e serve o build do React (fallback da SPA). Isso cabe no Node.js Web App da Hostinger sem VPS, sem processos auxiliares e sem Redis. Os módulos são independentes e se comunicam por serviços injetados — prontos para extração futura, se um dia fizer sentido.

```
apps/api/src
  config/        variáveis de ambiente validadas com Zod (falha cedo e com mensagem clara)
  database/      fábrica do Prisma Client por provider (único ponto que conhece PostgreSQL/MySQL)
  common/        guards (JWT, papéis), filtro de erros, pipe Zod, mapeadores, utilitários
  modules/
    auth, users            login, refresh rotativo, logout, perfil, senha
    settings               regras da operação (chave/valor) e endereço de casa
    stores                 lojas, catálogo, cadastro rápido, geocodificação
    authorizations         cartas em PDF, vencimentos, histórico
    routes                 rotas do dia, roteiros (padrão/semanal/mensal), agenda, otimização
    visits                 fluxo da visita e pipeline de fotos
    transport              tarifas e provedores de rota (RouteProvider)
    geocoding              Nominatim / Google
    expenses               despesas e resumos
    dashboard              indicadores do funcionário e do gestor
    reports                PDF (pdfkit) e Excel (ExcelJS)
    shared                 links públicos (tokens) e API somente leitura do painel
    notifications          central interna + rotina diária
    audit                  trilha de auditoria
    storage                StorageService + arquivos com URL assinada
    importer               leitura da planilha + importação idempotente
    health                 /health e /api/health/details
  cli/           seed, import-spreadsheet, geocode-stores (usados em dev e produção)
```

## Fluxo de autenticação

1. `POST /api/auth/login` valida a senha (bcrypt, custo 12) e devolve um **access token JWT** (15 min, mantido só em memória no navegador) + cookie **httpOnly** `rf_rt` com o refresh token (`Path=/api/auth`, `SameSite=Strict`, `Secure` em produção).
2. O banco guarda apenas o **hash SHA-256** do refresh token. Cada renovação **rotaciona** o token; reutilizar um token já trocado encerra todas as sessões do usuário.
3. O cookie não sensível `rf_session=1` só informa ao frontend que existe sessão a renovar (evita chamadas 401 desnecessárias).
4. `JwtAuthGuard` (global) protege todas as rotas, exceto as marcadas com `@Public()`; `RolesGuard` aplica `@Roles()` — ADMIN tem acesso total, MANAGER enxerga toda a operação, EMPLOYEE vê os próprios dados.

## Planejamento de rotas

Precedência para uma data: **rota já existente (alteração na data) > roteiro mensal > roteiro semanal (ciclo) > roteiro padrão**. A agenda mostra visitas "previstas" a partir dos roteiros e o sistema materializa as rotas dos próximos dias (configurável: `autoGenerateRoutes`, `routeGenerationHorizonDays`). Datas passadas nunca são inventadas. Cada parada (`route_stops`) aponta para sua visita (`visits`), e reordenar atualiza as duas.

A **otimização é opcional**: `POST /routes/:id/optimize` devolve uma proposta (vizinho mais próximo + 2-opt sobre o circuito Casa → lojas → Casa) e só altera a ordem com `apply: true`.

## Provedores plugáveis (sem integrações fingidas)

| Interface       | Implementações                                                                                                  | Configuração                            |
| --------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `RouteProvider` | `EstimateRouteProvider` (local, rotulado "estimativa"), `GoogleRoutesProvider` (Routes API, transporte público) | `ROUTE_PROVIDER`, `GOOGLE_MAPS_API_KEY` |
| Geocodificação  | Nominatim (OpenStreetMap, 1 req/s), Google Geocoding                                                            | `GEOCODING_PROVIDER`                    |
| `StorageDriver` | `LocalStorageDriver` (disco) — S3/R2 implementam a mesma interface                                              | `STORAGE_DRIVER`, `STORAGE_PATH`        |

Sem chave do Google, nada é simulado: a interface informa que os valores são estimativas e os links do Google Maps (que não exigem chave) continuam funcionando.

## Arquivos

A regra de negócio só conhece **chaves** (`photos/2026/10/<visita>/<uuid>.webp`). A API entrega **URLs assinadas** (HMAC-SHA256, expiração arredondada à hora para permitir cache) — funcionam em `<img>`, abrem PDFs no celular e não exigem cabeçalho de autenticação. Gravação atômica (arquivo temporário + rename) e proteção contra _path traversal_.

## Fotos

Navegador: compressão para ~2560 px / JPEG 0,86 antes do envio (economia de dados móveis). Servidor: validação por _magic bytes_, limite de tamanho, correção de orientação EXIF, redimensionamento (2048 px), WebP (qualidade 82), miniatura (480 px) e remoção de metadados (inclusive GPS).

## Frontend

- `apps/web/src/features/*` — uma pasta por área (dashboard, agenda, rotas, visitas, lojas, autorizações, despesas, histórico, relatórios, configurações, público), páginas carregadas sob demanda (_code splitting_).
- `packages/ui` — design system único (sem duplicação de componentes); `packages/types` — contratos Zod e regras de domínio compartilhadas com a API.
- Estado do servidor com TanStack Query; formulários validados pelos mesmos schemas Zod da API.
- Mobile first: navegação inferior (Início, Agenda, Rotas, Visitas, Despesas + Mais), alvos de toque ≥ 44 px, diálogos que viram "folhas" no celular, tabelas que viram cartões, sem rolagem horizontal (validado de 320 a 1920 px).
- Tema claro/escuro/sistema salvo no dispositivo; PWA com instalação, ícones e cache do app (dados não ficam offline nesta versão).
- Identidade: a rota desenhada como linha de transporte (Casa → lojas → Casa) em laranja "linha"; tipografia Atkinson Hyperlegible Next, escolhida pela legibilidade sob sol e em movimento.

## Segurança

Validação Zod em todas as entradas, CORS restrito ao `APP_URL`, Helmet com CSP, rate limiting (global e específico para login/refresh), uploads com limite e verificação de tipo real, autorização por papel, auditoria, erros sem detalhes técnicos (com `requestId` para rastreio no log), segredos apenas em variáveis de ambiente.

## Desempenho

Paginação nas listagens, consultas com `select`/índices, _lazy loading_ de páginas e imagens, miniaturas nas grades, compressão HTTP, cache imutável dos assets com hash, pool de conexões pequeno para hospedagem compartilhada.
