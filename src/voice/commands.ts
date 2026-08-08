import type { Dashboard, Task } from '../../shared/types';
import { formatTime, minutesUntil, relativeTime } from '../format';

export type VoiceCommand =
  | { kind: 'add-task'; title: string; priority: Task['priority'] }
  | { kind: 'complete-task'; query: string }
  | { kind: 'delete-task'; query: string }
  | { kind: 'append-note'; text: string }
  | { kind: 'briefing' }
  | { kind: 'read-tasks' }
  | { kind: 'read-slack' }
  | { kind: 'read-mail' }
  | { kind: 'read-schedule' }
  | { kind: 'next-event' }
  | { kind: 'play-podcast' }
  | { kind: 'toggle-podcast' }
  | { kind: 'next-episode' }
  | { kind: 'refresh' }
  | { kind: 'stop-speaking' };

const WAKE_WORDS = ['hud', 'computer', 'db'];

/** Strips an optional wake word and normalises punctuation/casing. */
export function normalise(transcript: string): string {
  let text = transcript
    .toLowerCase()
    .replace(/[.,!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const wake of WAKE_WORDS) {
    const prefix = new RegExp(`^(hey |ok |okay )?${wake}\\b[, ]*`);
    if (prefix.test(text)) {
      text = text.replace(prefix, '').trim();
      break;
    }
  }
  return text;
}

const PATTERNS: { test: RegExp; build: (match: RegExpMatchArray) => VoiceCommand }[] = [
  {
    test: /^(?:add|create|new)\s+(?:a\s+)?(?:task|objective|to-?do)\s+(?:to\s+)?(.+)$/,
    build: (match) => ({
      kind: 'add-task',
      ...extractPriority(match[1]),
    }),
  },
  {
    test: /^(?:remind me to|i need to)\s+(.+)$/,
    build: (match) => ({ kind: 'add-task', ...extractPriority(match[1]) }),
  },
  {
    test: /^(?:complete|finish|check off|mark done|done with|tick off)\s+(?:task\s+)?(.+)$/,
    build: (match) => ({ kind: 'complete-task', query: match[1] }),
  },
  {
    test: /^(?:delete|remove|drop|scrap)\s+(?:task\s+)?(.+)$/,
    build: (match) => ({ kind: 'delete-task', query: match[1] }),
  },
  {
    test: /^(?:note|log|journal|write down)\s+(?:that\s+)?(.+)$/,
    build: (match) => ({ kind: 'append-note', text: match[1] }),
  },
  {
    test: /^(?:brief(?:ing)?(?:\s+me)?|what'?s my day|daily brief(?:ing)?|status(?:\s+report)?|sit ?rep)$/,
    build: () => ({ kind: 'briefing' }),
  },
  {
    test: /^(?:read\s+)?(?:my\s+)?(?:tasks|objectives|to-?dos)$/,
    build: () => ({ kind: 'read-tasks' }),
  },
  {
    test: /^(?:read\s+)?(?:my\s+)?slack(?:\s+(?:feed|messages|mentions))?$/,
    build: () => ({ kind: 'read-slack' }),
  },
  {
    test: /^(?:read\s+)?(?:my\s+)?(?:mail|email|emails|inbox|gmail)$/,
    build: () => ({ kind: 'read-mail' }),
  },
  {
    test: /^(?:read\s+)?(?:my\s+)?(?:schedule|calendar|agenda|day)$/,
    build: () => ({ kind: 'read-schedule' }),
  },
  {
    test: /^(?:what'?s\s+)?next(?:\s+(?:meeting|event|up))?$/,
    build: () => ({ kind: 'next-event' }),
  },
  {
    test: /^(?:pause|resume|unpause)(?:\s+(?:the\s+)?(?:podcast|episode|audio|playback|tbpn))?$/,
    build: () => ({ kind: 'toggle-podcast' }),
  },
  {
    test: /^(?:next|skip)(?:\s+(?:this\s+|the\s+)?(?:episode|podcast|track))?$/,
    build: () => ({ kind: 'next-episode' }),
  },
  {
    test: /^(?:play|open|start|queue)\s+(?:the\s+)?(?:latest\s+)?(?:tbpn|podcast|episode|show)(?:\s+(?:podcast|episode))?$/,
    build: () => ({ kind: 'play-podcast' }),
  },
  {
    test: /^(?:refresh|reload|re-?sync|sync)$/,
    build: () => ({ kind: 'refresh' }),
  },
  {
    test: /^(?:stop|quiet|silence|shut up|cancel)$/,
    build: () => ({ kind: 'stop-speaking' }),
  },
];

function extractPriority(raw: string): { title: string; priority: Task['priority'] } {
  const highPriority = /\b(high priority|urgent|asap|important)\b/.test(raw);
  const lowPriority = /\b(low priority|whenever|someday)\b/.test(raw);
  const title = raw
    .replace(/\b(?:with\s+)?(?:high|low)\s+priority\b/g, '')
    .replace(/\b(urgent|asap|important|whenever|someday)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    priority: highPriority ? 'high' : lowPriority ? 'low' : 'normal',
  };
}

export function parseCommand(transcript: string): VoiceCommand | null {
  const text = normalise(transcript);
  if (text === '') return null;
  for (const pattern of PATTERNS) {
    const match = text.match(pattern.test);
    if (match) return pattern.build(match);
  }
  return null;
}

/** Loose word-overlap match so "standup notes" finds "Post async standup notes". */
export function findTask(tasks: Task[], query: string): Task | null {
  const words = normalise(query)
    .split(' ')
    .filter((word) => word.length > 2);
  if (words.length === 0) return null;
  let best: { task: Task; score: number } | null = null;
  for (const task of tasks) {
    const title = task.title.toLowerCase();
    const score = words.reduce((total, word) => total + (title.includes(word) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { task, score };
  }
  return best?.task ?? null;
}

function list(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function briefingText(data: Dashboard, now: Date): string {
  const open = data.notes.tasks.filter((task) => !task.done);
  const next = data.calendar.nextEvent;
  const mentions = data.slack.messages.filter((message) => message.mention);
  const parts: string[] = [
    `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}. It's ${formatTime(now.toISOString())}.`,
    data.calendar.events.length === 0
      ? 'Your calendar is clear today.'
      : `You have ${data.calendar.events.length} event${data.calendar.events.length === 1 ? '' : 's'} today, ${Math.round(data.calendar.busyMinutes / 60)} hours booked.`,
  ];
  if (next) {
    const eta = minutesUntil(next.start, now);
    parts.push(
      `Next up: ${next.title} at ${formatTime(next.start)}${eta > 0 ? `, in ${eta} minutes` : ', starting now'}.`,
    );
  }
  parts.push(
    open.length === 0
      ? 'No open objectives.'
      : `${open.length} open objective${open.length === 1 ? '' : 's'}: ${list(open.slice(0, 4).map((task) => task.title))}.`,
  );
  parts.push(
    `Slack has ${mentions.length} mention${mentions.length === 1 ? '' : 's'}, and ${data.mail.unread} unread email${data.mail.unread === 1 ? '' : 's'}.`,
  );
  const demo = data.sources.filter((source) => source.mode === 'mock').map((source) => source.name);
  if (demo.length > 0) parts.push(`Heads up: ${list(demo)} ${demo.length === 1 ? 'is' : 'are'} on demo data.`);
  return parts.join(' ');
}

export function tasksText(data: Dashboard): string {
  const open = data.notes.tasks.filter((task) => !task.done);
  if (open.length === 0) return 'You have no open objectives.';
  return `${open.length} open: ${list(open.map((task) => `${task.title}${task.priority === 'high' ? ', high priority' : ''}`))}.`;
}

export function slackText(data: Dashboard): string {
  if (data.slack.messages.length === 0) return 'No recent Slack messages.';
  return data.slack.messages
    .slice(0, 4)
    .map(
      (message) =>
        `${message.author} in ${message.channel.replace('#', '')}, ${relativeTime(message.ts)}: ${message.text}`,
    )
    .join(' … ');
}

export function mailText(data: Dashboard): string {
  if (data.mail.messages.length === 0) return 'Your inbox is clear.';
  return `${data.mail.unread} unread. ${data.mail.messages
    .slice(0, 4)
    .map((message) => `From ${message.from}: ${message.subject}`)
    .join(' … ')}`;
}

export function scheduleText(data: Dashboard): string {
  if (data.calendar.events.length === 0) return 'Nothing scheduled today.';
  return data.calendar.events
    .map((event) =>
      event.allDay
        ? `All day: ${event.title}`
        : `${formatTime(event.start)}, ${event.title}`,
    )
    .join(' … ');
}

export function nextEventText(data: Dashboard, now: Date): string {
  const next = data.calendar.nextEvent;
  if (!next) return 'Nothing else on the calendar today.';
  const eta = minutesUntil(next.start, now);
  return `${next.title} at ${formatTime(next.start)}${eta > 0 ? `, in ${eta} minutes` : ', now'}${
    next.location ? `, ${next.location}` : ''
  }.`;
}
