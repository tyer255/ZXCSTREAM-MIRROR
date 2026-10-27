export type PlayerMode = 'custom' | 'builtin';
export type MediaType = 'movie' | 'tv';

export interface PlayerUrlOptions {
  baseOrigin?: string;
  playerMode: PlayerMode;
  mediaType: MediaType;
  tmdbId: string;
  season?: string;
  episode?: string;
  queryParams?: Record<string, string | undefined>;
}

export interface ParsedPlayerQuery {
  dubLang: string;
  server?: number;
  domainAd?: string;
  color: string;
  autoplay: boolean;
  back: boolean;
  autostart: boolean;
}

export type AppRoute =
  | { page: 'home' }
  | {
      page: 'player';
      playerMode: PlayerMode;
      mediaType: MediaType;
      tmdbId: string;
      season: number;
      episode: number;
    }
  | {
      page: 'download';
      mediaType: MediaType;
      tmdbId: string;
    };

export const DUB_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'Original' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'esla', label: 'Spanish (LA)' },
  { code: 'ptbr', label: 'Portuguese (BR)' },
];

export const STREAM_SERVERS = [
  {
    id: 0,
    number: 1,
    name: 'Orion I',
    badge: 'Multi Audio Support',
    quality: '1080p FHD',
    latencyMs: 42,
  },
  {
    id: 1,
    number: 2,
    name: 'Valstrax II',
    badge: 'HD Quality & Reliable',
    quality: '1080p FHD',
    latencyMs: 58,
  },
  {
    id: 2,
    number: 3,
    name: 'Atlas III',
    badge: 'Fast & Stable',
    quality: '4K UHD',
    latencyMs: 36,
  },
  {
    id: 3,
    number: 4,
    name: 'Ursa IV',
    badge: 'Alternative',
    quality: '1080p FHD',
    latencyMs: 74,
  },
  {
    id: 4,
    number: 5,
    name: 'Alatreon V',
    badge: 'Extensive Movie & TV Library',
    quality: '1080p FHD',
    latencyMs: 65,
  },
  {
    id: 5,
    number: 6,
    name: 'Daedalus VI',
    badge: 'Alternative',
    quality: '720p HD',
    latencyMs: 89,
  },
] as const;

/**
 * Builds the canonical display URL shown in the ZXC[STREAM] copy bar.
 * Matches exact behaviour of module 31713 in zxcstream.cc:
 * `${origin}/${playerMode === 'custom' ? 'player' : 'embed'}/${mediaType}/${id}`
 * and appends `/${season}/${episode}` for tv series.
 */
export function buildPlayerUrl(options: PlayerUrlOptions): string {
  const origin = (options.baseOrigin ?? 'https://zxcstream.cc').replace(/\/+$/, '');
  const endpoint = options.playerMode === 'custom' ? 'player' : 'embed';
  const cleanId = options.tmdbId.trim();

  let path = `${origin}/${endpoint}/${options.mediaType}`;
  if (cleanId) {
    path += `/${encodeURIComponent(cleanId)}`;
  } else {
    path += `/`;
  }

  if (options.mediaType === 'tv') {
    const s = (options.season ?? '1').trim() || '1';
    const ep = (options.episode ?? '1').trim() || '1';
    path += `/${encodeURIComponent(s)}/${encodeURIComponent(ep)}`;
  }

  if (options.queryParams) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(options.queryParams)) {
      if (v !== undefined && v !== '') {
        search.set(k, v);
      }
    }
    const qs = search.toString();
    if (qs) {
      path += `?${qs}`;
    }
  }

  return path;
}

export function buildDownloadUrl(
  mediaType: MediaType,
  tmdbId: string,
  baseOrigin = 'https://zxcstream.cc'
): string {
  const origin = baseOrigin.replace(/\/+$/, '');
  return `${origin}/download/${mediaType}/${encodeURIComponent(tmdbId.trim())}`;
}

export function formatRuntime(minutes?: number | null): string {
  if (!minutes || minutes <= 0 || !Number.isFinite(minutes)) {
    return 'N/A';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function calculateStarRating(voteAverage?: number | null): number {
  if (voteAverage === undefined || voteAverage === null || Number.isNaN(voteAverage)) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(10, voteAverage));
  return Math.round((clamped / 10) * 5);
}

export const PLAYER_SERVERS = [
  { index: 0, id: 'orion', label: 'Orion I' },
  { index: 1, id: 'valstrax', label: 'Valstrax II' },
  { index: 2, id: 'atlas', label: 'Atlas III' },
  { index: 3, id: 'ursa', label: 'Ursa IV' },
  { index: 4, id: 'alatreon', label: 'Alatreon V' },
  { index: 5, id: 'daedalus', label: 'Daedalus VI' },
] as const;

export const PLAYER_HINTS = [
  'You can customize the subtitle size, color, and position in the settings.',
  'If the current server is slow or buffering, try switching to another server in the top-right corner.',
  'Double-tap left or right on the video to skip 10 seconds backward or forward.',
  'Use the Audio Dub menu in Settings to switch between Original and dubbed audio on Server 0.',
] as const;

export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  if (hrs > 0) {
    const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const paddedMins = mins < 10 ? `0${mins}` : `${mins}`;
  const paddedSecs = secs < 10 ? `0${secs}` : `${secs}`;
  return `${hrs}:${paddedMins}:${paddedSecs}`;
}

export function normalizeHexColor(input?: string | null, fallback = '#3b82f6'): string {
  if (!input) return fallback;
  const cleaned = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned) || /^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`;
  }
  return fallback;
}

export function parsePlayerQueryParams(search: string): ParsedPlayerQuery {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const rawDub = (params.get('dubLang') ?? 'en').toLowerCase();
  const validDub = DUB_LANGUAGES.some((d) => d.code === rawDub) ? rawDub : 'en';

  const rawServer = params.get('server');
  let server: number | undefined;
  if (rawServer !== null && rawServer.trim() !== '') {
    const parsed = Number.parseInt(rawServer, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      server = parsed;
    }
  }

  const domainAd = params.get('domainAd') ?? undefined;
  const color = normalizeHexColor(params.get('color'), '#3b82f6');
  const autoplay = params.get('autoplay') === 'true' || params.get('autoplay') === '1';
  const back = params.get('back') === 'true' || params.get('back') === '1';
  const autostart = params.get('autostart') === 'true' || params.get('autostart') === '1';

  return {
    dubLang: validDub,
    server,
    domainAd,
    color,
    autoplay,
    back,
    autostart,
  };
}

export function parseAppRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { page: 'home' };
  }

  const [first, second, third, fourth, fifth] = segments;

  if (first === 'download' && (second === 'movie' || second === 'tv') && third) {
    return {
      page: 'download',
      mediaType: second,
      tmdbId: third,
    };
  }

  if ((first === 'player' || first === 'embed') && (second === 'movie' || second === 'tv') && third) {
    const season = Math.max(1, Number.parseInt(fourth ?? '1', 10) || 1);
    const episode = Math.max(1, Number.parseInt(fifth ?? '1', 10) || 1);
    return {
      page: 'player',
      playerMode: first === 'player' ? 'custom' : 'builtin',
      mediaType: second,
      tmdbId: third,
      season,
      episode,
    };
  }

  return { page: 'home' };
}
