/** Error raised for non-2xx API responses, carrying the API's (German) message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const FALLBACK_MESSAGE = 'Das hat nicht geklappt. Bitte versuche es erneut.';

/** Browser-side API call (same origin). Throws ApiError with a user-facing message. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
  }
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return (await response.json()) as T;
}

export function jsonBody(body: unknown): RequestInit {
  return { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    // Validation messages arrive as "field: message".
    return message?.replace(/^[\w.]+: /, '') || FALLBACK_MESSAGE;
  } catch {
    return FALLBACK_MESSAGE;
  }
}

export function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}
