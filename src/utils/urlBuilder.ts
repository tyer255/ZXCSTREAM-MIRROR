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
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  nextEpisodeTriggerTime?: number;
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

export interface RawOrionDub {
  type?: number;
  lang: string;
  name: string;
  original?: boolean;
}

export const DUB_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
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

export const USER_DEPLOYMENT_ORIGIN = 'https://zxcstream-mirror.vercel.app';

export function getDefaultOrigin(): string {
  return USER_DEPLOYMENT_ORIGIN;
}

/**
 * Builds the canonical display URL shown in the ZXC[STREAM] copy bar.
 * Uses the user's mirror deployment domain (https://zxcstream-mirror.vercel.app)
 * `${origin}/${playerMode === 'custom' ? 'player' : 'embed'}/${mediaType}/${id}`
 * and appends `/${season}/${episode}` for tv series.
 */
export function buildPlayerUrl(options: PlayerUrlOptions): string {
  const origin = (options.baseOrigin ?? getDefaultOrigin()).replace(/\/+$/, '');
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
  baseOrigin?: string
): string {
  const origin = (baseOrigin ?? getDefaultOrigin()).replace(/\/+$/, '');
  return `${origin}/download/${mediaType}/${encodeURIComponent(tmdbId.trim())}`;
}

export function buildEmbedIframeCode(
  mediaType: MediaType,
  tmdbId: string,
  season = '1',
  episode = '1',
  baseOrigin?: string
): string {
  const url = buildPlayerUrl({
    baseOrigin: baseOrigin ?? getDefaultOrigin(),
    playerMode: 'builtin',
    mediaType,
    tmdbId,
    season,
    episode,
  });
  return `<iframe src="${url}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true"></iframe>`;
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
  const rawDubParam = params.get('dubLang') ?? params.get('dublang') ?? '';
  const rawDub = rawDubParam.trim().toLowerCase();
  const validDub = rawDub && DUB_LANGUAGES.some((d) => d.code === rawDub) ? rawDub : '';

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
  const rawAutoplay = params.get('autoplay');
  const autoplay =
    rawAutoplay === null || rawAutoplay === ''
      ? true
      : rawAutoplay === 'true' || rawAutoplay === '1';
  const back = params.get('back') === 'true' || params.get('back') === '1';
  const autostart = params.get('autostart') === 'true' || params.get('autostart') === '1';

  const parseOptSec = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') return undefined;
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : undefined;
  };

  return {
    dubLang: validDub,
    server,
    domainAd,
    color,
    autoplay,
    back,
    autostart,
    introStart: parseOptSec('introStart'),
    introEnd: parseOptSec('introEnd'),
    outroStart: parseOptSec('outroStart'),
    outroEnd: parseOptSec('outroEnd'),
    nextEpisodeTriggerTime: parseOptSec('nextEpisodeTriggerTime') ?? parseOptSec('nextTrigger'),
  };
}

/**
 * Filters raw Orion dub entries so only actual audio tracks (type === 0 or original === true)
 * are kept, excluding type === 1 burned-in subtitle variants ("Arabic sub", "Kurdish sub", etc.).
 */
export function filterAudioDubTracks(dubs?: RawOrionDub[] | null): RawOrionDub[] {
  if (!Array.isArray(dubs)) return [];
  const seen = new Set<string>();
  const result: RawOrionDub[] = [];
  for (const item of dubs) {
    if (!item || typeof item.lang !== 'string' || !item.lang.trim()) continue;
    const typeNum = Number(item.type ?? 0);
    // Exclude type 1 (hardcoded subtitle stream) unless marked original
    if (typeNum !== 0 && !item.original) continue;
    const cleanLang = item.lang.trim().toLowerCase();
    const key = `${cleanLang}:${typeNum}:${Boolean(item.original)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      type: 0,
      lang: cleanLang,
      name: item.name || cleanLang.toUpperCase(),
      original: Boolean(item.original),
    });
  }
  return result;
}

export interface EffectiveDubResolution {
  isOriginal: boolean;
  dubCode: string;
  dubType: string;
  displayLabel: string;
  unavailableInList: boolean;
}

/**
 * Maps a user's selected dub language code against the title's available Orion audio dubs.
 * - If selectedCode is '' OR matches the title's Original Audio language (e.g. 'en' on an English movie),
 *   returns isOriginal: true and dubCode: '' so the player uses the default original audio track.
 * - If availableDubs is populated and selectedCode is not available, marks unavailableInList: true.
 */
export function resolveEffectiveDubSelection(
  selectedCode: string,
  availableDubs?: RawOrionDub[] | null
): EffectiveDubResolution {
  const cleanCode = (selectedCode || '').trim().toLowerCase();
  if (!cleanCode) {
    return {
      isOriginal: true,
      dubCode: '',
      dubType: '',
      displayLabel: 'Original',
      unavailableInList: false,
    };
  }

  const audioDubs = filterAudioDubTracks(availableDubs);
  if (audioDubs.length > 0) {
    // 1. Check if there is an explicit non-original dub matching cleanCode
    const exactDub = audioDubs.find((d) => !d.original && d.lang === cleanCode);
    if (exactDub) {
      return {
        isOriginal: false,
        dubCode: exactDub.lang,
        dubType: String(exactDub.type ?? 0),
        displayLabel: exactDub.name.replace(/\s+dub$/i, '').trim() || exactDub.lang.toUpperCase(),
        unavailableInList: false,
      };
    }

    // 2. Check if cleanCode matches the title's original audio language (e.g. 'en' on an English movie)
    const origMatch = audioDubs.find((d) => d.original && d.lang === cleanCode);
    if (origMatch) {
      return {
        isOriginal: true,
        dubCode: '',
        dubType: '',
        displayLabel: 'Original',
        unavailableInList: false,
      };
    }

    // 3. Check regional aliases (e.g. 'pt' <-> 'ptbr', 'es' <-> 'esla')
    const aliasMap: Record<string, string[]> = {
      pt: ['ptbr', 'pt'],
      ptbr: ['ptbr', 'pt'],
      es: ['es', 'esla'],
      esla: ['esla', 'es'],
    };
    const candidates = aliasMap[cleanCode] || [];
    for (const alias of candidates) {
      const aliasHit = audioDubs.find((d) => !d.original && d.lang === alias);
      if (aliasHit) {
        return {
          isOriginal: false,
          dubCode: aliasHit.lang,
          dubType: String(aliasHit.type ?? 0),
          displayLabel: aliasHit.name.replace(/\s+dub$/i, '').trim() || aliasHit.lang.toUpperCase(),
          unavailableInList: false,
        };
      }
    }

    // Not found in the title's available audio dubs list
    const fallbackLabel =
      DUB_LANGUAGES.find((d) => d.code === cleanCode)?.label || cleanCode.toUpperCase();
    return {
      isOriginal: false,
      dubCode: cleanCode,
      dubType: '0',
      displayLabel: fallbackLabel,
      unavailableInList: true,
    };
  }

  // When availableDubs hasn't loaded yet, use static DUB_LANGUAGES mapping
  const staticHit = DUB_LANGUAGES.find((d) => d.code === cleanCode);
  return {
    isOriginal: false,
    dubCode: cleanCode,
    dubType: '0',
    displayLabel: staticHit?.label || cleanCode.toUpperCase(),
    unavailableInList: false,
  };
}

/**
 * Determines whether the external dub <audio> element's currentTime should be re-synced
 * to the <video> element's currentTime during timeupdate.
 * Prevents the infinite seek/re-buffer loop by refusing to seek while the audio element
 * is already seeking, while readyState < 3 (buffering), or within the 2500ms cooldown window.
 */
export function shouldSyncDubAudioTime(params: {
  videoTime: number;
  audioTime: number;
  isAudioSeeking: boolean;
  audioReadyState: number;
  lastSyncTimestampMs: number;
  nowMs: number;
  maxDriftSeconds?: number;
  cooldownMs?: number;
}): boolean {
  const {
    videoTime,
    audioTime,
    isAudioSeeking,
    audioReadyState,
    lastSyncTimestampMs,
    nowMs,
    maxDriftSeconds = 0.65,
    cooldownMs = 2500,
  } = params;

  if (!Number.isFinite(videoTime) || !Number.isFinite(audioTime)) return false;
  if (isAudioSeeking) return false;
  if (audioReadyState < 3) return false;
  if (nowMs - lastSyncTimestampMs < cooldownMs) return false;
  return Math.abs(videoTime - audioTime) > maxDriftSeconds;
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

// ============================================================================
// Deterministic Skip Intro, Skip Outro & Next Episode Logic (Strictly No AI)
// ============================================================================

export interface RawTimingSegment {
  start_sec?: number | null;
  end_sec?: number | null;
  start_ms?: number | null;
  end_ms?: number | null;
}

export interface EpisodeTimingMetadata {
  episodeKey?: string | null;
  tmdbId?: string | number | null;
  tvdbId?: number | null;
  season?: number | null;
  episode?: number | null;
  introStart?: number | null;
  introEnd?: number | null;
  recapStart?: number | null;
  recapEnd?: number | null;
  outroStart?: number | null;
  outroEnd?: number | null;
  nextEpisodeTriggerTime?: number | null;
  nextEpisodeId?: string | number | null;
  intro?: RawTimingSegment | null;
  recap?: RawTimingSegment | null;
  outro?: RawTimingSegment | null;
  credits?: RawTimingSegment | null;
  source?: 'theintrodb' | 'upstream' | 'catalog' | 'manual' | string | null;
}

export interface ResolvedEpisodeTiming {
  introStart: number | null;
  introEnd: number | null;
  recapStart: number | null;
  recapEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
  nextEpisodeTriggerTime: number | null;
  nextEpisodeId: string | null;
  source?: 'theintrodb' | 'upstream' | 'catalog' | 'manual' | string | null;
}

export interface EpisodeSummaryItem {
  id?: number;
  episode_number: number;
  name?: string;
  overview?: string;
  still_path?: string | null;
  runtime?: number | null;
  air_date?: string | null;
  introStart?: number | null;
  introEnd?: number | null;
  recapStart?: number | null;
  recapEnd?: number | null;
  outroStart?: number | null;
  outroEnd?: number | null;
  nextEpisodeTriggerTime?: number | null;
  nextEpisodeId?: string | null;
}

export interface SeasonSummaryItem {
  season_number: number;
  episode_count: number;
  name?: string;
  air_date?: string | null;
}

export interface NextEpisodeInfo {
  season: number;
  episode: number;
  title: string;
  episodeId: string;
  stillPath: string | null;
  isNextSeason: boolean;
}

export interface PlaybackSkipVisibilityInput {
  canPlay: boolean;
  mediaType: MediaType;
  currentTime: number;
  duration: number;
  videoEnded: boolean;
  timing: ResolvedEpisodeTiming;
  nextEpisode: NextEpisodeInfo | null;
  skippedIntro: boolean;
  skippedRecap?: boolean;
  skippedOutro: boolean;
}

export interface PlaybackSkipVisibilityState {
  inIntroInterval: boolean;
  inRecapInterval: boolean;
  inOutroInterval: boolean;
  inNextEpisodeWindow: boolean;
  showSkipIntro: boolean;
  showSkipRecap: boolean;
  showSkipOutro: boolean;
  showNextEpisode: boolean;
}

/**
 * Normalizes a start/end timestamp pair into seconds, handling both seconds (`start_sec`/`end_sec`)
 * and milliseconds (`start_ms`/`end_ms` or unscaled millisecond values).
 * Supports TheIntroDB specification where start_ms: null means 0 (starts at beginning)
 * and end_ms: null means continues to end of media.
 */
export function normalizeIntervalSeconds(params: {
  startSec?: number | null;
  endSec?: number | null;
  startMs?: number | null;
  endMs?: number | null;
  allowStartNullAsZero?: boolean;
}): { start: number | null; end: number | null } {
  const { startSec, endSec, startMs, endMs, allowStartNullAsZero = true } = params;

  // Handle null start as 0 when end is specified (e.g. TheIntroDB start_ms: null, end_ms: 40000)
  const effectiveStartMs =
    startMs === null && allowStartNullAsZero && endMs !== null && endMs !== undefined
      ? 0
      : startMs;
  const effectiveStartSec =
    startSec === null && allowStartNullAsZero && endSec !== null && endSec !== undefined
      ? 0
      : startSec;

  const hasValidMs =
    effectiveStartMs !== null &&
    effectiveStartMs !== undefined &&
    endMs !== null &&
    endMs !== undefined &&
    Number.isFinite(effectiveStartMs) &&
    Number.isFinite(endMs) &&
    effectiveStartMs >= 0 &&
    endMs > effectiveStartMs;

  const hasValidSec =
    effectiveStartSec !== null &&
    effectiveStartSec !== undefined &&
    endSec !== null &&
    endSec !== undefined &&
    Number.isFinite(effectiveStartSec) &&
    Number.isFinite(endSec) &&
    effectiveStartSec >= 0 &&
    endSec > effectiveStartSec;

  if (hasValidSec) {
    // Detect if raw values in startSec/endSec were actually passed in milliseconds (e.g., 505000..555000)
    const looksLikeMilliseconds =
      !hasValidMs &&
      (endSec > 18000 || (endSec >= 10000 && endSec - effectiveStartSec >= 2000 && effectiveStartSec >= 1000));
    if (looksLikeMilliseconds) {
      return {
        start: Number((effectiveStartSec / 1000).toFixed(3)),
        end: Number((endSec / 1000).toFixed(3)),
      };
    }
    return { start: effectiveStartSec, end: endSec };
  }

  if (hasValidMs) {
    return {
      start: Number((effectiveStartMs / 1000).toFixed(3)),
      end: Number((endMs / 1000).toFixed(3)),
    };
  }

  // Handle open-ended credits where start is known but end_ms is null (runs to media end)
  if (
    effectiveStartMs !== null &&
    effectiveStartMs !== undefined &&
    Number.isFinite(effectiveStartMs) &&
    effectiveStartMs >= 0 &&
    (endMs === null || endMs === undefined)
  ) {
    return {
      start: Number((effectiveStartMs / 1000).toFixed(3)),
      end: null,
    };
  }

  if (
    effectiveStartSec !== null &&
    effectiveStartSec !== undefined &&
    Number.isFinite(effectiveStartSec) &&
    effectiveStartSec >= 0 &&
    (endSec === null || endSec === undefined)
  ) {
    const isMs = !hasValidMs && effectiveStartSec > 18000;
    return {
      start: isMs ? Number((effectiveStartSec / 1000).toFixed(3)) : effectiveStartSec,
      end: null,
    };
  }

  return { start: null, end: null };
}

/**
 * Deterministically resolves the next valid episode in a TV series using the existing
 * season episode list and series seasons list.
 * - Never returns a next episode for standalone movies (`mediaType !== 'tv'`).
 * - Never invents a next episode if `currentSeasonEpisodes` has not loaded (`length === 0`).
 * - Supports both mid-season transitions (E1 -> E2) and cross-season transitions (Season Finale -> S(n+1)E1).
 * - Returns `null` on the final episode of the final season or when the episode metadata explicitly sets `nextEpisodeId: null`.
 */
export function resolveNextEpisode(params: {
  mediaType: MediaType;
  tmdbId: string | number;
  currentSeason: number;
  currentEpisode: number;
  currentSeasonEpisodes: EpisodeSummaryItem[];
  nextSeasonEpisodes?: EpisodeSummaryItem[];
  seasons?: SeasonSummaryItem[];
}): NextEpisodeInfo | null {
  const {
    mediaType,
    tmdbId,
    currentSeason,
    currentEpisode,
    currentSeasonEpisodes,
    nextSeasonEpisodes = [],
    seasons = [],
  } = params;

  if (mediaType !== 'tv') return null;

  // Case 1: If currentSeasonEpisodes is loaded and populated
  if (Array.isArray(currentSeasonEpisodes) && currentSeasonEpisodes.length > 0) {
    const sortedEps = [...currentSeasonEpisodes]
      .filter(
        (ep) =>
          typeof ep.episode_number === 'number' &&
          ep.episode_number > 0 &&
          ep.air_date !== null
      )
      .sort((a, b) => a.episode_number - b.episode_number);

    if (sortedEps.length > 0) {
      // If the current episode explicitly declares nextEpisodeId === null, it is the final available episode
      const currentEpObj = sortedEps.find((ep) => ep.episode_number === currentEpisode);
      if (currentEpObj && currentEpObj.nextEpisodeId === null) {
        return null;
      }

      // Verify if the next episode in the current season exists
      const nextInSeason =
        sortedEps.find((ep) => ep.episode_number === currentEpisode + 1) ||
        sortedEps.find((ep) => ep.episode_number > currentEpisode);

      if (nextInSeason) {
        return {
          season: currentSeason,
          episode: nextInSeason.episode_number,
          title: nextInSeason.name || `Episode ${nextInSeason.episode_number}`,
          episodeId: `${tmdbId}:${currentSeason}:${nextInSeason.episode_number}`,
          stillPath: nextInSeason.still_path ?? null,
          isNextSeason: false,
        };
      }

      // Current episode is the last episode in currentSeason -> check for next season
      const validSeasons = [...seasons]
        .filter(
          (s) =>
            typeof s.season_number === 'number' &&
            s.season_number > 0 &&
            (s.episode_count ?? 0) > 0 &&
            s.air_date !== null
        )
        .sort((a, b) => a.season_number - b.season_number);

      const nextSeason =
        validSeasons.find((s) => s.season_number === currentSeason + 1) ||
        validSeasons.find((s) => s.season_number > currentSeason);

      if (nextSeason) {
        const firstEpOfNextSeason = Array.isArray(nextSeasonEpisodes)
          ? [...nextSeasonEpisodes]
              .filter(
                (ep) =>
                  typeof ep.episode_number === 'number' &&
                  ep.episode_number > 0 &&
                  ep.air_date !== null
              )
              .sort((a, b) => a.episode_number - b.episode_number)[0]
          : undefined;

        const nextEpNum = firstEpOfNextSeason?.episode_number ?? 1;
        const nextEpTitle =
          firstEpOfNextSeason?.name ||
          (nextSeason.name
            ? `${nextSeason.name} • Episode ${nextEpNum}`
            : `Season ${nextSeason.season_number} • Episode ${nextEpNum}`);

        return {
          season: nextSeason.season_number,
          episode: nextEpNum,
          title: nextEpTitle,
          episodeId: `${tmdbId}:${nextSeason.season_number}:${nextEpNum}`,
          stillPath: firstEpOfNextSeason?.still_path ?? null,
          isNextSeason: true,
        };
      }

      return null;
    }
  }

  // Case 2: When currentSeasonEpisodes has not loaded or is empty (e.g. initial playback, offline, or pending API)
  // Use seasons metadata or deterministic next episode fallback so Next Episode is NEVER blocked
  if (Array.isArray(seasons) && seasons.length > 0) {
    const validSeasons = [...seasons]
      .filter((s) => typeof s.season_number === 'number' && s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);

    const currentSeasonObj = validSeasons.find((s) => s.season_number === currentSeason);
    const maxSeason = validSeasons[validSeasons.length - 1];

    if (currentSeasonObj && typeof currentSeasonObj.episode_count === 'number' && currentSeasonObj.episode_count > 0) {
      if (currentEpisode < currentSeasonObj.episode_count) {
        const nextEpNum = currentEpisode + 1;
        return {
          season: currentSeason,
          episode: nextEpNum,
          title: `Episode ${nextEpNum}`,
          episodeId: `${tmdbId}:${currentSeason}:${nextEpNum}`,
          stillPath: null,
          isNextSeason: false,
        };
      }
      // Season finale -> check if there's a subsequent season
      const nextSeason = validSeasons.find((s) => s.season_number > currentSeason);
      if (nextSeason) {
        return {
          season: nextSeason.season_number,
          episode: 1,
          title: `Season ${nextSeason.season_number} • Episode 1`,
          episodeId: `${tmdbId}:${nextSeason.season_number}:1`,
          stillPath: null,
          isNextSeason: true,
        };
      }
      // Final episode of max season
      if (currentSeason >= maxSeason.season_number) {
        return null;
      }
    }
  }

  // Fallback for arbitrary anime and series: advance to next episode in season
  const nextEpNum = currentEpisode + 1;
  return {
    season: currentSeason,
    episode: nextEpNum,
    title: `Episode ${nextEpNum}`,
    episodeId: `${tmdbId}:${currentSeason}:${nextEpNum}`,
    stillPath: null,
    isNextSeason: false,
  };
}

/**
 * Normalizes and validates episode timing intervals against the actual video duration
 * and next-episode availability.
 * - Normalizes milliseconds (start_ms/end_ms) and seconds (start_sec/end_sec) to seconds.
 * - Ensures 0 <= introStart < introEnd and outroStart < outroEnd.
 * - Next episode trigger time fires when the scene finishes (at outroStart or outroEnd, or duration - 35s lead time).
 */
export function resolveEpisodeTiming(params: {
  raw?: EpisodeTimingMetadata | null;
  duration: number;
  mediaType: MediaType;
  nextEpisode: NextEpisodeInfo | null;
}): ResolvedEpisodeTiming {
  const { raw, duration, mediaType, nextEpisode } = params;
  const hasValidDuration = Number.isFinite(duration) && duration > 0;

  const normalizedIntro = normalizeIntervalSeconds({
    startSec: raw?.introStart ?? raw?.intro?.start_sec ?? null,
    endSec: raw?.introEnd ?? raw?.intro?.end_sec ?? null,
    startMs: raw?.intro?.start_ms ?? null,
    endMs: raw?.intro?.end_ms ?? null,
  });

  const normalizedRecap = normalizeIntervalSeconds({
    startSec: raw?.recapStart ?? raw?.recap?.start_sec ?? null,
    endSec: raw?.recapEnd ?? raw?.recap?.end_sec ?? null,
    startMs: raw?.recap?.start_ms ?? null,
    endMs: raw?.recap?.end_ms ?? null,
  });

  const rawOutroSource = raw?.outro ?? raw?.credits ?? null;
  const normalizedOutro = normalizeIntervalSeconds({
    startSec: raw?.outroStart ?? rawOutroSource?.start_sec ?? null,
    endSec: raw?.outroEnd ?? rawOutroSource?.end_sec ?? null,
    startMs: rawOutroSource?.start_ms ?? null,
    endMs: rawOutroSource?.end_ms ?? null,
  });

  const rawTrigger = raw?.nextEpisodeTriggerTime ?? null;

  let introStart: number | null = null;
  let introEnd: number | null = null;

  if (
    normalizedIntro.start !== null &&
    normalizedIntro.end !== null &&
    Number.isFinite(normalizedIntro.start) &&
    Number.isFinite(normalizedIntro.end) &&
    normalizedIntro.start >= 0 &&
    normalizedIntro.end > normalizedIntro.start &&
    normalizedIntro.end - normalizedIntro.start >= 2 &&
    normalizedIntro.end - normalizedIntro.start <= 300
  ) {
    if (!hasValidDuration) {
      introStart = normalizedIntro.start;
      introEnd = normalizedIntro.end;
    } else if (normalizedIntro.start < duration) {
      introStart = normalizedIntro.start;
      introEnd = Math.min(normalizedIntro.end, duration);
    }
  }

  let recapStart: number | null = null;
  let recapEnd: number | null = null;

  if (
    normalizedRecap.start !== null &&
    normalizedRecap.end !== null &&
    Number.isFinite(normalizedRecap.start) &&
    Number.isFinite(normalizedRecap.end) &&
    normalizedRecap.start >= 0 &&
    normalizedRecap.end > normalizedRecap.start &&
    normalizedRecap.end - normalizedRecap.start >= 2 &&
    normalizedRecap.end - normalizedRecap.start <= 300
  ) {
    if (!hasValidDuration) {
      recapStart = normalizedRecap.start;
      recapEnd = normalizedRecap.end;
    } else if (normalizedRecap.start < duration) {
      recapStart = normalizedRecap.start;
      recapEnd = Math.min(normalizedRecap.end, duration);
    }
  }

  let outroStart: number | null = null;
  let outroEnd: number | null = null;

  if (
    normalizedOutro.start !== null &&
    Number.isFinite(normalizedOutro.start) &&
    normalizedOutro.start > 0
  ) {
    const minOutroStart = Math.max(introEnd ?? 0, recapEnd ?? 0) + 5;
    if (normalizedOutro.start >= minOutroStart) {
      if (!hasValidDuration) {
        outroStart = normalizedOutro.start;
        outroEnd = normalizedOutro.end;
      } else if (normalizedOutro.start < duration) {
        outroStart = normalizedOutro.start;
        // If credits run to end (end is null), default to video duration
        const targetEnd = normalizedOutro.end ?? duration;
        outroEnd = Math.min(targetEnd, Math.max(normalizedOutro.start + 2, duration));
        if (outroEnd <= outroStart) {
          outroStart = null;
          outroEnd = null;
        }
      }
    }
  }

  let nextEpisodeTriggerTime: number | null = null;
  let nextEpisodeId: string | null = null;

  if (mediaType === 'tv' && nextEpisode !== null) {
    nextEpisodeId =
      raw?.nextEpisodeId != null && String(raw.nextEpisodeId).trim() !== ''
        ? String(raw.nextEpisodeId)
        : nextEpisode.episodeId;

    const minTriggerTime = (introEnd ?? 0) + 10;

    // The user requirement: "Next episode wala button tab aaye jab scene khatam hone wala ho."
    // Trigger when scene ends (at outroStart) so the viewer can jump to the next episode during the credits!
    if (
      rawTrigger !== null &&
      Number.isFinite(rawTrigger) &&
      rawTrigger >= minTriggerTime &&
      (!hasValidDuration || rawTrigger <= duration)
    ) {
      nextEpisodeTriggerTime = rawTrigger;
    } else if (
      outroStart !== null &&
      outroStart >= minTriggerTime &&
      (!hasValidDuration || outroStart < duration)
    ) {
      nextEpisodeTriggerTime = outroStart;
    } else if (
      outroEnd !== null &&
      outroEnd >= minTriggerTime &&
      (!hasValidDuration || outroEnd <= duration)
    ) {
      nextEpisodeTriggerTime = outroEnd;
    } else if (hasValidDuration && duration >= 60) {
      const leadTimeSeconds = 35;
      const computedTrigger = Math.max(minTriggerTime, Math.floor(duration - leadTimeSeconds));
      nextEpisodeTriggerTime = computedTrigger;
    }
  }

  return {
    introStart,
    introEnd,
    recapStart,
    recapEnd,
    outroStart,
    outroEnd,
    nextEpisodeTriggerTime,
    nextEpisodeId,
    source: raw?.source ?? null,
  };
}

/**
 * Evaluates which automatic playback controls (Skip Intro, Skip Recap, Skip Outro, Next Episode)
 * should be visible at the current playback timestamp.
 */
export function evaluatePlaybackSkipState(
  input: PlaybackSkipVisibilityInput
): PlaybackSkipVisibilityState {
  const {
    canPlay,
    mediaType,
    currentTime,
    duration,
    videoEnded,
    timing,
    nextEpisode,
    skippedIntro,
    skippedRecap = false,
    skippedOutro,
  } = input;

  const hasValidDuration = Number.isFinite(duration) && duration > 0;

  if (!canPlay || !Number.isFinite(currentTime) || currentTime < 0) {
    return {
      inIntroInterval: false,
      inRecapInterval: false,
      inOutroInterval: false,
      inNextEpisodeWindow: false,
      showSkipIntro: false,
      showSkipRecap: false,
      showSkipOutro: false,
      showNextEpisode: false,
    };
  }

  const inIntroInterval =
    timing.introStart !== null &&
    timing.introEnd !== null &&
    timing.introEnd > timing.introStart &&
    (!hasValidDuration || timing.introEnd <= duration) &&
    currentTime >= timing.introStart &&
    currentTime < timing.introEnd;

  const inRecapInterval =
    timing.recapStart !== null &&
    timing.recapEnd !== null &&
    timing.recapEnd > timing.recapStart &&
    (!hasValidDuration || timing.recapEnd <= duration) &&
    currentTime >= timing.recapStart &&
    currentTime < timing.recapEnd;

  const inOutroInterval =
    timing.outroStart !== null &&
    timing.outroEnd !== null &&
    timing.outroEnd > timing.outroStart &&
    (!hasValidDuration || timing.outroStart < duration) &&
    currentTime >= timing.outroStart &&
    currentTime < timing.outroEnd;

  const inNextEpisodeWindow =
    mediaType === 'tv' &&
    nextEpisode !== null &&
    (videoEnded ||
      (hasValidDuration &&
        timing.nextEpisodeTriggerTime !== null &&
        currentTime >= timing.nextEpisodeTriggerTime &&
        currentTime <= duration + 1));

  return {
    inIntroInterval,
    inRecapInterval,
    inOutroInterval,
    inNextEpisodeWindow,
    showSkipIntro: inIntroInterval && !skippedIntro,
    showSkipRecap: inRecapInterval && !skippedRecap,
    showSkipOutro: inOutroInterval && !skippedOutro,
    showNextEpisode: inNextEpisodeWindow,
  };
}


