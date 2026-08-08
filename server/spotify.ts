import type { PodcastSummary } from '../shared/types.js';

/** TBPN — https://open.spotify.com/show/2L6WMqY3GUPCGBD0dX6p00 */
export const TBPN_SHOW_ID = '2L6WMqY3GUPCGBD0dX6p00';

export interface SpotifyCredentials {
  clientId: string;
  clientSecret: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

async function getAccessToken(credentials: SpotifyCredentials): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.accessToken;
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString(
    'base64',
  );
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`spotify token request failed: ${body.error ?? res.status}`);
  }
  cached = {
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached.accessToken;
}

interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  release_date: string;
  duration_ms: number;
  images?: { url: string; width?: number }[];
  external_urls: { spotify: string };
  uri: string;
}

/** Show page link, used whenever we cannot resolve a specific episode. */
export function podcastFallback(showId = TBPN_SHOW_ID): PodcastSummary {
  return {
    show: 'TBPN',
    showUrl: `https://open.spotify.com/show/${showId}`,
    showUri: `spotify:show:${showId}`,
    episode: null,
  };
}

export async function fetchLatestEpisode(
  credentials: SpotifyCredentials,
  showId = TBPN_SHOW_ID,
  market = process.env.SPOTIFY_MARKET ?? 'US',
): Promise<PodcastSummary> {
  const accessToken = await getAccessToken(credentials);
  const res = await fetch(
    `https://api.spotify.com/v1/shows/${showId}/episodes?limit=1&market=${market}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`spotify episodes request failed (${res.status})`);
  const body = (await res.json()) as { items?: SpotifyEpisode[] };
  const episode = body.items?.[0];
  const summary = podcastFallback(showId);
  if (!episode) return summary;
  return {
    ...summary,
    episode: {
      id: episode.id,
      title: episode.name,
      description: episode.description,
      releasedAt: episode.release_date,
      durationMinutes: Math.round(episode.duration_ms / 60_000),
      imageUrl:
        episode.images?.slice().sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0]?.url ?? '',
      url: episode.external_urls.spotify,
      uri: episode.uri,
    },
  };
}
