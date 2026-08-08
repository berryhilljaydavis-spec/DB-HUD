import type { CalendarSummary } from '../../shared/types';
import { formatClock, formatTime, minutesUntil } from '../format';

interface ReactorCoreProps {
  calendar: CalendarSummary;
  now: Date;
  tasksOpen: number;
  unreadMentions: number;
  unreadMail: number;
}

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export function ReactorCore({
  calendar,
  now,
  tasksOpen,
  unreadMentions,
  unreadMail,
}: ReactorCoreProps) {
  const next = calendar.nextEvent;
  const untilNext = next ? minutesUntil(next.start, now) : null;
  const dayProgress = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;

  return (
    <div className="reactor">
      <svg className="reactor-svg" viewBox="0 0 400 400" role="presentation">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(96,229,255,0.55)" />
            <stop offset="60%" stopColor="rgba(30,120,190,0.18)" />
            <stop offset="100%" stopColor="rgba(6,20,40,0)" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="150" fill="url(#coreGlow)" />

        <g className="spin-slow">
          <circle className="ring" cx="200" cy="200" r="178" strokeDasharray="6 10" />
          <circle className="ring dim" cx="200" cy="200" r="168" />
        </g>

        <g className="spin-reverse">
          <circle
            className="ring bright"
            cx="200"
            cy="200"
            r="146"
            strokeDasharray="120 40 60 40"
          />
        </g>

        <g className="ticks">
          {TICKS.map((tick) => {
            const angle = (tick / TICKS.length) * Math.PI * 2 - Math.PI / 2;
            const inner = tick % 5 === 0 ? 112 : 120;
            return (
              <line
                key={tick}
                x1={200 + Math.cos(angle) * inner}
                y1={200 + Math.sin(angle) * inner}
                x2={200 + Math.cos(angle) * 128}
                y2={200 + Math.sin(angle) * 128}
                className={tick % 5 === 0 ? 'tick major' : 'tick'}
              />
            );
          })}
        </g>

        <circle
          className="progress-track"
          cx="200"
          cy="200"
          r="96"
          pathLength={100}
          strokeDasharray="100"
        />
        <circle
          className="progress-value"
          cx="200"
          cy="200"
          r="96"
          pathLength={100}
          strokeDasharray={`${dayProgress} ${100 - dayProgress}`}
          transform="rotate(-90 200 200)"
        />

        <g className="spin-slow">
          <polygon
            className="core-frame"
            points="200,120 268,160 268,240 200,280 132,240 132,160"
          />
        </g>
        <circle className="core-inner" cx="200" cy="200" r="52" />
      </svg>

      <div className="reactor-readout">
        <p className="clock">{formatClock(now)}</p>
        <p className="date">
          {now.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        {next ? (
          <p className="next-event">
            <span className="label">NEXT</span>
            {next.title}
            <span className="eta">
              {untilNext !== null && untilNext > 0 ? `T-${untilNext}m` : 'NOW'} ·{' '}
              {formatTime(next.start)}
            </span>
          </p>
        ) : (
          <p className="next-event">
            <span className="label">NEXT</span>
            No further events today
          </p>
        )}
        <ul className="reactor-stats">
          <li>
            <b>{tasksOpen}</b>
            <span>TASKS</span>
          </li>
          <li>
            <b>{unreadMentions}</b>
            <span>MENTIONS</span>
          </li>
          <li>
            <b>{unreadMail}</b>
            <span>UNREAD</span>
          </li>
          <li>
            <b>{Math.round(calendar.busyMinutes / 6) / 10}h</b>
            <span>BOOKED</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
