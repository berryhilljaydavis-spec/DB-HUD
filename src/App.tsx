import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dashboard } from '../shared/types';
import { api } from './api';
import { Panel } from './components/Panel';
import { ReactorCore } from './components/ReactorCore';
import { Radar } from './components/Radar';
import { BarChart, Gauge } from './components/Charts';
import { CalendarTimeline, MailFeed, SlackFeed } from './components/Feeds';
import { TasksPanel } from './components/TasksPanel';
import { NotesPanel } from './components/NotesPanel';
import { StatusBar } from './components/StatusBar';
import './hud.css';

const REFRESH_MS = 60_000;

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const next = await api.dashboard();
      setData(next);
      setRefreshedAt(new Date());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'failed to load dashboard');
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const blips = useMemo(() => {
    if (!data) return [];
    return data.slack.messages.slice(0, 8).map((message, index) => ({
      angle: (index * 360) / Math.max(1, Math.min(8, data.slack.messages.length)) + 12,
      distance: Math.min(1, (Date.now() - Date.parse(message.ts)) / (12 * 3_600_000)),
      label: `${message.channel} · ${message.author}`,
    }));
  }, [data]);

  if (!data) {
    return (
      <div className="boot">
        <p>{error ? `LINK FAILURE — ${error}` : 'INITIALISING DB HUD…'}</p>
      </div>
    );
  }

  const openTasks = data.notes.tasks.filter((task) => !task.done);

  return (
    <div className="hud">
      <div className="scanlines" aria-hidden="true" />
      <header className="hud-head">
        <div className="brand">
          <span className="brand-mark">DB</span>
          <div>
            <h1>DB HUD</h1>
            <p>Daily operations console · Slack · Gmail · Calendar</p>
          </div>
        </div>
        <StatusBar sources={data.sources} refreshedAt={refreshedAt} onRefresh={() => void load()} />
      </header>

      {error ? <p className="banner">Last refresh failed — {error}</p> : null}

      <main className="grid">
        <div className="col left">
          <Panel title="Comms Radar" badge={`${data.slack.activeChannels} CH`}>
            <Radar blips={blips} />
          </Panel>
          <Panel title="Signal Load" badge="12H">
            <BarChart values={data.slack.activity} label="SLACK MESSAGES / HOUR" />
            <div className="gauge-row">
              <Gauge value={data.slack.unreadMentions} max={20} label="MENTIONS" />
              <Gauge value={data.mail.unread} max={50} label="UNREAD" />
              <Gauge
                value={Math.round(data.calendar.busyMinutes / 60)}
                max={8}
                label="BOOKED"
                unit="h"
              />
            </div>
          </Panel>
        </div>

        <div className="col center">
          <div className="core-stage">
            <ReactorCore
              calendar={data.calendar}
              now={now}
              tasksOpen={openTasks.length}
              unreadMentions={data.slack.unreadMentions}
              unreadMail={data.mail.unread}
            />
          </div>
          <Panel title="Schedule" badge={`${data.calendar.events.length} EVENTS`}>
            <CalendarTimeline calendar={data.calendar} now={now} />
          </Panel>
          <Panel title="Daily Log" badge={data.notes.note.date}>
            <NotesPanel
              note={data.notes.note}
              onSave={async (body) => {
                await api.saveNote(body);
                await load();
              }}
            />
          </Panel>
        </div>

        <div className="col right">
          <Panel title="Objectives" badge={`${openTasks.length} OPEN`}>
            <TasksPanel
              tasks={data.notes.tasks}
              onAdd={async (title) => {
                await api.addTask(title);
                await load();
              }}
              onToggle={async (id) => {
                await api.toggleTask(id);
                await load();
              }}
              onDelete={async (id) => {
                await api.deleteTask(id);
                await load();
              }}
            />
          </Panel>
          <Panel title="Slack Feed" badge={`${data.slack.unreadMentions} MENTIONS`}>
            <SlackFeed slack={data.slack} />
          </Panel>
          <Panel title="Inbox" badge={`${data.mail.unread} UNREAD`}>
            <MailFeed mail={data.mail} />
          </Panel>
        </div>
      </main>
    </div>
  );
}
