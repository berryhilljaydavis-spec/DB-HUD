import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dashboard } from '../shared/types';
import { api } from './api';
import { Panel } from './components/Panel';
import { ReactorCore } from './components/ReactorCore';
import { PodcastPanel, type PodcastControls } from './components/PodcastPanel';
import { BarChart, Gauge } from './components/Charts';
import { CalendarTimeline, MailFeed, SlackFeed } from './components/Feeds';
import { TasksPanel } from './components/TasksPanel';
import { NotesPanel } from './components/NotesPanel';
import { StatusBar } from './components/StatusBar';
import { VoicePanel, type VoiceLogEntry } from './components/VoicePanel';
import { useVoice } from './voice/useVoice';
import { speak, stopSpeaking, synthesisSupported } from './voice/speech';
import {
  briefingText,
  findTask,
  mailText,
  nextEventText,
  parseCommand,
  scheduleText,
  slackText,
  tasksText,
} from './voice/commands';
import './hud.css';

const REFRESH_MS = 60_000;
const VOICE_LOG_LIMIT = 4;

export default function App() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [voiceLog, setVoiceLog] = useState<VoiceLogEntry[]>([]);
  const [voiceReplies, setVoiceReplies] = useState(synthesisSupported());
  const [speaking, setSpeaking] = useState(false);
  const dataRef = useRef<Dashboard | null>(null);
  dataRef.current = data;
  const podcastControls = useRef<PodcastControls | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.dashboard();
      setData(next);
      setRefreshedAt(new Date());
      setError(null);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'failed to load dashboard');
      return null;
    }
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!voiceReplies) return;
      setSpeaking(true);
      speak(text, () => setSpeaking(false));
    },
    [voiceReplies],
  );

  const logVoice = useCallback((heard: string, reply: string, ok = true) => {
    setVoiceLog((entries) =>
      [{ id: `${Date.now()}-${entries.length}`, heard, reply, ok }, ...entries].slice(
        0,
        VOICE_LOG_LIMIT,
      ),
    );
  }, []);

  const runCommand = useCallback(
    async (utterance: string) => {
      const current = dataRef.current;
      if (!current) return;
      const command = parseCommand(utterance);
      const heard = utterance.trim();
      if (!command) return;

      const respond = (reply: string, ok = true) => {
        logVoice(heard, reply, ok);
        say(reply);
      };

      switch (command.kind) {
        case 'add-task': {
          if (!command.title) {
            respond('I did not catch the task name.', false);
            return;
          }
          await api.addTask(command.title, command.priority);
          await load();
          respond(`Added ${command.title}.`);
          return;
        }
        case 'complete-task':
        case 'delete-task': {
          const target = findTask(current.notes.tasks, command.query);
          if (!target) {
            respond(`No objective matching “${command.query}”.`, false);
            return;
          }
          if (command.kind === 'complete-task') {
            if (target.done) {
              respond(`${target.title} is already done.`);
              return;
            }
            await api.toggleTask(target.id);
            await load();
            respond(`Completed ${target.title}.`);
          } else {
            await api.deleteTask(target.id);
            await load();
            respond(`Deleted ${target.title}.`);
          }
          return;
        }
        case 'append-note': {
          const stamp = now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const body = current.notes.note.body;
          await api.saveNote(`${body}${body ? '\n' : ''}${stamp} — ${command.text}`);
          await load();
          respond('Logged.');
          return;
        }
        case 'briefing':
          respond(briefingText(current, now));
          return;
        case 'read-tasks':
          respond(tasksText(current));
          return;
        case 'read-slack':
          respond(slackText(current));
          return;
        case 'read-mail':
          respond(mailText(current));
          return;
        case 'read-schedule':
          respond(scheduleText(current));
          return;
        case 'next-event':
          respond(nextEventText(current, now));
          return;
        case 'play-podcast': {
          const target = current.podcast.episode;
          if (podcastControls.current && target) {
            podcastControls.current.toggle();
            respond(`Playing ${current.podcast.show}: ${target.title}.`);
            return;
          }
          window.open(target?.url ?? current.podcast.showUrl, '_blank', 'noreferrer');
          respond(
            target
              ? `Opening ${current.podcast.show}: ${target.title}.`
              : `Opening ${current.podcast.show} on Spotify.`,
          );
          return;
        }
        case 'toggle-podcast': {
          if (!podcastControls.current) return respond('No episode loaded.', false);
          podcastControls.current.toggle();
          respond('Toggled playback.');
          return;
        }
        case 'next-episode': {
          if (!podcastControls.current) return respond('No episode loaded.', false);
          podcastControls.current.next();
          respond('Next episode.');
          return;
        }
        case 'refresh': {
          const next = await load();
          respond(next ? 'Resynced.' : 'Sync failed.', Boolean(next));
          return;
        }
        case 'stop-speaking':
          stopSpeaking();
          setSpeaking(false);
          logVoice(heard, 'Silenced.');
          return;
      }
    },
    [load, logVoice, now, say],
  );

  const voice = useVoice({ onUtterance: (text) => void runCommand(text) });

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

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
            <p>Voice-enabled ops console · Slack · Gmail · Calendar · Spotify</p>
          </div>
        </div>
        <StatusBar
          sources={data.sources}
          refreshedAt={refreshedAt}
          onRefresh={() => void load()}
          voiceActive={voice.state.listening}
        />
      </header>

      {error ? <p className="banner">Last refresh failed — {error}</p> : null}

      <main className="grid">
        <div className="col left">
          <Panel
            title="Voice Link"
            badge={voice.state.listening ? 'LIVE MIC' : 'STANDBY'}
            className="voice-link"
          >
            <VoicePanel
              state={voice.state}
              speaking={speaking}
              voiceReplies={voiceReplies}
              log={voiceLog}
              onToggleListening={voice.toggle}
              onToggleReplies={() => {
                stopSpeaking();
                setSpeaking(false);
                setVoiceReplies((on) => !on);
              }}
              onBriefing={() => {
                const reply = briefingText(data, now);
                logVoice('Brief me', reply);
                setSpeaking(true);
                speak(reply, () => setSpeaking(false));
              }}
            />
          </Panel>
          <Panel
            title="Podcast"
            badge={data.podcast.episode ? 'LATEST EP' : data.podcast.show}
            className="podcast-link"
          >
            <PodcastPanel podcast={data.podcast} controlsRef={podcastControls} />
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
