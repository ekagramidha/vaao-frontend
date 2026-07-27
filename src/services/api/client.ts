import { currentLocationId } from '@/services/embed';
import type { ErrorEnvelope, ResponseMeta, SuccessEnvelope } from '@/types/api';

/**
 * The single fetch wrapper every request goes through.
 *
 * It unwraps the API's success envelope so callers receive the payload
 * directly, and turns a failure envelope into a thrown `ApiClientError`
 * carrying the machine-readable code. Views switch on `error.code`, never on
 * the message text.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1').replace(
  /\/+$/,
  '',
);

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(params: {
    message: string;
    code: string;
    status: number;
    details?: unknown;
    requestId?: string;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.requestId = params.requestId;
  }

  /** True when the failure is one the user can fix by doing something first. */
  get isActionable(): boolean {
    return this.code === 'UNPROCESSABLE' || this.code === 'VALIDATION_FAILED';
  }

  get isNotSupported(): boolean {
    return this.code === 'NOT_SUPPORTED_BY_GHL';
  }
}

export interface ApiResult<T> {
  data: T;
  meta?: ResponseMeta;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}/${path.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // Which sub-account this request is about. Never a credential.
  const location = currentLocationId();
  if (location) headers['x-ghl-location-id'] = location;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    // A network-level failure has no envelope, so it is given a code of its own
    // rather than being reported as a generic 500 the server never sent.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError({
      message: 'Could not reach the optimizer API. Check that the backend is running.',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  const text = await response.text();
  const parsed: unknown = text ? safeParse(text) : null;

  if (!response.ok) {
    const envelope = parsed as ErrorEnvelope | null;
    throw new ApiClientError({
      message: envelope?.error?.message ?? `Request failed with status ${response.status}.`,
      code: envelope?.error?.code ?? 'UNKNOWN',
      status: response.status,
      details: envelope?.error?.details,
      requestId: envelope?.requestId,
    });
  }

  const envelope = parsed as SuccessEnvelope<T>;
  return { data: envelope.data, ...(envelope.meta ? { meta: envelope.meta } : {}) };
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
