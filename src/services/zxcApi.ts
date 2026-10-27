import { MediaType } from '../utils/urlBuilder';
import {
  MediaCatalogEntry,
  getMediaByTmdbId,
} from '../data/tmdbCatalog';

export interface LiveStreamLink {
  type: 'dash' | 'hls' | 'mp4' | string;
  link: string;
  proxiedLink?: string;
  resolution?: number | string | null;
  format?: string;
  size?: number | string;
}

export interface LiveDubTrack {
  lang: string;
  name: string;
  type?: string | number;
}

export interface LiveSubtitleTrack {
  id?: string;
  display: string;
  file: string;
  lan?: string;
}

export interface LiveServerSourceResponse {
  server: string;
  links: LiveStreamLink[];
  dubs: LiveDubTrack[];
  subtitles: LiveSubtitleTrack[];
  fallback?: boolean;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface IntroOutroData {
  intro?: { start_sec: number; end_sec: number };
  outro?: { start_sec: number; end_sec: number };
}

export interface NormalizedMediaDetails extends MediaCatalogEntry {
  imdbId: string | null;
  releaseDateFull: string;
  lastAirDate?: string;
  logoPath?: string | null;
  backdropPaths: string[];
}

export const SERVER_DEFINITIONS = [
  {
    index: 0,
    number: 1,
    name: 'Orion I',
    server: 'orion',
    desc: 'Multi Audio Support',
  },
  {
    index: 1,
    number: 2,
    name: 'Valstrax II',
    server: 'valstrax',
    desc: 'HD Quality & Reliable',
  },
  {
    index: 2,
    number: 3,
    name: 'Atlas III',
    server: 'atlas',
    desc: 'Fast & Stable',
  },
  {
    index: 3,
    number: 4,
    name: 'Ursa IV',
    server: 'ursa',
    desc: 'Alternative',
  },
  {
    index: 4,
    number: 5,
    name: 'Alatreon V',
    server: 'alatreon',
    desc: 'Extensive Movie & TV Library',
  },
  {
    index: 5,
    number: 6,
    name: 'Daedalus VI',
    server: 'daedalus',
    desc: 'Alternative',
  },
  {
    index: 6,
    number: 7,
    name: 'Resshin',
    server: 'resshin',
    desc: 'Download & Multi Audio Support',
  },
] as const;

export function formatBytes(bytesInput?: number | string | null): string {
  const bytes = Number(bytesInput);
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '1.4 GB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let unitIdx = 0;
  // Note: some upstream resshin responses report size in KB
  if (val < 50_000_000 && val > 100_000) {
    val = val * 1024;
  }
  while (val >= 1024 && unitIdx < units.length - 1) {
    val /= 1024;
    unitIdx++;
  }
  return `${val.toFixed(1)} ${units[unitIdx]}`;
}

export async function fetchLiveTmdbDetails(
  mediaType: MediaType,
  tmdbId: string,
  language = 'en-US'
): Promise<NormalizedMediaDetails> {
  const cleanId = tmdbId.trim() || '128';
  const fallback = getMediaByTmdbId(mediaType, cleanId);

  try {
    const res = await fetch(
      `/api/tmdb/${encodeURIComponent(mediaType)}/${encodeURIComponent(
        cleanId
      )}?language=${encodeURIComponent(language)}`
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const raw = await res.json();
    const backdropPaths: string[] = Array.isArray(raw.backdrop_paths)
      ? raw.backdrop_paths
      : [];
    const firstBackdrop = backdropPaths[0]
      ? `https://image.tmdb.org/t/p/original${backdropPaths[0]}`
      : fallback.backdropUrl;
    const posterUrl = raw.poster_path
      ? `https://image.tmdb.org/t/p/w780${raw.poster_path}`
      : fallback.posterUrl;
    const logoPath =
      Array.isArray(raw.logo_paths) && raw.logo_paths[0]
        ? `https://image.tmdb.org/t/p/w780/${raw.logo_paths[0].replace(/^\//, '')}`
        : fallback.logoUrl ?? null;

    const releaseDateFull = String(raw.release_date || `${fallback.releaseYear}-01-01`);
    const releaseYear = releaseDateFull.slice(0, 4) || fallback.releaseYear;

    const genres = Array.isArray(raw.genres)
      ? raw.genres.map((g: { name?: string } | string) =>
          typeof g === 'string' ? g : String(g?.name || '')
        ).filter(Boolean)
      : fallback.genres;

    const cast = Array.isArray(raw.cast) && raw.cast.length > 0
      ? raw.cast.slice(0, 12).map((c: { id?: number; name?: string; character?: string; profile_path?: string }, idx: number) => {
          const name = String(c.name || 'Cast Member');
          const initials = name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          return {
            id: Number(c.id ?? idx + 1),
            name,
            character: String(c.character || ''),
            avatarColor: ['#1d4ed8', '#047857', '#7c3aed', '#b45309', '#be123c'][idx % 5],
            initials: initials || 'ZS',
            profileUrl: c.profile_path
              ? `https://image.tmdb.org/t/p/w300${c.profile_path}`
              : undefined,
          };
        })
      : fallback.cast;

    const seasons = Array.isArray(raw.seasons) && raw.seasons.length > 0
      ? raw.seasons
          .filter((s: { season_number?: number }) => Number(s.season_number) > 0)
          .map((s: { season_number: number; episode_count: number; name?: string }) => ({
            seasonNumber: Number(s.season_number),
            episodeCount: Number(s.episode_count) || 1,
            name: String(s.name || `Season ${s.season_number}`),
          }))
      : fallback.seasons;

    return {
      ...fallback,
      tmdbId: cleanId,
      mediaType,
      title: String(raw.title || fallback.title),
      tagline: String(raw.tagline || fallback.tagline),
      overview: String(raw.overview || fallback.overview),
      voteAverage: Number(raw.rating ?? fallback.voteAverage) || fallback.voteAverage,
      runtimeMinutes: Number(raw.runtime ?? fallback.runtimeMinutes) || fallback.runtimeMinutes,
      releaseYear,
      releaseDateFull,
      lastAirDate: raw.last_air_date ? String(raw.last_air_date) : undefined,
      imdbId: raw.imdb_id ? String(raw.imdb_id) : null,
      status: String(raw.status || fallback.status),
      originalLanguage: String(raw.original_language || fallback.originalLanguage),
      country: String(raw.country || fallback.country),
      genres: genres.length > 0 ? genres : fallback.genres,
      posterUrl,
      backdropUrl: firstBackdrop,
      logoUrl: logoPath ?? undefined,
      logoPath,
      backdropPaths,
      youtubeTrailerKey: String(raw.trailer || fallback.youtubeTrailerKey),
      cast,
      seasons,
    };
  } catch {
    return {
      ...fallback,
      imdbId: cleanId === '128' ? 'tt0119698' : cleanId === '1184918' ? 'tt29623480' : null,
      releaseDateFull: `${fallback.releaseYear}-01-01`,
      logoPath: fallback.logoUrl ?? null,
      backdropPaths: [],
    };
  }
}

export async function fetchServerSources(params: {
  server: string;
  mediaType: MediaType;
  tmdbId: string;
  season?: number;
  episode?: number;
  title: string;
  year: string;
  date: string;
  latestDate?: string;
  imdbId?: string | null;
  dubCode?: string;
  dubType?: string;
}): Promise<LiveServerSourceResponse> {
  const qs = new URLSearchParams({
    mediaType: params.mediaType,
    tmdbId: params.tmdbId,
    season: String(params.season ?? 1),
    episode: String(params.episode ?? 1),
    title: params.title,
    year: params.year,
    date: params.date,
  });

  if (params.latestDate) qs.set('latestDate', params.latestDate);
  if (params.imdbId) qs.set('imdbId', params.imdbId);
  if (params.dubCode) {
    qs.set('dubCode', params.dubCode);
    qs.set('dubType', params.dubType ?? '0');
  }

  const res = await fetch(
    `/api/sources/${encodeURIComponent(params.server)}?${qs.toString()}`
  );
  if (!res.ok) {
    throw new Error(`Server ${params.server} returned ${res.status}`);
  }
  return res.json();
}

export async function fetchLiveSubtitles(params: {
  mediaType: MediaType;
  tmdbId: string;
  season?: number;
  episode?: number;
  title: string;
  year: string;
  date: string;
}): Promise<LiveSubtitleTrack[]> {
  try {
    const qs = new URLSearchParams({
      mediaType: params.mediaType,
      tmdbId: params.tmdbId,
      season: String(params.season ?? 1),
      episode: String(params.episode ?? 1),
      title: params.title,
      year: params.year,
      date: params.date,
    });
    const res = await fetch(`/api/subtitles?${qs.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.captions) ? data.captions : [];
  } catch {
    return [];
  }
}

export async function fetchSentinelEmbedUrl(params: {
  mediaType: MediaType;
  tmdbId: string;
  season?: number;
  episode?: number;
  imdbId?: string | null;
}): Promise<string | null> {
  try {
    const qs = new URLSearchParams({
      mediaType: params.mediaType,
      tmdbId: params.tmdbId,
      season: String(params.season ?? 1),
      episode: String(params.episode ?? 1),
    });
    if (params.imdbId) qs.set('imdbId', params.imdbId);
    const res = await fetch(`/api/embed/sentinel?${qs.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.embed ? String(data.embed) : null;
  } catch {
    return null;
  }
}

export async function fetchIntroTimestamps(params: {
  imdbId: string | null;
  tmdbId: string;
  season: number;
  episode: number;
}): Promise<IntroOutroData> {
  if (!params.imdbId) return {};
  try {
    const qs = new URLSearchParams({
      imdbId: params.imdbId,
      tmdbId: params.tmdbId,
      season: String(params.season),
      episode: String(params.episode),
    });
    const res = await fetch(`/api/intro?${qs.toString()}`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

function parseTimestampToSeconds(raw: string): number {
  const parts = raw.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return 0;
}

export function parseSubtitlesText(rawText: string, domain = 'zxcstream.icu'): SubtitleCue[] {
  const cues: SubtitleCue[] = [
    {
      start: 1,
      end: 6,
      text: `Dive into an endless streaming experience at <b>${domain}</b>`,
    },
  ];
  if (!rawText) return cues;
  const blocks = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timeLineIdx = lines.findIndex((line) =>
      /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)
    );
    if (timeLineIdx === -1) continue;
    const [startStr, endStr] = lines[timeLineIdx].split('-->');
    const start = parseTimestampToSeconds(startStr);
    const end = parseTimestampToSeconds(endStr);
    const text = lines
      .slice(timeLineIdx + 1)
      .join('<br/>')
      .trim();
    if (text && Number.isFinite(start) && Number.isFinite(end)) {
      cues.push({ start, end, text });
    }
  }
  return cues;
}
