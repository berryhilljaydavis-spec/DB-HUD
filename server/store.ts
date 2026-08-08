import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DailyNote, NotesSummary, Task } from '../shared/types.js';

const DATA_FILE = resolve(process.env.HUD_DATA_FILE ?? 'data/notes.json');

interface StoreShape {
  notes: Record<string, DailyNote>;
  tasks: Task[];
}

const seed: StoreShape = {
  notes: {},
  tasks: [
    {
      id: 'seed-1',
      title: 'Review integrations design doc',
      done: false,
      priority: 'high',
      source: 'manual',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-2',
      title: 'Post async standup notes',
      done: false,
      priority: 'normal',
      source: 'slack',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'seed-3',
      title: 'Reply to roadmap review thread',
      done: true,
      priority: 'normal',
      source: 'gmail',
      createdAt: new Date().toISOString(),
    },
  ],
};

async function read(): Promise<StoreShape> {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8')) as StoreShape;
  } catch {
    return structuredClone(seed);
  }
}

async function write(store: StoreShape): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getNotes(): Promise<NotesSummary> {
  const store = await read();
  const date = today();
  const note = store.notes[date] ?? {
    date,
    body: '',
    updatedAt: new Date().toISOString(),
  };
  return { note, tasks: store.tasks };
}

export async function saveNote(body: string): Promise<DailyNote> {
  const store = await read();
  const note: DailyNote = { date: today(), body, updatedAt: new Date().toISOString() };
  store.notes[note.date] = note;
  await write(store);
  return note;
}

export async function addTask(
  title: string,
  priority: Task['priority'] = 'normal',
): Promise<Task> {
  const store = await read();
  const task: Task = {
    id: randomUUID(),
    title,
    done: false,
    priority,
    source: 'manual',
    createdAt: new Date().toISOString(),
  };
  store.tasks.unshift(task);
  await write(store);
  return task;
}

export async function toggleTask(id: string): Promise<Task | null> {
  const store = await read();
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.done = !task.done;
  await write(store);
  return task;
}

export async function deleteTask(id: string): Promise<boolean> {
  const store = await read();
  const next = store.tasks.filter((t) => t.id !== id);
  if (next.length === store.tasks.length) return false;
  store.tasks = next;
  await write(store);
  return true;
}
