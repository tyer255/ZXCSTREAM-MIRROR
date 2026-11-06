/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateAnimeTmdbMetadata, AnimeValidationResult } from './AnimeMetadata.js';
import { AnimeResolveResponse, AnimeStreamSource } from './AnimeSourceResolver.js';
import { getMediaByTmdbId, getEpisodeTimingMetadata, SERIES_TIMING_REGISTRY } from '../data/tmdbCatalog.js';

export type FetchTmdbDetailsFn = (mediaType: string, tmdbId: string, language?: string) => Promise<any>;
export type ResolveServerFn = (server: string, params: any) => Promise<any>;

interface AnimeSaltPlayerData {
  language: string;
  link: string;
}

/**
 * Searches AnimeSalt for matching anime series slug
 */
async function findAnimeSaltSeriesSlug(title: string): Promise<string | null> {
  const cleanTitle = title
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();

  const searchKeywords = [cleanTitle.split(':')[0].trim() || cleanTitle];

  for (const query of searchKeywords) {
    if (!query || query.length < 2) continue;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`https://animesalt.cx/?s=${encodeURIComponent(query)}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://animesalt.cx/',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const html = await res.text();
      const matches = Array.from(html.matchAll(/\/series\/([a-z0-9-]+)\/?/gi));
      if (matches.length > 0) {
        return matches[0][1];
      }
    } catch {
      // try next keyword
    }
  }

  // Fallback to normalized title slug
  return cleanTitle.replace(/\s+/g, '-');
}

/**
 * Extracts player data and multi-language streams from AnimeSalt episode page
 */
async function scrapeAnimeSaltSources(
  slug: string,
  season: number,
  episode: number
): Promise<{ sources: AnimeStreamSource[]; languages: string[] }> {
  const candidateUrls = [
    `https://animesalt.cx/episode/${slug}-${season}x${episode}/`,
    `https://animesalt.cx/episode/${slug}-episode-${episode}/`,
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://animesalt.cx/',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const html = await res.text();
      const streams: AnimeStreamSource[] = [];
      const languages: string[] = [];

      // Pattern 1: player.php?data=BASE64
      const dataParamMatch = html.match(/player\.php\?data=([A-Za-z0-9+/=%]+)/);
      if (dataParamMatch) {
        try {
          const rawB64 = decodeURIComponent(dataParamMatch[1]);
          const decodedJson = Buffer.from(rawB64, 'base64').toString('utf8');
          const parsed: AnimeSaltPlayerData[] = JSON.parse(decodedJson);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (!item || !item.link) continue;
              const langRaw = String(item.language || '').trim();
              const langLower = langRaw.toLowerCase();
              const isHindi = langLower.includes('hindi') || langLower.includes('hin');
              const isEnglish = langLower.includes('english') || langLower.includes('eng');
              const isTamil = langLower.includes('tamil') || langLower.includes('tam');
              const isTelugu = langLower.includes('telugu') || langLower.includes('tel');
              const isKannada = langLower.includes('kannada') || langLower.includes('kan');
              const isMalayalam = langLower.includes('malayalam') || langLower.includes('mal');
              const isJapanese = langLower.includes('japanese') || langLower.includes('jap') || langLower.includes('sub');

              const langCode = isHindi
                ? 'hi'
                : isEnglish
                ? 'en'
                : isTamil
                ? 'ta'
                : isTelugu
                ? 'te'
                : isKannada
                ? 'kn'
                : isMalayalam
                ? 'ml'
                : 'ja';

              languages.push(langCode);

              streams.push({
                id: `animesalt-${langCode}-${streams.length}`,
                provider: 'animesalt',
                url: item.link.replace(/\\\//g, '/'),
                quality: '1080p',
                label: `AnimeSalt | ${langRaw} (${isJapanese ? 'Sub' : 'Dub'})`,
                type: 'hls',
                audioLang: langCode,
                audioLabel: `${langRaw} ${isJapanese ? '(Sub)' : '(Dub)'}`,
                isSub: isJapanese,
                isDub: !isJapanese,
              });
            }
          }
        } catch {
          // ignore parse error
        }
      }

      // Pattern 2: iframe embeds
      const iframeMatches = Array.from(html.matchAll(/<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi));
      for (const m of iframeMatches) {
        const src = m[1];
        if (src && !src.includes('player.php') && src.startsWith('http')) {
          streams.push({
            id: `animesalt-embed-${streams.length}`,
            provider: 'animesalt-embed',
            url: src,
            quality: 'HD',
            label: 'AnimeSalt Player Stream',
            type: 'hls',
            audioLang: 'ja',
            audioLabel: 'Japanese (Sub)',
            isSub: true,
            isDub: false,
          });
        }
      }

      if (streams.length > 0) {
        return { sources: streams, languages };
      }
    } catch {
      // try next candidate URL
    }
  }

  return { sources: [], languages: [] };
}

export const ANIME_LANG_LABELS: Record<string, string> = {
  ja: 'Japanese (Sub)',
  en: 'English (Dub)',
  hi: 'Hindi (Dub)',
  ta: 'Tamil (Dub)',
  te: 'Telugu (Dub)',
  kn: 'Kannada (Dub)',
  ml: 'Malayalam (Dub)',
  bn: 'Bengali (Dub)',
  id: 'Indonesian (Dub)',
  tl: 'Tagalog (Dub)',
  es: 'Spanish (Dub)',
  esla: 'Spanish LA (Dub)',
  fr: 'French (Dub)',
  de: 'German (Dub)',
  pt: 'Portuguese (Dub)',
  ptbr: 'Portuguese BR (Dub)',
  ru: 'Russian (Dub)',
};

/**
 * Dynamically builds genuine available audio tracks strictly from verified sources
 */
export function buildAvailableAudioTracks(sources: AnimeStreamSource[]): Array<{
  code: string;
  label: string;
  isSub: boolean;
  isDub: boolean;
}> {
  const detectedLangs = new Set<string>();
  for (const s of sources) {
    if (s.audioLang) {
      detectedLangs.add(s.audioLang.toLowerCase().trim());
    }
  }

  const availableAudioTracks: Array<{ code: string; label: string; isSub: boolean; isDub: boolean }> = [];
  // Japanese (Sub) is present if any Japanese/sub source exists or as primary default
  if (detectedLangs.has('ja') || sources.some((s) => s.isSub || s.audioLang === 'ja')) {
    availableAudioTracks.push({
      code: 'ja',
      label: 'Japanese (Sub)',
      isSub: true,
      isDub: false,
    });
  }

  // Include ONLY languages that genuinely exist in sources
  const priorityOrder = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'id', 'tl', 'es', 'esla', 'fr', 'de', 'pt', 'ptbr', 'ru'];
  for (const code of priorityOrder) {
    if (code !== 'ja' && detectedLangs.has(code)) {
      availableAudioTracks.push({
        code,
        label: ANIME_LANG_LABELS[code] || `${code.toUpperCase()} (Dub)`,
        isSub: false,
        isDub: true,
      });
    }
  }
  for (const code of detectedLangs) {
    if (code !== 'ja' && !priorityOrder.includes(code)) {
      availableAudioTracks.push({
        code,
        label: ANIME_LANG_LABELS[code] || `${code.toUpperCase()} (Dub)`,
        isSub: false,
        isDub: true,
      });
    }
  }

  if (availableAudioTracks.length === 0) {
    availableAudioTracks.push({
      code: 'ja',
      label: 'Japanese (Sub)',
      isSub: true,
      isDub: false,
    });
  }

  return availableAudioTracks;
}

/**
 * Main Anime Player source resolver
 */
export async function resolveAnimeContent(params: {
  tmdbId: string | number;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  preferredAudio?: string;
}, deps: {
  fetchTmdbDetailsWithFallback: FetchTmdbDetailsFn;
  resolveForServer: ResolveServerFn;
}): Promise<AnimeResolveResponse> {
  const { fetchTmdbDetailsWithFallback, resolveForServer } = deps;
  const { tmdbId, season = 1, episode = 1, preferredAudio = 'ja' } = params;
  const cleanId = String(tmdbId || '').trim();
  const explicitType = params.mediaType === 'movie' ? 'movie' : 'tv';

  // 1. Fetch & Validate TMDB Anime Metadata
  let details = await fetchTmdbDetailsWithFallback(explicitType, cleanId);
  if (!details || (!details.title && !details.name)) {
    const fallbackMeta = getMediaByTmdbId(explicitType, cleanId);
    if (fallbackMeta) {
      details = {
        id: Number(cleanId),
        title: fallbackMeta.title,
        name: fallbackMeta.title,
        original_language: 'ja',
        genres: fallbackMeta.genres.map((g, i) => ({ id: i === 0 ? 16 : i + 1, name: g })),
        release_date: `${fallbackMeta.releaseYear}-01-01`,
        overview: fallbackMeta.overview,
      };
    }
  }

  let validation = validateAnimeTmdbMetadata(details, explicitType);
  if (!validation.isValidAnime) {
    const altType: 'movie' | 'tv' = explicitType === 'movie' ? 'tv' : 'movie';
    const altDetails = await fetchTmdbDetailsWithFallback(altType, cleanId);
    if (altDetails && (altDetails.title || altDetails.name)) {
      const altValidation = validateAnimeTmdbMetadata(altDetails, altType);
      if (altValidation.isValidAnime) {
        validation = altValidation;
      }
    }
  }

  if (!validation.isValidAnime) {
    return {
      success: false,
      tmdbId: Number(cleanId),
      title: validation.title || `TMDB #${cleanId}`,
      mediaType: validation.mediaType,
      season,
      episode,
      sources: [],
      subtitles: [],
      availableAudioTracks: [],
      error: validation.rejectionReason || 'Content is not valid anime.',
    };
  }

  const mediaType = validation.mediaType;
  const animeTitle = validation.title || validation.romajiTitle || `Anime #${cleanId}`;
  const releaseYear = validation.year || '2020';
  const date = validation.releaseDate || `${releaseYear}-01-01`;
  const imdbId = validation.imdbId || '';

  // 2. Concurrently resolve AnimeSalt reference sources & fast multi-audio verified CDNs
  const startTime = Date.now();
  const allSources: AnimeStreamSource[] = [];
  const discoveredLangs = new Set<string>(['ja']);

  // Launch AnimeSalt search and scrape in background with a strict 400ms cap so it never stalls playback
  const animeSaltPromise = Promise.race([
    (async () => {
      try {
        const slug = await findAnimeSaltSeriesSlug(animeTitle);
        if (slug) {
          const saltResult = await scrapeAnimeSaltSources(slug, season, episode);
          for (const lang of saltResult.languages) {
            discoveredLangs.add(lang);
          }
          return saltResult.sources;
        }
      } catch {
        // ignore
      }
      return [] as AnimeStreamSource[];
    })(),
    new Promise<AnimeStreamSource[]>((resolve) => setTimeout(() => resolve([]), 400)),
  ]);

  let orionOrigResponse: any = null;

  // Fast concurrent query across verified anime stream providers including Vegamovies, Alatreon, Ursa, Atlas, Orion, Valstrax
  const providersToRace = ['vegamovies', 'alatreon', 'ursa', 'atlas', 'orion', 'valstrax'];
  const providerPromises = providersToRace.map(async (provider) => {
    try {
      const resolved = await Promise.race([
        resolveForServer(provider, {
          mediaType,
          tmdbId: cleanId,
          season,
          episode,
          title: animeTitle,
          releaseYear,
          date,
          imdbId,
          dubCode: '',
          dubType: '0',
        }),
        new Promise<any>((r) => setTimeout(() => r(null), 2000)),
      ]);

      if (provider === 'orion' && resolved) {
        orionOrigResponse = resolved;
      }

      if (resolved && resolved.success && Array.isArray(resolved.links)) {
        const nonHevc = resolved.links.filter((l: any) => l?.link && !l.onlyHevc);
        const playable = nonHevc.length > 0 ? nonHevc : resolved.links.filter((l: any) => l?.link);
        return playable.map((l: any, idx: number): AnimeStreamSource => {
          const isDash = l.type === 'dash' || l.type === 'andromeda';
          const linkLang = String(l.lang || '').toLowerCase().trim();
          const isJapanese = !linkLang || linkLang === 'ja' || linkLang === 'jp' || linkLang === 'orig';
          const audioLang = isJapanese ? 'ja' : linkLang;
          const qual = l.quality || '1080p';
          const audioLabel =
            ANIME_LANG_LABELS[audioLang] ||
            (isJapanese ? 'Japanese (Original)' : `${audioLang.toUpperCase()} (Dub)`);
          return {
            id: `${provider}-${idx}`,
            provider,
            url: l.link,
            quality: qual.includes('p') ? qual : `${qual}p`,
            label: l.label || `${provider.toUpperCase()} | ${qual} | ${audioLabel}`,
            type: isDash ? 'dash' : 'hls',
            audioLang,
            audioLabel,
            isSub: isJapanese,
            isDub: !isJapanese,
            onlyHevc: Boolean(l.onlyHevc),
            audioStreamKey: l.audioStreamKey || resolved.audioStreamKey || '',
          };
        });
      }
    } catch {
      // ignore provider error
    }
    return [];
  });

  const [providerResults, saltSources] = await Promise.all([
    Promise.all(providerPromises),
    animeSaltPromise,
  ]);

  for (const list of providerResults) {
    allSources.push(...list);
  }

  // Query Orion dub streams only if Orion actually returned an active dub list or if preferred audio is requested and Orion is alive
  const cleanPref = (preferredAudio || 'ja').trim().toLowerCase();
  const rawDubResults: any[] = [];
  if (orionOrigResponse && orionOrigResponse.success && Array.isArray(orionOrigResponse.dubs) && orionOrigResponse.dubs.length > 0) {
    const dubLanguagesToQuery = Array.from(
      new Set(['hi', 'en', ...(cleanPref && cleanPref !== 'ja' ? [cleanPref] : [])])
    );
    const dubItems = await Promise.all(
      dubLanguagesToQuery.map(async (dubLang) => {
        try {
          const orionDub = await Promise.race([
            resolveForServer('orion', {
              mediaType,
              tmdbId: cleanId,
              season,
              episode,
              title: animeTitle,
              releaseYear,
              date,
              imdbId,
              dubCode: dubLang,
              dubType: '0',
            }),
            new Promise<any>((r) => setTimeout(() => r(null), 1000)),
          ]);
          if (orionDub && orionDub.success) {
            const link = orionDub.dubAudioUrl || orionDub.link || orionDub.links?.[0]?.link;
            if (link) {
              return {
                dubLang,
                link,
                audioStreamKey: orionDub.audioStreamKey || orionDub.links?.[0]?.audioStreamKey || '',
                onlyHevc: Boolean(orionDub.links?.[0]?.onlyHevc ?? true),
                dubs: orionDub.dubs,
              };
            }
          }
        } catch {}
        return null;
      })
    );
    rawDubResults.push(...dubItems.filter(Boolean));
  }

  // If no sources resolved yet and this is TV Season > 1, try absolute episode numbering fallback
  if (allSources.length === 0 && mediaType === 'tv' && Number(season) > 1) {
    let cumulativeEp = Number(episode);
    const spec = SERIES_TIMING_REGISTRY[cleanId];
    if (spec?.seasons) {
      for (let s = 1; s < Number(season); s++) {
        cumulativeEp += (spec.seasons[s] || 0);
      }
    }
    if (cumulativeEp !== Number(episode)) {
      const altFallbackProviders = ['vegamovies', 'alatreon', 'atlas'];
      const altResults = await Promise.all(
        altFallbackProviders.map(async (provider) => {
          try {
            const resolved = await resolveForServer(provider, {
              mediaType: 'tv',
              tmdbId: cleanId,
              season: 1,
              episode: cumulativeEp,
              title: animeTitle,
              releaseYear,
              date,
              imdbId,
              dubCode: '',
              dubType: '0',
            });
            if (resolved && resolved.success && Array.isArray(resolved.links)) {
              const nonHevc = resolved.links.filter((l: any) => l?.link && !l.onlyHevc);
              const playable = nonHevc.length > 0 ? nonHevc : resolved.links.filter((l: any) => l?.link);
              return playable.map((l: any, idx: number): AnimeStreamSource => {
                const isDash = l.type === 'dash' || l.type === 'andromeda';
                const linkLang = String(l.lang || '').toLowerCase().trim();
                const isJapanese = !linkLang || linkLang === 'ja' || linkLang === 'jp' || linkLang === 'orig';
                const audioLang = isJapanese ? 'ja' : linkLang;
                const qual = l.quality || '1080p';
                const audioLabel =
                  ANIME_LANG_LABELS[audioLang] ||
                  (isJapanese ? 'Japanese (Original)' : `${audioLang.toUpperCase()} (Dub)`);
                return {
                  id: `${provider}-abs-${idx}`,
                  provider,
                  url: l.link,
                  quality: qual.includes('p') ? qual : `${qual}p`,
                  label: l.label || `${provider.toUpperCase()} | Ep ${cumulativeEp} | ${qual} | ${audioLabel}`,
                  type: isDash ? 'dash' : 'hls',
                  audioLang,
                  audioLabel,
                  isSub: isJapanese,
                  isDub: !isJapanese,
                  onlyHevc: Boolean(l.onlyHevc),
                  audioStreamKey: l.audioStreamKey || resolved.audioStreamKey || '',
                };
              });
            }
          } catch {}
          return [];
        })
      );
      for (const list of altResults) {
        allSources.push(...list);
      }
    }
  }

  // Extract Orion's authoritative list of supported audio dubs (type === 0 && !original) and original audioStreamKey
  const origAudioStreamKey: string = orionOrigResponse?.audioStreamKey || '';
  const orionRawDubs: any[] =
    orionOrigResponse?.dubs ||
    rawDubResults.find((r) => Array.isArray(r?.dubs))?.dubs ||
    [];
  const orionVerifiedDubLangs =
    Array.isArray(orionRawDubs) && orionRawDubs.length > 0
      ? new Set(
          orionRawDubs
            .filter((d: any) => Number(d?.type ?? 0) === 0 && !d?.original)
            .map((d: any) => String(d?.lang || '').toLowerCase().trim())
            .filter(Boolean)
        )
      : null;

  for (const dubItem of rawDubResults) {
    if (!dubItem) continue;
    const { dubLang, link, audioStreamKey, onlyHevc } = dubItem;

    // 1. If Orion provided an explicit dubs list for this title, verify dubLang is genuinely listed as an audio dub
    if (orionVerifiedDubLangs && orionVerifiedDubLangs.size > 0 && !orionVerifiedDubLangs.has(dubLang)) {
      continue;
    }

    // 2. Verify the dub stream's audio initialization path is NOT a fallback copy of the original Japanese stream
    if (origAudioStreamKey && audioStreamKey && audioStreamKey === origAudioStreamKey) {
      continue;
    }

    const langLabel = ANIME_LANG_LABELS[dubLang] || `${dubLang.toUpperCase()} (Dub)`;
    allSources.push({
      id: `orion-dub-${dubLang}`,
      provider: 'orion',
      url: link,
      quality: '1080p',
      label: `Orion | ${langLabel}`,
      type: 'dash',
      audioLang: dubLang,
      audioLabel: langLabel,
      isSub: false,
      isDub: true,
      onlyHevc,
      audioStreamKey,
    });
  }

  for (const s of saltSources) {
    allSources.push(s);
  }

  // Build audio tracks metadata dynamically based on actual playable sources
  const availableAudioTracks = buildAvailableAudioTracks(allSources);

  // English & Spanish subtitles for anime
  const subtitles = [
    {
      id: 'sub-en',
      language: 'English',
      url: `https://zxcstream.cc/backend/subtitles/${mediaType}/${cleanId}?lang=en`,
    },
  ];

  const durationMs = Date.now() - startTime;

  if (allSources.length === 0) {
    return {
      success: false,
      tmdbId: Number(cleanId),
      title: animeTitle,
      mediaType,
      season,
      episode,
      sources: [],
      subtitles,
      availableAudioTracks,
      error: `No authorized playback streams available for "${animeTitle}" S${season}E${episode}.`,
      diagnostics: {
        durationMs,
        sourcesCount: 0,
      },
    };
  }

  return {
    success: true,
    tmdbId: Number(cleanId),
    title: animeTitle,
    mediaType,
    season,
    episode,
    sources: allSources,
    subtitles,
    availableAudioTracks,
    diagnostics: {
      resolvedProvider: allSources[0]?.provider,
      durationMs,
      sourcesCount: allSources.length,
    },
  };
}
