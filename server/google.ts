import type { CalendarEvent, CalendarSummary, MailMessage, MailSummary } from '../shared/types.js';

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

export async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`google token refresh failed: ${body.error ?? res.status}`);
  }
  cached = {
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.accessToken;
}

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`google request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

interface GmailListResponse {
  messages?: { id: string }[];
  resultSizeEstimate?: number;
}

interface GmailMessage {
  id: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: { headers?: { name: string; value: string }[] };
}

function header(message: GmailMessage, name: string): string {
  const found = message.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return found?.value ?? '';
}

function displayName(from: string): string {
  const match = from.match(/^\s*"?([^"<]+?)"?\s*</);
  return (match ? match[1] : from.replace(/[<>]/g, '')).trim();
}

export async function fetchMail(credentials: GoogleCredentials): Promise<MailSummary> {
  const accessToken = await getAccessToken(credentials);
  const list = await googleGet<GmailListResponse>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=' +
      encodeURIComponent('in:inbox newer_than:2d'),
    accessToken,
  );
  const messages: MailMessage[] = [];
  let important = 0;
  for (const stub of list.messages ?? []) {
    const message = await googleGet<GmailMessage>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}?format=metadata` +
        '&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date',
      accessToken,
    );
    const labels = message.labelIds ?? [];
    if (labels.includes('IMPORTANT')) important += 1;
    messages.push({
      id: message.id,
      from: displayName(header(message, 'From')),
      subject: header(message, 'Subject') || '(no subject)',
      snippet: message.snippet ?? '',
      receivedAt: new Date(Number(message.internalDate ?? Date.now())).toISOString(),
      unread: labels.includes('UNREAD'),
    });
  }
  const unreadList = await googleGet<GmailListResponse>(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=' +
      encodeURIComponent('is:unread in:inbox'),
    accessToken,
  );
  return {
    unread: unreadList.resultSizeEstimate ?? messages.filter((m) => m.unread).length,
    important,
    messages,
  };
}

interface CalendarApiEvent {
  id: string;
  summary?: string;
  location?: string;
  attendees?: unknown[];
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export async function fetchCalendar(
  credentials: GoogleCredentials,
  calendarId = 'primary',
): Promise<CalendarSummary> {
  const accessToken = await getAccessToken(credentials);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?singleEvents=true&orderBy=startTime&maxResults=20` +
    `&timeMin=${dayStart.toISOString()}&timeMax=${dayEnd.toISOString()}`;
  const body = await googleGet<{ items?: CalendarApiEvent[] }>(url, accessToken);

  const events: CalendarEvent[] = (body.items ?? []).map((item) => {
    const allDay = !item.start?.dateTime;
    const start = item.start?.dateTime ?? `${item.start?.date}T00:00:00.000Z`;
    const end = item.end?.dateTime ?? `${item.end?.date}T00:00:00.000Z`;
    return {
      id: item.id,
      title: item.summary ?? '(untitled)',
      start,
      end,
      location: item.location ?? '',
      attendees: item.attendees?.length ?? 1,
      allDay,
    };
  });

  const now = Date.now();
  return {
    events,
    busyMinutes: events
      .filter((e) => !e.allDay)
      .reduce((total, e) => total + (Date.parse(e.end) - Date.parse(e.start)) / 60_000, 0),
    nextEvent: events.find((e) => Date.parse(e.start) > now) ?? null,
  };
}
