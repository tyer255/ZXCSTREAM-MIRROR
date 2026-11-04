/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimeValidationResult {
  isValidAnime: boolean;
  isAnime: boolean;
  mediaType: 'tv' | 'movie';
  tmdbId: number;
  title: string;
  romajiTitle?: string;
  englishTitle?: string;
  japaneseTitle?: string;
  year?: string;
  releaseDate?: string;
  genres: string[];
  genreIds: number[];
  originalLanguage: string;
  originCountry: string[];
  overview?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  backdropPaths?: string[];
  logoPath?: string | null;
  logoPaths?: string[];
  totalSeasons?: number;
  totalEpisodes?: number;
  seasons?: Array<{
    seasonNumber: number;
    name: string;
    episodeCount: number;
    airDate?: string | null;
    posterPath?: string | null;
  }>;
  imdbId?: string;
  rejectionReason?: string;
  classifiedCategory?: 'Anime TV' | 'Anime Movie' | 'Live-Action TV' | 'Hollywood/Live-Action Movie' | 'Western Animation';
}

const ANIMATION_GENRE_ID = 16;
const ANIMATION_GENRE_NAME = 'animation';

const ANIME_LANGUAGE_CODES = new Set(['ja', 'jpn']);
const ANIME_COUNTRY_CODES = new Set(['JP', 'JPN', 'JAPAN']);

const ANIME_KEYWORDS = [
  'anime',
  'manga',
  'based on manga',
  'light novel',
  'based on light novel',
  'shounen',
  'seinen',
  'shoujo',
  'josei',
  'isekai',
  'mecha',
  'otaku',
];

/**
 * Validates whether raw TMDB metadata represents an authentic Anime movie or series.
 * Strictly blocks live-action Hollywood/Bollywood movies, Western cartoons, and normal live-action TV.
 */
export function validateAnimeTmdbMetadata(raw: any, explicitType?: 'movie' | 'tv'): AnimeValidationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: explicitType || 'tv',
      tmdbId: 0,
      title: 'Unknown Title',
      genres: [],
      genreIds: [],
      originalLanguage: '',
      originCountry: [],
      rejectionReason: 'Invalid or missing TMDB metadata.',
      classifiedCategory: 'Hollywood/Live-Action Movie',
    };
  }

  const tmdbId = Number(raw.id || raw.tmdbId || 0);
  const title = String(raw.name || raw.title || raw.original_name || raw.original_title || `TMDB #${tmdbId}`).trim();

  const originCountry: string[] = Array.isArray(raw.origin_country)
    ? raw.origin_country.map((c: any) => String(c).trim().toUpperCase())
    : Array.isArray(raw.production_countries)
    ? raw.production_countries.map((c: any) => String(c?.iso_3166_1 || c?.name || '').trim().toUpperCase())
    : Array.isArray(raw.country)
    ? raw.country.map((c: any) => String(c).trim().toUpperCase())
    : typeof raw.country === 'string' && raw.country.trim()
    ? raw.country
        .split(',')
        .map((c: string) => c.trim().toUpperCase())
        .filter(Boolean)
    : [];

  const isJapanOrigin = originCountry.some((c) => ANIME_COUNTRY_CODES.has(c));
  const rawOriginalLang = String(raw.original_language || '').trim().toLowerCase();
  const originalLanguage = rawOriginalLang || (isJapanOrigin ? 'ja' : '');

  const rawGenres = Array.isArray(raw.genres) ? raw.genres : [];
  const genres: string[] = rawGenres.map((g: any) => typeof g === 'string' ? g : String(g?.name || '')).filter(Boolean);
  const genreIds: number[] = rawGenres.map((g: any) => typeof g?.id === 'number' ? g.id : 0).filter((id: number) => id > 0);

  const resolvedMediaType: 'tv' | 'movie' =
    explicitType === 'tv' || explicitType === 'movie'
      ? explicitType
      : raw.resolvedMediaType === 'movie' ||
        raw.media_type === 'movie' ||
        (Boolean(raw.title) && !raw.name && !raw.seasons)
      ? 'movie'
      : 'tv';

  const hasAnimationGenre =
    genreIds.includes(ANIMATION_GENRE_ID) ||
    genres.some((g) => g.toLowerCase() === ANIMATION_GENRE_NAME);

  const isJapaneseLanguage = ANIME_LANGUAGE_CODES.has(originalLanguage);

  // Inspect keywords for anime / manga tags if provided
  const rawKeywords = Array.isArray(raw.keywords?.keywords)
    ? raw.keywords.keywords
    : Array.isArray(raw.keywords?.results)
    ? raw.keywords.results
    : Array.isArray(raw.keywords)
    ? raw.keywords
    : [];
  const keywordsList = rawKeywords.map((k: any) => String(k?.name || k || '').toLowerCase());
  const hasAnimeKeyword = keywordsList.some((k: string) =>
    ANIME_KEYWORDS.some((target) => k.includes(target))
  );

  const releaseDate = String(raw.release_date || raw.first_air_date || '');
  const year = releaseDate ? releaseDate.slice(0, 4) : '';

  const posterPath = raw.poster_path
    ? raw.poster_path.startsWith('http')
      ? raw.poster_path
      : `https://image.tmdb.org/t/p/w500${raw.poster_path.startsWith('/') ? raw.poster_path : `/${raw.poster_path}`}`
    : null;
  const backdropPaths: string[] = Array.isArray(raw.backdrop_paths)
    ? raw.backdrop_paths
        .filter((p: any) => typeof p === 'string' && p.trim().length > 0)
        .map((p: string) => (p.startsWith('http') ? p : `https://image.tmdb.org/t/p/w1280${p.startsWith('/') ? p : `/${p}`}`))
    : typeof raw.backdrop_path === 'string' && raw.backdrop_path.trim()
    ? [
        raw.backdrop_path.startsWith('http')
          ? raw.backdrop_path
          : `https://image.tmdb.org/t/p/w1280${raw.backdrop_path.startsWith('/') ? raw.backdrop_path : `/${raw.backdrop_path}`}`,
      ]
    : [];
  const backdropPath = backdropPaths[0] || null;

  const logoPaths: string[] = Array.isArray(raw.logo_paths)
    ? raw.logo_paths
        .filter((p: any) => typeof p === 'string' && p.trim().length > 0)
        .map((p: string) => (p.startsWith('http') ? p : `https://image.tmdb.org/t/p/w780${p.startsWith('/') ? p : `/${p}`}`))
    : typeof raw.logo_path === 'string' && raw.logo_path.trim()
    ? [
        raw.logo_path.startsWith('http')
          ? raw.logo_path
          : `https://image.tmdb.org/t/p/w780${raw.logo_path.startsWith('/') ? raw.logo_path : `/${raw.logo_path}`}`,
      ]
    : [];
  const logoPath = logoPaths[0] || null;

  const seasonsList = Array.isArray(raw.seasons)
    ? raw.seasons
        .filter((s: any) => typeof s.season_number === 'number' && s.season_number > 0)
        .map((s: any) => ({
          seasonNumber: s.season_number,
          name: s.name || `Season ${s.season_number}`,
          episodeCount: Number(s.episode_count || 0),
          airDate: s.air_date || null,
          posterPath: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null,
        }))
    : [];

  // Known Anime TMDB catalog fallback matches (for classic films or series where origin_country is undefined in lightweight cache)
  const isKnownAnimeId =
    tmdbId === 128 || // Princess Mononoke
    tmdbId === 372058 || // Your Name
    tmdbId === 85937 || // Demon Slayer
    tmdbId === 1429 || // Attack on Titan
    tmdbId === 37854 || // One Piece
    tmdbId === 30984 || // Bleach
    tmdbId === 95479 || // Jujutsu Kaisen
    tmdbId === 88040 || // Chainsaw Man
    tmdbId === 60735 || // Seven Deadly Sins
    tmdbId === 92685 || // Vinland Saga
    tmdbId === 493529 || // Dungeon Meshi
    tmdbId === 129 || // Spirited Away
    tmdbId === 4935 || // Howl's Moving Castle
    tmdbId === 317442; // The Boy and the Beast

  // Classification checks:
  // Case 1: Not animated at all -> Block immediately (Live action Hollywood/Bollywood or live-action TV series like House of the Dragon 94997)
  if (!hasAnimationGenre && !isKnownAnimeId) {
    const category = resolvedMediaType === 'tv' ? 'Live-Action TV' : 'Hollywood/Live-Action Movie';
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: resolvedMediaType,
      tmdbId,
      title,
      genres,
      genreIds,
      originalLanguage,
      originCountry,
      overview: raw.overview,
      posterPath,
      backdropPath,
      backdropPaths,
      logoPath,
      logoPaths,
      rejectionReason: `"${title}" is a ${category}. Anime Core is exclusively dedicated to Anime content.`,
      classifiedCategory: category,
    };
  }

  // Case 2: Animation genre present, but Western cartoon (e.g. Despicable Me 4, Shrek, Toy Story, The Simpsons)
  // Animation from US/Europe with English/Spanish/French original language and no Japan connection
  if (hasAnimationGenre && !isJapaneseLanguage && !isJapanOrigin && !hasAnimeKeyword && !isKnownAnimeId) {
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: resolvedMediaType,
      tmdbId,
      title,
      genres,
      genreIds,
      originalLanguage,
      originCountry,
      overview: raw.overview,
      posterPath,
      backdropPath,
      backdropPaths,
      logoPath,
      logoPaths,
      rejectionReason: `"${title}" is Western Animation (${originalLanguage.toUpperCase()}). Anime Core exclusively plays Japanese Anime.`,
      classifiedCategory: 'Western Animation',
    };
  }

  // Valid Anime!
  const classifiedCategory = resolvedMediaType === 'movie' ? 'Anime Movie' : 'Anime TV';
  return {
    isValidAnime: true,
    isAnime: true,
    mediaType: resolvedMediaType,
    tmdbId,
    title,
    romajiTitle: raw.original_name || raw.original_title || title,
    englishTitle: raw.title || raw.name || title,
    japaneseTitle: raw.original_name || raw.original_title || undefined,
    year,
    releaseDate,
    genres,
    genreIds,
    originalLanguage: originalLanguage || 'ja',
    originCountry: originCountry.length > 0 ? originCountry : ['JP'],
    overview: raw.overview,
    posterPath,
    backdropPath,
    backdropPaths,
    logoPath,
    logoPaths,
    totalSeasons: seasonsList.length > 0 ? seasonsList.length : Number(raw.number_of_seasons || 1),
    totalEpisodes: Number(raw.number_of_episodes || (seasonsList.length > 0 ? seasonsList.reduce((acc: number, s: { episodeCount: number }) => acc + s.episodeCount, 0) : 1)),
    seasons: seasonsList,
    imdbId: raw.imdb_id ? String(raw.imdb_id) : undefined,
    classifiedCategory,
  };
}

/**
 * Client helper to validate TMDB ID against /api/anime/validate/:tmdbId
 */
export async function fetchAnimeValidation(
  tmdbId: string | number,
  mediaType?: 'movie' | 'tv',
  signal?: AbortSignal
): Promise<AnimeValidationResult> {
  const cleanId = String(tmdbId || '').trim();
  if (!cleanId || !/^\d+$/.test(cleanId)) {
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: mediaType || 'tv',
      tmdbId: 0,
      title: 'Invalid ID',
      genres: [],
      genreIds: [],
      originalLanguage: '',
      originCountry: [],
      rejectionReason: 'Invalid TMDB ID. A numeric ID is required.',
      classifiedCategory: 'Hollywood/Live-Action Movie',
    };
  }

  try {
    const qs = mediaType ? `?type=${encodeURIComponent(mediaType)}` : '';
    const res = await fetch(`/api/anime/validate/${encodeURIComponent(cleanId)}${qs}`, { signal });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        isValidAnime: false,
        isAnime: false,
        mediaType: mediaType || 'tv',
        tmdbId: Number(cleanId),
        title: errJson.title || `TMDB #${cleanId}`,
        genres: errJson.genres || [],
        genreIds: [],
        originalLanguage: errJson.originalLanguage || '',
        originCountry: [],
        rejectionReason: errJson.error || errJson.rejectionReason || 'Content verification failed.',
        classifiedCategory: errJson.classifiedCategory || 'Live-Action TV',
      };
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    if (signal?.aborted) throw err;
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: mediaType || 'tv',
      tmdbId: Number(cleanId),
      title: `TMDB #${cleanId}`,
      genres: [],
      genreIds: [],
      originalLanguage: '',
      originCountry: [],
      rejectionReason: 'Network error verifying anime metadata.',
      classifiedCategory: 'Live-Action TV',
    };
  }
}
