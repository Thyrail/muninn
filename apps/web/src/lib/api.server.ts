import 'server-only';
import {
  publicConfigSchema,
  type ChatMessageDto,
  type NotebookSummary,
  type PublicConfig,
  type SourceDto,
} from '@muninn/shared';
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

async function getJson<T>(path: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(`GET /api${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

export function getNotebooks(): Promise<NotebookSummary[]> {
  return getJson('/notebooks');
}

/** Returns null for unknown or foreign notebooks (the API answers 404 for both). */
export async function getNotebook(id: string): Promise<NotebookSummary | null> {
  const response = await apiFetch(`/notebooks/${encodeURIComponent(id)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GET /api/notebooks/:id failed with ${response.status}`);
  return (await response.json()) as NotebookSummary;
}

export function getSources(notebookId: string): Promise<SourceDto[]> {
  return getJson(`/notebooks/${encodeURIComponent(notebookId)}/sources`);
}

export function getChatMessages(notebookId: string): Promise<ChatMessageDto[]> {
  return getJson(`/notebooks/${encodeURIComponent(notebookId)}/messages`);
}
