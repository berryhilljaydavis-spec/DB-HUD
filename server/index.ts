import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import type { Dashboard, SourceStatus } from '../shared/types.js';
import { mockCalendar, mockMail, mockSlack } from './mock.js';
import { fetchSlack } from './slack.js';
import { fetchCalendar, fetchMail, type GoogleCredentials } from './google.js';
import { addTask, deleteTask, getNotes, saveNote, toggleTask, today } from './store.js';

const app = express();
app.use(express.json());

function googleCredentials(): GoogleCredentials | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    refreshToken: GOOGLE_REFRESH_TOKEN,
  };
}

async function withFallback<T>(
  name: SourceStatus['name'],
  live: (() => Promise<T>) | null,
  fallback: () => T,
  statuses: SourceStatus[],
): Promise<T> {
  if (!live) {
    statuses.push({ name, mode: 'mock', ok: true, detail: 'no credentials configured' });
    return fallback();
  }
  try {
    const value = await live();
    statuses.push({ name, mode: 'live', ok: true, detail: 'connected' });
    return value;
  } catch (error) {
    statuses.push({
      name,
      mode: 'mock',
      ok: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
    return fallback();
  }
}

app.get('/api/dashboard', async (_req, res) => {
  const statuses: SourceStatus[] = [];
  const slackToken = process.env.SLACK_TOKEN;
  const google = googleCredentials();
  const channelFilter = (process.env.SLACK_CHANNELS ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const [slack, mail, calendar] = await Promise.all([
    withFallback(
      'slack',
      slackToken
        ? () => fetchSlack(slackToken, { channelFilter, selfUserId: process.env.SLACK_USER_ID })
        : null,
      mockSlack,
      statuses,
    ),
    withFallback('gmail', google ? () => fetchMail(google) : null, mockMail, statuses),
    withFallback(
      'calendar',
      google ? () => fetchCalendar(google, process.env.GOOGLE_CALENDAR_ID) : null,
      mockCalendar,
      statuses,
    ),
  ]);

  const notes = await getNotes();
  statuses.push({ name: 'notes', mode: 'live', ok: true, detail: 'local store' });

  const dashboard: Dashboard = {
    generatedAt: new Date().toISOString(),
    date: today(),
    sources: statuses,
    slack,
    mail,
    calendar,
    notes,
  };
  res.json(dashboard);
});

app.put('/api/note', async (req, res) => {
  const body = typeof req.body?.body === 'string' ? req.body.body : null;
  if (body === null) {
    res.status(400).json({ error: 'body must be a string' });
    return;
  }
  res.json(await saveNote(body));
});

app.post('/api/tasks', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const priority = ['low', 'normal', 'high'].includes(req.body?.priority)
    ? req.body.priority
    : 'normal';
  res.status(201).json(await addTask(title, priority));
});

app.post('/api/tasks/:id/toggle', async (req, res) => {
  const task = await toggleTask(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'task not found' });
    return;
  }
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const removed = await deleteTask(req.params.id);
  res.status(removed ? 204 : 404).end();
});

const dist = resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`HUD API listening on http://localhost:${port}`);
});
