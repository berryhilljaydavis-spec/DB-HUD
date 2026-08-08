import type { VoiceState } from '../voice/useVoice';

export interface VoiceLogEntry {
  id: string;
  heard: string;
  reply: string;
  ok: boolean;
}

interface VoicePanelProps {
  state: VoiceState;
  speaking: boolean;
  voiceReplies: boolean;
  log: VoiceLogEntry[];
  onToggleListening: () => void;
  onToggleReplies: () => void;
  onBriefing: () => void;
}

const EXAMPLES = [
  '"add task review the deploy, high priority"',
  '"complete standup notes"',
  '"note shipped the voice console"',
  '"read my inbox" · "next meeting" · "briefing"',
  '"play the latest TBPN"',
];

export function VoicePanel({
  state,
  speaking,
  voiceReplies,
  log,
  onToggleListening,
  onToggleReplies,
  onBriefing,
}: VoicePanelProps) {
  if (!state.supported) {
    return (
      <p className="empty">
        Voice control needs the Web Speech API — open the HUD in Chrome, Edge or Safari.
      </p>
    );
  }

  return (
    <div className="voice">
      <div className="voice-controls">
        <button
          type="button"
          className={`mic ${state.listening ? 'on' : ''}`}
          onClick={onToggleListening}
          aria-pressed={state.listening}
          aria-label={state.listening ? 'Stop listening' : 'Start listening'}
        >
          <span className="mic-glyph" aria-hidden="true" />
          {state.listening ? 'LISTENING' : 'ENGAGE VOICE'}
        </button>
        <button type="button" onClick={onBriefing} className="voice-secondary">
          BRIEF ME
        </button>
        <button
          type="button"
          onClick={onToggleReplies}
          className={`voice-secondary ${voiceReplies ? 'active' : ''}`}
          aria-pressed={voiceReplies}
        >
          {voiceReplies ? 'REPLIES ON' : 'REPLIES OFF'}
        </button>
      </div>

      <div className={`waveform ${state.listening ? 'active' : ''} ${speaking ? 'speaking' : ''}`}>
        {Array.from({ length: 28 }, (_, index) => (
          <span key={index} style={{ animationDelay: `${(index % 7) * 0.09}s` }} />
        ))}
      </div>

      <p className="voice-transcript">
        {state.error
          ? state.error
          : state.transcript
            ? `“${state.transcript}”`
            : state.listening
              ? 'Awaiting command…'
              : 'Voice standby. Say “HUD, brief me”.'}
      </p>

      {log.length > 0 ? (
        <ul className="voice-log">
          {log.map((entry) => (
            <li key={entry.id} className={entry.ok ? 'ok' : 'bad'}>
              <span className="heard">{entry.heard}</span>
              <span className="reply">{entry.reply}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="voice-hints">
          {EXAMPLES.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
