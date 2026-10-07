# Importação da planilha XLSX

A planilha `Controle_Profissional_de_Visitas.xlsx` (em `data/`) é a **fonte dos dados iniciais reais**. Depois da importação, o banco passa a ser a fonte oficial.

## Como executar

```bash
npm run db:seed:postgres                         # seed completo (usuário + configurações + planilha)
npm run import:xlsx -- --dry-run                 # simula: mostra o que seria criado e as inconsistências
npm run import:xlsx -- --file data/outra.xlsx    # importa outra planilha
npm run import:xlsx -- --update                  # também atualiza registros existentes com os dados da planilha
npx tsx scripts/import-spreadsheet.ts --file ... # atalho equivalente na raiz do monorepo
```

Também pela interface: **Configurações › Importação** (com opção de simulação) e pela API `POST /api/import/spreadsheet`. Cada execução é registrada em `import_runs` com o resumo e as inconsistências.

## Mapeamento

| Aba / coluna                                                                                          | Destino                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Rotas** — "Base de saída e retorno"                                                                 | `home_addresses` do funcionário (origem e destino das rotas)                                                       |
| **Rotas** — Data, Região, Ordem, Código, Rede, Unidade/Loja, Endereço                                 | `routes` (uma por data) e `route_stops` na **ordem** da planilha; endereço dividido em logradouro, bairro e cidade |
| **Rotas** — linhas RETORNO                                                                            | conferidas contra a base (não viram parada)                                                                        |
| **Visitas** — Data, Semana, Região, Rede, Código, Unidade/Loja, Endereço, Bairro, Status, Observações | `visits` (+ lojas em `stores`)                                                                                     |
| **Rotas** (por dia da semana)                                                                         | `route_templates` "Roteiro padrão (importado da planilha)"                                                         |
| **Cadastro Rápido** — "Código/Loja — Endereço — Bairro"                                               | lojas (quando houver linhas preenchidas)                                                                           |
| **Config** — Redes, Regiões                                                                           | listas das configurações                                                                                           |
| **Dashboard** — "Planejamento iniciado em ..."                                                        | `company_settings` (`operation.planningNote` e `operation.planningStartDate`)                                      |

Regras:

- **Rede:** a coluna Rede é uma fórmula sem valor salvo; o importador aplica a mesma regra da planilha — código iniciado por **V + número** → Drogaria Venancio; loja identificada pelo nome → Cristal (configurável).
- **Lojas sem código** (Cristal) recebem um código provisório estável, ex.: `CRI-DROGARIA-MALIBU` (editável).
- **Lojas sem nome** (Venancio) recebem "rede + código", ex.: `Drogaria Venancio V47`.
- **Status:** Pendente, Em andamento, Concluído, Não realizado e Reagendado → enums do sistema.

## Idempotência

- Lojas: `importKey` (`store:<rede>:<código ou nome>`), depois código, depois rede + nome.
- Rotas: funcionário + data. Visitas: `importKey` (`visit:<funcionário>:<data>:<loja>`). Roteiro: `template:standard:<funcionário>`.
- Reimportar **não duplica**. Por padrão **não sobrescreve** o que foi alterado no sistema; apenas preenche campos vazios (use `--update` para sobrescrever).
- Nada é apagado silenciosamente: problemas viram registros em `import_runs` e na saída do comando.

## Inconsistências encontradas na planilha anexada

| Tipo                       | Detalhe                                                                                                                                                          | Tratamento                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Loja fora da rota          | **Farmácia Drogakar** (Rua Visconde de Pirajá, 12, loja B — Ipanema) e **V104** aparecem na aba Visitas em 08/10/2026, mas não na aba Rotas (que lista 10 lojas) | adicionadas ao fim da rota do dia (posições 11 e 12) — revise a ordem                           |
| Endereço sem número        | **V104** "Rua Ataulfo de Paiva" (no Leblon é _Avenida_ Ataulfo de Paiva) e **V127** "Rua São Francisco Xavier"                                                   | importados como estão; complete para geocodificação precisa                                     |
| Fórmulas sem valor salvo   | 129 células (Mês, Dia da semana, Rede)                                                                                                                           | valores recalculados pelo importador                                                            |
| Lojas sem nome             | 34 lojas Venancio só com código                                                                                                                                  | nome "rede + código"                                                                            |
| Lojas sem código           | 9 lojas Cristal                                                                                                                                                  | código provisório estável                                                                       |
| Link "ABRIR ROTA COMPLETA" | combina transporte público com paradas intermediárias — o Google Maps não suporta                                                                                | rota completa em carro/a pé (até 9 paradas por link) + um link de transporte público por trecho |
| Limite de paradas          | 08/10 tem 12 lojas (o Google Maps aceita 9 por link)                                                                                                             | rota completa dividida em 2 partes                                                              |
| Feriado                    | 12/10/2026 (Nossa Senhora Aparecida) tem 9 visitas programadas                                                                                                   | alerta na agenda e no dashboard                                                                 |
| Gráficos                   | a aba Dashboard tem 5 gráficos nativos do Excel                                                                                                                  | ignorados (não são dados); o RouteFlow gera os próprios                                         |

## Compatibilidade de arquivo

A planilha foi gerada por uma ferramenta que grava relacionamentos internos com caminhos absolutos e contém gráficos; ambos derrubam o leitor ExcelJS. O importador normaliza esses pontos **em memória** antes da leitura (o arquivo original não é alterado). Planilhas salvas pelo Excel também são aceitas.
