import type { CalendarSummary, MailSummary, SlackSummary } from '../../shared/types';
import { formatTime, relativeTime } from '../format';

export function SlackFeed({ slack }: { slack: SlackSummary }) {
  if (slack.messages.length === 0) return <p className="empty">No recent messages.</p>;
  return (
    <ul className="feed">
      {slack.messages.map((message) => (
        <li key={message.id} className={message.mention ? 'feed-item mention' : 'feed-item'}>
          <div className="feed-meta">
            <span className="channel">{message.channel}</span>
            <span className="author">{message.author}</span>
            <span className="time">{relativeTime(message.ts)}</span>
          </div>
          <p className="feed-text">{message.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function MailFeed({ mail }: { mail: MailSummary }) {
  if (mail.messages.length === 0) return <p className="empty">Inbox clear.</p>;
  return (
    <ul className="feed">
      {mail.messages.map((message) => (
        <li key={message.id} className={message.unread ? 'feed-item mention' : 'feed-item'}>
          <div className="feed-meta">
            <span className="channel">{message.from}</span>
            <span className="time">{relativeTime(message.receivedAt)}</span>
          </div>
          <p className="feed-subject">{message.subject}</p>
          <p className="feed-text">{message.snippet}</p>
        </li>
      ))}
    </ul>
  );
}

export function CalendarTimeline({
  calendar,
  now,
}: {
  calendar: CalendarSummary;
  now: Date;
}) {
  if (calendar.events.length === 0) return <p className="empty">Nothing scheduled today.</p>;
  const nowMs = now.getTime();
  return (
    <ul className="timeline">
      {calendar.events.map((event) => {
        const started = Date.parse(event.start) <= nowMs;
        const ended = Date.parse(event.end) <= nowMs;
        const state = ended ? 'done' : started ? 'live' : 'upcoming';
        return (
          <li key={event.id} className={`timeline-item ${state}`}>
            <span className="slot">
              {event.allDay ? 'ALL DAY' : `${formatTime(event.start)}–${formatTime(event.end)}`}
            </span>
            <div>
              <p className="event-title">{event.title}</p>
              <p className="event-meta">
                {[event.location, event.attendees > 1 ? `${event.attendees} guests` : 'solo']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
