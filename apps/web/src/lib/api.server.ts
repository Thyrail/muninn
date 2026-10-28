import 'server-only';
import { publicConfigSchema, type PublicConfig } from '@muninn/shared';
import { cookies } from 'next/headers';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/** Calls the API from server components, forwarding the user's session cookie. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieHeader = (await cookies()).toString();
  return fetch(`${API_INTERNAL_URL}/api${path}`, {
    ...init,
    headers: { ...init?.headers, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
    cache: 'no-store',
  });
}

/** Returns the logged-in user, or null if the session is missing or invalid. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const response = await apiFetch('/me');
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`GET /api/me failed with ${response.status}`);
  return (await response.json()) as SessionUser;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const response = await fetch(`${API_INTERNAL_URL}/api/config`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`GET /api/config failed with ${response.status}`);
  return publicConfigSchema.parse(await response.json());
}
