import { useCallback, useEffect, useRef, useState } from 'react';
import type { PodcastEpisode, PodcastSummary } from '../../shared/types';

/** Imperative handle so voice commands can drive playback. */
export interface PodcastControls {
  toggle(): void;
  next(): void;
}

interface PodcastPanelProps {
  podcast: PodcastSummary;
  controlsRef?: { current: PodcastControls | null };
}

const EMBED_SRC = 'https://open.spotify.com/embed/iframe-api/v1';

let apiPromise: Promise<SpotifyEmbed.API> | null = null;

/** Loads Spotify's embed API once per page. */
function loadEmbedApi(): Promise<SpotifyEmbed.API> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = EMBED_SRC;
    script.async = true;
    document.body.appendChild(script);
  });
  return apiPromise;
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

export function PodcastPanel({ podcast, controlsRef }: PodcastPanelProps) {
  const queue: PodcastEpisode[] = podcast.queue.length > 0
    ? podcast.queue
    : podcast.episode
      ? [podcast.episode]
      : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controller = useRef<SpotifyEmbed.Controller | null>(null);
  const creating = useRef(false);
  const advancedAt = useRef(0);
  const advance = useRef<(autoplay: boolean) => void>(() => {});

  const episode = queue[Math.min(index, queue.length - 1)] ?? null;
  const firstUri = queue[0]?.uri;

  advance.current = (autoplay: boolean) => {
    if (queue.length === 0) return;
    // Playback updates arrive in bursts; ignore repeats while the next episode loads.
    if (Date.now() - advancedAt.current < 3000) return;
    advancedAt.current = Date.now();
    const next = (index + 1) % queue.length;
    setIndex(next);
    const target = queue[next];
    controller.current?.loadUri(target.uri);
    if (autoplay) controller.current?.play();
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !firstUri || creating.current) return;
    creating.current = true;
    let cancelled = false;
    let instance: SpotifyEmbed.Controller | null = null;
    void loadEmbedApi().then((api) => {
      if (cancelled) return;
      api.createController(host, { uri: firstUri, width: '100%', height: 80 }, (created) => {
        if (cancelled) {
          created.destroy();
          return;
        }
        instance = created;
        controller.current = created;
        created.addListener('playback_update', ({ data }) => {
          setPaused(data.isPaused);
          // Spotify has no "ended" event, so detect the tail of the episode.
          if (data.duration > 0 && data.position >= data.duration - 1000) {
            advance.current(true);
          }
        });
      });
    });
    return () => {
      cancelled = true;
      instance?.destroy();
      controller.current = null;
      creating.current = false;
    };
  }, [firstUri]);

  const toggle = useCallback(() => controller.current?.togglePlay(), []);
  const next = useCallback(() => advance.current(!paused), [paused]);

  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = { toggle, next };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, toggle, next]);

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
        <p className="podcast-show">
          {podcast.show} · Spotify
          {queue.length > 1 ? ` · ${index + 1}/${queue.length}` : ''}
        </p>
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
          {episode ? (
            <>
              <button className="podcast-cta" type="button" onClick={toggle}>
                {paused ? 'PLAY' : 'PAUSE'}
              </button>
              <button className="podcast-cta ghost" type="button" onClick={next}>
                NEXT EP
              </button>
            </>
          ) : (
            <a className="podcast-cta" href={target} target="_blank" rel="noreferrer">
              PLAY LATEST
            </a>
          )}
          <a className="podcast-cta ghost" href={appTarget}>
            OPEN APP
          </a>
        </div>
      </div>

      <div className="podcast-embed" ref={hostRef} />
    </div>
  );
}
