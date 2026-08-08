import type { CalendarSummary, MailSummary, SlackSummary } from '../shared/types.js';

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function atHour(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function mockSlack(): SlackSummary {
  return {
    unreadMentions: 4,
    activeChannels: 7,
    messages: [
      {
        id: 'm1',
        channel: '#eng-platform',
        author: 'dana',
        text: 'Deploy to staging is green, can you sanity check the HUD panels?',
        ts: isoMinutesAgo(8),
        mention: true,
      },
      {
        id: 'm2',
        channel: '#incidents',
        author: 'pagerbot',
        text: 'Resolved: elevated latency on api-edge (12m)',
        ts: isoMinutesAgo(26),
        mention: false,
      },
      {
        id: 'm3',
        channel: '#design',
        author: 'kai',
        text: 'New glow tokens are in Figma — cyan 400 replaced the old accent.',
        ts: isoMinutesAgo(51),
        mention: false,
      },
      {
        id: 'm4',
        channel: '#standup',
        author: 'morgan',
        text: 'Reminder: async standup notes due before 10:00.',
        ts: isoMinutesAgo(94),
        mention: true,
      },
      {
        id: 'm5',
        channel: '#eng-platform',
        author: 'sam',
        text: 'Left comments on the calendar aggregation PR.',
        ts: isoMinutesAgo(132),
        mention: true,
      },
    ],
    activity: [2, 5, 3, 8, 12, 9, 14, 11, 18, 13, 7, 4],
  };
}

export function mockMail(): MailSummary {
  return {
    unread: 12,
    important: 3,
    messages: [
      {
        id: 'e1',
        from: 'Vercel',
        subject: 'Deployment ready: DB-HUD',
        snippet: 'Your preview deployment finished building in 41s.',
        receivedAt: isoMinutesAgo(15),
        unread: true,
      },
      {
        id: 'e2',
        from: 'Priya Raman',
        subject: 'Q3 roadmap review — agenda',
        snippet: 'Adding the integrations workstream to the top of the agenda.',
        receivedAt: isoMinutesAgo(63),
        unread: true,
      },
      {
        id: 'e3',
        from: 'GitHub',
        subject: '[DB-HUD] Review requested on #1',
        snippet: 'berryhilljaydavis-spec requested your review.',
        receivedAt: isoMinutesAgo(120),
        unread: false,
      },
      {
        id: 'e4',
        from: 'Google Calendar',
        subject: 'Invitation: Ops sync @ 15:30',
        snippet: 'Weekly ops sync, 30 minutes, 6 guests.',
        receivedAt: isoMinutesAgo(190),
        unread: false,
      },
    ],
  };
}

export function mockCalendar(): CalendarSummary {
  const events = [
    {
      id: 'c1',
      title: 'Async standup notes',
      start: atHour(9, 30),
      end: atHour(9, 45),
      location: 'Slack #standup',
      attendees: 1,
      allDay: false,
    },
    {
      id: 'c2',
      title: 'Integrations design review',
      start: atHour(11, 0),
      end: atHour(12, 0),
      location: 'Meet',
      attendees: 5,
      allDay: false,
    },
    {
      id: 'c3',
      title: 'Focus block — HUD panels',
      start: atHour(13, 0),
      end: atHour(15, 0),
      location: '',
      attendees: 1,
      allDay: false,
    },
    {
      id: 'c4',
      title: 'Ops sync',
      start: atHour(15, 30),
      end: atHour(16, 0),
      location: 'Meet',
      attendees: 6,
      allDay: false,
    },
  ];
  const now = Date.now();
  const busyMinutes = events.reduce(
    (total, e) => total + (Date.parse(e.end) - Date.parse(e.start)) / 60_000,
    0,
  );
  return {
    events,
    busyMinutes,
    nextEvent: events.find((e) => Date.parse(e.start) > now) ?? null,
  };
}
