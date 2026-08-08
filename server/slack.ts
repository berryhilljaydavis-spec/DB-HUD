import type { SlackMessage, SlackSummary } from '../shared/types.js';

const SLACK_API = 'https://slack.com/api';
const HISTORY_HOURS = 12;

interface SlackChannel {
  id: string;
  name: string;
}

interface SlackHistoryMessage {
  ts?: string;
  text?: string;
  user?: string;
  username?: string;
  bot_id?: string;
  subtype?: string;
}

async function slackCall<T>(
  method: string,
  token: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${SLACK_API}/${method}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json()) as { ok: boolean; error?: string } & T;
  if (!body.ok) throw new Error(`slack ${method} failed: ${body.error ?? res.status}`);
  return body;
}

function bucketByHour(messages: SlackMessage[]): number[] {
  const buckets = new Array<number>(HISTORY_HOURS).fill(0);
  const now = Date.now();
  for (const message of messages) {
    const hoursAgo = Math.floor((now - Date.parse(message.ts)) / 3_600_000);
    const index = HISTORY_HOURS - 1 - hoursAgo;
    if (index >= 0 && index < HISTORY_HOURS) buckets[index] += 1;
  }
  return buckets;
}

export async function fetchSlack(
  token: string,
  options: { channelFilter: string[]; selfUserId?: string },
): Promise<SlackSummary> {
  const { channels } = await slackCall<{ channels: SlackChannel[] }>(
    'users.conversations',
    token,
    { types: 'public_channel,private_channel', exclude_archived: 'true', limit: '100' },
  );

  const wanted = options.channelFilter.map((c) => c.replace(/^#/, '').toLowerCase());
  const selected = (wanted.length
    ? channels.filter((c) => wanted.includes(c.name.toLowerCase()) || wanted.includes(c.id.toLowerCase()))
    : channels
  ).slice(0, 8);

  const oldest = ((Date.now() - HISTORY_HOURS * 3_600_000) / 1000).toFixed(3);
  const mentionToken = options.selfUserId ? `<@${options.selfUserId}>` : null;
  const userNames = new Map<string, string>();
  const collected: SlackMessage[] = [];

  for (const channel of selected) {
    const { messages } = await slackCall<{ messages: SlackHistoryMessage[] }>(
      'conversations.history',
      token,
      { channel: channel.id, oldest, limit: '50' },
    );
    for (const message of messages) {
      if (!message.ts || message.subtype === 'channel_join') continue;
      let author = message.username ?? message.user ?? 'unknown';
      if (message.user) {
        if (!userNames.has(message.user)) {
          try {
            const info = await slackCall<{ user: { real_name?: string; name: string } }>(
              'users.info',
              token,
              { user: message.user },
            );
            userNames.set(message.user, info.user.real_name || info.user.name);
          } catch {
            userNames.set(message.user, message.user);
          }
        }
        author = userNames.get(message.user) ?? author;
      }
      const text = message.text ?? '';
      collected.push({
        id: `${channel.id}-${message.ts}`,
        channel: `#${channel.name}`,
        author,
        text,
        ts: new Date(Number(message.ts) * 1000).toISOString(),
        mention: mentionToken ? text.includes(mentionToken) : /@here|@channel/.test(text),
      });
    }
  }

  collected.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return {
    unreadMentions: collected.filter((m) => m.mention).length,
    activeChannels: new Set(collected.map((m) => m.channel)).size,
    messages: collected.slice(0, 8),
    activity: bucketByHour(collected),
  };
}
