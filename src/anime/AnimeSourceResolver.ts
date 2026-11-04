/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimeStreamSource {
  id: string;
  provider: string;
  url: string;
  quality: string;
  label: string;
  type: 'hls' | 'dash' | 'mp4';
  audioLang: 'ja' | 'en' | 'hi' | string;
  audioLabel: string;
  isSub: boolean;
  isDub: boolean;
  onlyHevc?: boolean;
  audioStreamKey?: string;
  subtitles?: Array<{ id: string; language: string; url: string }>;
  headers?: Record<string, string>;
}

export interface AnimeResolveResponse {
  success: boolean;
  tmdbId: number;
  title: string;
  mediaType: 'movie' | 'tv';
  season: number;
  episode: number;
  sources: AnimeStreamSource[];
  subtitles: Array<{ id: string; language: string; url: string }>;
  availableAudioTracks: Array<{ code: string; label: string; isSub: boolean; isDub: boolean }>;
  error?: string;
  diagnostics?: {
    resolvedProvider?: string;
    durationMs?: number;
    sourcesCount?: number;
  };
}

/**
 * Resolves verified anime stream sources from /api/anime/resolve.
 * Follows the AnimeSalt workflow for title/season/episode matching and multi-audio support.
 */
export async function resolveAnimeSources(params: {
  tmdbId: number | string;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  preferredAudio?: string;
  signal?: AbortSignal;
}): Promise<AnimeResolveResponse> {
  const { tmdbId, mediaType = 'tv', season = 1, episode = 1, preferredAudio = 'ja', signal } = params;
  const cleanId = String(tmdbId || '').trim();

  try {
    const res = await fetch('/api/anime/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        tmdbId: cleanId,
        mediaType,
        season,
        episode,
        preferredAudio,
      }),
    });

    const data: AnimeResolveResponse = await res.json().catch(() => ({
      success: false,
      tmdbId: Number(cleanId),
      title: `Anime #${cleanId}`,
      mediaType,
      season,
      episode,
      sources: [],
      subtitles: [],
      availableAudioTracks: [],
      error: 'Malformed server response',
    }));

    return data;
  } catch (err: any) {
    if (signal?.aborted) throw err;
    return {
      success: false,
      tmdbId: Number(cleanId),
      title: `Anime #${cleanId}`,
      mediaType,
      season,
      episode,
      sources: [],
      subtitles: [],
      availableAudioTracks: [],
      error: err.message || 'Network request to anime source resolver failed',
    };
  }
}

/**
 * Selects the best source for the user's active audio preference (e.g. Sub [Japanese] vs Dub [English/Hindi]).
 * When a non-Japanese dub is requested and no source matches that language, returns null when strictMatch is true
 * (or when none match a specific dub code) so the caller never falsely plays the default Japanese stream.
 */
export function pickOptimalAnimeSource(
  sources: AnimeStreamSource[],
  preferredAudio = 'ja',
  preferredHeight?: number,
  strictMatch = false
): AnimeStreamSource | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  const targetLang = (preferredAudio || 'ja').trim().toLowerCase();
  const isSubTarget = targetLang === 'sub' || targetLang === 'ja' || targetLang === 'jp' || targetLang === 'jpn';

  const matchesAudio = sources.filter((s) => {
    const sLang = (s.audioLang || '').trim().toLowerCase();
    const sLabel = (s.audioLabel || '').toLowerCase();

    if (isSubTarget) {
      return sLang === 'ja' || sLang === 'jpn' || s.isSub || sLabel.includes('sub') || sLabel.includes('japanese');
    }
    if (targetLang === 'hi' || targetLang === 'hin') {
      return sLang === 'hi' || sLang === 'hin' || sLabel.includes('hindi');
    }
    if (targetLang === 'en' || targetLang === 'eng') {
      return sLang === 'en' || sLang === 'eng' || sLabel.includes('english');
    }
    if (targetLang === 'dub') {
      return s.isDub || sLabel.includes('dub');
    }
    return sLang === targetLang || sLabel.includes(targetLang);
  });

  if (matchesAudio.length === 0) {
    if (strictMatch || !isSubTarget) {
      return null;
    }
  }

  const candidatePool = matchesAudio.length > 0 ? matchesAudio : sources;

  const parseHeight = (txt: string): number => {
    const m = txt.match(/(\d{3,4})p/i);
    return m ? Number.parseInt(m[1], 10) : 720;
  };

  if (preferredHeight && preferredHeight > 0) {
    const exact = candidatePool.find((s) => parseHeight(s.quality) === preferredHeight);
    if (exact) return exact;
  }

  // Prefer non-HEVC (universal H.264) when picking a primary video stream, then highest resolution
  const sorted = [...candidatePool].sort((a, b) => {
    if (isSubTarget && Boolean(a.onlyHevc) !== Boolean(b.onlyHevc)) {
      return a.onlyHevc ? 1 : -1;
    }
    return parseHeight(b.quality) - parseHeight(a.quality);
  });
  return sorted[0] || null;
}
