import type { SourceStatus } from '../../shared/types';

const LABELS: Record<SourceStatus['name'], string> = {
  slack: 'SLACK',
  gmail: 'GMAIL',
  calendar: 'CALENDAR',
  notes: 'LOCAL STORE',
  podcast: 'SPOTIFY',
};

export function StatusBar({
  sources,
  refreshedAt,
  onRefresh,
  voiceActive = false,
}: {
  sources: SourceStatus[];
  refreshedAt: Date | null;
  onRefresh: () => void;
  voiceActive?: boolean;
}) {
  return (
    <div className="statusbar">
      <ul>
        {sources.map((source) => (
          <li key={source.name} className={source.mode === 'live' ? 'live' : 'mock'}>
            <span className="dot" />
            {LABELS[source.name]}
            <em>{source.mode === 'live' ? 'LIVE' : source.ok ? 'DEMO' : 'ERROR'}</em>
            {source.mode === 'mock' ? <span className="tip">{source.detail}</span> : null}
          </li>
        ))}
      </ul>
      <div className="statusbar-right">
        {voiceActive ? <span className="mic-live">MIC LIVE</span> : null}
        {refreshedAt ? (
          <span className="synced">
            SYNC {refreshedAt.toLocaleTimeString(undefined, { hour12: false })}
          </span>
        ) : null}
        <button type="button" onClick={onRefresh}>
          REFRESH
        </button>
      </div>
    </div>
  );
}
