import type { Dashboard, DailyNote, Task } from '../shared/types';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class LockedError extends Error {
  constructor() {
    super('passcode required');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (res.status === 401) throw new LockedError();
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed (${res.status})`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  dashboard: () => request<Dashboard>('/dashboard'),
  login: (passcode: string) =>
    request<{ ok: true }>('/login', { method: 'POST', body: JSON.stringify({ passcode }) }),
  saveNote: (body: string) =>
    request<DailyNote>('/note', { method: 'PUT', body: JSON.stringify({ body }) }),
  addTask: (title: string, priority: Task['priority'] = 'normal') =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ title, priority }) }),
  toggleTask: (id: string) => request<Task>(`/tasks/${id}/toggle`, { method: 'POST' }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};
