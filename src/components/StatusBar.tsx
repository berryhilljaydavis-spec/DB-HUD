import type { SourceStatus } from '../../shared/types';

const LABELS: Record<SourceStatus['name'], string> = {
  slack: 'SLACK',
  gmail: 'GMAIL',
  calendar: 'CALENDAR',
  notes: 'LOCAL STORE',
};

export function StatusBar({
  sources,
  refreshedAt,
  onRefresh,
}: {
  sources: SourceStatus[];
  refreshedAt: Date | null;
  onRefresh: () => void;
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
