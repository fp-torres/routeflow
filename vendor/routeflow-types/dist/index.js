// src/enums.ts
function values(obj) {
  return Object.values(obj);
}
var UserRole = { EMPLOYEE: "EMPLOYEE", MANAGER: "MANAGER", ADMIN: "ADMIN" };
var USER_ROLES = values(UserRole);
var VisitStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  NOT_COMPLETED: "NOT_COMPLETED",
  RESCHEDULED: "RESCHEDULED",
  CANCELLED: "CANCELLED",
  BLOCKED: "BLOCKED"
};
var VISIT_STATUSES = values(VisitStatus);
var RouteStatus = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
};
var ROUTE_STATUSES = values(RouteStatus);
var TransportMode = {
  WALKING: "WALKING",
  BUS: "BUS",
  METRO: "METRO",
  TRAIN: "TRAIN",
  TRANSIT: "TRANSIT",
  DRIVING: "DRIVING",
  TAXI: "TAXI",
  RIDE_APP: "RIDE_APP",
  BICYCLE: "BICYCLE",
  OTHER: "OTHER"
};
var TRANSPORT_MODES = values(TransportMode);
var TransportType = {
  BUS: "BUS",
  METRO: "METRO",
  TRAIN: "TRAIN",
  INTEGRATION: "INTEGRATION",
  TAXI: "TAXI",
  RIDE_APP: "RIDE_APP",
  OTHER: "OTHER"
};
var TRANSPORT_TYPES = values(TransportType);
var PhotoCategory = {
  FACADE: "FACADE",
  DISPLAY: "DISPLAY",
  PRODUCT: "PRODUCT",
  MATERIAL: "MATERIAL",
  RECEIPT: "RECEIPT",
  OTHER: "OTHER"
};
var PHOTO_CATEGORIES = values(PhotoCategory);
var AuthorizationStatus = { ACTIVE: "ACTIVE", REVOKED: "REVOKED" };
var AUTHORIZATION_STATUSES = values(AuthorizationStatus);
var AuthorizationValidity = {
  /** A loja não exige carta (regra da rede ou da loja). */
  NOT_REQUIRED: "NOT_REQUIRED",
  VALID: "VALID",
  EXPIRING: "EXPIRING",
  CRITICAL: "CRITICAL",
  EXPIRED: "EXPIRED",
  NOT_YET_VALID: "NOT_YET_VALID",
  NO_EXPIRATION: "NO_EXPIRATION",
  REVOKED: "REVOKED"
};
var AUTHORIZATION_VALIDITIES = values(AuthorizationValidity);
var NotificationType = {
  AUTHORIZATION_EXPIRING: "AUTHORIZATION_EXPIRING",
  AUTHORIZATION_EXPIRED: "AUTHORIZATION_EXPIRED",
  VISIT_UPCOMING: "VISIT_UPCOMING",
  VISIT_PENDING: "VISIT_PENDING",
  ROUTE_CHANGED: "ROUTE_CHANGED",
  SYSTEM: "SYSTEM"
};
var NOTIFICATION_TYPES = values(NotificationType);
var RouteTemplateKind = {
  STANDARD: "STANDARD",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY"
};
var ROUTE_TEMPLATE_KINDS = values(RouteTemplateKind);
var VisitActivityType = {
  NOTE: "NOTE",
  ACTIVITY: "ACTIVITY",
  STATUS_CHANGE: "STATUS_CHANGE",
  PHOTO: "PHOTO",
  SYSTEM: "SYSTEM"
};
var VISIT_ACTIVITY_TYPES = values(VisitActivityType);
var SharedScope = {
  VISITS: "visits",
  PHOTOS: "photos",
  AUTHORIZATIONS: "authorizations",
  EXPENSES: "expenses",
  ROUTES: "routes"
};
var SHARED_SCOPES = values(SharedScope);
var ReportType = {
  VISITS: "visits",
  ROUTES: "routes",
  EXPENSES: "expenses",
  AUTHORIZATIONS: "authorizations",
  HISTORY: "history",
  CONSOLIDATED: "consolidated"
};
var REPORT_TYPES = values(ReportType);
var TransitStepMode = {
  WALK: "WALK",
  BUS: "BUS",
  METRO: "METRO",
  TRAIN: "TRAIN",
  TRAM: "TRAM",
  FERRY: "FERRY",
  OTHER: "OTHER"
};

// src/labels.ts
var USER_ROLE_LABEL = {
  EMPLOYEE: "Funcion\xE1rio",
  MANAGER: "Gestor",
  ADMIN: "Administrador"
};
var VISIT_STATUS_LABEL = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Conclu\xEDda",
  NOT_COMPLETED: "N\xE3o realizada",
  RESCHEDULED: "Reagendada",
  CANCELLED: "Cancelada",
  BLOCKED: "Bloqueada"
};
var VISIT_STATUS_TONE = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  NOT_COMPLETED: "danger",
  RESCHEDULED: "warning",
  CANCELLED: "neutral",
  BLOCKED: "critical"
};
var SPREADSHEET_STATUS_MAP = {
  pendente: "PENDING",
  "em andamento": "IN_PROGRESS",
  concluido: "COMPLETED",
  concluida: "COMPLETED",
  "nao realizado": "NOT_COMPLETED",
  "nao realizada": "NOT_COMPLETED",
  reagendado: "RESCHEDULED",
  reagendada: "RESCHEDULED",
  cancelado: "CANCELLED",
  cancelada: "CANCELLED",
  bloqueado: "BLOCKED",
  bloqueada: "BLOCKED"
};
var ROUTE_STATUS_LABEL = {
  PLANNED: "Planejada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Conclu\xEDda",
  CANCELLED: "Cancelada"
};
var TRANSPORT_MODE_LABEL = {
  WALKING: "Caminhada",
  BUS: "\xD4nibus",
  METRO: "Metr\xF4",
  TRAIN: "Trem",
  TRANSIT: "Transporte p\xFAblico",
  DRIVING: "Carro",
  TAXI: "T\xE1xi",
  RIDE_APP: "Aplicativo",
  BICYCLE: "Bicicleta",
  OTHER: "Outro"
};
var TRANSPORT_TYPE_LABEL = {
  BUS: "\xD4nibus",
  METRO: "Metr\xF4",
  TRAIN: "Trem",
  INTEGRATION: "Integra\xE7\xE3o",
  TAXI: "T\xE1xi",
  RIDE_APP: "Aplicativo",
  OTHER: "Outros"
};
var PHOTO_CATEGORY_LABEL = {
  FACADE: "Fachada",
  DISPLAY: "Exposi\xE7\xE3o",
  PRODUCT: "Produto",
  MATERIAL: "Material",
  RECEIPT: "Comprovante",
  OTHER: "Outro"
};
var AUTHORIZATION_VALIDITY_LABEL = {
  NOT_REQUIRED: "N\xE3o exigida",
  VALID: "V\xE1lida",
  EXPIRING: "Vence em breve",
  CRITICAL: "Vencimento pr\xF3ximo",
  EXPIRED: "Expirada",
  NOT_YET_VALID: "Ainda n\xE3o vigente",
  NO_EXPIRATION: "Sem vencimento",
  REVOKED: "Revogada"
};
var AUTHORIZATION_VALIDITY_TONE = {
  NOT_REQUIRED: "success",
  VALID: "success",
  EXPIRING: "warning",
  CRITICAL: "danger",
  EXPIRED: "critical",
  NOT_YET_VALID: "info",
  NO_EXPIRATION: "success",
  REVOKED: "neutral"
};
var NOTIFICATION_TYPE_LABEL = {
  AUTHORIZATION_EXPIRING: "Autoriza\xE7\xE3o vencendo",
  AUTHORIZATION_EXPIRED: "Autoriza\xE7\xE3o vencida",
  VISIT_UPCOMING: "Visita pr\xF3xima",
  VISIT_PENDING: "Visita pendente",
  ROUTE_CHANGED: "Rota alterada",
  SYSTEM: "Sistema"
};
var ROUTE_TEMPLATE_KIND_LABEL = {
  STANDARD: "Roteiro padr\xE3o (semanal fixo)",
  WEEKLY: "Roteiro semanal (ciclo de semanas)",
  MONTHLY: "Roteiro mensal (semana do m\xEAs)"
};
var VISIT_ACTIVITY_TYPE_LABEL = {
  NOTE: "Observa\xE7\xE3o",
  ACTIVITY: "Atividade",
  STATUS_CHANGE: "Status",
  PHOTO: "Foto",
  SYSTEM: "Sistema"
};
var SHARED_SCOPE_LABEL = {
  visits: "Visitas e indicadores",
  photos: "Fotos das visitas",
  authorizations: "Autoriza\xE7\xF5es",
  expenses: "Despesas",
  routes: "Rotas"
};
var REPORT_TYPE_LABEL = {
  visits: "Visitas",
  routes: "Rotas",
  expenses: "Despesas",
  authorizations: "Autoriza\xE7\xF5es",
  history: "Hist\xF3rico",
  consolidated: "Consolidado"
};
var WEEKDAY_LABEL = {
  1: "Segunda-feira",
  2: "Ter\xE7a-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "S\xE1bado",
  7: "Domingo"
};
var WEEKDAY_SHORT_LABEL = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "S\xE1b",
  7: "Dom"
};
var MONTH_LABEL = [
  "janeiro",
  "fevereiro",
  "mar\xE7o",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];
var TRANSIT_STEP_LABEL = {
  WALK: "Caminhada",
  BUS: "\xD4nibus",
  METRO: "Metr\xF4",
  TRAIN: "Trem",
  TRAM: "VLT",
  FERRY: "Barca",
  OTHER: "Transporte"
};

// src/domain/dates.ts
var ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
var DEFAULT_TIME_ZONE = "America/Sao_Paulo";
function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE_REGEX.test(value)) return false;
  const date = isoToUtcDate(value);
  return !Number.isNaN(date.getTime()) && utcDateToIso(date) === value;
}
function isoToUtcDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function utcDateToIso(date) {
  return date.toISOString().slice(0, 10);
}
function todayIso(timeZone = DEFAULT_TIME_ZONE, now = /* @__PURE__ */ new Date()) {
  return toIsoInTimeZone(now, timeZone);
}
function toIsoInTimeZone(instant, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(instant);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function addDaysIso(iso, days) {
  const date = isoToUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToIso(date);
}
function diffDaysIso(from, to) {
  return Math.round((isoToUtcDate(to).getTime() - isoToUtcDate(from).getTime()) / 864e5);
}
function isoWeekday(iso) {
  const day = isoToUtcDate(iso).getUTCDay();
  return day === 0 ? 7 : day;
}
function startOfWeekIso(iso) {
  return addDaysIso(iso, 1 - isoWeekday(iso));
}
function endOfWeekIso(iso) {
  return addDaysIso(startOfWeekIso(iso), 6);
}
function startOfMonthIso(iso) {
  return `${iso.slice(0, 7)}-01`;
}
function endOfMonthIso(iso) {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}
function addMonthsIso(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return utcDateToIso(target);
}
function eachDayIso(from, to) {
  const days = [];
  for (let current = from; current <= to; current = addDaysIso(current, 1)) days.push(current);
  return days;
}
function weekOfMonth(iso) {
  return Math.ceil(Number(iso.slice(8, 10)) / 7);
}
function parseBrDate(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return isIsoDate(iso) ? iso : null;
}
function formatDateBR(iso) {
  if (!iso) return "\u2014";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function formatShortDateBR(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function formatLongDateBR(iso, withYear = true) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAY_LABEL[isoWeekday(iso)].toLowerCase();
  return `${weekday}, ${d} de ${MONTH_LABEL[m - 1]}${withYear ? ` de ${y}` : ""}`;
}
function monthLabel(iso) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTH_LABEL[m - 1]} de ${y}`;
}
function formatTimeBR(instant, timeZone = DEFAULT_TIME_ZONE) {
  if (!instant) return "\u2014";
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(instant)
  );
}
function formatDateTimeBR(instant, timeZone = DEFAULT_TIME_ZONE) {
  if (!instant) return "\u2014";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(instant));
}
function formatDuration(seconds) {
  if (seconds == null) return "\u2014";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
function formatDistance(meters) {
  if (meters == null) return "\u2014";
  if (meters < 1e3) return `${Math.round(meters)} m`;
  return `${(meters / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

// src/domain/holidays.ts
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function getNationalHolidays(year) {
  const easter = easterSunday(year);
  const fixed = (md, name) => ({
    date: `${year}-${md}`,
    name,
    kind: "national"
  });
  const list = [
    fixed("01-01", "Confraterniza\xE7\xE3o Universal"),
    { date: addDaysIso(easter, -48), name: "Carnaval", kind: "optional" },
    { date: addDaysIso(easter, -47), name: "Carnaval", kind: "optional" },
    { date: addDaysIso(easter, -2), name: "Sexta-feira Santa", kind: "national" },
    fixed("04-21", "Tiradentes"),
    fixed("05-01", "Dia do Trabalho"),
    { date: addDaysIso(easter, 60), name: "Corpus Christi", kind: "optional" },
    fixed("09-07", "Independ\xEAncia do Brasil"),
    fixed("10-12", "Nossa Senhora Aparecida"),
    fixed("11-02", "Finados"),
    fixed("11-15", "Proclama\xE7\xE3o da Rep\xFAblica"),
    fixed("12-25", "Natal")
  ];
  if (year >= 2024) list.push(fixed("11-20", "Dia Nacional de Zumbi e da Consci\xEAncia Negra"));
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
function holidayOn(date) {
  return getNationalHolidays(Number(date.slice(0, 4))).find((h) => h.date === date);
}

// src/domain/authorization.ts
var DEFAULT_VALIDITY_THRESHOLDS = { warningDays: 30, criticalDays: 7 };
function computeLetterValidity(letter, today, thresholds = DEFAULT_VALIDITY_THRESHOLDS) {
  if (letter.status === "REVOKED" || letter.deletedAt) {
    return { validity: AuthorizationValidity.REVOKED, daysLeft: null };
  }
  if (letter.validFrom && letter.validFrom > today) {
    return {
      validity: AuthorizationValidity.NOT_YET_VALID,
      daysLeft: letter.expirationDate ? diffDaysIso(today, letter.expirationDate) : null
    };
  }
  if (!letter.expirationDate)
    return { validity: AuthorizationValidity.NO_EXPIRATION, daysLeft: null };
  const daysLeft = diffDaysIso(today, letter.expirationDate);
  if (daysLeft < 0) return { validity: AuthorizationValidity.EXPIRED, daysLeft };
  if (daysLeft <= thresholds.criticalDays)
    return { validity: AuthorizationValidity.CRITICAL, daysLeft };
  if (daysLeft <= thresholds.warningDays)
    return { validity: AuthorizationValidity.EXPIRING, daysLeft };
  return { validity: AuthorizationValidity.VALID, daysLeft };
}
function isUsableValidity(validity) {
  return validity === AuthorizationValidity.NOT_REQUIRED || validity === AuthorizationValidity.VALID || validity === AuthorizationValidity.EXPIRING || validity === AuthorizationValidity.CRITICAL || validity === AuthorizationValidity.NO_EXPIRATION;
}
var SEVERITY = {
  NOT_REQUIRED: -1,
  NO_EXPIRATION: 0,
  VALID: 1,
  EXPIRING: 2,
  CRITICAL: 3,
  NOT_YET_VALID: 4,
  EXPIRED: 5,
  REVOKED: 6
};
function summarizeStoreAuthorization(letters, today, thresholds = DEFAULT_VALIDITY_THRESHOLDS) {
  const evaluated = letters.map((letter) => ({ letter, result: computeLetterValidity(letter, today, thresholds) })).filter((item) => item.result.validity !== AuthorizationValidity.REVOKED);
  if (evaluated.length === 0) return null;
  const usable = evaluated.filter((item) => isUsableValidity(item.result.validity));
  if (usable.length > 0) {
    const best = usable.sort((a, b) => {
      const da = a.result.daysLeft ?? Number.POSITIVE_INFINITY;
      const db = b.result.daysLeft ?? Number.POSITIVE_INFINITY;
      return db - da;
    })[0];
    return { ...best.result, hasValid: true, letterCount: evaluated.length };
  }
  const leastSevere = evaluated.sort(
    (a, b) => SEVERITY[a.result.validity] - SEVERITY[b.result.validity]
  )[0];
  return { ...leastSevere.result, hasValid: false, letterCount: evaluated.length };
}
function describeDaysLeft(daysLeft) {
  if (daysLeft == null) return "Sem data de vencimento";
  if (daysLeft < 0)
    return `Expirada h\xE1 ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) === 1 ? "" : "s"}`;
  if (daysLeft === 0) return "Vence hoje";
  if (daysLeft === 1) return "Vence amanh\xE3";
  return `Vence em ${daysLeft} dias`;
}
var plainKey = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
function isAuthorizationRequired(store, requiredNetworks) {
  if (store.authorizationRequired === true || store.authorizationRequired === false) {
    return store.authorizationRequired;
  }
  const network = plainKey(store.network);
  return requiredNetworks.some((n) => plainKey(n) === network);
}

// src/domain/text.ts
function normalizeText(value) {
  return (value ?? "").normalize("NFC").replace(/[\u2012\u2013\u2014\u2015]/g, "\u2014").replace(/\s+/g, " ").trim();
}
function stripAccents(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function comparableKey(value) {
  return stripAccents(normalizeText(value)).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function slugify(value) {
  return stripAccents(normalizeText(value)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// src/domain/stores.ts
var DEFAULT_CITY = "Rio de Janeiro";
var DEFAULT_STATE = "RJ";
var DEFAULT_NETWORK_RULES = {
  codeRules: [{ pattern: "^V\\d+$", network: "Drogaria Venancio" }],
  defaultNetworkForNamedStores: "Cristal"
};
function normalizeStoreCode(code) {
  return normalizeText(code).toUpperCase().replace(/\s+/g, "");
}
function networkForCode(code, rules = DEFAULT_NETWORK_RULES) {
  const normalized = normalizeStoreCode(code);
  for (const rule of rules.codeRules) {
    try {
      if (new RegExp(rule.pattern, "i").test(normalized)) return rule.network;
    } catch {
    }
  }
  return null;
}
function generateStoreCode(network, name) {
  const prefix = slugify(network).replace(/-/g, "").slice(0, 3).toUpperCase() || "LOJ";
  const body = slugify(name).toUpperCase();
  return `${prefix}-${body}`.slice(0, 40).replace(/-+$/, "");
}
function buildStoreImportKey(network, codeOrName) {
  return `store:${slugify(network)}:${slugify(codeOrName)}`.slice(0, 191);
}
function formatStoreAddress(store) {
  const city = [store.city || DEFAULT_CITY, store.state || DEFAULT_STATE].filter(Boolean).join(" - ");
  const tail = [store.neighborhood, city].filter(Boolean).join(", ");
  return tail ? `${store.address} \u2014 ${tail}` : store.address;
}
function fullAddressForMaps(store, includeCountry = false) {
  return [
    store.address,
    store.neighborhood,
    store.city || DEFAULT_CITY,
    store.state || DEFAULT_STATE
  ].concat(includeCountry ? ["Brasil"] : []).filter((part) => part && String(part).trim()).join(", ");
}
var ABBREVIATIONS = [
  [/\bAv\.?\s/gi, "Avenida "],
  [/\bR\.\s/gi, "Rua "],
  [/\bNossa\s+Sra\.?\s/gi, "Nossa Senhora "],
  [/\bSra\.?\s/gi, "Senhora "],
  [/\bDr\.?\s/gi, "Doutor "],
  [/\bPça\.?\s/gi, "Pra\xE7a "],
  [/\bEstr\.?\s/gi, "Estrada "]
];
function normalizeAddressForGeocoding(address) {
  let result = ` ${normalizeText(address)} `;
  for (const [regex, replacement] of ABBREVIATIONS) result = result.replace(regex, replacement);
  result = result.replace(/,\s*(loja|lj|sala|sl|bloco|apto?)\b[^,]*/gi, "");
  result = result.replace(/(\d)\.(\d{3})\b/g, "$1$2");
  return result.replace(/\s+/g, " ").trim();
}
function addressHasNumber(address) {
  return /\d/.test(address);
}

// src/domain/quick-add.ts
function splitParts(line) {
  const normalized = normalizeText(line);
  if (normalized.includes("	")) return normalized.split("	").map((p) => p.trim());
  if (normalized.includes("\u2014")) return normalized.split("\u2014").map((p) => p.trim());
  if (normalized.includes("|")) return normalized.split("|").map((p) => p.trim());
  return normalized.split(/\s+-\s+/).map((p) => p.trim());
}
function parseQuickAddLine(raw, line, options = {}) {
  const rules = options.rules ?? DEFAULT_NETWORK_RULES;
  const parts = splitParts(raw.replace(/\t/g, "	"));
  const [first = "", address = "", neighborhood = ""] = parts;
  const base = {
    line,
    raw,
    region: options.region ?? null,
    neighborhood: neighborhood || null,
    address
  };
  if (!first)
    return {
      ...base,
      code: null,
      name: "",
      network: "",
      ok: false,
      error: "Informe o c\xF3digo ou o nome da loja."
    };
  const codeCandidate = normalizeStoreCode(first);
  const codeNetwork = networkForCode(codeCandidate, rules);
  const row = codeNetwork ? {
    ...base,
    code: codeCandidate,
    name: `${codeNetwork} ${codeCandidate}`,
    network: codeNetwork,
    ok: true
  } : {
    ...base,
    code: null,
    name: first.replace(/\((cristal|rede[^)]*)\)/gi, "").trim(),
    network: /\(cristal\)/i.test(first) ? "Cristal" : rules.defaultNetworkForNamedStores,
    ok: true
  };
  if (!address)
    return {
      ...row,
      ok: false,
      error: "Endere\xE7o n\xE3o informado (use: C\xF3digo/Loja \u2014 Endere\xE7o \u2014 Bairro)."
    };
  if (!neighborhood)
    return {
      ...row,
      ok: false,
      error: "Bairro n\xE3o informado (use: C\xF3digo/Loja \u2014 Endere\xE7o \u2014 Bairro)."
    };
  return row;
}
function parseQuickAddText(text, options = {}) {
  return text.split(/\r?\n/).map((raw, index) => ({ raw: raw.trim(), line: index + 1 })).filter((item) => item.raw.length > 0).map((item) => parseQuickAddLine(item.raw, item.line, options));
}

// src/domain/maps.ts
var MAX_WAYPOINTS_PER_LINK = 9;
var BASE = "https://www.google.com/maps";
function googleMapsSearchUrl(query) {
  return `${BASE}/search/?api=1&query=${encodeURIComponent(query)}`;
}
function googleMapsCoordinatesUrl(latitude, longitude) {
  return `${BASE}/search/?api=1&query=${latitude},${longitude}`;
}
function googleMapsDirectionsUrl({
  origin,
  destination,
  waypoints = [],
  travelMode = "transit"
}) {
  const params = new URLSearchParams({ api: "1", origin, destination, travelmode: travelMode });
  if (waypoints.length > 0 && travelMode !== "transit")
    params.set("waypoints", waypoints.join("|"));
  return `${BASE}/dir/?${params.toString()}`;
}
function buildFullRouteLinks(home, stops, travelMode = "driving") {
  if (stops.length === 0) return [];
  const points = [home, ...stops, home];
  const maxSpan = MAX_WAYPOINTS_PER_LINK + 1;
  const segments = [];
  for (let start = 0; start < points.length - 1; start += maxSpan) {
    segments.push([start, Math.min(start + maxSpan, points.length - 1)]);
  }
  return segments.map(([start, end], index) => {
    const slice = points.slice(start, end + 1);
    return {
      part: index + 1,
      totalParts: segments.length,
      url: googleMapsDirectionsUrl({
        origin: slice[0].address,
        destination: slice[slice.length - 1].address,
        waypoints: slice.slice(1, -1).map((p) => p.address),
        travelMode
      }),
      from: slice[0].label,
      to: slice[slice.length - 1].label,
      stops: slice.length - 2
    };
  });
}
function buildLegLinks(home, stops, travelMode = "transit") {
  if (stops.length === 0) return [];
  const points = [home, ...stops, home];
  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    return {
      index,
      from,
      to,
      url: googleMapsDirectionsUrl({ origin: from.address, destination: to.address, travelMode })
    };
  });
}

// src/domain/geo.ts
var EARTH_RADIUS_KM = 6371.0088;
function haversineKm(a, b) {
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
function hasCoordinates(value) {
  return value != null && typeof value.latitude === "number" && typeof value.longitude === "number";
}
var DEFAULT_ESTIMATE_PARAMS = {
  detourFactor: 1.35,
  walkingThresholdKm: 1.1,
  walkingSpeedKmh: 4.5,
  transitSpeedKmh: 16,
  transitOverheadMinutes: 8
};
function estimateLeg(from, to, params = DEFAULT_ESTIMATE_PARAMS) {
  const straightKm = haversineKm(from, to);
  const routeKm = straightKm * params.detourFactor;
  if (straightKm <= params.walkingThresholdKm) {
    return {
      mode: "WALKING",
      distanceMeters: Math.round(routeKm * 1e3),
      durationSeconds: Math.round(routeKm / params.walkingSpeedKmh * 3600)
    };
  }
  return {
    mode: "BUS",
    distanceMeters: Math.round(routeKm * 1e3),
    durationSeconds: Math.round(
      routeKm / params.transitSpeedKmh * 3600 + params.transitOverheadMinutes * 60
    )
  };
}

// src/domain/optimizer.ts
function closedTourDistanceKm(origin, points) {
  if (points.length === 0) return 0;
  let total = haversineKm(origin, points[0]);
  for (let i = 1; i < points.length; i += 1) total += haversineKm(points[i - 1], points[i]);
  return total + haversineKm(points[points.length - 1], origin);
}
function optimizeClosedTour(origin, points) {
  const originalDistanceKm = closedTourDistanceKm(origin, points);
  if (points.length <= 2) {
    return {
      order: points.map((p) => p.id),
      distanceKm: originalDistanceKm,
      originalDistanceKm,
      improvementKm: 0
    };
  }
  const remaining = [...points];
  const tour = [];
  let current = origin;
  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((p, index) => {
      const d = haversineKm(current, p);
      if (d < bestDistance - 1e-9) {
        bestDistance = d;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    tour.push(next);
    current = next;
  }
  let improved = true;
  let best = closedTourDistanceKm(origin, tour);
  let guard = 0;
  while (improved && guard < 500) {
    improved = false;
    guard += 1;
    for (let i = 0; i < tour.length - 1; i += 1) {
      for (let k = i + 1; k < tour.length; k += 1) {
        const candidate = [
          ...tour.slice(0, i),
          ...tour.slice(i, k + 1).reverse(),
          ...tour.slice(k + 1)
        ];
        const distance = closedTourDistanceKm(origin, candidate);
        if (distance + 1e-9 < best) {
          tour.splice(0, tour.length, ...candidate);
          best = distance;
          improved = true;
        }
      }
    }
  }
  const finalDistance = Math.min(best, originalDistanceKm);
  const order = best <= originalDistanceKm ? tour.map((p) => p.id) : points.map((p) => p.id);
  return {
    order,
    distanceKm: finalDistance,
    originalDistanceKm,
    improvementKm: Math.max(0, originalDistanceKm - finalDistance)
  };
}
function pathCost(cost, start, end, order) {
  let total = 0;
  let prev = start;
  for (const node of order) {
    total += cost[prev][node];
    prev = node;
  }
  return total + cost[prev][end];
}
var EXACT_LIMIT = 13;
function optimizePath(cost, start, end, nodes) {
  const n = nodes.length;
  if (n <= 1)
    return { order: [...nodes], cost: pathCost(cost, start, end, nodes), method: "exact" };
  if (n <= EXACT_LIMIT) {
    const size = 1 << n;
    const dp = new Float64Array(size * n).fill(Infinity);
    const parent = new Int8Array(size * n).fill(-1);
    for (let j2 = 0; j2 < n; j2++) dp[(1 << j2) * n + j2] = cost[start][nodes[j2]];
    for (let mask2 = 1; mask2 < size; mask2++) {
      for (let j2 = 0; j2 < n; j2++) {
        if (!(mask2 & 1 << j2)) continue;
        const current = dp[mask2 * n + j2];
        if (current === Infinity) continue;
        for (let k = 0; k < n; k++) {
          if (mask2 & 1 << k) continue;
          const next = mask2 | 1 << k;
          const value = current + cost[nodes[j2]][nodes[k]];
          if (value < dp[next * n + k]) {
            dp[next * n + k] = value;
            parent[next * n + k] = j2;
          }
        }
      }
    }
    const full = size - 1;
    let bestJ = 0;
    let best = Infinity;
    for (let j2 = 0; j2 < n; j2++) {
      const value = dp[full * n + j2] + cost[nodes[j2]][end];
      if (value < best) {
        best = value;
        bestJ = j2;
      }
    }
    const order2 = [];
    let mask = full;
    let j = bestJ;
    while (j !== -1) {
      order2.push(nodes[j]);
      const p = parent[mask * n + j];
      mask &= ~(1 << j);
      j = p;
    }
    order2.reverse();
    return { order: order2, cost: best, method: "exact" };
  }
  const remaining = new Set(nodes);
  let order = [];
  let prev = start;
  while (remaining.size) {
    let pick = -1;
    let bestCost = Infinity;
    for (const node of remaining) {
      const c = cost[prev][node];
      if (c < bestCost) {
        bestCost = c;
        pick = node;
      }
    }
    order.push(pick);
    remaining.delete(pick);
    prev = pick;
  }
  let bestTotal = pathCost(cost, start, end, order);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = [
          ...order.slice(0, i),
          ...order.slice(i, k + 1).reverse(),
          ...order.slice(k + 1)
        ];
        const total = pathCost(cost, start, end, candidate);
        if (total + 1e-9 < bestTotal) {
          order = candidate;
          bestTotal = total;
          improved = true;
        }
      }
    }
  }
  return { order, cost: bestTotal, method: "heuristic" };
}

// src/domain/letter-parser.ts
var MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];
var MONTH_RE = new RegExp(`\\b(${MONTHS.join("|")})\\b`, "g");
var CODE_RE = /\b([A-Z]{1,3}\d{1,4})\b(?:\s+(\d{1,2})(?!\d))?/g;
var plain = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
var pad = (n) => String(n).padStart(2, "0");
var isoOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
var daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
var dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / 864e5;
function parseAuthorizationLetterText(input, today) {
  const lines = (Array.isArray(input) ? input : input.split(/\r?\n/)).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fullPlain = plain(lines.join("\n"));
  let months = [];
  for (const line of lines) {
    const found = [...plain(line).matchAll(MONTH_RE)].map((m) => MONTHS.indexOf(m[1]) + 1);
    if (found.length > months.length) months = found;
  }
  let years = [];
  if (months.length) {
    const ty = Number(today.slice(0, 4));
    let best = null;
    for (const base of [ty - 1, ty, ty + 1]) {
      const ys = [];
      let y = base;
      months.forEach((m, i) => {
        if (i > 0 && m < months[i - 1]) y += 1;
        ys.push(y);
      });
      const start = isoOf(ys[0], months[0], 1);
      const lastY2 = ys[ys.length - 1];
      const lastM2 = months[months.length - 1];
      const end = isoOf(lastY2, lastM2, daysInMonth(lastY2, lastM2));
      const t = dayNumber(today);
      const dist = today >= start && today <= end ? 0 : Math.min(Math.abs(t - dayNumber(start)), Math.abs(t - dayNumber(end)));
      if (!best || dist < best.dist) best = { years: ys, dist };
    }
    years = best.years;
  }
  const byCode = /* @__PURE__ */ new Map();
  for (const line of lines) {
    let column = 0;
    for (const match of line.matchAll(CODE_RE)) {
      const code = match[1];
      if (!byCode.has(code)) byCode.set(code, /* @__PURE__ */ new Set());
      const day = match[2] ? Number(match[2]) : null;
      if (day !== null && months.length) {
        const i = column % months.length;
        const y = years[i];
        const m = months[i];
        if (day >= 1 && day <= daysInMonth(y, m)) byCode.get(code).add(isoOf(y, m, day));
      }
      column += 1;
    }
  }
  const stores = [...byCode.entries()].map(([code, dates]) => ({ code, dates: [...dates].sort() }));
  const validity = /validade de (\d{1,2})/.exec(fullPlain);
  const lastY = years[years.length - 1];
  const lastM = months[months.length - 1];
  return {
    stores,
    months,
    validFrom: months.length ? isoOf(years[0], months[0], 1) : null,
    expirationDate: lastY && lastM ? isoOf(lastY, lastM, daysInMonth(lastY, lastM)) : null,
    network: fullPlain.includes("venancio") ? "Drogaria Venancio" : fullPlain.includes("cristal") ? "Cristal" : null,
    validityMonths: validity ? Number(validity[1]) : null
  };
}

// src/domain/greeting.ts
var capitalize = (v) => v.charAt(0).toUpperCase() + v.slice(1);
function greetingFor(date, timeZone = "America/Sao_Paulo") {
  const hourPart = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).formatToParts(date).find((p) => p.type === "hour");
  const hour = Number(hourPart?.value ?? 0) % 24;
  const greeting = hour >= 6 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone, weekday: "long" }).format(date);
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "long" }).format(date);
  return { greeting, dateLabel: `${capitalize(weekday)}, ${dayMonth}` };
}
var firstName = (name) => name.trim().split(/\s+/)[0] ?? "";

// src/domain/money.ts
function toMoneyNumber(value) {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function toNullableMoney(value) {
  if (value == null || value === "") return null;
  return toMoneyNumber(value);
}
function formatBRL(value) {
  if (value == null) return "\u2014";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function parseMoney(input) {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
function sumMoney(values2) {
  return Math.round(values2.reduce((acc, v) => acc + (v ?? 0), 0) * 100) / 100;
}

// src/schemas/common.ts
import { z } from "zod";
var isoDateSchema = z.string({ error: "Informe a data." }).trim().refine((value) => isIsoDate(value), "Data inv\xE1lida (use AAAA-MM-DD).");
var optionalIsoDateSchema = z.preprocess(
  (value) => value === "" || value === null ? void 0 : value,
  isoDateSchema.optional()
);
var nullableIsoDateSchema = z.preprocess(
  (value) => value === "" ? null : value,
  isoDateSchema.nullable().optional()
);
function csvArray(item) {
  return z.preprocess((value) => {
    if (value == null || value === "") return void 0;
    if (Array.isArray(value)) return value.flatMap((v) => String(v).split(",")).filter(Boolean);
    return String(value).split(",").map((v) => v.trim()).filter(Boolean);
  }, z.array(item).optional());
}
var booleanQuery = z.preprocess((value) => {
  if (value === void 0 || value === "") return void 0;
  if (typeof value === "boolean") return value;
  return ["1", "true", "sim", "yes"].includes(String(value).toLowerCase());
}, z.boolean().optional());
var paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});
var dateRangeQuerySchema = z.object({ from: optionalIsoDateSchema, to: optionalIsoDateSchema }).refine((v) => !v.from || !v.to || v.from <= v.to, {
  message: "A data inicial deve ser anterior \xE0 final.",
  path: ["to"]
});
var optionalText = (max) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable().optional()
);
var latitudeSchema = z.coerce.number().min(-90).max(90);
var longitudeSchema = z.coerce.number().min(-180).max(180);
var geoCaptureSchema = z.object({
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  accuracy: z.coerce.number().min(0).max(1e5).optional()
});

// src/schemas/auth.ts
import { z as z2 } from "zod";
var loginSchema = z2.object({
  email: z2.email({ error: "Informe um e-mail v\xE1lido." }).trim().toLowerCase(),
  password: z2.string().min(1, "Informe a senha.").max(200),
  // "Lembrar acesso": sessão persistente (cookie HttpOnly com validade) x sessão do navegador
  remember: z2.boolean().default(false)
});
var changePasswordSchema = z2.object({
  currentPassword: z2.string().min(1, "Informe a senha atual."),
  newPassword: z2.string().min(10, "A nova senha precisa ter pelo menos 10 caracteres.").max(200).regex(/[A-Za-z]/, "Inclua ao menos uma letra.").regex(/\d/, "Inclua ao menos um n\xFAmero."),
  confirmPassword: z2.string()
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: "As senhas n\xE3o conferem.",
  path: ["confirmPassword"]
});
var profileUpdateSchema = z2.object({
  name: z2.string().trim().min(2, "Informe seu nome.").max(120)
});
var strongPassword = z2.string().min(10, "A senha precisa ter pelo menos 10 caracteres.").max(200).regex(/[A-Za-z]/, "Inclua ao menos uma letra.").regex(/\d/, "Inclua ao menos um n\xFAmero.");
var roleSchema = z2.enum(["EMPLOYEE", "MANAGER", "ADMIN"]);
var userCreateSchema = z2.object({
  name: z2.string().trim().min(2, "Informe o nome.").max(120),
  email: z2.email({ error: "Informe um e-mail v\xE1lido." }).trim().toLowerCase().max(191),
  password: strongPassword,
  role: roleSchema.default("EMPLOYEE")
});
var userUpdateSchema = z2.object({
  name: z2.string().trim().min(2).max(120).optional(),
  email: z2.email({ error: "Informe um e-mail v\xE1lido." }).trim().toLowerCase().max(191).optional(),
  role: roleSchema.optional(),
  active: z2.boolean().optional()
});
var userPasswordResetSchema = z2.object({ password: strongPassword });
var transferOperationSchema = z2.object({
  fromUserId: z2.string().uuid(),
  includePast: z2.boolean().default(false)
});

// src/schemas/stores.ts
import { z as z3 } from "zod";
var storeBaseSchema = z3.object({
  code: z3.string().trim().max(40, "C\xF3digo muito longo.").transform((v) => v.toUpperCase().replace(/\s+/g, "")).optional().or(z3.literal("").transform(() => void 0)),
  name: z3.string().trim().min(2, "Informe o nome da loja.").max(191),
  network: z3.string().trim().min(2, "Informe a rede.").max(120),
  address: z3.string().trim().min(5, "Informe o endere\xE7o.").max(500),
  neighborhood: optionalText(120),
  city: z3.string().trim().min(2).max(120).default("Rio de Janeiro"),
  state: z3.string().trim().length(2, "Use a sigla do estado (ex.: RJ).").transform((v) => v.toUpperCase()).default("RJ"),
  zipCode: z3.preprocess(
    (v) => typeof v === "string" && v.trim() === "" ? null : v,
    z3.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inv\xE1lido (ex.: 20251-060).").nullable().optional()
  ),
  region: optionalText(80),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
  observations: optionalText(5e3),
  // null = segue a regra da rede; true/false = exceção desta loja
  authorizationRequired: z3.boolean().nullable().optional(),
  active: z3.boolean().default(true)
});
var storeCreateSchema = storeBaseSchema;
var storeUpdateSchema = storeBaseSchema.partial();
var storeQuerySchema = paginationQuerySchema.extend({
  search: z3.string().trim().max(120).optional(),
  network: z3.string().trim().max(120).optional(),
  region: z3.string().trim().max(80).optional(),
  neighborhood: z3.string().trim().max(120).optional(),
  active: booleanQuery,
  withoutCoordinates: booleanQuery,
  pageSize: z3.coerce.number().int().min(1).max(200).default(50)
});
var quickAddCommitSchema = z3.object({
  rows: z3.array(
    z3.object({
      code: z3.string().trim().max(40).nullable().optional(),
      name: z3.string().trim().min(2).max(191),
      network: z3.string().trim().min(2).max(120),
      address: z3.string().trim().min(5).max(500),
      neighborhood: optionalText(120),
      region: optionalText(80)
    })
  ).min(1, "Adicione pelo menos uma loja.").max(200, "M\xE1ximo de 200 lojas por vez.")
});

// src/schemas/visits.ts
import { z as z4 } from "zod";
var visitQuerySchema = paginationQuerySchema.extend({
  date: optionalIsoDateSchema,
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  status: csvArray(z4.enum(VISIT_STATUSES)),
  storeId: z4.string().uuid().optional(),
  network: z4.string().trim().max(120).optional(),
  region: z4.string().trim().max(80).optional(),
  employeeId: z4.string().uuid().optional(),
  search: z4.string().trim().max(120).optional(),
  pageSize: z4.coerce.number().int().min(1).max(200).default(50)
});
var visitCreateSchema = z4.object({
  storeId: z4.string().uuid("Selecione a loja."),
  scheduledDate: isoDateSchema,
  notes: optionalText(5e3)
});
var visitUpdateSchema = z4.object({
  notes: optionalText(5e3),
  status: z4.enum(VISIT_STATUSES).optional(),
  statusReason: optionalText(500),
  startedAt: z4.iso.datetime({ offset: true }).nullable().optional(),
  finishedAt: z4.iso.datetime({ offset: true }).nullable().optional()
}).refine(
  (v) => !v.startedAt || !v.finishedAt || Date.parse(v.startedAt) <= Date.parse(v.finishedAt),
  {
    message: "O t\xE9rmino precisa ser depois do in\xEDcio.",
    path: ["finishedAt"]
  }
);
var visitStartSchema = geoCaptureSchema;
var visitFinishSchema = geoCaptureSchema.extend({
  status: z4.enum(["COMPLETED", "NOT_COMPLETED"]).default("COMPLETED"),
  notes: optionalText(5e3),
  reason: optionalText(500)
});
var visitActivitySchema = z4.object({
  type: z4.enum(["NOTE", "ACTIVITY"]),
  description: z4.string().trim().min(2, "Descreva a atividade.").max(2e3)
});
var visitRescheduleSchema = z4.object({
  date: isoDateSchema,
  reason: optionalText(500)
});
var photoUploadMetaSchema = z4.object({
  category: z4.enum(PHOTO_CATEGORIES).default("OTHER"),
  caption: optionalText(500),
  /** Tamanhos originais (bytes) antes da compressão no navegador, separados por vírgula. */
  originalSizes: z4.string().max(2e3).optional()
});

// src/schemas/routes.ts
import { z as z5 } from "zod";
var routeQuerySchema = z5.object({
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  employeeId: z5.string().uuid().optional()
});
var routeCreateSchema = z5.object({
  // ADMIN/MANAGER: rota de outro funcionário
  employeeId: z5.string().uuid().optional(),
  date: isoDateSchema,
  storeIds: z5.array(z5.string().uuid()).max(40).default([]),
  fromTemplate: z5.boolean().default(false)
});
var routeUpdateSchema = z5.object({
  startAddress: z5.string().trim().min(5).max(500).optional(),
  status: z5.enum(ROUTE_STATUSES).optional(),
  notes: optionalText(5e3),
  actualTransportCost: z5.coerce.number().min(0).max(1e5).nullable().optional()
});
var routeAddStopSchema = z5.object({
  storeId: z5.string().uuid("Selecione a loja."),
  position: z5.coerce.number().int().min(1).optional()
});
var routeReorderSchema = z5.object({
  stopIds: z5.array(z5.string().uuid()).min(1)
});
var routeOptimizeSchema = z5.object({
  apply: z5.boolean().default(false)
});
var routeGenerateSchema = z5.object({
  employeeId: z5.string().uuid().optional(),
  from: isoDateSchema,
  to: isoDateSchema,
  overwrite: z5.boolean().default(false)
}).refine((v) => v.from <= v.to, { message: "Per\xEDodo inv\xE1lido.", path: ["to"] });
var templateCreateSchema = z5.object({
  name: z5.string().trim().min(2, "D\xEA um nome ao roteiro.").max(120),
  kind: z5.enum(ROUTE_TEMPLATE_KINDS).default("STANDARD"),
  cycleWeeks: z5.coerce.number().int().min(1).max(8).default(1),
  anchorDate: nullableIsoDateSchema,
  validFrom: nullableIsoDateSchema,
  validUntil: nullableIsoDateSchema,
  active: z5.boolean().default(true),
  notes: optionalText(2e3)
});
var templateUpdateSchema = templateCreateSchema.partial();
var templateDaySchema = z5.object({
  weekday: z5.coerce.number().int().min(1).max(7),
  weekIndex: z5.coerce.number().int().min(0).max(8).default(0),
  storeIds: z5.array(z5.string().uuid()).max(40)
});

// src/schemas/authorizations.ts
import { z as z6 } from "zod";
var letterStoreDatesSchema = z6.record(z6.string().uuid(), z6.array(isoDateSchema).max(120));
var storeIdsSchema = z6.array(z6.string().uuid()).max(500);
var letterMetaSchema = z6.object({
  title: z6.string().trim().min(2, "Informe um t\xEDtulo.").max(191),
  issueDate: nullableIsoDateSchema,
  validFrom: nullableIsoDateSchema,
  expirationDate: nullableIsoDateSchema,
  notes: optionalText(2e3),
  network: optionalText(120),
  // multipart: "id1,id2"; obrigatório no envio geral (na página da loja ela já entra)
  storeIds: csvArray(z6.string().uuid()),
  // multipart: JSON texto com as datas por loja (lidas da carta)
  storeDates: z6.string().max(2e5).optional()
}).refine((v) => !v.validFrom || !v.expirationDate || v.validFrom <= v.expirationDate, {
  message: "O vencimento deve ser posterior ao in\xEDcio da vig\xEAncia.",
  path: ["expirationDate"]
});
var letterUpdateSchema = z6.object({
  title: z6.string().trim().min(2).max(191).optional(),
  issueDate: nullableIsoDateSchema,
  validFrom: nullableIsoDateSchema,
  expirationDate: nullableIsoDateSchema,
  notes: optionalText(2e3),
  network: optionalText(120),
  storeIds: storeIdsSchema.min(1, "Selecione ao menos uma loja.").optional(),
  storeDates: letterStoreDatesSchema.optional()
});
var letterQuerySchema = z6.object({
  storeId: z6.string().uuid().optional(),
  validity: csvArray(z6.enum(AUTHORIZATION_VALIDITIES)),
  search: z6.string().trim().max(120).optional(),
  network: z6.string().trim().max(120).optional(),
  expiringWithinDays: z6.coerce.number().int().min(0).max(365).optional()
});

// src/schemas/expenses.ts
import { z as z7 } from "zod";
var money = z7.preprocess(
  (v) => v === "" || v === null || v === void 0 ? null : typeof v === "string" ? Number(v.replace(",", ".")) : v,
  z7.number({ error: "Valor inv\xE1lido." }).min(0, "O valor n\xE3o pode ser negativo.").max(1e5).nullable()
);
var expenseCreateSchema = z7.object({
  date: isoDateSchema,
  type: z7.enum(TRANSPORT_TYPES),
  description: optionalText(500),
  estimatedValue: money.optional(),
  actualValue: money.optional(),
  routeId: z7.string().uuid().nullable().optional(),
  visitId: z7.string().uuid().nullable().optional()
}).refine((v) => v.actualValue != null || v.estimatedValue != null, {
  message: "Informe o valor pago (ou o valor estimado).",
  path: ["actualValue"]
});
var expenseUpdateSchema = z7.object({
  date: isoDateSchema.optional(),
  type: z7.enum(TRANSPORT_TYPES).optional(),
  description: optionalText(500),
  estimatedValue: money.optional(),
  actualValue: money.optional()
});
var expenseQuerySchema = paginationQuerySchema.extend({
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  type: csvArray(z7.enum(TRANSPORT_TYPES)),
  routeId: z7.string().uuid().optional(),
  employeeId: z7.string().uuid().optional(),
  pageSize: z7.coerce.number().int().min(1).max(200).default(50)
});
var fareSchema = z7.object({
  type: z7.enum(TRANSPORT_TYPES),
  operator: z7.string().trim().min(2, "Informe a operadora.").max(120),
  description: optionalText(255),
  value: z7.coerce.number().min(0).max(1e3),
  effectiveFrom: isoDateSchema,
  effectiveUntil: optionalIsoDateSchema.nullable(),
  active: z7.boolean().default(true),
  verified: z7.boolean().default(true)
});

// src/schemas/settings.ts
import { z as z8 } from "zod";
var homeAddressSchema = z8.object({
  address: z8.string().trim().min(8, "Informe o endere\xE7o completo.").max(500),
  label: optionalText(80),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional()
});
var companySettingsSchema = z8.object({
  companyName: z8.string().trim().min(2).max(120),
  authorizationWarningDays: z8.coerce.number().int().min(1).max(365),
  authorizationCriticalDays: z8.coerce.number().int().min(0).max(60),
  blockVisitWithoutAuthorization: z8.boolean(),
  // Redes cuja loja precisa de carta de autorização (as demais aparecem como "Não exigida")
  authorizationRequiredNetworks: z8.array(z8.string().trim().min(1).max(120)).max(50),
  autoGenerateRoutes: z8.boolean(),
  routeGenerationHorizonDays: z8.coerce.number().int().min(0).max(120),
  fullRouteTravelMode: z8.enum(["driving", "walking"]),
  networks: z8.array(z8.string().trim().min(1).max(120)).max(50),
  regions: z8.array(z8.string().trim().min(1).max(80)).max(50),
  activityPresets: z8.array(z8.string().trim().min(1).max(120)).max(30),
  networkCodeRules: z8.array(
    z8.object({
      pattern: z8.string().trim().min(1).max(60),
      network: z8.string().trim().min(1).max(120)
    })
  ).max(20),
  defaultNetworkForNamedStores: z8.string().trim().min(1).max(120)
});
var companySettingsUpdateSchema = companySettingsSchema.partial();
var sharedAccessCreateSchema = z8.object({
  label: z8.string().trim().min(2, "D\xEA um nome ao link (ex.: Gestor comercial).").max(120),
  scope: z8.array(z8.enum(SHARED_SCOPES)).min(1, "Selecione o que o link pode exibir.")
});
var sharedAccessUpdateSchema = z8.object({
  label: z8.string().trim().min(2).max(120).optional(),
  active: z8.boolean().optional(),
  scope: z8.array(z8.enum(SHARED_SCOPES)).min(1).optional()
});
var reportQuerySchema = z8.object({
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  employeeId: z8.string().uuid().optional(),
  network: z8.string().trim().max(120).optional(),
  storeId: z8.string().uuid().optional(),
  region: z8.string().trim().max(80).optional(),
  status: csvArray(z8.enum(VISIT_STATUSES))
});
var auditQuerySchema = z8.object({
  entity: z8.string().trim().max(60).optional(),
  action: z8.string().trim().max(60).optional(),
  from: optionalIsoDateSchema,
  to: optionalIsoDateSchema,
  page: z8.coerce.number().int().min(1).default(1),
  pageSize: z8.coerce.number().int().min(1).max(100).default(30)
});
export {
  AUTHORIZATION_STATUSES,
  AUTHORIZATION_VALIDITIES,
  AUTHORIZATION_VALIDITY_LABEL,
  AUTHORIZATION_VALIDITY_TONE,
  AuthorizationStatus,
  AuthorizationValidity,
  DEFAULT_CITY,
  DEFAULT_ESTIMATE_PARAMS,
  DEFAULT_NETWORK_RULES,
  DEFAULT_STATE,
  DEFAULT_TIME_ZONE,
  DEFAULT_VALIDITY_THRESHOLDS,
  ISO_DATE_REGEX,
  MAX_WAYPOINTS_PER_LINK,
  MONTH_LABEL,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABEL,
  NotificationType,
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABEL,
  PhotoCategory,
  REPORT_TYPES,
  REPORT_TYPE_LABEL,
  ROUTE_STATUSES,
  ROUTE_STATUS_LABEL,
  ROUTE_TEMPLATE_KINDS,
  ROUTE_TEMPLATE_KIND_LABEL,
  ReportType,
  RouteStatus,
  RouteTemplateKind,
  SHARED_SCOPES,
  SHARED_SCOPE_LABEL,
  SPREADSHEET_STATUS_MAP,
  SharedScope,
  TRANSIT_STEP_LABEL,
  TRANSPORT_MODES,
  TRANSPORT_MODE_LABEL,
  TRANSPORT_TYPES,
  TRANSPORT_TYPE_LABEL,
  TransitStepMode,
  TransportMode,
  TransportType,
  USER_ROLES,
  USER_ROLE_LABEL,
  UserRole,
  VISIT_ACTIVITY_TYPES,
  VISIT_ACTIVITY_TYPE_LABEL,
  VISIT_STATUSES,
  VISIT_STATUS_LABEL,
  VISIT_STATUS_TONE,
  VisitActivityType,
  VisitStatus,
  WEEKDAY_LABEL,
  WEEKDAY_SHORT_LABEL,
  addDaysIso,
  addMonthsIso,
  addressHasNumber,
  auditQuerySchema,
  booleanQuery,
  buildFullRouteLinks,
  buildLegLinks,
  buildStoreImportKey,
  changePasswordSchema,
  closedTourDistanceKm,
  companySettingsSchema,
  companySettingsUpdateSchema,
  comparableKey,
  computeLetterValidity,
  csvArray,
  dateRangeQuerySchema,
  describeDaysLeft,
  diffDaysIso,
  eachDayIso,
  easterSunday,
  endOfMonthIso,
  endOfWeekIso,
  estimateLeg,
  expenseCreateSchema,
  expenseQuerySchema,
  expenseUpdateSchema,
  fareSchema,
  firstName,
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  formatDistance,
  formatDuration,
  formatLongDateBR,
  formatShortDateBR,
  formatStoreAddress,
  formatTimeBR,
  fullAddressForMaps,
  generateStoreCode,
  geoCaptureSchema,
  getNationalHolidays,
  googleMapsCoordinatesUrl,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  greetingFor,
  hasCoordinates,
  haversineKm,
  holidayOn,
  homeAddressSchema,
  isAuthorizationRequired,
  isIsoDate,
  isUsableValidity,
  isoDateSchema,
  isoToUtcDate,
  isoWeekday,
  latitudeSchema,
  letterMetaSchema,
  letterQuerySchema,
  letterStoreDatesSchema,
  letterUpdateSchema,
  loginSchema,
  longitudeSchema,
  monthLabel,
  networkForCode,
  normalizeAddressForGeocoding,
  normalizeStoreCode,
  normalizeText,
  nullableIsoDateSchema,
  optimizeClosedTour,
  optimizePath,
  optionalIsoDateSchema,
  optionalText,
  paginationQuerySchema,
  parseAuthorizationLetterText,
  parseBrDate,
  parseMoney,
  parseQuickAddLine,
  parseQuickAddText,
  pathCost,
  photoUploadMetaSchema,
  profileUpdateSchema,
  quickAddCommitSchema,
  reportQuerySchema,
  routeAddStopSchema,
  routeCreateSchema,
  routeGenerateSchema,
  routeOptimizeSchema,
  routeQuerySchema,
  routeReorderSchema,
  routeUpdateSchema,
  sharedAccessCreateSchema,
  sharedAccessUpdateSchema,
  slugify,
  startOfMonthIso,
  startOfWeekIso,
  storeBaseSchema,
  storeCreateSchema,
  storeQuerySchema,
  storeUpdateSchema,
  stripAccents,
  sumMoney,
  summarizeStoreAuthorization,
  templateCreateSchema,
  templateDaySchema,
  templateUpdateSchema,
  toIsoInTimeZone,
  toMoneyNumber,
  toNullableMoney,
  todayIso,
  transferOperationSchema,
  userCreateSchema,
  userPasswordResetSchema,
  userUpdateSchema,
  utcDateToIso,
  visitActivitySchema,
  visitCreateSchema,
  visitFinishSchema,
  visitQuerySchema,
  visitRescheduleSchema,
  visitStartSchema,
  visitUpdateSchema,
  weekOfMonth
};
//# sourceMappingURL=index.js.map