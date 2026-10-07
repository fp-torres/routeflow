import type { ApiErrorBody, AuthResponse } from '@routeflow/types';

/** Erro de API com mensagem já amigável (nunca exibimos detalhes técnicos). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Array<{ path: string; message: string }> = [],
    public requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = '/api';
let accessToken: string | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;
const listeners = new Set<(session: AuthResponse | null) => void>();

/** Indica (sem expor o token httpOnly) se há uma sessão a renovar; evita chamadas 401 desnecessárias. */
export function hasSessionHint(): boolean {
  return typeof document !== 'undefined' && document.cookie.split('; ').includes('rf_session=1');
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function onSessionChange(listener: (session: AuthResponse | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Renova a sessão via cookie httpOnly (uma única requisição concorrente). */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => (res.ok ? ((await res.json()) as AuthResponse) : null))
      .catch(() => null)
      .then((session) => {
        accessToken = session?.accessToken ?? null;
        listeners.forEach((l) => l(session));
        return session;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export type Query = Record<string, string | number | boolean | null | undefined | string[]>;

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    )
      continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

const FALLBACK: Record<number, string> = {
  0: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Não encontramos o que você procurava.',
  413: 'Arquivo muito grande.',
  429: 'Muitas tentativas em pouco tempo. Aguarde um instante.',
};

export function friendlyMessage(status: number, message?: string): string {
  if (status >= 500) return 'Não foi possível concluir agora. Tente novamente em instantes.';
  return message || FALLBACK[status] || 'Não foi possível concluir a ação.';
}

async function toError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await res.json()) as Partial<ApiErrorBody>;
  } catch {
    // corpo não-JSON
  }
  return new ApiError(
    res.status,
    friendlyMessage(res.status, body.message),
    body.errors ?? [],
    body.requestId,
  );
}

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
}

export async function request<T>(
  method: string,
  path: string,
  { query, body, signal, auth = true }: RequestOptions = {},
): Promise<T> {
  const isForm = body instanceof FormData;
  const send = (token: string | null) =>
    fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  let res: Response;
  try {
    res = await send(accessToken);
    if (res.status === 401 && auth) {
      const session = await refreshSession();
      if (session) res = await send(session.accessToken);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, FALLBACK[0]!);
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

/** Upload multipart com progresso (XHR), renovando a sessão se necessário. */
export function upload<T>(
  path: string,
  form: FormData,
  onProgress?: (value: number) => void,
): Promise<T> {
  const attempt = (token: string | null) =>
    new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', buildUrl(path));
      xhr.withCredentials = true;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total);
      };
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = null;
        }
        resolve({ status: xhr.status, body });
      };
      xhr.onerror = () => reject(new ApiError(0, FALLBACK[0]!));
      xhr.send(form);
    });
  return (async () => {
    let result = await attempt(accessToken);
    if (result.status === 401) {
      const session = await refreshSession();
      if (session) result = await attempt(session.accessToken);
    }
    if (result.status >= 200 && result.status < 300) return result.body as T;
    const body = (result.body ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      result.status,
      friendlyMessage(result.status, body.message),
      body.errors ?? [],
    );
  })();
}

/** Download autenticado (relatórios PDF/Excel). */
export async function download(path: string, query?: Query): Promise<void> {
  const send = (token: string | null) =>
    fetch(buildUrl(path, query), {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  let res: Response;
  try {
    res = await send(accessToken);
    if (res.status === 401) {
      const session = await refreshSession();
      if (session) res = await send(session.accessToken);
    }
  } catch {
    throw new ApiError(0, FALLBACK[0]!);
  }
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const name =
    /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'routeflow';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
