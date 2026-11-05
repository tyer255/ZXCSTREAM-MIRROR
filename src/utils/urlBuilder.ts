export type PlayerMode = 'custom' | 'builtin' | 'nxsha' | 'anime';
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
    }
  | {
      page: 'anime';
      tmdbId: string;
      season: number;
      episode: number;
      mediaType?: 'movie' | 'tv';
    };

export interface RawOrionDub {
  type?: number;
  lang: string;
  name: string;
  label?: string;
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
    name: 'Vegamovies III',
    badge: 'Hindi & Dual Audio',
    quality: '1080p FHD',
    latencyMs: 48,
  },
  {
    id: 3,
    number: 4,
    name: 'Atlas IV',
    badge: 'Fast & Stable',
    quality: '4K UHD',
    latencyMs: 36,
  },
  {
    id: 4,
    number: 5,
    name: 'Ursa V',
    badge: 'Alternative',
    quality: '1080p FHD',
    latencyMs: 74,
  },
  {
    id: 5,
    number: 6,
    name: 'Alatreon VI',
    badge: 'Extensive Movie & TV Library',
    quality: '1080p FHD',
    latencyMs: 65,
  },
  {
    id: 6,
    number: 7,
    name: 'Daedalus VII',
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
  const cleanId = options.tmdbId.trim();

  if (options.playerMode === 'anime') {
    let animePath = '';
    if (options.mediaType === 'tv') {
      const s = (options.season ?? '1').trim() || '1';
      const ep = (options.episode ?? '1').trim() || '1';
      animePath = `${origin}/anime/tv/${encodeURIComponent(cleanId || '85937')}/${encodeURIComponent(s)}/${encodeURIComponent(ep)}`;
    } else {
      animePath = `${origin}/anime/movie/${encodeURIComponent(cleanId || '128')}`;
    }
    if (options.queryParams) {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(options.queryParams)) {
        if (v !== undefined && v !== '') {
          search.set(k, v);
        }
      }
      const qs = search.toString();
      if (qs) animePath += `?${qs}`;
    }
    return animePath;
  }

  const endpoint = options.playerMode === 'nxsha' ? 'nxsha' : options.playerMode === 'custom' ? 'player' : 'embed';

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
  baseOrigin?: string,
  playerMode: PlayerMode = 'builtin'
): string {
  const url = buildPlayerUrl({
    baseOrigin: baseOrigin ?? getDefaultOrigin(),
    playerMode,
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
  { index: 2, id: 'vegamovies', label: 'Vegamovies III' },
  { index: 3, id: 'atlas', label: 'Atlas IV' },
  { index: 4, id: 'ursa', label: 'Ursa V' },
  { index: 5, id: 'alatreon', label: 'Alatreon VI' },
  { index: 6, id: 'daedalus', label: 'Daedalus VII' },
] as const;

export const NXSHA_SERVERS = [
  { index: 0, id: 'rive-citadel', label: 'Citadel (Hindi & Multi)' },
  { index: 1, id: 'castle', label: 'CastVid (Multi-Lang)' },
  { index: 2, id: 'watchout', label: 'Multi-bill (Fast HLS)' },
  { index: 3, id: 'streamflix', label: 'StremFx (Direct MP4)' },
  { index: 4, id: 'nitro', label: 'Nitro (1080p Multi-Audio)' },
  { index: 5, id: 'xdownloader', label: 'XDrop (Alternative)' },
  { index: 6, id: 'purstream', label: 'PurStream (Fast)' },
  { index: 7, id: 'vixolity', label: 'Vixolity (UHD)' },
  { index: 8, id: 'rive-primevids', label: 'PrimeVids (Backup)' },
  { index: 9, id: 'vegamovies', label: 'Vegamovies (Hindi & Dual)' },
  { index: 10, id: 'orion', label: 'AethoOrion (Multi-Audio Master)' },
  { index: 11, id: 'vega', label: 'AethoVega (Direct HLS Master)' },
  { index: 12, id: 'callisto', label: 'AethoCallisto (16-Lang Global & Hindi)' },
  { index: 13, id: 'sirius', label: 'AethoSirius (Ultra-Fast Hindi/EN)' },
  { index: 14, id: 'bharat', label: 'AethoBharat (Hindi & South Multi-Audio)' },
  { index: 15, id: 'indus', label: 'AethoIndus (India Edge HLS)' },
  { index: 16, id: 'bolly', label: 'AethoBolly (Dual-Audio Hindi)' },
  { index: 17, id: 'kuro', label: 'AethoKuro (Anime & Series Multi-Audio)' },
  { index: 18, id: 'quantum', label: 'AethoQuantum (Adaptive Master HLS)' },
  { index: 19, id: 'rousav', label: 'AethoRousav (22-Lang Multi-Track)' },
  { index: 20, id: 'atlas', label: 'AethoAtlas (Fast Edge H.264)' },
  { index: 21, id: 'ursa', label: 'AethoUrsa (Low-Latency Edge)' },
  { index: 22, id: 'andromeda', label: 'AethoAndromeda (Ultra HD Stream)' },
  { index: 23, id: 'valstrax', label: 'AethoValstrax (High-Bitrate 1080p)' },
  { index: 24, id: 'alatreon', label: 'AethoAlatreon (Extended Library)' },
  { index: 25, id: 'resshin', label: 'AethoResshin (Multi-Res & Hindi Dub)' },
  { index: 26, id: 'centaurus', label: 'AethoCentaurus (Multi-Res 1080p)' },
  { index: 27, id: 'daedalus', label: 'AethoDaedalus (Global CDN Mirror)' },
  { index: 28, id: 'quasar', label: 'AethoQuasar (High-Speed India/Asia)' },
  { index: 29, id: 'zenith', label: 'AethoZenith (Multi-Lang Cinema Bridge)' },
  { index: 30, id: 'nebula', label: 'AethoNebula (Dual-Audio Express)' },
  { index: 31, id: 'zxc_pulse', label: 'AethoPulse (Secondary Multi-Audio)' },
  { index: 32, id: 'zxc_atlas', label: 'AethoVortex (Fast Edge Cluster)' },
  { index: 33, id: 'zxc_ursa', label: 'AethoApex (Global Backup HLS)' },
  { index: 34, id: 'hyperion', label: 'AethoHyperion (Cloud Fabric 1080p)' },
  { index: 35, id: 'vidfast', label: 'AethoFlash (Instant Start Cluster)' },
  { index: 36, id: 'vaplayer', label: 'AethoPrism (European Edge Node)' },
  { index: 37, id: 'kronos', label: 'AethoKronos (Multi-CDN Stream)' },
  { index: 38, id: 'pegasus', label: 'AethoPegasus (Zero-Buffer Hindi/EN)' },
  { index: 39, id: 'nova', label: 'AethoNova (Cinema 1080p Multi-Audio)' },
  { index: 40, id: 'apollo', label: 'AethoApollo (Universal Failover)' },
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
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 50) {
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
    if (cleanLang === 'orig' || cleanLang === 'original') continue;
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

/**
 * Merges two RawOrionDub arrays (e.g. native NXSHA dubs and Orion dubs) without duplicates.
 */
export function mergeAvailableDubs(
  existing?: RawOrionDub[] | null,
  incoming?: RawOrionDub[] | null
): RawOrionDub[] {
  const combined = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])];
  const byLang = new Map<string, RawOrionDub>();
  for (const item of combined) {
    if (!item || typeof item.lang !== 'string' || !item.lang.trim()) continue;
    const typeNum = Number(item.type ?? 0);
    if (typeNum !== 0 && !item.original) continue;
    const cleanLang = item.lang.trim().toLowerCase();
    if (cleanLang === 'orig' || cleanLang === 'original') continue;
    const existingEntry = byLang.get(cleanLang);
    if (!existingEntry) {
      byLang.set(cleanLang, {
        type: 0,
        lang: cleanLang,
        name: item.name || item.label || cleanLang.toUpperCase(),
        label: item.label || item.name || cleanLang.toUpperCase(),
        original: Boolean(item.original),
      });
    } else if (existingEntry.original && !item.original) {
      // Keep as selectable non-original dub if one provider explicitly offers it as a selectable dub track
      byLang.set(cleanLang, {
        ...existingEntry,
        name: item.name || existingEntry.name,
        original: false,
      });
    }
  }
  return Array.from(byLang.values());
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
  if (!cleanCode || cleanCode === 'orig' || cleanCode === 'original') {
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

  // Explicit Anime Route: /anime/:tmdbId/:season/:ep or /anime/movie/:tmdbId or /anime/:tmdbId
  if (first === 'anime' && second) {
    if ((second === 'movie' || second === 'tv') && third) {
      const season = Math.max(1, Number.parseInt(fourth ?? '1', 10) || 1);
      const episode = Math.max(1, Number.parseInt(fifth ?? '1', 10) || 1);
      return {
        page: 'anime',
        mediaType: second,
        tmdbId: third,
        season,
        episode,
      };
    }
    const season = Math.max(1, Number.parseInt(third ?? '1', 10) || 1);
    const episode = Math.max(1, Number.parseInt(fourth ?? '1', 10) || 1);
    return {
      page: 'anime',
      tmdbId: second,
      season,
      episode,
      mediaType: !third ? 'movie' : undefined,
    };
  }

  // Explicit Anime Embed Route: /embed/anime/movie/:id or /embed/anime/:id/:s/:e
  if (first === 'embed' && second === 'anime' && third) {
    if ((third === 'movie' || third === 'tv') && fourth) {
      const season = Math.max(1, Number.parseInt(fifth ?? '1', 10) || 1);
      return {
        page: 'anime',
        mediaType: third,
        tmdbId: fourth,
        season,
        episode: Math.max(1, Number.parseInt(segments[5] ?? '1', 10) || 1),
      };
    }
    const season = Math.max(1, Number.parseInt(fourth ?? '1', 10) || 1);
    const episode = Math.max(1, Number.parseInt(fifth ?? '1', 10) || 1);
    return {
      page: 'anime',
      tmdbId: third,
      season,
      episode,
      mediaType: !fourth ? 'movie' : undefined,
    };
  }

  // Dedicated Anime Player Endpoint (User Requirement 3): /embed/{tmdbid}/{season}/{ep}
  // When second segment is a numeric TMDB ID (not 'movie' or 'tv'):
  // e.g. /embed/94997/1/1, /embed/85937/1/1, /embed/128 (movie)
  if (first === 'embed' && second && second !== 'movie' && second !== 'tv' && /^\d+$/.test(second)) {
    const season = Math.max(1, Number.parseInt(third ?? '1', 10) || 1);
    const episode = Math.max(1, Number.parseInt(fourth ?? '1', 10) || 1);
    return {
      page: 'anime',
      tmdbId: second,
      season,
      episode,
      mediaType: !third ? 'movie' : undefined,
    };
  }

  // Standard Embed / Custom / NXSHA Player Routes: /embed/movie/:id or /embed/tv/:id/:s/:e
  if ((first === 'player' || first === 'embed' || first === 'nxsha') && (second === 'movie' || second === 'tv') && third) {
    const season = Math.max(1, Number.parseInt(fourth ?? '1', 10) || 1);
    const episode = Math.max(1, Number.parseInt(fifth ?? '1', 10) || 1);
    return {
      page: 'player',
      playerMode: first === 'nxsha' ? 'nxsha' : first === 'player' ? 'custom' : 'builtin',
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

// ============================================================================
// NXSHA Language Detection, Source Matching, Quality & Subtitle Helpers
// ============================================================================

const NXSHA_LANG_PATTERNS: Array<{ code: string; name: string; regex: RegExp }> = [
  { code: 'hi', name: 'Hindi', regex: /(?:^|\b|\s|\[|\|)(hindi|hin|hi|हिन्दी|हिंदी)(?:\b|\s|\]|\||$)/i },
  { code: 'en', name: 'English', regex: /(?:^|\b|\s|\[|\|)(english|eng|en)(?:\b|\s|\]|\||$)/i },
  { code: 'ta', name: 'Tamil', regex: /(?:^|\b|\s|\[|\|)(tamil|tam|ta|தமிழ்)(?:\b|\s|\]|\||$)/i },
  { code: 'te', name: 'Telugu', regex: /(?:^|\b|\s|\[|\|)(telugu|tel|te|తెలుగు)(?:\b|\s|\]|\||$)/i },
  { code: 'ml', name: 'Malayalam', regex: /(?:^|\b|\s|\[|\|)(malayalam|mal|ml|മലയാളം)(?:\b|\s|\]|\||$)/i },
  { code: 'kn', name: 'Kannada', regex: /(?:^|\b|\s|\[|\|)(kannada|kan|kn|ಕನ್ನಡ)(?:\b|\s|\]|\||$)/i },
  { code: 'bn', name: 'Bengali', regex: /(?:^|\b|\s|\[|\|)(bengali|bangla|ben|bn|বাংলা)(?:\b|\s|\]|\||$)/i },
  { code: 'es', name: 'Spanish', regex: /(?:^|\b|\s|\[|\|)(spanish|español|espanol|esla|castilian|spa|es)(?:\b|\s|\]|\||$)/i },
  { code: 'fr', name: 'French', regex: /(?:^|\b|\s|\[|\|)(french|français|francais|fra|fre|fr)(?:\b|\s|\]|\||$)/i },
  { code: 'de', name: 'German', regex: /(?:^|\b|\s|\[|\|)(german|deutsch|ger|deu|de)(?:\b|\s|\]|\||$)/i },
  { code: 'ja', name: 'Japanese', regex: /(?:^|\b|\s|\[|\|)(japanese|日本語|nihongo|jap|jpn|ja)(?:\b|\s|\]|\||$)/i },
  { code: 'pt', name: 'Portuguese', regex: /(?:^|\b|\s|\[|\|)(portuguese|ptbr|português|portugues|por|pt)(?:\b|\s|\]|\||$)/i },
  { code: 'it', name: 'Italian', regex: /(?:^|\b|\s|\[|\|)(italian|italiano|ita|it)(?:\b|\s|\]|\||$)/i },
  { code: 'ko', name: 'Korean', regex: /(?:^|\b|\s|\[|\|)(korean|한국어|kor|ko)(?:\b|\s|\]|\||$)/i },
  { code: 'ar', name: 'Arabic', regex: /(?:^|\b|\s|\[|\|)(arabic|العربية|ara|ar)(?:\b|\s|\]|\||$)/i },
  { code: 'ru', name: 'Russian', regex: /(?:^|\b|\s|\[|\|)(russian|русский|rus|ru)(?:\b|\s|\]|\||$)/i },
  { code: 'tr', name: 'Turkish', regex: /(?:^|\b|\s|\[|\|)(turkish|türkçe|turkce|tur|tr)(?:\b|\s|\]|\||$)/i },
  { code: 'pl', name: 'Polish', regex: /(?:^|\b|\s|\[|\|)(polish|polski|pol|pl)(?:\b|\s|\]|\||$)/i },
  { code: 'id', name: 'Indonesian', regex: /(?:^|\b|\s|\[|\|)(indonesian|bahasa|ind|id)(?:\b|\s|\]|\||$)/i },
  { code: 'tl', name: 'Tagalog', regex: /(?:^|\b|\s|\[|\|)(tagalog|filipino|tgl|tl)(?:\b|\s|\]|\||$)/i },
  { code: 'vi', name: 'Vietnamese', regex: /(?:^|\b|\s|\[|\|)(vietnamese|vietsub|thuyết minh|vie|vi)(?:\b|\s|\]|\||$)/i },
];

/**
 * Detects the actual baked-in language of a single NXSHA stream from its label/quality text.
 * - If a label contains a comma-separated list of languages in brackets like
 *   `[English, Hindi, Tamil, Telugu] - 720P`, only the FIRST listed language (`English`)
 *   is present in that single-track HLS stream.
 */
export function detectSingleStreamLanguage(text?: string | null): { code: string; name: string } | null {
  if (!text) return null;
  let normalized = text;
  // If brackets contain comma-separated languages (e.g. "[English, Hindi, Tamil, Telugu]"), keep only the first
  normalized = normalized.replace(/\[([^\]]*,[^\]]*)\]/g, (_full, inner: string) => {
    const firstPart = inner.split(',')[0]?.trim() || '';
    return `[${firstPart}]`;
  });

  // Also if pipe-separated or comma-separated without brackets, check earliest match position in string
  let bestMatch: { code: string; name: string; index: number } | null = null;
  for (const pat of NXSHA_LANG_PATTERNS) {
    const m = pat.regex.exec(normalized);
    if (m && (bestMatch === null || m.index < bestMatch.index)) {
      bestMatch = { code: pat.code, name: pat.name, index: m.index };
    }
  }
  return bestMatch ? { code: bestMatch.code, name: bestMatch.name } : null;
}

/**
 * Extracts all language codes mentioned in a stream label (e.g. "[Hindi, English, Tamil, Telugu] - 720P").
 */
export function detectAllStreamLanguages(text?: string | null): Array<{ code: string; name: string }> {
  if (!text) return [];
  const matches: Array<{ code: string; name: string; index: number }> = [];
  for (const pat of NXSHA_LANG_PATTERNS) {
    const m = pat.regex.exec(text);
    if (m) {
      matches.push({ code: pat.code, name: pat.name, index: m.index });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  return matches.map(({ code, name }) => ({ code, name }));
}

export function parseResolutionHeight(text?: string | null): number {
  if (!text) return 0;
  const m = text.match(/\b(2160|1440|1080|720|480|360)p?\b/i);
  if (m) return Number.parseInt(m[1], 10);
  if (/\b4k\b/i.test(text)) return 2160;
  return 0;
}

/**
 * Strictly matches an NXSHA source for a given dub language code (and optional resolution height),
 * supporting both dedicated single-language streams and multi-audio MPEG-TS streams (`multiLangs`).
 */
export function matchNxshaSourceForDub(
  sources?: any[] | null,
  dubCode?: string | null,
  preferredHeight?: number | null
): any | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const cleanCode = (dubCode || '').trim().toLowerCase();
  const isOriginal = !cleanCode || cleanCode === 'orig' || cleanCode === 'original';
  const normalizedTarget = cleanCode === 'esla' ? 'es' : cleanCode === 'ptbr' ? 'pt' : cleanCode;

  const getSourceLang = (s: any): string => {
    if (s?.lang && typeof s.lang === 'string') return s.lang.trim().toLowerCase();
    const detected = detectSingleStreamLanguage(`${s?.label || ''} ${s?.quality || ''}`);
    return detected?.code || '';
  };

  const getSourceMultiLangs = (s: any): string[] => {
    if (Array.isArray(s?.multiLangs)) {
      return s.multiLangs.map((c: any) => String(c).trim().toLowerCase()).filter(Boolean);
    }
    const all = detectAllStreamLanguages(`${s?.label || ''} ${s?.quality || ''}`);
    return all.length > 1 ? all.map((l) => l.code) : [];
  };

  const candidates = sources.filter((s) => {
    if (!s?.url) return false;
    const sLang = getSourceLang(s);
    const mLangs = getSourceMultiLangs(s);
    if (isOriginal) {
      return sLang === 'en' || sLang === '' || mLangs.includes('en') || mLangs.length > 1;
    }
    return sLang === cleanCode || sLang === normalizedTarget || mLangs.includes(cleanCode) || mLangs.includes(normalizedTarget);
  });

  if (candidates.length === 0) return null;

  if (preferredHeight && preferredHeight > 0) {
    const exactHeight = candidates.find(
      (s) => parseResolutionHeight(`${s.label || ''} ${s.quality || ''} ${s.url || ''}`) === preferredHeight
    );
    if (exactHeight) return exactHeight;
  }

  // Sort candidates: prefer exact single-lang match first when available at the same or higher resolution, then by height descending
  const sorted = [...candidates].sort((a, b) => {
    const hA = parseResolutionHeight(`${a.label || ''} ${a.quality || ''} ${a.url || ''}`) || 720;
    const hB = parseResolutionHeight(`${b.label || ''} ${b.quality || ''} ${b.url || ''}`) || 720;
    return hB - hA;
  });

  return sorted[0];
}

/**
 * Extracts distinct resolution quality options (e.g. 1080p, 720p, 480p) from NXSHA sources
 * for the currently active language so Settings -> Quality works on single-level HLS streams.
 * Uses index = 1000 + height to distinguish NXSHA source-switching qualities from internal HLS levels.
 */
export function extractNxshaQualitiesForDub(
  sources?: any[] | null,
  dubCode?: string | null
): Array<{ index: number; height: number }> {
  if (!Array.isArray(sources) || sources.length === 0) return [];
  const cleanCode = (dubCode || '').trim().toLowerCase();
  const isOriginal = !cleanCode || cleanCode === 'orig' || cleanCode === 'original';
  const normalizedTarget = cleanCode === 'esla' ? 'es' : cleanCode === 'ptbr' ? 'pt' : cleanCode;

  const getSourceLang = (s: any): string => {
    if (s?.lang && typeof s.lang === 'string') return s.lang.trim().toLowerCase();
    const detected = detectSingleStreamLanguage(`${s?.label || ''} ${s?.quality || ''}`);
    return detected?.code || '';
  };

  const getSourceMultiLangs = (s: any): string[] => {
    if (Array.isArray(s?.multiLangs)) {
      return s.multiLangs.map((c: any) => String(c).trim().toLowerCase()).filter(Boolean);
    }
    const all = detectAllStreamLanguages(`${s?.label || ''} ${s?.quality || ''}`);
    return all.length > 1 ? all.map((l) => l.code) : [];
  };

  let matching = sources.filter((s) => {
    if (!s?.url) return false;
    const sLang = getSourceLang(s);
    const mLangs = getSourceMultiLangs(s);
    if (isOriginal) return sLang === 'en' || sLang === '' || mLangs.includes('en') || mLangs.length > 1;
    return sLang === cleanCode || sLang === normalizedTarget || mLangs.includes(cleanCode) || mLangs.includes(normalizedTarget);
  });

  if (matching.length === 0) {
    matching = sources.filter((s) => Boolean(s?.url));
  }

  const heights = new Set<number>();
  for (const s of matching) {
    const h = parseResolutionHeight(`${s.label || ''} ${s.quality || ''} ${s.url || ''}`);
    if (h > 0) heights.add(h);
  }

  return Array.from(heights)
    .sort((a, b) => b - a)
    .map((h) => ({ index: 1000 + h, height: h }));
}

// ============================================================================
// MPEG-TS PMT Multi-Audio Track Inspector & In-Place Selector
// ============================================================================

const ISO639_TO_DUB_CODE: Record<string, { code: string; name: string }> = {
  hin: { code: 'hi', name: 'Hindi' },
  hi: { code: 'hi', name: 'Hindi' },
  eng: { code: 'en', name: 'English' },
  en: { code: 'en', name: 'English' },
  tam: { code: 'ta', name: 'Tamil' },
  ta: { code: 'ta', name: 'Tamil' },
  tel: { code: 'te', name: 'Telugu' },
  te: { code: 'te', name: 'Telugu' },
  mal: { code: 'ml', name: 'Malayalam' },
  ml: { code: 'ml', name: 'Malayalam' },
  kan: { code: 'kn', name: 'Kannada' },
  kn: { code: 'kn', name: 'Kannada' },
  ben: { code: 'bn', name: 'Bengali' },
  bn: { code: 'bn', name: 'Bengali' },
  spa: { code: 'es', name: 'Spanish' },
  es: { code: 'es', name: 'Spanish' },
  fra: { code: 'fr', name: 'French' },
  fre: { code: 'fr', name: 'French' },
  fr: { code: 'fr', name: 'French' },
  deu: { code: 'de', name: 'German' },
  ger: { code: 'de', name: 'German' },
  de: { code: 'de', name: 'German' },
  jpn: { code: 'ja', name: 'Japanese' },
  ja: { code: 'ja', name: 'Japanese' },
  por: { code: 'pt', name: 'Portuguese' },
  pt: { code: 'pt', name: 'Portuguese' },
  ita: { code: 'it', name: 'Italian' },
  it: { code: 'it', name: 'Italian' },
  kor: { code: 'ko', name: 'Korean' },
  ko: { code: 'ko', name: 'Korean' },
  ara: { code: 'ar', name: 'Arabic' },
  ar: { code: 'ar', name: 'Arabic' },
  rus: { code: 'ru', name: 'Russian' },
  ru: { code: 'ru', name: 'Russian' },
  tur: { code: 'tr', name: 'Turkish' },
  tr: { code: 'tr', name: 'Turkish' },
  pol: { code: 'pl', name: 'Polish' },
  pl: { code: 'pl', name: 'Polish' },
  ind: { code: 'id', name: 'Indonesian' },
  id: { code: 'id', name: 'Indonesian' },
  tgl: { code: 'tl', name: 'Tagalog' },
  fil: { code: 'tl', name: 'Tagalog' },
  tl: { code: 'tl', name: 'Tagalog' },
  vie: { code: 'vi', name: 'Vietnamese' },
  vi: { code: 'vi', name: 'Vietnamese' },
};

export function iso639ToDubInfo(isoCode?: string | null): { code: string; name: string } | null {
  if (!isoCode) return null;
  const clean = isoCode.trim().toLowerCase();
  if (!clean || clean === 'und' || clean === 'mul' || clean === 'mis' || clean === 'zxx') {
    return null;
  }
  return ISO639_TO_DUB_CODE[clean] || null;
}

export function mpeg2Crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 24;
    for (let b = 0; b < 8; b++) {
      if (crc & 0x80000000) {
        crc = ((crc << 1) ^ 0x04c11db7) >>> 0;
      } else {
        crc = (crc << 1) >>> 0;
      }
    }
  }
  return crc >>> 0;
}

export interface MpegTsAudioSelectionResult {
  isMpegTs: boolean;
  audioTrackCount: number;
  discoveredLangs: string[];
  discoveredDubs: RawOrionDub[];
  selectedLang: string;
  matchedTargetLang: boolean;
  modified: boolean;
}

function isMpegTsAudioStreamType(streamType: number): boolean {
  return (
    streamType === 0x03 || // MPEG-1 Audio
    streamType === 0x04 || // MPEG-2 Audio
    streamType === 0x0f || // ISO/IEC 13818-7 ADTS AAC
    streamType === 0x11 || // ISO/IEC 14496-3 LATM AAC
    streamType === 0x81 || // AC-3
    streamType === 0x87    // E-AC-3
  );
}

/**
 * Inspects MPEG-TS packets in a segment buffer for Program Map Tables (PMT), discovers all
 * embedded audio elementary stream languages (ISO-639 descriptors), and when multiple audio
 * tracks are muxed in the container (e.g. `eng`, `hin`, `tam`, `tel` on rive-citadel / castle),
 * rewrites the PMT in-place so `hls.js` demuxes the exact requested dub language track.
 */
export function inspectAndSelectMpegTsAudioTrack(
  data: Uint8Array,
  targetDubCode?: string | null
): MpegTsAudioSelectionResult {
  const emptyResult: MpegTsAudioSelectionResult = {
    isMpegTs: false,
    audioTrackCount: 0,
    discoveredLangs: [],
    discoveredDubs: [],
    selectedLang: '',
    matchedTargetLang: false,
    modified: false,
  };

  if (!data || data.length < 188) return emptyResult;

  // Locate first 188-byte MPEG-TS sync byte (handles raw .ts and header-padded .jpg/.png segments)
  let startOffset = -1;
  const maxScan = Math.min(data.length - 188, 2048);
  for (let i = 0; i <= maxScan; i++) {
    if (
      data[i] === 0x47 &&
      (i + 188 >= data.length || data[i + 188] === 0x47) &&
      (i + 376 >= data.length || data[i + 376] === 0x47)
    ) {
      startOffset = i;
      break;
    }
  }
  if (startOffset < 0) return emptyResult;

  const rawTarget = (targetDubCode || '').trim().toLowerCase();
  const isOriginalTarget = !rawTarget || rawTarget === 'orig' || rawTarget === 'original';
  const normTarget = rawTarget === 'esla' ? 'es' : rawTarget === 'ptbr' ? 'pt' : rawTarget;

  let pmtPid = 0x1000;
  let audioTrackCount = 0;
  const discoveredLangSet = new Set<string>();
  const discoveredDubsMap = new Map<string, RawOrionDub>();
  let selectedLang = '';
  let matchedTargetLang = false;
  let modified = false;

  for (let pkt = startOffset; pkt + 188 <= data.length; pkt += 188) {
    if (data[pkt] !== 0x47) continue;

    const pusi = (data[pkt + 1] & 0x40) !== 0;
    const pid = ((data[pkt + 1] & 0x1f) << 8) | data[pkt + 2];
    const afc = (data[pkt + 3] >> 4) & 0x03;
    if ((afc & 0x01) === 0) continue;

    let payStart = pkt + 4;
    if (afc & 0x02) {
      const adaptLen = data[pkt + 4];
      payStart += 1 + adaptLen;
    }
    if (payStart >= pkt + 188) continue;

    // 1. Parse PAT (PID 0x0000) to discover PMT PID
    if (pid === 0x0000 && pusi) {
      const pointer = data[payStart];
      const secStart = payStart + 1 + pointer;
      if (secStart + 8 < pkt + 188 && data[secStart] === 0x00) {
        const secLen = ((data[secStart + 1] & 0x0f) << 8) | data[secStart + 2];
        const loopEnd = Math.min(pkt + 188, secStart + 3 + secLen - 4);
        for (let pos = secStart + 8; pos + 4 <= loopEnd; pos += 4) {
          const progNum = (data[pos] << 8) | data[pos + 1];
          const progPid = ((data[pos + 2] & 0x1f) << 8) | data[pos + 3];
          if (progNum !== 0 && progPid > 0) {
            pmtPid = progPid;
            break;
          }
        }
      }
      continue;
    }

    // 2. Parse PMT (PID === pmtPid, table_id === 0x02)
    if (pid === pmtPid && pusi) {
      const pointer = data[payStart];
      const secStart = payStart + 1 + pointer;
      if (secStart + 12 >= pkt + 188 || data[secStart] !== 0x02) continue;

      const secLen = ((data[secStart + 1] & 0x0f) << 8) | data[secStart + 2];
      const secEnd = secStart + 3 + secLen;
      if (secEnd > pkt + 188) continue;

      const pcrPid = ((data[secStart + 8] & 0x1f) << 8) | data[secStart + 9];
      const progInfoLen = ((data[secStart + 10] & 0x0f) << 8) | data[secStart + 11];
      const esPos = secStart + 12 + progInfoLen;
      const esEnd = secEnd - 4;
      if (esPos > esEnd) continue;

      interface EsEntry {
        streamType: number;
        elemPid: number;
        isoLang: string;
        dubCode: string;
        dubName: string;
        isAudio: boolean;
        rawBytes: Uint8Array;
      }

      const entries: EsEntry[] = [];
      let pos = esPos;
      while (pos + 5 <= esEnd) {
        const streamType = data[pos];
        const elemPid = ((data[pos + 1] & 0x1f) << 8) | data[pos + 2];
        const esInfoLen = ((data[pos + 3] & 0x0f) << 8) | data[pos + 4];
        const entryEnd = pos + 5 + esInfoLen;
        if (entryEnd > esEnd) break;

        let isoLang = '';
        let dPos = pos + 5;
        while (dPos + 2 <= entryEnd) {
          const dTag = data[dPos];
          const dLen = data[dPos + 1];
          if (dTag === 0x0a && dLen >= 3 && dPos + 5 <= entryEnd) {
            isoLang = String.fromCharCode(data[dPos + 2], data[dPos + 3], data[dPos + 4])
              .replace(/\0/g, '')
              .trim()
              .toLowerCase();
          }
          dPos += 2 + dLen;
        }

        const dubInfo = iso639ToDubInfo(isoLang);
        const isAudio = isMpegTsAudioStreamType(streamType);
        entries.push({
          streamType,
          elemPid,
          isoLang,
          dubCode: dubInfo?.code || '',
          dubName: dubInfo?.name || '',
          isAudio,
          rawBytes: data.slice(pos, entryEnd),
        });
        pos = entryEnd;
      }

      const audioEntries = entries.filter((e) => e.isAudio);
      if (audioEntries.length > audioTrackCount) {
        audioTrackCount = audioEntries.length;
      }

      for (let idx = 0; idx < audioEntries.length; idx++) {
        const a = audioEntries[idx];
        if (a.dubCode) {
          discoveredLangSet.add(a.dubCode);
          if (!discoveredDubsMap.has(a.dubCode)) {
            discoveredDubsMap.set(a.dubCode, {
              type: 0,
              lang: a.dubCode,
              name: `${a.dubName} dub`,
              label: a.dubName,
              original: false,
            });
          }
        }
      }

      if (audioEntries.length === 1) {
        const onlyAudio = audioEntries[0];
        selectedLang = onlyAudio.dubCode;
        if (isOriginalTarget) {
          matchedTargetLang = !onlyAudio.dubCode || onlyAudio.dubCode === 'en';
        } else {
          matchedTargetLang =
            onlyAudio.dubCode === normTarget ||
            onlyAudio.dubCode === rawTarget ||
            onlyAudio.isoLang === rawTarget;
        }
      } else if (audioEntries.length > 1) {
        let chosenAudio = audioEntries[0];
        if (isOriginalTarget) {
          chosenAudio = audioEntries.find((a) => a.dubCode === 'en') || audioEntries[0];
          matchedTargetLang = true;
        } else {
          const exactMatch = audioEntries.find(
            (a) =>
              a.dubCode === normTarget ||
              a.dubCode === rawTarget ||
              (rawTarget.length === 3 && a.isoLang === rawTarget)
          );
          if (exactMatch) {
            chosenAudio = exactMatch;
            matchedTargetLang = true;
          } else {
            chosenAudio = audioEntries.find((a) => a.dubCode === 'en') || audioEntries[0];
            matchedTargetLang = false;
          }
        }

        selectedLang = chosenAudio.dubCode;

        // Keep all non-audio streams (video, etc.) and ONLY the chosen audio stream
        const keptEntries = entries.filter((e) => !e.isAudio || e === chosenAudio);
        const newEsLen = keptEntries.reduce((sum, e) => sum + e.rawBytes.length, 0);

        // If PCR_PID pointed to a removed audio PID, point it to the first kept stream (video or chosenAudio)
        const removedAudioPids = new Set(
          audioEntries.filter((a) => a !== chosenAudio).map((a) => a.elemPid)
        );
        if (removedAudioPids.has(pcrPid) && keptEntries.length > 0) {
          const newPcrPid = keptEntries[0].elemPid;
          data[secStart + 8] = (data[secStart + 8] & 0xe0) | ((newPcrPid >> 8) & 0x1f);
          data[secStart + 9] = newPcrPid & 0xff;
        }

        const newSecLen = 9 + progInfoLen + newEsLen + 4;
        data[secStart + 1] = (data[secStart + 1] & 0xf0) | ((newSecLen >> 8) & 0x0f);
        data[secStart + 2] = newSecLen & 0xff;

        let writePos = esPos;
        for (const k of keptEntries) {
          data.set(k.rawBytes, writePos);
          writePos += k.rawBytes.length;
        }

        const crc = mpeg2Crc32(data.subarray(secStart, writePos));
        data[writePos] = (crc >>> 24) & 0xff;
        data[writePos + 1] = (crc >>> 16) & 0xff;
        data[writePos + 2] = (crc >>> 8) & 0xff;
        data[writePos + 3] = crc & 0xff;
        writePos += 4;

        while (writePos < pkt + 188) {
          data[writePos++] = 0xff;
        }

        modified = true;
      }
    }
  }

  return {
    isMpegTs: true,
    audioTrackCount,
    discoveredLangs: Array.from(discoveredLangSet),
    discoveredDubs: Array.from(discoveredDubsMap.values()),
    selectedLang,
    matchedTargetLang,
    modified,
  };
}

const SUBTITLE_LANG_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  pb: 'Portuguese (BR)',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  tr: 'Turkish',
  id: 'Indonesian',
  vi: 'Vietnamese',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  bn: 'Bengali',
  nl: 'Dutch',
  pl: 'Polish',
};

/**
 * Normalizes and merges subtitle track lists from ZXCSTREAM and NXSHA APIs.
 */
export function normalizeSubtitleTracks(
  existing?: any[] | null,
  incoming?: any[] | null
): Array<{ id: string; language: string; url: string }> {
  const combined = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])];
  const seenLang = new Set<string>();
  const result: Array<{ id: string; language: string; url: string }> = [];

  for (let i = 0; i < combined.length; i++) {
    const item = combined[i];
    if (!item) continue;
    const rawUrl = String(item.url || item.uri || item.file || '').trim();
    if (!rawUrl) continue;
    const rawTitle = String(item.title || item.label || item.language || item.lang || '').trim();
    if (!rawTitle) continue;
    const lowerCode = rawTitle.toLowerCase();
    const displayLanguage = SUBTITLE_LANG_NAMES[lowerCode] || rawTitle;
    const key = displayLanguage.toLowerCase();
    if (seenLang.has(key)) continue;
    seenLang.add(key);
    result.push({
      id: String(item.id || `sub-${i}-${key}`),
      language: displayLanguage,
      url: rawUrl,
    });
  }

  return result;
}




