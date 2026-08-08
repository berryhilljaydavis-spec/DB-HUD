import type { PodcastSummary } from '../../shared/types';

interface PodcastPanelProps {
  podcast: PodcastSummary;
}

function formatReleased(date: string): string {
  const parsed = new Date(date.length === 7 ? `${date}-01` : date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Strips the sponsor/link boilerplate Spotify ships in episode descriptions. */
function trimDescription(description: string): string {
  return description
    .split(/TBPN is made possible by|Follow TBPN|https?:\/\//)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

export function PodcastPanel({ podcast }: PodcastPanelProps) {
  const { episode } = podcast;
  const target = episode?.url ?? podcast.showUrl;
  const appTarget = episode?.uri ?? podcast.showUri;

  return (
    <div className="podcast">
      <a className="podcast-art" href={target} target="_blank" rel="noreferrer">
        {episode?.imageUrl ? (
          <img src={episode.imageUrl} alt={`${podcast.show} cover art`} />
        ) : (
          <span className="podcast-art-fallback" aria-hidden="true">
            {podcast.show}
          </span>
        )}
        <span className="podcast-play" aria-hidden="true" />
      </a>

      <div className="podcast-body">
        <p className="podcast-show">{podcast.show} · Spotify</p>
        {episode ? (
          <>
            <a className="podcast-title" href={episode.url} target="_blank" rel="noreferrer">
              {episode.title}
            </a>
            <p className="podcast-meta">
              {formatReleased(episode.releasedAt)} · {episode.durationMinutes} min
            </p>
            <p className="podcast-desc">{trimDescription(episode.description)}</p>
          </>
        ) : (
          <>
            <a className="podcast-title" href={podcast.showUrl} target="_blank" rel="noreferrer">
              Latest {podcast.show} episode
            </a>
            <p className="podcast-meta">
              Add Spotify API credentials to resolve the newest episode directly.
            </p>
          </>
        )}
        <div className="podcast-actions">
          <a className="podcast-cta" href={target} target="_blank" rel="noreferrer">
            PLAY LATEST
          </a>
          <a className="podcast-cta ghost" href={appTarget}>
            OPEN APP
          </a>
        </div>
      </div>
    </div>
  );
}
