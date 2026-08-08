import assert from 'node:assert/strict';
import test from 'node:test';
import type { Dashboard, Task } from '../../shared/types';
import { briefingText, findTask, normalise, parseCommand } from './commands';

function task(title: string, done = false): Task {
  return {
    id: title,
    title,
    done,
    priority: 'normal',
    source: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

test('strips wake words and punctuation', () => {
  assert.equal(normalise('Hey HUD, brief me!'), 'brief me');
  assert.equal(normalise('Computer: refresh.'), 'refresh');
  assert.equal(normalise('   Brief   me  '), 'brief me');
});

test('parses task creation with priority', () => {
  assert.deepEqual(parseCommand('hud add task review the deploy, high priority'), {
    kind: 'add-task',
    title: 'Review the deploy',
    priority: 'high',
  });
  assert.deepEqual(parseCommand('add objective ship voice mode'), {
    kind: 'add-task',
    title: 'Ship voice mode',
    priority: 'normal',
  });
  assert.deepEqual(parseCommand('remind me to book the room whenever'), {
    kind: 'add-task',
    title: 'Book the room',
    priority: 'low',
  });
});

test('parses task mutation, notes and read-outs', () => {
  assert.deepEqual(parseCommand('complete standup notes'), {
    kind: 'complete-task',
    query: 'standup notes',
  });
  assert.deepEqual(parseCommand('delete task book the room'), {
    kind: 'delete-task',
    query: 'book the room',
  });
  assert.deepEqual(parseCommand('note that the migration is done'), {
    kind: 'append-note',
    text: 'the migration is done',
  });
  assert.deepEqual(parseCommand("what's my day"), { kind: 'briefing' });
  assert.deepEqual(parseCommand('read my inbox'), { kind: 'read-mail' });
  assert.deepEqual(parseCommand('next meeting'), { kind: 'next-event' });
  assert.deepEqual(parseCommand('play the latest tbpn'), { kind: 'play-podcast' });
  assert.deepEqual(parseCommand('open podcast'), { kind: 'play-podcast' });
  assert.deepEqual(parseCommand('pause the episode'), { kind: 'toggle-podcast' });
  assert.deepEqual(parseCommand('resume'), { kind: 'toggle-podcast' });
  assert.deepEqual(parseCommand('next episode'), { kind: 'next-episode' });
  assert.deepEqual(parseCommand('skip'), { kind: 'next-episode' });
  assert.deepEqual(parseCommand('resync'), { kind: 'refresh' });
  assert.deepEqual(parseCommand('quiet'), { kind: 'stop-speaking' });
});

test('ignores chatter that is not a command', () => {
  assert.equal(parseCommand('so anyway I was saying'), null);
  assert.equal(parseCommand(''), null);
});

test('matches tasks loosely, ignoring short words', () => {
  const tasks = [task('Post async standup notes'), task('Review integrations design doc')];
  assert.equal(findTask(tasks, 'standup notes')?.title, 'Post async standup notes');
  assert.equal(findTask(tasks, 'integrations')?.title, 'Review integrations design doc');
  assert.equal(findTask(tasks, 'the a of'), null);
  assert.equal(findTask(tasks, 'nonexistent thing'), null);
});

test('briefing mentions events, objectives, mentions and demo sources', () => {
  const now = new Date('2026-08-08T09:00:00.000Z');
  const dashboard: Dashboard = {
    generatedAt: now.toISOString(),
    date: '2026-08-08',
    sources: [{ name: 'slack', mode: 'mock', ok: true, detail: 'no credentials configured' }],
    slack: {
      unreadMentions: 1,
      activeChannels: 2,
      messages: [
        {
          id: 'a',
          channel: '#eng',
          author: 'dana',
          text: 'ping',
          ts: now.toISOString(),
          mention: true,
        },
      ],
      activity: [1],
    },
    mail: { unread: 3, important: 1, messages: [] },
    calendar: {
      events: [
        {
          id: 'e',
          title: 'Ops sync',
          start: new Date(now.getTime() + 30 * 60_000).toISOString(),
          end: new Date(now.getTime() + 60 * 60_000).toISOString(),
          location: 'Meet',
          attendees: 3,
          allDay: false,
        },
      ],
      busyMinutes: 30,
      nextEvent: {
        id: 'e',
        title: 'Ops sync',
        start: new Date(now.getTime() + 30 * 60_000).toISOString(),
        end: new Date(now.getTime() + 60 * 60_000).toISOString(),
        location: 'Meet',
        attendees: 3,
        allDay: false,
      },
    },
    podcast: {
      show: 'TBPN',
      showUrl: 'https://open.spotify.com/show/2L6WMqY3GUPCGBD0dX6p00',
      showUri: 'spotify:show:2L6WMqY3GUPCGBD0dX6p00',
      episode: null,
      queue: [],
    },
    notes: {
      note: { date: '2026-08-08', body: '', updatedAt: now.toISOString() },
      tasks: [task('Ship voice mode'), task('Old thing', true)],
    },
  };

  const text = briefingText(dashboard, now);
  assert.match(text, /1 event/);
  assert.match(text, /Next up: Ops sync/);
  assert.match(text, /1 open objective: Ship voice mode/);
  assert.match(text, /1 mention, and 3 unread emails/);
  assert.match(text, /slack is on demo data/);
});
