/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResolvedEpisodeTiming, resolveEpisodeTiming } from '../utils/urlBuilder.js';

export interface AnimeEpisodeSummary {
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  stillPath?: string | null;
  runtime?: number | null;
  airDate?: string | null;
  introStart?: number | null;
  introEnd?: number | null;
  outroStart?: number | null;
  outroEnd?: number | null;
}

export interface AnimeSeasonSummary {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes?: AnimeEpisodeSummary[];
}

export interface AnimePlaybackProgress {
  tmdbId: number;
  season: number;
  episode: number;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

const STORAGE_PREFIX = 'anime_core_progress_';

/**
 * Loads saved playback progress for an anime episode from localStorage.
 */
export function getSavedAnimeProgress(
  tmdbId: number | string,
  season = 1,
  episode = 1
): AnimePlaybackProgress | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const key = `${STORAGE_PREFIX}${tmdbId}_${season}_${episode}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.currentTime === 'number' &&
      Number.isFinite(parsed.currentTime) &&
      parsed.currentTime > 5 &&
      (!parsed.duration || parsed.currentTime < parsed.duration - 15)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves current playback position for an anime episode to localStorage.
 */
export function saveAnimeProgress(
  tmdbId: number | string,
  season: number,
  episode: number,
  currentTime: number,
  duration: number
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!Number.isFinite(currentTime) || currentTime < 0) return;
  try {
    const key = `${STORAGE_PREFIX}${tmdbId}_${season}_${episode}`;
    const record: AnimePlaybackProgress = {
      tmdbId: Number(tmdbId),
      season,
      episode,
      currentTime: Number(currentTime.toFixed(2)),
      duration: Number(duration.toFixed(2)),
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // ignore quota errors
  }
}

/**
 * Clears saved playback position when episode finishes.
 */
export function clearAnimeProgress(tmdbId: number | string, season: number, episode: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = `${STORAGE_PREFIX}${tmdbId}_${season}_${episode}`;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Resolves next and previous anime episodes for smooth playback navigation.
 */
export function resolveAnimeAdjacentEpisodes(params: {
  mediaType: 'movie' | 'tv';
  currentSeason: number;
  currentEpisode: number;
  seasons?: AnimeSeasonSummary[];
  currentSeasonEpisodes?: AnimeEpisodeSummary[];
}): {
  prev: { season: number; episode: number } | null;
  next: { season: number; episode: number } | null;
} {
  const { mediaType, currentSeason, currentEpisode, seasons = [], currentSeasonEpisodes = [] } = params;

  if (mediaType === 'movie') {
    return { prev: null, next: null };
  }

  // Previous episode
  let prev: { season: number; episode: number } | null = null;
  if (currentEpisode > 1) {
    prev = { season: currentSeason, episode: currentEpisode - 1 };
  } else if (currentSeason > 1) {
    // Look for previous season
    const prevSeason = seasons.find((s) => s.seasonNumber === currentSeason - 1);
    if (prevSeason && prevSeason.episodeCount > 0) {
      prev = { season: currentSeason - 1, episode: prevSeason.episodeCount };
    }
  }

  // Next episode
  let next: { season: number; episode: number } | null = null;
  const currentSeasonObj = seasons.find((s) => s.seasonNumber === currentSeason);
  const totalInSeason =
    currentSeasonEpisodes.length > 0
      ? currentSeasonEpisodes.length
      : currentSeasonObj?.episodeCount ?? 0;

  if (totalInSeason > 0 && currentEpisode < totalInSeason) {
    next = { season: currentSeason, episode: currentEpisode + 1 };
  } else {
    // Check if there is a next season
    const nextSeason = seasons.find((s) => s.seasonNumber === currentSeason + 1);
    if (nextSeason && (nextSeason.episodeCount > 0 || !currentSeasonObj)) {
      next = { season: currentSeason + 1, episode: 1 };
    } else if (totalInSeason === 0) {
      // Fallback when episode counts haven't loaded yet
      next = { season: currentSeason, episode: currentEpisode + 1 };
    }
  }

  return { prev, next };
}

/**
 * Fetches episodes for an anime season from /api/tmdb/season/:tmdbId/season/:season
 */
export async function fetchAnimeSeasonEpisodes(
  tmdbId: number | string,
  seasonNumber: number,
  signal?: AbortSignal
): Promise<AnimeEpisodeSummary[]> {
  try {
    const res = await fetch(`/api/tmdb/season/${tmdbId}/season/${seasonNumber}`, { signal });
    if (!res.ok) return [];
    const json = await res.json();
    const rawEps = Array.isArray(json?.data?.episodes)
      ? json.data.episodes
      : Array.isArray(json?.episodes)
      ? json.episodes
      : [];

    return rawEps.map((ep: any) => ({
      episodeNumber: Number(ep.episode_number || 1),
      seasonNumber: Number(ep.season_number || seasonNumber),
      name: String(ep.name || `Episode ${ep.episode_number || 1}`).trim(),
      overview: ep.overview || '',
      stillPath: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null,
      runtime: typeof ep.runtime === 'number' ? ep.runtime : null,
      airDate: ep.air_date || null,
      introStart: typeof ep.introStart === 'number' ? ep.introStart : null,
      introEnd: typeof ep.introEnd === 'number' ? ep.introEnd : null,
      outroStart: typeof ep.outroStart === 'number' ? ep.outroStart : null,
      outroEnd: typeof ep.outroEnd === 'number' ? ep.outroEnd : null,
    }));
  } catch (err: any) {
    if (signal?.aborted) throw err;
    return [];
  }
}

/**
 * Fetches episode OP (Intro) and ED (Outro) timing metadata from /api/intro
 */
export async function fetchAnimeEpisodeTiming(params: {
  tmdbId: number | string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  duration?: number;
  signal?: AbortSignal;
}): Promise<ResolvedEpisodeTiming> {
  const { tmdbId, mediaType, season = 1, episode = 1, duration = 0, signal } = params;
  try {
    const qs = new URLSearchParams({
      tmdbId: String(tmdbId),
      mediaType,
    });
    if (mediaType === 'tv') {
      qs.set('season', String(season));
      qs.set('episode', String(episode));
    }
    if (duration > 0) {
      qs.set('durationSec', String(Math.round(duration)));
    }

    const res = await fetch(`/api/intro?${qs.toString()}`, { signal });
    if (!res.ok) {
      return resolveEpisodeTiming({ duration, mediaType, nextEpisode: null });
    }
    const data = await res.json();
    return resolveEpisodeTiming({
      raw: data,
      duration,
      mediaType,
      nextEpisode: null,
    });
  } catch (err: any) {
    if (signal?.aborted) throw err;
    return resolveEpisodeTiming({ duration, mediaType, nextEpisode: null });
  }
}
