import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  addressHasNumber,
  buildStoreImportKey,
  comparableKey,
  DEFAULT_CITY,
  DEFAULT_NETWORK_RULES,
  formatDateBR,
  holidayOn,
  isIsoDate,
  isoWeekday,
  MAX_WAYPOINTS_PER_LINK,
  networkForCode,
  normalizeStoreCode,
  normalizeText,
  parseBrDate,
  parseQuickAddLine,
  SPREADSHEET_STATUS_MAP,
  utcDateToIso,
  WEEKDAY_LABEL,
  type ImportIssue,
  type IsoDate,
  type NetworkRules,
  type VisitStatus,
} from '@routeflow/types';

export interface StoreDraft {
  key: string;
  code: string | null;
  name: string;
  nameDerived: boolean;
  network: string;
  address: string;
  neighborhood: string | null;
  city: string;
  region: string | null;
  sources: string[];
}

export interface VisitDraft {
  date: IsoDate;
  storeKey: string;
  status: VisitStatus;
  notes: string | null;
  region: string | null;
  week: string | null;
  row: number;
}

export interface RouteDraft {
  date: IsoDate;
  region: string | null;
  /** Ordem final: aba Rotas + lojas presentes apenas na aba Visitas ao final */
  storeKeys: string[];
}

export interface ParsedSpreadsheet {
  baseAddress: string | null;
  stores: Map<string, StoreDraft>;
  visits: VisitDraft[];
  routes: RouteDraft[];
  weekdayTemplate: Map<number, string[]>;
  catalogs: { statuses: string[]; networks: string[]; regions: string[] };
  planningNote: string | null;
  planningStartDate: IsoDate | null;
  issues: ImportIssue[];
}

type CellValue = ExcelJS.CellValue;

function rawValue(value: CellValue): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>;
    if ('richText' in v) return (v.richText as Array<{ text: string }>).map((t) => t.text).join('');
    if ('formula' in v || 'sharedFormula' in v) return v.result ?? null;
    if ('hyperlink' in v || 'text' in v) return v.text ?? null;
    if ('error' in v) return null;
  }
  return value;
}

function isFormulaWithoutResult(value: CellValue): boolean {
  if (!value || typeof value !== 'object' || value instanceof Date) return false;
  const v = value as unknown as Record<string, unknown>;
  return ('formula' in v || 'sharedFormula' in v) && (v.result === undefined || v.result === null);
}

function formulaText(value: CellValue): string {
  if (!value || typeof value !== 'object' || value instanceof Date) return '';
  const v = value as unknown as Record<string, unknown>;
  return typeof v.formula === 'string' ? v.formula : '';
}

function text(value: CellValue): string {
  const raw = rawValue(value);
  if (raw == null) return '';
  if (raw instanceof Date) return utcDateToIso(raw);
  return normalizeText(String(raw));
}

export function toIsoDate(value: CellValue): IsoDate | null {
  const raw = rawValue(value);
  if (raw instanceof Date) return utcDateToIso(raw);
  if (typeof raw === 'number' && raw > 20000 && raw < 80000)
    return utcDateToIso(new Date(Math.round((raw - 25569) * 86_400_000)));
  if (typeof raw === 'string') {
    const t = raw.trim();
    return parseBrDate(t) ?? (isIsoDate(t.slice(0, 10)) ? t.slice(0, 10) : null);
  }
  return null;
}

/** "Rua X, 123, loja B — Copacabana, Rio de Janeiro" -> partes */
export function splitRouteAddress(value: string): {
  address: string;
  neighborhood: string | null;
  city: string;
} {
  const [street = '', rest = ''] = normalizeText(value).split(/\s*—\s*/);
  const [neighborhood, city] = rest.split(',').map((p) => p.trim());
  return { address: street, neighborhood: neighborhood || null, city: city || DEFAULT_CITY };
}

/** "Rua Barão de Petrópolis, 572 — Rio Comprido, Rio de Janeiro — RJ" -> "Rua Barão de Petrópolis, 572, Rio Comprido, Rio de Janeiro - RJ" */
export function normalizeBaseAddress(value: string): string {
  const parts = normalizeText(value)
    .split(/\s*—\s*/)
    .filter(Boolean);
  if (parts.length === 0) return '';
  const last = parts[parts.length - 1]!;
  if (parts.length > 1 && /^[A-Z]{2}$/.test(last))
    return `${parts.slice(0, -1).join(', ')} - ${last}`;
  return parts.join(', ');
}

function findSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find((ws) => comparableKey(ws.name) === comparableKey(name));
}

function headerMap(row: ExcelJS.Row): Map<string, number> {
  const map = new Map<string, number>();
  row.eachCell((cell, col) => {
    const key = comparableKey(text(cell.value));
    if (key && !map.has(key)) map.set(key, col);
  });
  return map;
}

/**
 * O ExcelJS não suporta gráficos nativos (a aba Dashboard da planilha tem 5).
 * Removemos apenas as referências a desenhos/gráficos — que não são dados —
 * antes da leitura, sem alterar o arquivo original.
 */
export async function stripDrawings(buffer: Buffer): Promise<{ buffer: Buffer; removed: number }> {
  const zip = await JSZip.loadAsync(buffer);
  let removed = 0;
  for (const name of Object.keys(zip.files)) {
    if (/^xl\/(drawings|charts)\//.test(name)) {
      zip.remove(name);
      removed += 1;
      continue;
    }
    const isSheet = /^xl\/worksheets\/sheet\d+\.xml$/.test(name);
    const isSheetRels = /^xl\/worksheets\/_rels\/sheet\d+\.xml\.rels$/.test(name);
    const isWorkbookRels = name === 'xl/_rels/workbook.xml.rels';
    if (!isSheet && !isSheetRels && !isWorkbookRels && name !== '[Content_Types].xml') continue;
    const xml = await zip.file(name)!.async('string');
    const cleaned = xml
      .replace(/<(drawing|legacyDrawing)\b[^>]*\/>/g, '')
      .replace(/<Relationship\b[^>]*Type="[^"]*\/(drawing|vmlDrawing|chart)"[^>]*\/>/g, '')
      .replace(/<Override\b[^>]*PartName="\/xl\/(drawings|charts)\/[^"]*"[^>]*\/>/g, '')
      // Alvos absolutos (gerados por openpyxl) confundem o ExcelJS: torna-os relativos
      .replace(
        /Target="\/xl\//g,
        isSheetRels ? 'Target="../' : isWorkbookRels ? 'Target="' : 'Target="/xl/',
      );
    if (cleaned !== xml) zip.file(name, cleaned);
  }
  return { buffer: await zip.generateAsync({ type: 'nodebuffer' }), removed };
}

export async function parseSpreadsheet(
  buffer: Buffer,
  rules: NetworkRules = DEFAULT_NETWORK_RULES,
): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  const sanitized = await stripDrawings(buffer);
  await workbook.xlsx.load(sanitized.buffer as unknown as ArrayBuffer);
  const issues: ImportIssue[] = [];
  const charts = (await JSZip.loadAsync(buffer)).file(/^xl\/charts\/chart\d+\.xml$/).length;
  if (sanitized.removed) {
    issues.push({
      severity: 'info',
      code: 'CHARTS_IGNORED',
      sheet: 'Dashboard',
      message: `A planilha contém ${charts} gráfico(s) nativo(s) do Excel; eles não são dados e foram ignorados (o RouteFlow gera os próprios gráficos).`,
    });
  }
  const stores = new Map<string, StoreDraft>();
  const derivedNames: string[] = [];

  const upsertStore = (
    draft: Omit<StoreDraft, 'key' | 'sources' | 'nameDerived'>,
    source: string,
  ): string => {
    const key = buildStoreImportKey(draft.network, draft.code ?? draft.name);
    const existing = stores.get(key);
    if (!existing) {
      const nameDerived = !draft.name;
      const name = draft.name || `${draft.network} ${draft.code}`;
      if (nameDerived) derivedNames.push(draft.code ?? name);
      stores.set(key, { ...draft, name, key, nameDerived, sources: [source] });
      if (!addressHasNumber(draft.address)) {
        issues.push({
          severity: 'warning',
          code: 'ADDRESS_WITHOUT_NUMBER',
          message: `${draft.code ?? name}: endereço sem número ("${draft.address}"). Complete o endereço para geocodificação e navegação precisas.`,
          sheet: source.split('!')[0],
        });
      }
      return key;
    }
    existing.sources.push(source);
    if (!existing.neighborhood && draft.neighborhood) existing.neighborhood = draft.neighborhood;
    if (!existing.region && draft.region) existing.region = draft.region;
    if (draft.name && existing.nameDerived) {
      existing.name = draft.name;
      existing.nameDerived = false;
    }
    if (draft.address && comparableKey(draft.address) !== comparableKey(existing.address)) {
      issues.push({
        severity: 'warning',
        code: 'ADDRESS_CONFLICT',
        message: `${existing.code ?? existing.name}: endereços diferentes entre abas ("${existing.address}" x "${draft.address}"). Mantido o primeiro.`,
      });
    }
    return key;
  };

  for (const required of ['Rotas', 'Visitas']) {
    if (!findSheet(workbook, required))
      issues.push({
        severity: 'error',
        code: 'MISSING_SHEET',
        message: `Aba "${required}" não encontrada.`,
      });
  }

  // ------------------------------- Config -------------------------------
  const catalogs = { statuses: [] as string[], networks: [] as string[], regions: [] as string[] };
  const config = findSheet(workbook, 'Config');
  if (config) {
    config.eachRow((row, rowNumber) => {
      row.eachCell((cell, col) => {
        const key = comparableKey(text(cell.value));
        const target =
          key === 'status'
            ? catalogs.statuses
            : key === 'redes'
              ? catalogs.networks
              : key === 'regioes'
                ? catalogs.regions
                : null;
        if (!target) return;
        for (let r = rowNumber + 1; r <= config.rowCount; r += 1) {
          const value = text(config.getRow(r).getCell(col).value);
          if (!value) break;
          target.push(value);
        }
      });
    });
  }

  // ------------------------------ Dashboard -----------------------------
  let planningNote: string | null = null;
  let planningStartDate: IsoDate | null = null;
  const dashboard = findSheet(workbook, 'Dashboard');
  if (dashboard) {
    for (let r = 1; r <= Math.min(dashboard.rowCount, 6); r += 1) {
      const value = text(dashboard.getRow(r).getCell(1).value);
      const match = /iniciado em (\d{2}\/\d{2}\/\d{4})/i.exec(value);
      if (match) {
        planningNote = value;
        planningStartDate = parseBrDate(match[1]!);
      }
    }
  }

  // -------------------------------- Rotas -------------------------------
  const routeRows = new Map<IsoDate, Array<{ order: number; key: string }>>();
  const routeRegion = new Map<IsoDate, string>();
  const declaredCount = new Map<IsoDate, number>();
  let baseAddress: string | null = null;
  const rotas = findSheet(workbook, 'Rotas');
  if (rotas) {
    let headerRow = 0;
    let transitWaypoints = false;
    rotas.eachRow((row, n) => {
      const a = comparableKey(text(row.getCell(1).value));
      if (!baseAddress && a.startsWith('base de saida'))
        baseAddress = text(row.getCell(2).value) || null;
      if (!headerRow && a === 'dia' && comparableKey(text(row.getCell(2).value)) === 'data')
        headerRow = n;
      row.eachCell((cell) => {
        const f = formulaText(cell.value);
        if (/travelmode=transit/i.test(f) && /waypoints=/i.test(f)) transitWaypoints = true;
      });
    });
    if (transitWaypoints) {
      issues.push({
        severity: 'info',
        code: 'TRANSIT_WAYPOINTS_UNSUPPORTED',
        sheet: 'Rotas',
        message:
          'O botão "ABRIR ROTA COMPLETA" usa transporte público com paradas intermediárias, combinação que o Google Maps não suporta. O RouteFlow gera a rota completa (carro/caminhada, até 9 paradas por link) e um link de transporte público por trecho.',
      });
    }
    if (!headerRow)
      issues.push({
        severity: 'error',
        code: 'HEADER_NOT_FOUND',
        sheet: 'Rotas',
        message: 'Cabeçalho (Dia, Data, ...) não encontrado na aba Rotas.',
      });
    else {
      const h = headerMap(rotas.getRow(headerRow));
      const col = (name: string) => h.get(comparableKey(name));
      for (let r = headerRow + 1; r <= rotas.rowCount; r += 1) {
        const row = rotas.getRow(r);
        if (comparableKey(text(row.getCell(1).value)) === 'como usar') break;
        const date = toIsoDate(row.getCell(col('Data') ?? 2).value);
        if (!date) continue;
        const code = normalizeStoreCode(text(row.getCell(col('Código') ?? 6).value)) || null;
        const network = text(row.getCell(col('Rede') ?? 7).value);
        const name = text(row.getCell(col('Unidade / Loja') ?? 8).value);
        const fullAddress = text(row.getCell(col('Endereço') ?? 9).value);
        const region = text(row.getCell(col('Região') ?? 3).value) || null;
        const order = Number(text(row.getCell(col('Ordem') ?? 5).value)) || r;
        const declared = Number(text(row.getCell(col('Lojas') ?? 4).value));
        if (Number.isFinite(declared) && declared > 0) declaredCount.set(date, declared);
        if (region) routeRegion.set(date, region);
        if (comparableKey(code) === 'retorno' || comparableKey(network) === 'base') {
          if (
            baseAddress &&
            comparableKey(splitRouteAddress(fullAddress).address) !==
              comparableKey(splitRouteAddress(baseAddress).address)
          ) {
            issues.push({
              severity: 'warning',
              code: 'RETURN_ADDRESS_MISMATCH',
              sheet: 'Rotas',
              row: r,
              message: `Retorno de ${formatDateBR(date)} não aponta para a base cadastrada.`,
            });
          }
          continue;
        }
        const resolvedNetwork =
          network ||
          (code ? networkForCode(code, rules) : null) ||
          rules.defaultNetworkForNamedStores;
        if (!code && !name) {
          issues.push({
            severity: 'error',
            code: 'STORE_WITHOUT_IDENTIFICATION',
            sheet: 'Rotas',
            row: r,
            message: 'Linha sem código e sem nome de loja; ignorada.',
          });
          continue;
        }
        const parts = splitRouteAddress(fullAddress);
        const key = upsertStore(
          {
            code,
            name,
            network: resolvedNetwork,
            address: parts.address,
            neighborhood: parts.neighborhood,
            city: parts.city,
            region,
          },
          `Rotas!${r}`,
        );
        routeRows.set(date, [...(routeRows.get(date) ?? []), { order, key }]);
      }
    }
  }

  // ------------------------------- Visitas ------------------------------
  const visits: VisitDraft[] = [];
  const visitas = findSheet(workbook, 'Visitas');
  let formulasWithoutCache = 0;
  if (visitas) {
    const h = headerMap(visitas.getRow(1));
    const col = (name: string) => h.get(comparableKey(name));
    const seen = new Set<string>();
    for (let r = 2; r <= visitas.rowCount; r += 1) {
      const row = visitas.getRow(r);
      const cell = (name: string, fallback: number) => row.getCell(col(name) ?? fallback).value;
      const code = normalizeStoreCode(text(cell('Código', 7))) || null;
      const name = text(cell('Unidade / Loja', 8));
      const address = text(cell('Endereço', 9));
      const dateValue = cell('Data', 3);
      if (!code && !name && !address && !text(dateValue)) continue;
      for (const [header, fallback] of [
        ['Mês', 1],
        ['Dia da semana', 4],
        ['Rede', 6],
      ] as const) {
        if (isFormulaWithoutResult(cell(header, fallback))) formulasWithoutCache += 1;
      }
      const date = toIsoDate(dateValue);
      if (!date) {
        issues.push({
          severity: 'error',
          code: 'INVALID_DATE',
          sheet: 'Visitas',
          row: r,
          message: `Data inválida ou vazia (${code ?? name}). Linha ignorada.`,
        });
        continue;
      }
      if (!code && !name) {
        issues.push({
          severity: 'error',
          code: 'STORE_WITHOUT_IDENTIFICATION',
          sheet: 'Visitas',
          row: r,
          message: 'Linha sem código e sem nome de loja; ignorada.',
        });
        continue;
      }
      const networkText = text(cell('Rede', 6));
      const network =
        networkText ||
        (code ? networkForCode(code, rules) : null) ||
        rules.defaultNetworkForNamedStores;
      const statusText = text(cell('Status', 11));
      const status = SPREADSHEET_STATUS_MAP[comparableKey(statusText)] ?? 'PENDING';
      if (statusText && !SPREADSHEET_STATUS_MAP[comparableKey(statusText)]) {
        issues.push({
          severity: 'warning',
          code: 'UNKNOWN_STATUS',
          sheet: 'Visitas',
          row: r,
          message: `Status "${statusText}" desconhecido; importado como Pendente.`,
        });
      }
      const region = text(cell('Região', 5)) || null;
      const key = upsertStore(
        {
          code,
          name,
          network,
          address,
          neighborhood: text(cell('Bairro', 10)) || null,
          city: DEFAULT_CITY,
          region,
        },
        `Visitas!${r}`,
      );
      if (seen.has(`${date}|${key}`)) {
        issues.push({
          severity: 'warning',
          code: 'DUPLICATE_VISIT',
          sheet: 'Visitas',
          row: r,
          message: `Visita duplicada para ${code ?? name} em ${formatDateBR(date)}; mantida apenas uma.`,
        });
        continue;
      }
      seen.add(`${date}|${key}`);
      visits.push({
        date,
        storeKey: key,
        status,
        notes: text(cell('Observações', 12)) || null,
        region,
        week: text(cell('Semana', 2)) || null,
        row: r,
      });
    }
  }
  if (formulasWithoutCache > 0) {
    issues.push({
      severity: 'info',
      code: 'FORMULA_WITHOUT_CACHED_VALUE',
      sheet: 'Visitas',
      message: `${formulasWithoutCache} células com fórmula sem valor calculado salvo (Mês, Dia da semana, Rede). O importador recalculou: código iniciado por V => Drogaria Venancio; loja identificada pelo nome => Cristal.`,
    });
  }
  if (derivedNames.length) {
    issues.push({
      severity: 'info',
      code: 'STORE_NAME_DERIVED',
      message: `${derivedNames.length} lojas sem "Unidade / Loja" receberam o nome "rede + código" (ex.: Drogaria Venancio ${derivedNames[0]}).`,
    });
  }
  const withoutCode = [...stores.values()].filter((s) => !s.code);
  if (withoutCode.length) {
    issues.push({
      severity: 'info',
      code: 'STORE_WITHOUT_CODE',
      message: `${withoutCode.length} lojas sem código na planilha (${withoutCode.map((s) => s.name).join(', ')}). Receberam um código provisório estável, que pode ser editado.`,
    });
  }

  // --------------------------- Cadastro Rápido --------------------------
  const quick = findSheet(workbook, 'Cadastro Rápido');
  if (quick) {
    for (let r = 5; r <= quick.rowCount; r += 1) {
      const raw = text(quick.getRow(r).getCell(1).value);
      if (!raw || comparableKey(raw) === 'como usar') continue;
      if (/^\d+\.\s/.test(raw)) continue;
      const parsed = parseQuickAddLine(raw, r, {
        rules,
        region: text(quick.getRow(r).getCell(3).value) || null,
      });
      if (!parsed.ok) {
        issues.push({
          severity: 'warning',
          code: 'QUICK_ADD_INVALID',
          sheet: 'Cadastro Rápido',
          row: r,
          message: parsed.error ?? 'Linha inválida.',
        });
        continue;
      }
      upsertStore(
        {
          code: parsed.code,
          name: parsed.name,
          network: parsed.network,
          address: parsed.address,
          neighborhood: parsed.neighborhood,
          city: DEFAULT_CITY,
          region: parsed.region,
        },
        `Cadastro Rápido!${r}`,
      );
    }
  }

  // ---------------------- Reconciliação Rotas x Visitas ------------------
  const allDates = [...new Set([...routeRows.keys(), ...visits.map((v) => v.date)])].sort();
  const routes: RouteDraft[] = [];
  for (const date of allDates) {
    const ordered = (routeRows.get(date) ?? []).sort((a, b) => a.order - b.order).map((r) => r.key);
    const dayVisits = visits.filter((v) => v.date === date);
    const visitKeys = dayVisits.map((v) => v.storeKey);
    const onlyInVisitas = visitKeys.filter((k) => !ordered.includes(k));
    const onlyInRotas = ordered.filter((k) => !visitKeys.includes(k));
    for (const key of onlyInVisitas) {
      const s = stores.get(key)!;
      issues.push({
        severity: 'warning',
        code: 'STORE_MISSING_IN_ROUTE',
        message: `${s.code ?? s.name} está na aba Visitas em ${formatDateBR(date)}, mas não na aba Rotas. Foi adicionada ao final da rota do dia (revise a ordem).`,
      });
    }
    for (const key of onlyInRotas) {
      const s = stores.get(key)!;
      issues.push({
        severity: 'warning',
        code: 'VISIT_MISSING',
        message: `${s.code ?? s.name} está na aba Rotas em ${formatDateBR(date)}, mas não na aba Visitas. Visita criada como Pendente.`,
      });
      visits.push({
        date,
        storeKey: key,
        status: 'PENDING',
        notes: null,
        region: routeRegion.get(date) ?? s.region,
        week: null,
        row: 0,
      });
    }
    const declared = declaredCount.get(date);
    const finalKeys = [...ordered, ...onlyInVisitas];
    if (declared && declared !== ordered.length) {
      issues.push({
        severity: 'warning',
        code: 'ROUTE_COUNT_MISMATCH',
        sheet: 'Rotas',
        message: `Rota de ${formatDateBR(date)} declara ${declared} lojas, mas lista ${ordered.length}.`,
      });
    }
    if (finalKeys.length > MAX_WAYPOINTS_PER_LINK) {
      issues.push({
        severity: 'info',
        code: 'WAYPOINT_LIMIT',
        message: `Rota de ${formatDateBR(date)} tem ${finalKeys.length} lojas: o Google Maps aceita até ${MAX_WAYPOINTS_PER_LINK} paradas por link, então a rota completa será dividida em partes.`,
      });
    }
    const holiday = holidayOn(date);
    if (holiday && finalKeys.length) {
      issues.push({
        severity: 'info',
        code: 'HOLIDAY',
        message: `${formatDateBR(date)} é ${holiday.kind === 'national' ? 'feriado nacional' : 'ponto facultativo'} (${holiday.name}) e possui ${finalKeys.length} visitas programadas.`,
      });
    }
    routes.push({
      date,
      region: routeRegion.get(date) ?? dayVisits[0]?.region ?? null,
      storeKeys: finalKeys,
    });
  }

  // -------------------- Roteiro padrão por dia da semana ----------------
  const weekdayTemplate = new Map<number, string[]>();
  for (const route of routes) {
    const weekday = isoWeekday(route.date);
    const existing = weekdayTemplate.get(weekday);
    if (!existing) weekdayTemplate.set(weekday, route.storeKeys);
    else if (existing.join('|') !== route.storeKeys.join('|')) {
      issues.push({
        severity: 'info',
        code: 'TEMPLATE_CONFLICT',
        message: `Há mais de uma rota em ${WEEKDAY_LABEL[weekday]}; o roteiro padrão usa a primeira data.`,
      });
    }
  }

  return {
    baseAddress,
    stores,
    visits,
    routes,
    weekdayTemplate,
    catalogs,
    planningNote,
    planningStartDate,
    issues,
  };
}
