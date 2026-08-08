export type SourceMode = 'live' | 'mock';

export interface SourceStatus {
  name: 'slack' | 'gmail' | 'calendar' | 'notes' | 'podcast';
  mode: SourceMode;
  ok: boolean;
  detail: string;
}

export interface SlackMessage {
  id: string;
  channel: string;
  author: string;
  text: string;
  ts: string;
  mention: boolean;
}

export interface SlackSummary {
  unreadMentions: number;
  activeChannels: number;
  messages: SlackMessage[];
  /** Message counts per hour for the last 12 hours, oldest first. */
  activity: number[];
}

export interface MailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  unread: boolean;
}

export interface MailSummary {
  unread: number;
  important: number;
  messages: MailMessage[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  attendees: number;
  allDay: boolean;
}

export interface CalendarSummary {
  events: CalendarEvent[];
  busyMinutes: number;
  nextEvent: CalendarEvent | null;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: 'low' | 'normal' | 'high';
  source: 'manual' | 'slack' | 'gmail';
  createdAt: string;
}

export interface DailyNote {
  date: string;
  body: string;
  updatedAt: string;
}

export interface NotesSummary {
  note: DailyNote;
  tasks: Task[];
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  releasedAt: string;
  durationMinutes: number;
  imageUrl: string;
  /** Web player link. */
  url: string;
  /** Desktop-app deep link, e.g. spotify:episode:… */
  uri: string;
}

export interface PodcastSummary {
  show: string;
  showUrl: string;
  showUri: string;
  /** Newest episode, or null when it could not be resolved without credentials. */
  episode: PodcastEpisode | null;
  /** Newest-first play queue the player cycles through; empty without credentials. */
  queue: PodcastEpisode[];
}

export interface Dashboard {
  generatedAt: string;
  date: string;
  sources: SourceStatus[];
  slack: SlackSummary;
  mail: MailSummary;
  calendar: CalendarSummary;
  notes: NotesSummary;
  podcast: PodcastSummary;
}
