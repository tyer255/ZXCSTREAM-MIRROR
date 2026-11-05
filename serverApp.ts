import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import CryptoJS from 'crypto-js';
import {
  getCatalogSeasonEpisodes,
  getEpisodeTimingMetadata,
  getSeriesImdbId,
  getSeriesTvdbId,
  getMediaByTmdbId,
} from './src/data/tmdbCatalog.js';
import {
  normalizeIntervalSeconds,
  MediaType,
  RawOrionDub,
  NXSHA_SERVERS,
  detectAllStreamLanguages,
  detectSingleStreamLanguage,
  inspectAndSelectMpegTsAudioTrack,
  normalizeSubtitleTracks,
} from './src/utils/urlBuilder.js';
import {
  ALLOWED_NXSHA_PROVIDERS,
  isAuthorizedNxshaProvider,
  isDeadNxshaSourceUrl,
  isTrustedNxshaMediaUrl,
  validatePlayableNxshaSource,
  raceNxshaProviders,
} from './src/utils/nxshaDiscovery.js';
import { validateAnimeTmdbMetadata } from './src/anime/AnimeMetadata.js';
import { resolveAnimeContent } from './src/anime/AnimeServerResolver.js';
import {
  VEGAMOVIES_BASE_URL,
  parseVegaSearchHtml,
  resolveVegaMoviesDirect,
  VegaResolvedSource,
  VegaSearchCard,
} from './src/utils/vegamoviesResolver.js';

const app = express();

// Enable CORS for all origins (especially useful for Vercel deployments and custom domains)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Normalize Vercel rewritten paths so /api routes work seamlessly on Vercel deployments
app.use((req, _res, next) => {
  try {
    const rawUrl = req.url || '/';
    const parsed = new URL(rawUrl, 'http://localhost');
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    const isEntrypointPath =
      pathname === '/' ||
      pathname === '/index' ||
      pathname === '/api' ||
      pathname === '/api/index' ||
      pathname === '/api/index.js' ||
      pathname === '/api/index.ts' ||
      pathname === '/api/[...all]' ||
      pathname === '/api/%5B...all%5D';

    const rewrittenPath = parsed.searchParams.get('__path');
    if (rewrittenPath) {
      parsed.searchParams.delete('__path');
      const cleanSub = rewrittenPath.replace(/^\/+/, '');
      const qs = parsed.searchParams.toString();
      if (isEntrypointPath) {
        req.url = `/api/${cleanSub}${qs ? `?${qs}` : ''}`;
      } else {
        req.url = `${parsed.pathname}${qs ? `?${qs}` : ''}`;
      }
    } else if (isEntrypointPath) {
      const originalUri = (req.headers['x-forwarded-uri'] || req.headers['x-original-uri']) as
        | string
        | undefined;
      if (originalUri && originalUri.startsWith('/api')) {
        req.url = originalUri;
      }
    }
  } catch {
    // Keep original req.url on parse failure
  }
  next();
});

let CURRENT_TOKEN_ENDPOINT = '/backend/getthefuckoutniiguh';

let FIELD_MAP: Record<string, string> = {
  id: 'a7f39c821d604e5b91e57b',
  fToken: 'e83c4b719a5210579c1635a',
  ts: '61d9a5274c8e3b2f38291e6',
  token: 'c492f7a183d01e36c538a716d',
  title: '5e28c9147a06de29f3674b392a1',
  year: 'b731e6c94f867f8341c306e',
  season: 'd8427b5c382f957c3613e85b',
  episode: '91c6ea75d1f785c92346b713d',
  imdbId: 'f35a8194265e871c4933a725f',
  path: '6b491e258392e7561a9384c',
  mediaType: 'c81306d28147a35632e816b',
  date: 'e16493139e5814b3027',
  latestDate: 'e953416ad739e5814b3027',
};

let lastFieldMapDiscoveryAt = 0;
let fieldMapDiscoveryPromise: Promise<boolean> | null = null;

async function refreshFieldMapFromUpstream(): Promise<boolean> {
  const now = Date.now();
  if (now - lastFieldMapDiscoveryAt < 60_000) return false;
  if (fieldMapDiscoveryPromise) return fieldMapDiscoveryPromise;

  fieldMapDiscoveryPromise = (async () => {
    try {
      lastFieldMapDiscoveryAt = Date.now();
      const pageRes = await fetch('https://zxcstream.cc/player/movie/128', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (!pageRes.ok) return false;
      const html = await pageRes.text();
      const chunkMatches = Array.from(
        new Set(html.match(/\/_next\/static\/chunks\/[a-zA-Z0-9_.~-]+\.js/g) || [])
      );
      for (const chunkPath of chunkMatches) {
        try {
          const chunkRes = await fetch(`https://zxcstream.cc${chunkPath}`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            },
          });
          if (!chunkRes.ok) continue;
          const js = await chunkRes.text();

          // Dynamically detect any updated token endpoint (e.g. /backend/getthefuckoutniiguh or future rotations)
          const postMatch = js.match(/post\(["'](\/backend\/[a-zA-Z0-9_~-]+)["']/);
          if (postMatch && postMatch[1]) {
            CURRENT_TOKEN_ENDPOINT = postMatch[1];
          }

          if (!js.includes('generateFrontendToken') && !js.includes('latestDate:') && !js.includes('FIELD_MAP')) continue;

          // Robust, key-order-independent FIELD_MAP extractor
          const extractField = (key: string) => {
            const m = js.match(new RegExp(`${key}:"([a-f0-9]+)"`));
            return m ? m[1] : null;
          };

          const id = extractField('id');
          const fToken = extractField('fToken');
          const ts = extractField('ts');
          const token = extractField('token');
          const title = extractField('title');
          const year = extractField('year');
          const season = extractField('season');
          const episode = extractField('episode');
          const imdbId = extractField('imdbId');
          const path = extractField('path');
          const mediaType = extractField('mediaType');
          const date = extractField('date');
          const latestDate = extractField('latestDate');

          if (id && ts && token && path && mediaType) {
            FIELD_MAP = {
              id,
              fToken: fToken || FIELD_MAP.fToken,
              ts,
              token,
              title: title || FIELD_MAP.title,
              year: year || FIELD_MAP.year,
              season: season || FIELD_MAP.season,
              episode: episode || FIELD_MAP.episode,
              imdbId: imdbId || FIELD_MAP.imdbId,
              path,
              mediaType,
              date: date || FIELD_MAP.date,
              latestDate: latestDate || FIELD_MAP.latestDate,
            };
            return true;
          }
        } catch {
          // continue next chunk
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      fieldMapDiscoveryPromise = null;
    }
  })();

  return fieldMapDiscoveryPromise;
}

const DECRYPTION_KEY = '7f4c9e2a81d63b05c4f7a9e8126d3b50e1a8c7f23d9465ab0c6e9f1d4a7b832c';

function decryptCryptoJS(cipherBase64: string, passphrase: string): string {
  try {
    const buf = Buffer.from(cipherBase64, 'base64');
    if (buf.subarray(0, 8).toString('utf8') !== 'Salted__') return cipherBase64;
    const salt = buf.subarray(8, 16);
    const ciphertext = buf.subarray(16);

    let keyIv = Buffer.alloc(0);
    let prev = Buffer.alloc(0);
    while (keyIv.length < 48) {
      prev = crypto
        .createHash('md5')
        .update(Buffer.concat([prev, Buffer.from(passphrase, 'utf8'), salt]))
        .digest();
      keyIv = Buffer.concat([keyIv, prev]);
    }
    const key = keyIv.subarray(0, 32);
    const iv = keyIv.subarray(32, 48);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return cipherBase64;
  }
}

const COMMON_HEADERS = {
  Referer: 'https://zxcstream.cc/',
  Origin: 'https://zxcstream.cc',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
};

const tmdbImdbCache = new Map<string, string>();

async function fetchTmdbDetailsWithFallback(mediaType: string, tmdbId: string, language = 'en-US') {
  const tryTypeOnHost = async (host: string, type: string) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(
        `${host}/backend/tmdb/details/${encodeURIComponent(type)}/${encodeURIComponent(tmdbId)}?language=${encodeURIComponent(language)}`,
        {
          headers: {
            ...COMMON_HEADERS,
            Origin: host,
            Referer: `${host}/player/${type}/${tmdbId}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.data || data;
      if (!raw || (!raw.title && !raw.name && !raw.id)) return null;
      if (raw.imdb_id) {
        tmdbImdbCache.set(String(tmdbId).trim(), String(raw.imdb_id).trim());
      }
      return { ...raw, resolvedMediaType: type };
    } catch {
      return null;
    }
  };

  const tryType = async (type: string) => {
    return await tryTypeOnHost('https://zxcstream.cc', type);
  };

  const primary = await tryType(mediaType);
  if (primary) return primary;

  const altType = mediaType === 'movie' ? 'tv' : 'movie';
  return await tryType(altType);
}

// Short-lived in-memory cache for verified DASH MPD XML manifests so /api/stream/mpd-audio
// can serve the audio-only MPD immediately without a second round-trip to vidstuck.cc.
const mpdManifestCache = new Map<string, { xml: string; expiresAt: number }>();

function cacheMpdXml(url: string, xml: string) {
  const now = Date.now();
  if (mpdManifestCache.size > 120) {
    for (const [k, v] of mpdManifestCache.entries()) {
      if (v.expiresAt < now) mpdManifestCache.delete(k);
    }
    if (mpdManifestCache.size > 120) {
      const oldestKey = mpdManifestCache.keys().next().value;
      if (oldestKey) mpdManifestCache.delete(oldestKey);
    }
  }
  mpdManifestCache.set(url, { xml, expiresAt: now + 5 * 60 * 1000 });
}

function stripVideoFromMpd(mpdText: string): string {
  return mpdText
    .replace(/<AdaptationSet[^>]*contentType=["']video["'][\s\S]*?<\/AdaptationSet>/gi, '')
    .replace(/<AdaptationSet[^>]*mimeType=["']video\/[^"']*["'][\s\S]*?<\/AdaptationSet>/gi, '');
}

async function resolveForServer(
  targetServer: string,
  options: {
    mediaType: string;
    tmdbId: string;
    season?: number;
    episode?: number;
    title: string;
    releaseYear: string;
    date: string;
    imdbId?: string;
    lastAirDate?: string;
    dubCode?: string;
    dubType?: string;
  }
) {
  const {
    mediaType,
    tmdbId,
    season = 1,
    episode = 1,
    title,
    releaseYear,
    date,
    imdbId,
    lastAirDate,
    dubCode = '',
    dubType = '',
  } = options;

  if (targetServer === 'vegamovies') {
    const vegaRes = await resolveVegaMoviesCombined({
      tmdbId: String(tmdbId),
      mediaType: mediaType === 'tv' ? 'tv' : 'movie',
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      title,
      releaseYear,
      imdbId,
    });
    const links = vegaRes.sources.map((s) => ({
      link: s.url,
      type: s.type || (s.url.includes('.m3u8') ? 'hls' : s.url.includes('.mpd') ? 'dash' : 'hls'),
      quality: s.quality || '1080p',
      label: s.label || 'Vegamovies | 1080p FHD [Hindi-Eng]',
      lang: s.lang || 'hi',
      onlyHevc: false,
      hasAudio: true,
    }));
    const primary = links[0] || null;
    return {
      success: links.length > 0,
      server: 'vegamovies',
      links,
      link: primary?.link || null,
      type: primary?.type || 'hls',
      dubs: vegaRes.dubs,
      subtitles: vegaRes.subtitles,
      matchedPost: vegaRes.matchedPost,
      indStreamImdbId: vegaRes.indStreamImdbId,
    };
  }

  const queryProvider = async (
    baseHost: string,
    tokenEndpoint: string,
    sourcesPrefix: string,
    serverKey: string
  ) => {
    const refererUrl = `${baseHost}/player/${mediaType}/${tmdbId}${
      mediaType === 'tv' ? `/${season}/${episode}` : ''
    }`;

    let sourceData: any = null;
    let lastError = 'Request failed';

    const tokenEndpoints = Array.from(
      new Set([
        CURRENT_TOKEN_ENDPOINT,
        tokenEndpoint,
        '/backend/getthefuckoutniiguh',
        '/backend/wtfnigga',
        '/backend/fucku',
        '/backend/token',
      ])
    ).filter(Boolean);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const tokenBody: Record<string, any> = {
          [FIELD_MAP.id]: String(tmdbId),
          [FIELD_MAP.mediaType]: mediaType,
          [FIELD_MAP.path]: serverKey,
        };

        if (mediaType === 'tv') {
          tokenBody[FIELD_MAP.season] = Number(season) || 1;
          tokenBody[FIELD_MAP.episode] = Number(episode) || 1;
        }

        let tokenData: any = null;
        let tokenStatus = 0;

        for (const ep of tokenEndpoints) {
          try {
            const tokenController = new AbortController();
            const tokenTimer = setTimeout(() => tokenController.abort(), 3500);
            const tokenRes = await fetch(`${baseHost}${ep}`, {
              method: 'POST',
              headers: {
                ...COMMON_HEADERS,
                Origin: baseHost,
                Referer: refererUrl,
              },
              body: JSON.stringify(tokenBody),
              signal: tokenController.signal,
            });
            clearTimeout(tokenTimer);
            tokenStatus = tokenRes.status;
            if (tokenRes.ok) {
              const parsed = await tokenRes.json();
              if (parsed?.token) {
                tokenData = parsed;
                CURRENT_TOKEN_ENDPOINT = ep;
                break;
              }
            }
          } catch {
            // Try next token endpoint
          }
        }

        if (!tokenData || !tokenData.token) {
          lastError = tokenStatus ? `Token HTTP ${tokenStatus}` : 'Token failed';
          if (attempt === 0 && (tokenStatus === 400 || tokenStatus === 404 || !tokenData?.token)) {
            const refreshed = await refreshFieldMapFromUpstream();
            if (refreshed) continue;
          }
          if (attempt === 0 && (tokenStatus >= 500 || tokenStatus === 429)) {
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
          return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
        }

        const query = new URLSearchParams({
          [FIELD_MAP.id]: String(tmdbId),
          [FIELD_MAP.path]: serverKey,
          [FIELD_MAP.mediaType]: mediaType,
          [FIELD_MAP.ts]: String(tokenData.ts),
          [FIELD_MAP.token]: tokenData.token,
          [FIELD_MAP.title]: title,
          [FIELD_MAP.year]: releaseYear,
          [FIELD_MAP.date]: String(date),
        });

        if (mediaType === 'tv') {
          query.set(FIELD_MAP.season, String(Number(season) || 1));
          query.set(FIELD_MAP.episode, String(Number(episode) || 1));
          if (lastAirDate) query.set(FIELD_MAP.latestDate, String(lastAirDate));
        }

        if (imdbId) query.set(FIELD_MAP.imdbId, imdbId);

        if (dubCode) {
          query.set('dubCode', dubCode);
          query.set('dubType', dubType !== '' ? String(dubType) : '0');
        }

        const srcController = new AbortController();
        const srcTimer = setTimeout(() => srcController.abort(), 4000);
        const sourceRes = await fetch(
          `${baseHost}${sourcesPrefix}/${encodeURIComponent(serverKey)}?${query.toString()}`,
          {
            headers: {
              ...COMMON_HEADERS,
              Origin: baseHost,
              Referer: refererUrl,
            },
            signal: srcController.signal,
          }
        );
        clearTimeout(srcTimer);

        if (!sourceRes.ok) {
          lastError = `HTTP ${sourceRes.status}`;
          if (attempt === 0 && (sourceRes.status >= 500 || sourceRes.status === 429)) {
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
          return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
        }

        sourceData = await sourceRes.json();
        break;
      } catch (err: any) {
        lastError = err?.message || 'Network error';
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 150));
          continue;
        }
        return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
      }
    }

    if (!sourceData) {
      return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
    }

    const rawLinks = (sourceData.links || []).map((item: any) => {
      let decrypted = decryptCryptoJS(item.link, DECRYPTION_KEY);
      if (typeof decrypted === 'string' && decrypted.startsWith('/')) {
        decrypted = `https://vidstuck.cc${decrypted}`;
      }
      return {
        ...item,
        link: decrypted,
      };
    });

    const verifiedLinks: any[] = [];
    for (const item of rawLinks) {
      if (!item.link || !item.link.startsWith('http')) continue;
      const isWorkerUrl = item.link.includes('workers.dev');
      const isDash =
        !isWorkerUrl &&
        (item.type === 'dash' || item.link.includes('andromeda') || item.link.includes('.mpd'));

      if (isDash) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const mpdRes = await fetch(item.link, {
            headers: {
              'User-Agent': COMMON_HEADERS['User-Agent'],
              Referer: `${baseHost}/`,
              Origin: baseHost,
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!mpdRes.ok) continue;
          const mpdText = await mpdRes.text();
          if (!mpdText.includes('<MPD') || !mpdText.includes('video')) continue;
          const hasAudio =
            mpdText.includes('contentType="audio"') ||
            mpdText.includes("contentType='audio'") ||
            mpdText.includes('audio/mp4') ||
            mpdText.includes('mp4a');
          cacheMpdXml(item.link, mpdText);
          const codecs = mpdText.match(/codecs="([^"]+)"/g) || [];
          const videoCodecs = codecs.filter(
            (c) => !c.includes('mp4a') && !c.includes('ac-3') && !c.includes('ec-3')
          );
          const onlyHevc =
            videoCodecs.length > 0 &&
            videoCodecs.every((c) => c.includes('hev1') || c.includes('hvc1'));
          const audioAdaptationMatch = mpdText.match(
            /<AdaptationSet[^>]*contentType=["']audio["'][\s\S]*?<\/AdaptationSet>/i
          );
          const audioInitMatch = (audioAdaptationMatch ? audioAdaptationMatch[0] : mpdText).match(
            /initialization=["']([^"'?]+)/i
          );
          const audioStreamKey = audioInitMatch ? audioInitMatch[1] : '';
          verifiedLinks.push({ ...item, type: 'dash', onlyHevc, hasAudio, audioStreamKey });
        } catch {
          // Skip broken DASH manifest
        }
      } else if (isWorkerUrl) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2000);
          const probeRes = await fetch(item.link, {
            method: 'HEAD',
            headers: {
              'User-Agent': COMMON_HEADERS['User-Agent'],
              Referer: `${baseHost}/`,
              Origin: baseHost,
            },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!probeRes.ok) continue;
          verifiedLinks.push({ ...item, onlyHevc: false, hasAudio: true });
        } catch {
          // Skip broken worker link
        }
      } else {
        verifiedLinks.push({ ...item, onlyHevc: false, hasAudio: true });
      }
    }

    const verifiedAudioItem =
      verifiedLinks.find((l) => l.hasAudio !== false) || verifiedLinks[0] || null;
    const verifiedAudioLink = verifiedAudioItem?.link || null;

    return {
      ...sourceData,
      success: verifiedLinks.length > 0,
      links: verifiedLinks,
      dubAudioUrl: verifiedAudioLink,
      audioStreamKey: verifiedAudioItem?.audioStreamKey || '',
      server: targetServer,
    };
  };

  return await queryProvider(
    'https://zxcstream.cc',
    CURRENT_TOKEN_ENDPOINT,
    '/backend_/sources',
    targetServer
  );
}

// Router for all API routes (mounted at /api, /api/index, and /)
const apiRouter = express.Router();

// Health check / status
apiRouter.get('/status', (_req, res) => {
  res.json({ status: 'ok', server: 'zxcstream-mirror', time: Date.now() });
});
apiRouter.get('/stream/status', (_req, res) => {
  res.json({ status: 'ok', server: 'zxcstream-mirror', time: Date.now() });
});

// TMDB Details Route (supports both /tmdb/details/:mediaType/:tmdbId and /tmdb/:mediaType/:tmdbId)
const handleTmdbDetails = async (req: express.Request, res: express.Response) => {
  const { mediaType, tmdbId } = req.params;
  const language = (req.query.language as string) || 'en-US';
  const cleanId = String(tmdbId || '').trim();
  const safeMediaType: MediaType = mediaType === 'tv' ? 'tv' : 'movie';

  try {
    const data = await fetchTmdbDetailsWithFallback(mediaType, cleanId, language);
    if (data && (data.title || data.name || data.id)) {
      return res.json(data);
    }

    // Graceful fallback: retrieve catalog metadata or synthetic entry so valid IDs never 404
    const fallback = getMediaByTmdbId(safeMediaType, cleanId);
    return res.json({
      id: Number(cleanId.replace(/\D/g, '')) || Number(fallback.tmdbId) || 128,
      title: fallback.title,
      name: fallback.title,
      overview: fallback.overview,
      tagline: fallback.tagline,
      poster_path: fallback.posterUrl ? fallback.posterUrl.replace('https://image.tmdb.org/t/p/w500', '') : null,
      backdrop_path: fallback.backdropUrl ? fallback.backdropUrl.replace('https://image.tmdb.org/t/p/original', '') : null,
      backdrop_paths: fallback.backdropUrl ? [fallback.backdropUrl] : [],
      logo_paths: fallback.logoUrl ? [fallback.logoUrl] : [],
      genres: fallback.genres.map((g, i) => ({ id: i + 1, name: g })),
      rating: fallback.voteAverage,
      vote_average: fallback.voteAverage,
      runtime: fallback.runtimeMinutes,
      status: fallback.status,
      release_date: `${fallback.releaseYear}-01-01`,
      first_air_date: `${fallback.releaseYear}-01-01`,
      imdb_id: getSeriesImdbId(cleanId) || null,
      seasons: fallback.seasons?.map((s) => ({
        season_number: s.seasonNumber,
        episode_count: s.episodeCount,
        name: s.name,
      })) || [],
      cast: fallback.cast?.map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profileUrl?.replace('https://image.tmdb.org/t/p/w300', ''),
      })) || [],
      resolvedMediaType: safeMediaType,
      fallback: true,
    });
  } catch (err: any) {
    const fallback = getMediaByTmdbId(safeMediaType, cleanId);
    return res.json({
      id: Number(cleanId.replace(/\D/g, '')) || 128,
      title: fallback.title,
      name: fallback.title,
      overview: fallback.overview,
      resolvedMediaType: safeMediaType,
      fallback: true,
    });
  }
};

apiRouter.get('/tmdb/details/:mediaType/:tmdbId', handleTmdbDetails);
apiRouter.get('/tmdb/:mediaType/:tmdbId', handleTmdbDetails);

// TMDB TV Season Episodes Proxy Route (enriched with per-episode intro/outro/next-episode timing metadata)
apiRouter.get('/tmdb/season/:tmdbId/season/:seasonNumber', async (req, res) => {
  const { tmdbId, seasonNumber } = req.params;
  const seasonNum = Number(seasonNumber) || 1;
  try {
    const response = await fetch(
      `https://zxcstream.cc/backend/tmdb/season/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(seasonNumber)}`,
      {
        headers: {
          ...COMMON_HEADERS,
          Referer: `https://zxcstream.cc/player/tv/${tmdbId}/${seasonNumber}/1`,
        },
      }
    );
    if (!response.ok) {
      const fallbackEps = getCatalogSeasonEpisodes(tmdbId, seasonNum);
      return res.json({ episodes: fallbackEps });
    }
    const data = await response.json();
    const rawEpisodes = Array.isArray(data?.data?.episodes)
      ? data.data.episodes
      : Array.isArray(data?.episodes)
      ? data.episodes
      : [];

    if (rawEpisodes.length === 0) {
      const fallbackEps = getCatalogSeasonEpisodes(tmdbId, seasonNum);
      return res.json({ ...data, episodes: fallbackEps });
    }

    const enrichedEpisodes = rawEpisodes.map((ep: any) => {
      const epNum = Number(ep?.episode_number) || 1;
      const timing = getEpisodeTimingMetadata(tmdbId, seasonNum, epNum, 'tv');
      if (!timing) return ep;
      return {
        ...ep,
        introStart: ep.introStart ?? timing.introStart,
        introEnd: ep.introEnd ?? timing.introEnd,
        outroStart: ep.outroStart ?? timing.outroStart,
        outroEnd: ep.outroEnd ?? timing.outroEnd,
        nextEpisodeTriggerTime:
          ep.nextEpisodeTriggerTime !== undefined
            ? ep.nextEpisodeTriggerTime
            : timing.nextEpisodeTriggerTime,
        nextEpisodeId:
          ep.nextEpisodeId !== undefined ? ep.nextEpisodeId : timing.nextEpisodeId,
      };
    });

    if (data?.data?.episodes) {
      return res.json({
        ...data,
        data: { ...data.data, episodes: enrichedEpisodes },
      });
    }
    return res.json({ ...data, episodes: enrichedEpisodes });
  } catch {
    const fallbackEps = getCatalogSeasonEpisodes(tmdbId, seasonNum);
    return res.json({ episodes: fallbackEps });
  }
});

// Stream Source Resolver Route
apiRouter.post('/stream/resolve', async (req, res) => {
  const {
    mediaType: reqMediaType = 'movie',
    tmdbId = '128',
    serverPath: reqServerPath,
    preferredServer,
    season = 1,
    episode = 1,
    dubCode = '',
    dubType = '',
    autoFallback = false,
    allowHevc = false,
  } = req.body;
  const serverPath = reqServerPath || preferredServer || 'orion';

  let mediaType = reqMediaType;
  let { title = '', releaseYear = '', year = '', date = '', imdbId = '', lastAirDate = '' } = req.body;
  if (!releaseYear && year) releaseYear = String(year);

  try {
    if (!title || !releaseYear) {
      const details = await fetchTmdbDetailsWithFallback(mediaType, String(tmdbId));
      if (details) {
        if (details.resolvedMediaType) {
          mediaType = details.resolvedMediaType;
        }
        title = details.title || details.name || title;
        date = details.release_date || details.first_air_date || date;
        releaseYear = (date ? String(new Date(date).getFullYear()) : '') || releaseYear;
        imdbId = details.imdb_id || imdbId;
        lastAirDate = details.last_air_date || lastAirDate;
      }
    }

    if (!title) title = mediaType === 'tv' ? 'Series' : 'Movie';
    if (!date) date = '2022-01-01';
    if (!releaseYear) releaseYear = date.split('-')[0] || '2022';

    const options = {
      mediaType,
      tmdbId: String(tmdbId),
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      title,
      releaseYear,
      date,
      imdbId,
      lastAirDate,
      dubCode,
      dubType,
    };

    const filterPlayable = (resObj: any) => {
      if (!resObj || !Array.isArray(resObj.links)) return resObj;
      if (allowHevc) return resObj;
      const filtered = resObj.links.filter((l: any) => !l.onlyHevc);
      return {
        ...resObj,
        links: filtered,
        success: filtered.length > 0,
      };
    };

    let result = filterPlayable(await resolveForServer(serverPath, options));

    const shouldFallback = autoFallback || (!req.body.strictSingleServer && (!result.links || result.links.length === 0));
    if ((!result.links || result.links.length === 0) && shouldFallback) {
      const fallbackServers = ['valstrax', 'vegamovies', 'atlas', 'ursa', 'alatreon', 'daedalus', 'orion'].filter(
        (s) => s !== serverPath
      );
      for (const alt of fallbackServers) {
        const altResult = filterPlayable(await resolveForServer(alt, options));
        if (altResult.links && altResult.links.length > 0) {
          result = altResult;
          break;
        }
      }
    }

    const primaryLink = Array.isArray(result.links) && result.links.length > 0 ? result.links[0] : null;

    return res.json({
      ...result,
      success: Boolean(primaryLink?.link),
      link: primaryLink?.link || null,
      type: primaryLink?.type || 'hls',
      resolvedMediaType: mediaType,
    });
  } catch (err: any) {
    return res.json({
      links: [],
      error: err.message,
      server: serverPath,
    });
  }
});

// Sources GET endpoint (e.g. from zxcApi: /api/sources/:server)
apiRouter.get('/sources/:server', async (req, res) => {
  const targetServer = req.params.server;
  const {
    mediaType = 'movie',
    tmdbId = '128',
    season = 1,
    episode = 1,
    title = '',
    year = '',
    date = '',
    imdbId = '',
    dubCode = '',
    dubType = '',
  } = req.query as Record<string, string>;

  try {
    const result = await resolveForServer(targetServer, {
      mediaType,
      tmdbId,
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      title: title || (mediaType === 'tv' ? 'Series' : 'Movie'),
      releaseYear: year || date.split('-')[0] || '2022',
      date: date || '2022-01-01',
      imdbId,
      dubCode,
      dubType,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Subtitles Resolver Route
apiRouter.post('/subtitles/resolve', async (req, res) => {
  const {
    mediaType = 'movie',
    tmdbId = '128',
    season = 1,
    episode = 1,
    title = '',
    releaseYear = '',
    date = '',
  } = req.body;

  try {
    const subBody: Record<string, any> = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: 'subtitle_',
    };
    if (mediaType === 'tv') {
      subBody[FIELD_MAP.season] = Number(season) || 1;
      subBody[FIELD_MAP.episode] = Number(episode) || 1;
    }

    let tokenData: any = null;
    for (const ep of [CURRENT_TOKEN_ENDPOINT, '/backend/getthefuckoutniiguh', '/backend/wtfnigga', '/backend/fucku']) {
      try {
        const tokenRes = await fetch(`https://zxcstream.cc${ep}`, {
          method: 'POST',
          headers: COMMON_HEADERS,
          body: JSON.stringify(subBody),
        });
        if (tokenRes.ok) {
          const parsed = await tokenRes.json();
          if (parsed?.token) {
            tokenData = parsed;
            break;
          }
        }
      } catch {
        // try next
      }
    }
    if (!tokenData?.token) return res.json({ subtitles: [] });

    const query = new URLSearchParams({
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: 'subtitle_',
      [FIELD_MAP.ts]: String(tokenData.ts),
      [FIELD_MAP.token]: tokenData.token,
      [FIELD_MAP.title]: title,
      [FIELD_MAP.year]: releaseYear,
      [FIELD_MAP.date]: String(date),
    });
    if (mediaType === 'tv') {
      query.set(FIELD_MAP.season, String(Number(season) || 1));
      query.set(FIELD_MAP.episode, String(Number(episode) || 1));
    }

    // Try vidstuck.cc/backend/subtitle then zxcstream.cc/backend_/subtitle_
    try {
      const vidRes = await fetch(`https://vidstuck.cc/backend/subtitle?${query.toString()}`, {
        headers: COMMON_HEADERS,
      });
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const list = Array.isArray(vidData) ? vidData : vidData.captions || vidData.subtitles || [];
        if (list.length > 0) return res.json({ subtitles: list });
      }
    } catch {
      // fallback
    }

    const subRes = await fetch(`https://zxcstream.cc/backend_/subtitle_?${query.toString()}`, {
      headers: COMMON_HEADERS,
    });
    if (!subRes.ok) return res.json({ subtitles: [] });
    const subData = await subRes.json();
    const list = Array.isArray(subData) ? subData : subData.subtitles || subData.captions || [];
    return res.json({ subtitles: list });
  } catch {
    return res.json({ subtitles: [] });
  }
});

// Subtitles GET endpoint (e.g. from zxcApi: /api/subtitles?...)
apiRouter.get('/subtitles', async (req, res) => {
  const {
    mediaType = 'movie',
    tmdbId = '128',
    season = 1,
    episode = 1,
    title = '',
    year = '',
    date = '',
  } = req.query as Record<string, string>;

  try {
    const subBody: Record<string, any> = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: 'subtitle_',
    };
    if (mediaType === 'tv') {
      subBody[FIELD_MAP.season] = Number(season) || 1;
      subBody[FIELD_MAP.episode] = Number(episode) || 1;
    }

    let tokenData: any = null;
    for (const ep of [CURRENT_TOKEN_ENDPOINT, '/backend/getthefuckoutniiguh', '/backend/wtfnigga', '/backend/fucku']) {
      try {
        const tokenRes = await fetch(`https://zxcstream.cc${ep}`, {
          method: 'POST',
          headers: COMMON_HEADERS,
          body: JSON.stringify(subBody),
        });
        if (tokenRes.ok) {
          const parsed = await tokenRes.json();
          if (parsed?.token) {
            tokenData = parsed;
            break;
          }
        }
      } catch {
        // try next
      }
    }
    if (!tokenData?.token) return res.json({ captions: [] });

    const query = new URLSearchParams({
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: 'subtitle_',
      [FIELD_MAP.ts]: String(tokenData.ts),
      [FIELD_MAP.token]: tokenData.token,
      [FIELD_MAP.title]: title,
      [FIELD_MAP.year]: year,
      [FIELD_MAP.date]: String(date),
    });
    if (mediaType === 'tv') {
      query.set(FIELD_MAP.season, String(Number(season) || 1));
      query.set(FIELD_MAP.episode, String(Number(episode) || 1));
    }

    try {
      const vidRes = await fetch(`https://vidstuck.cc/backend/subtitle?${query.toString()}`, {
        headers: COMMON_HEADERS,
      });
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const list = Array.isArray(vidData) ? vidData : vidData.captions || vidData.subtitles || [];
        if (list.length > 0) return res.json({ captions: list });
      }
    } catch {
      // fallback
    }

    const subRes = await fetch(`https://zxcstream.cc/backend_/subtitle_?${query.toString()}`, {
      headers: COMMON_HEADERS,
    });
    if (!subRes.ok) return res.json({ captions: [] });
    const subData = await subRes.json();
    const list = Array.isArray(subData) ? subData : subData.subtitles || subData.captions || [];
    return res.json({ captions: list });
  } catch {
    return res.json({ captions: [] });
  }
});

apiRouter.options('/stream/proxy', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  return res.sendStatus(200);
});

// Universal Proxy endpoint for subtitles (.vtt, .srt) & stream manifest chunks
apiRouter.get('/stream/proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid or missing target URL');
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent': COMMON_HEADERS['User-Agent'],
      Referer: 'https://zxcstream.cc/',
      Origin: 'https://zxcstream.cc',
    };
    if (req.headers.range) {
      reqHeaders.Range = String(req.headers.range);
    }

    const upstream = await fetch(targetUrl, {
      headers: reqHeaders,
    });

    res.status(upstream.status);
    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Accept-Ranges', 'bytes');

    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl') ||
      targetUrl.includes('.m3u8');

    if (isM3u8) {
      const text = await upstream.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        const resolveAgainstBase = (relOrAbs: string) => {
          try {
            return new URL(relOrAbs.trim(), targetUrl).toString();
          } catch {
            return relOrAbs.trim();
          }
        };

        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/g, (_m, uriVal) => {
                const absUri = resolveAgainstBase(uriVal);
                return `URI="/api/stream/proxy?url=${encodeURIComponent(absUri)}"`;
              });
            }
            const absUrl = resolveAgainstBase(trimmed);
            return `/api/stream/proxy?url=${encodeURIComponent(absUrl)}`;
          })
          .join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.status(200).send(rewritten);
      }
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err: any) {
    return res.status(502).send(err.message || 'Upstream fetch proxy failed');
  }
});

// Audio-only DASH MPD proxy for playing Orion dubbed audio on non-HEVC browsers
apiRouter.get('/stream/mpd-audio', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid or missing target URL');
  }

  try {
    let mpdText = '';
    const cached = mpdManifestCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
      mpdText = cached.xml;
    } else {
      for (let attempt = 0; attempt < 2; attempt++) {
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': COMMON_HEADERS['User-Agent'],
            Referer: 'https://zxcstream.cc/',
            Origin: 'https://zxcstream.cc',
          },
        });
        if (upstream.ok) {
          mpdText = await upstream.text();
          if (mpdText.includes('<MPD')) {
            cacheMpdXml(targetUrl, mpdText);
            break;
          }
        }
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    if (!mpdText || !mpdText.includes('<MPD')) {
      return res.status(502).send('Failed to fetch valid upstream MPD');
    }

    const audioOnlyMpd = stripVideoFromMpd(mpdText);
    res.setHeader('Content-Type', 'application/dash+xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(audioOnlyMpd);
  } catch (err: any) {
    return res.status(502).send(err.message || 'Upstream MPD audio proxy failed');
  }
});

// Sentinel Embed endpoint
apiRouter.get('/embed/sentinel', (req, res) => {
  const base = 'https://zxcstream-mirror.vercel.app';
  const { mediaType = 'movie', tmdbId = '128', season = '1', episode = '1' } = req.query;
  const path =
    mediaType === 'tv'
      ? `${base}/embed/tv/${tmdbId}/${season}/${episode}`
      : `${base}/embed/movie/${tmdbId}`;
  return res.json({ embed: path });
});

// In-memory cache for TheIntroDB v4 and upstream responses
interface TheIntroDbSegmentResult {
  introStart: number | null;
  introEnd: number | null;
  recapStart: number | null;
  recapEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
  tvdbId: number | null;
  durationMs: number | null;
  fetchedAt: number;
}

const theIntroDbCache = new Map<string, TheIntroDbSegmentResult>();
const upstreamIntroCache = new Map<
  string,
  {
    introStart: number | null;
    introEnd: number | null;
    outroStart: number | null;
    outroEnd: number | null;
    fetchedAt: number;
  }
>();

const manualEpisodeTimingOverrides = new Map<
  string,
  {
    introStart: number | null;
    introEnd: number | null;
    recapStart?: number | null;
    recapEnd?: number | null;
    outroStart: number | null;
    outroEnd: number | null;
    nextEpisodeTriggerTime: number | null;
  }
>();

/**
 * Queries TheIntroDB official v4 media API (https://api.theintrodb.org/v4/media)
 * Returns community-verified intro, recap, and credits timestamps.
 */
async function queryTheIntroDb(params: {
  mediaType: 'movie' | 'tv';
  tvdbId?: number | null;
  tmdbId?: string | number | null;
  imdbId?: string | null;
  season?: number;
  episode?: number;
  durationMs?: number;
}): Promise<TheIntroDbSegmentResult | null> {
  const query = new URLSearchParams();
  if (params.tvdbId != null && params.tvdbId > 0) {
    query.set('tvdb_id', String(params.tvdbId));
  } else if (params.tmdbId != null && String(params.tmdbId).trim() !== '') {
    query.set('tmdb_id', String(params.tmdbId).trim());
  } else if (params.imdbId != null && String(params.imdbId).trim() !== '') {
    query.set('imdb_id', String(params.imdbId).trim());
  } else {
    return null;
  }

  if (params.mediaType === 'tv') {
    if (params.season != null) query.set('season', String(params.season));
    if (params.episode != null) query.set('episode', String(params.episode));
  }

  const durationMs =
    params.durationMs && params.durationMs >= 300000 ? params.durationMs : undefined;
  if (durationMs) {
    query.set('duration_ms', String(durationMs));
    query.set('merge_unknown', 'true');
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const apiUrl = `https://api.theintrodb.org/v4/media?${query.toString()}`;

    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ZXCStream-TheIntroDB-Integration/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') return null;

    // 1. Intro segment (start_ms: null means 0)
    let introStart: number | null = null;
    let introEnd: number | null = null;
    if (Array.isArray(data.intro) && data.intro.length > 0) {
      const seg = data.intro[0];
      const norm = normalizeIntervalSeconds({
        startMs: seg?.start_ms ?? null,
        endMs: seg?.end_ms ?? null,
        allowStartNullAsZero: true,
      });
      introStart = norm.start;
      introEnd = norm.end;
    }

    // 2. Recap segment
    let recapStart: number | null = null;
    let recapEnd: number | null = null;
    if (Array.isArray(data.recap) && data.recap.length > 0) {
      const seg = data.recap[0];
      const norm = normalizeIntervalSeconds({
        startMs: seg?.start_ms ?? null,
        endMs: seg?.end_ms ?? null,
        allowStartNullAsZero: true,
      });
      recapStart = norm.start;
      recapEnd = norm.end;
    }

    // 3. Credits / Outro segment (end_ms: null means continues to media end)
    let outroStart: number | null = null;
    let outroEnd: number | null = null;
    if (Array.isArray(data.credits) && data.credits.length > 0) {
      const seg = data.credits[0];
      const norm = normalizeIntervalSeconds({
        startMs: seg?.start_ms ?? null,
        endMs: seg?.end_ms ?? null,
        allowStartNullAsZero: true,
      });
      outroStart = norm.start;
      outroEnd = norm.end ?? (durationMs ? Number((durationMs / 1000).toFixed(3)) : null);
    }

    if (introStart !== null || recapStart !== null || outroStart !== null) {
      return {
        introStart,
        introEnd,
        recapStart,
        recapEnd,
        outroStart,
        outroEnd,
        tvdbId: data.tvdb_id ?? params.tvdbId ?? null,
        durationMs: durationMs ?? null,
        fetchedAt: Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Owner/Admin endpoint to configure or override exact episode timestamps deterministically
apiRouter.post('/intro', (req, res) => {
  const tmdbId = String(req.body?.tmdbId || '').trim();
  const season = Number(req.body?.season) || 1;
  const episode = Number(req.body?.episode) || 1;
  if (!tmdbId || season < 1 || episode < 1) {
    return res.status(400).json({ error: 'Valid tmdbId, season, and episode are required' });
  }
  const episodeKey = `${tmdbId}:${season}:${episode}`;
  const introNorm = normalizeIntervalSeconds({
    startSec: req.body?.introStart ?? req.body?.intro?.start_sec ?? null,
    endSec: req.body?.introEnd ?? req.body?.intro?.end_sec ?? null,
    startMs: req.body?.intro?.start_ms ?? null,
    endMs: req.body?.intro?.end_ms ?? null,
  });
  const recapNorm = normalizeIntervalSeconds({
    startSec: req.body?.recapStart ?? req.body?.recap?.start_sec ?? null,
    endSec: req.body?.recapEnd ?? req.body?.recap?.end_sec ?? null,
    startMs: req.body?.recap?.start_ms ?? null,
    endMs: req.body?.recap?.end_ms ?? null,
  });
  const outroNorm = normalizeIntervalSeconds({
    startSec: req.body?.outroStart ?? req.body?.outro?.start_sec ?? null,
    endSec: req.body?.outroEnd ?? req.body?.outro?.end_sec ?? null,
    startMs: req.body?.outro?.start_ms ?? null,
    endMs: req.body?.outro?.end_ms ?? null,
  });
  const triggerRaw = req.body?.nextEpisodeTriggerTime;
  const nextEpisodeTriggerTime =
    triggerRaw !== null && triggerRaw !== undefined && Number.isFinite(Number(triggerRaw))
      ? Number(triggerRaw)
      : null;

  const entry = {
    introStart: introNorm.start,
    introEnd: introNorm.end,
    recapStart: recapNorm.start,
    recapEnd: recapNorm.end,
    outroStart: outroNorm.start,
    outroEnd: outroNorm.end,
    nextEpisodeTriggerTime,
  };
  manualEpisodeTimingOverrides.set(episodeKey, entry);
  return res.json({ episodeKey, tmdbId, season, episode, ...entry, source: 'manual' });
});

// Intro & Outro Skip timestamps endpoint (TheIntroDB v4 API + upstream /backend/intro + verified catalog fallback)
apiRouter.get('/intro', async (req, res) => {
  const tmdbId = String(req.query.tmdbId || '').trim();
  const mediaType = (String(req.query.mediaType || 'tv').trim() === 'movie' ? 'movie' : 'tv') as
    | 'movie'
    | 'tv';
  const season = Number(req.query.season) || 1;
  const episode = Number(req.query.episode) || 1;

  if (!tmdbId || (mediaType === 'tv' && (season < 1 || episode < 1))) {
    return res.json({});
  }

  const episodeKey = mediaType === 'tv' ? `${tmdbId}:${season}:${episode}` : `movie:${tmdbId}`;
  const durationMsRaw = Number(req.query.durationMs);
  const durationSecRaw = Number(req.query.durationSec);
  const durationMs =
    Number.isFinite(durationMsRaw) && durationMsRaw > 0
      ? durationMsRaw
      : Number.isFinite(durationSecRaw) && durationSecRaw > 0
      ? Math.round(durationSecRaw * 1000)
      : 0;

  const fallbackTiming =
    mediaType === 'tv' ? getEpisodeTimingMetadata(tmdbId, season, episode, mediaType) : null;

  // 1. Check manual owner/admin override first
  const manualOverride = manualEpisodeTimingOverrides.get(episodeKey);
  if (manualOverride) {
    return res.json({
      episodeKey,
      tmdbId,
      season,
      episode,
      introStart: manualOverride.introStart,
      introEnd: manualOverride.introEnd,
      recapStart: manualOverride.recapStart ?? null,
      recapEnd: manualOverride.recapEnd ?? null,
      outroStart: manualOverride.outroStart,
      outroEnd: manualOverride.outroEnd,
      nextEpisodeTriggerTime:
        manualOverride.nextEpisodeTriggerTime ??
        (fallbackTiming?.nextEpisodeId === null ? null : manualOverride.outroEnd),
      nextEpisodeId: fallbackTiming?.nextEpisodeId ?? null,
      intro:
        manualOverride.introStart !== null && manualOverride.introEnd !== null
          ? { start_sec: manualOverride.introStart, end_sec: manualOverride.introEnd }
          : null,
      recap:
        manualOverride.recapStart !== null && manualOverride.recapEnd !== null
          ? { start_sec: manualOverride.recapStart, end_sec: manualOverride.recapEnd }
          : null,
      credits:
        manualOverride.outroStart !== null && manualOverride.outroEnd !== null
          ? { start_sec: manualOverride.outroStart, end_sec: manualOverride.outroEnd }
          : null,
      outro:
        manualOverride.outroStart !== null && manualOverride.outroEnd !== null
          ? { start_sec: manualOverride.outroStart, end_sec: manualOverride.outroEnd }
          : null,
      source: 'manual',
    });
  }

  // 2. Resolve TVDB ID and IMDb ID for TheIntroDB
  let tvdbId =
    Number(req.query.tvdbId) ||
    getSeriesTvdbId(tmdbId) ||
    null;

  let imdbId =
    String(req.query.imdbId || '').trim() ||
    tmdbImdbCache.get(tmdbId) ||
    getSeriesImdbId(tmdbId) ||
    '';

  if (!tvdbId || !imdbId) {
    try {
      const details = await fetchTmdbDetailsWithFallback(mediaType, tmdbId);
      if (details) {
        if (!imdbId && details.imdb_id) {
          imdbId = String(details.imdb_id).trim();
          tmdbImdbCache.set(tmdbId, imdbId);
        }
        if (!tvdbId && (details.tvdb_id || details.external_ids?.tvdb_id)) {
          tvdbId = Number(details.tvdb_id || details.external_ids?.tvdb_id);
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Check TheIntroDB cache (cluster key by duration in 30s buckets so minor drift reuses cache)
  const durationCluster = durationMs ? Math.round(durationMs / 30000) * 30000 : 0;
  const cacheKey = `${episodeKey}:${durationCluster}`;
  let theIntroDbEntry = theIntroDbCache.get(cacheKey) || null;
  if (theIntroDbEntry && Date.now() - theIntroDbEntry.fetchedAt > 60 * 60 * 1000) {
    theIntroDbEntry = null;
  }

  // 4. Query TheIntroDB official v4 media API if not cached
  if (!theIntroDbEntry) {
    theIntroDbEntry = await queryTheIntroDb({
      mediaType,
      tvdbId,
      tmdbId,
      imdbId,
      season,
      episode,
      durationMs,
    });
    if (theIntroDbEntry) {
      theIntroDbCache.set(cacheKey, theIntroDbEntry);
    }
  }

  // 5. Query upstream /backend/intro if TheIntroDB has no records and mediaType is TV
  let upstreamEntry = upstreamIntroCache.get(episodeKey) || null;
  if (upstreamEntry && Date.now() - upstreamEntry.fetchedAt > 30 * 60 * 1000) {
    upstreamEntry = null;
  }

  if (!theIntroDbEntry && !upstreamEntry && mediaType === 'tv' && imdbId) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const upstreamUrl = `https://zxcstream.cc/backend/intro?imdbId=${encodeURIComponent(
        imdbId
      )}&season=${encodeURIComponent(String(season))}&episode=${encodeURIComponent(
        String(episode)
      )}&tmdbId=${encodeURIComponent(tmdbId)}`;

      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          ...COMMON_HEADERS,
          Referer: `https://zxcstream.cc/player/tv/${tmdbId}/${season}/${episode}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (upstreamRes.ok) {
        const rawData = await upstreamRes.json();
        const matchesEpisode =
          (rawData?.season === undefined || Number(rawData.season) === season) &&
          (rawData?.episode === undefined || Number(rawData.episode) === episode);

        if (matchesEpisode && rawData && (rawData.intro || rawData.outro)) {
          const normIntro = normalizeIntervalSeconds({
            startSec: rawData.intro?.start_sec ?? null,
            endSec: rawData.intro?.end_sec ?? null,
            startMs: rawData.intro?.start_ms ?? null,
            endMs: rawData.intro?.end_ms ?? null,
          });
          const normOutro = normalizeIntervalSeconds({
            startSec: rawData.outro?.start_sec ?? null,
            endSec: rawData.outro?.end_sec ?? null,
            startMs: rawData.outro?.start_ms ?? null,
            endMs: rawData.outro?.end_ms ?? null,
          });

          let introStart = normIntro.start;
          let introEnd = normIntro.end;
          let outroStart = normOutro.start;
          let outroEnd = normOutro.end;

          if (
            introStart !== null &&
            introEnd !== null &&
            outroStart !== null &&
            outroEnd !== null &&
            outroEnd <= introStart &&
            introStart >= 900
          ) {
            outroStart = introStart;
            outroEnd = introEnd;
            introStart = null;
            introEnd = null;
          }

          upstreamEntry = {
            introStart,
            introEnd,
            outroStart,
            outroEnd,
            fetchedAt: Date.now(),
          };
          upstreamIntroCache.set(episodeKey, upstreamEntry);
        }
      }
    } catch {
      // Fallback below
    }
  }

  // 6. Gracefully merge TheIntroDB with upstream and verified catalog timing
  const resolvedSource = theIntroDbEntry
    ? 'theintrodb'
    : upstreamEntry
    ? 'upstream'
    : fallbackTiming
    ? 'catalog'
    : 'none';

  const finalIntroStart =
    theIntroDbEntry?.introStart ?? upstreamEntry?.introStart ?? fallbackTiming?.introStart ?? null;
  const finalIntroEnd =
    theIntroDbEntry?.introEnd ?? upstreamEntry?.introEnd ?? fallbackTiming?.introEnd ?? null;

  const finalRecapStart = theIntroDbEntry?.recapStart ?? null;
  const finalRecapEnd = theIntroDbEntry?.recapEnd ?? null;

  const finalOutroStart =
    theIntroDbEntry?.outroStart ?? upstreamEntry?.outroStart ?? fallbackTiming?.outroStart ?? null;
  const finalOutroEnd =
    theIntroDbEntry?.outroEnd ?? upstreamEntry?.outroEnd ?? fallbackTiming?.outroEnd ?? null;

  const isSeriesFinale = fallbackTiming?.nextEpisodeId === null;
  // Trigger Next Episode when the scene finishes and outro begins
  const resolvedTrigger =
    isSeriesFinale || mediaType !== 'tv'
      ? null
      : (finalOutroStart ?? finalOutroEnd ?? fallbackTiming?.nextEpisodeTriggerTime ?? null);

  return res.json({
    episodeKey,
    mediaType,
    tmdbId,
    tvdbId: tvdbId ?? theIntroDbEntry?.tvdbId ?? null,
    season: mediaType === 'tv' ? season : undefined,
    episode: mediaType === 'tv' ? episode : undefined,
    durationMs: durationMs || undefined,
    introStart: finalIntroStart,
    introEnd: finalIntroEnd,
    recapStart: finalRecapStart,
    recapEnd: finalRecapEnd,
    outroStart: finalOutroStart,
    outroEnd: finalOutroEnd,
    nextEpisodeTriggerTime: resolvedTrigger,
    nextEpisodeId: fallbackTiming?.nextEpisodeId ?? null,
    intro:
      finalIntroStart !== null && finalIntroEnd !== null
        ? {
            start_sec: finalIntroStart,
            end_sec: finalIntroEnd,
            start_ms: Math.round(finalIntroStart * 1000),
            end_ms: Math.round(finalIntroEnd * 1000),
          }
        : null,
    recap:
      finalRecapStart !== null && finalRecapEnd !== null
        ? {
            start_sec: finalRecapStart,
            end_sec: finalRecapEnd,
            start_ms: Math.round(finalRecapStart * 1000),
            end_ms: Math.round(finalRecapEnd * 1000),
          }
        : null,
    credits:
      finalOutroStart !== null && finalOutroEnd !== null
        ? {
            start_sec: finalOutroStart,
            end_sec: finalOutroEnd,
            start_ms: Math.round(finalOutroStart * 1000),
            end_ms: Math.round(finalOutroEnd * 1000),
          }
        : null,
    outro:
      finalOutroStart !== null && finalOutroEnd !== null
        ? {
            start_sec: finalOutroStart,
            end_sec: finalOutroEnd,
            start_ms: Math.round(finalOutroStart * 1000),
            end_ms: Math.round(finalOutroEnd * 1000),
          }
        : null,
    source: resolvedSource,
  });
});

// ============================================================================
// NXSHA (nxsha.space/embed) Reverse-Engineered Ad-Free Streaming Engine
// ============================================================================
const NXSHA_KEY = 'f4488ab4da401203d23baa129fc546153898162524635d6776826d0c867ccaa3';

export function nxshaEncrypt(data: Record<string, unknown>): string {
  try {
    const payload = JSON.stringify({
      ...data,
      _req_ts: Date.now(),
      _req_salt: Math.random().toString(36).substring(2, 12),
    });
    const ciphertext = CryptoJS.AES.encrypt(payload, NXSHA_KEY).toString();
    return ciphertext.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

export function nxshaDecrypt<T = any>(enc?: string | null): T | null {
  if (!enc) return null;
  try {
    let b64 = enc.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const bytes = CryptoJS.AES.decrypt(b64, NXSHA_KEY);
    const jsonStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    delete parsed._req_ts;
    delete parsed._req_salt;
    return parsed as T;
  } catch {
    return null;
  }
}

export interface NxshaServer {
  id: string | number;
  name: string;
  scraper: string;
  quality?: string;
  high_priority?: number;
  web_support?: boolean;
  types?: string[];
  status?: string;
}

export interface NxshaSource {
  id?: string;
  provider?: string;
  url: string;
  org_uri?: string;
  quality?: string;
  label?: string;
  type?: string;
  isEmbed?: boolean;
  headers?: Record<string, string>;
  lang?: string;
  langName?: string;
  multiLangs?: string[];
}

const DUB_LANGUAGE_PATTERNS: { code: string; name: string; regex: RegExp }[] = [
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

export function detectNxshaLanguage(text: string): { code: string; name: string } | null {
  return detectSingleStreamLanguage(text);
}

const NXSHA_COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

function extractHscowAssetKey(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:hscow\.com|fcxmb\.com)\/(?:my)?hls(?:_mps)?\/(?:(\d{4}\/\d+yue\/(?:\d+\/)?[A-Za-z0-9]+)|([A-Za-z0-9]{6,}))/i);
  if (!m) return null;
  const raw = m[1] || m[2] || '';
  // Normalize language/resolution suffix from named folders like TheWildRobot_Hindi_720 -> thewildrobot
  return raw.split('_')[0].toLowerCase();
}

function needsNxshaProxy(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/api/nxsha/proxy') || url.startsWith('/api/stream/proxy')) return false;
  const lower = url.toLowerCase();
  if (lower.includes('vidstuck.cc') || lower.includes('zxcstream.cc')) {
    return false;
  }
  return true;
}

function wrapInNxshaProxy(url: string): string {
  if (!url || url.startsWith('/api/nxsha/proxy')) return url;
  return `/api/nxsha/proxy?url=${encodeURIComponent(url)}`;
}

async function fetchNxshaServers(
  tmdbId: string,
  mediaType: string,
  season = 1,
  episode = 1,
  imdbId = '',
  parentSignal?: AbortSignal
): Promise<NxshaServer[]> {
  try {
    const encPayload = nxshaEncrypt({
      tmdbId: String(tmdbId || ''),
      imdb_id: imdbId || '',
      type: mediaType === 'tv' ? 'tv' : 'movie',
      season: mediaType === 'tv' ? season : undefined,
      episode: mediaType === 'tv' ? episode : undefined,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    if (parentSignal) {
      if (parentSignal.aborted) {
        clearTimeout(timeout);
        return [];
      }
      parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const res = await fetch(`https://nxsha.space/api/servers?q=${encodeURIComponent(encPayload)}`, {
      headers: {
        ...NXSHA_COMMON_HEADERS,
        Referer:
          mediaType === 'tv'
            ? `https://nxsha.space/embed/tv/${tmdbId}/${season}/${episode}`
            : `https://nxsha.space/embed/movie/${tmdbId}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    const decrypted = nxshaDecrypt<{ servers?: NxshaServer[] }>(json?._hash);
    const rawList = Array.isArray(decrypted?.servers) ? decrypted!.servers! : [];
    return rawList.filter(
      (s) =>
        s &&
        s.scraper &&
        s.web_support !== false &&
        isAuthorizedNxshaProvider(s.scraper)
    );
  } catch {
    return [];
  }
}

async function fetchNxshaSubtitles(
  tmdbId: string,
  mediaType: string,
  season = 1,
  episode = 1,
  imdbId = '',
  parentSignal?: AbortSignal
): Promise<Array<{ id: string; language: string; url: string }>> {
  try {
    const encPayload = nxshaEncrypt({
      tmdbId: String(tmdbId || ''),
      imdb_id: imdbId || '',
      type: mediaType === 'tv' ? 'tv' : 'movie',
      season: mediaType === 'tv' ? season : undefined,
      episode: mediaType === 'tv' ? episode : undefined,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    if (parentSignal) {
      if (parentSignal.aborted) {
        clearTimeout(timeout);
        return [];
      }
      parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const res = await fetch(`https://nxsha.space/api/subtitles?q=${encodeURIComponent(encPayload)}`, {
      headers: {
        ...NXSHA_COMMON_HEADERS,
        Referer:
          mediaType === 'tv'
            ? `https://nxsha.space/embed/tv/${tmdbId}/${season}/${episode}`
            : `https://nxsha.space/embed/movie/${tmdbId}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    const decrypted = nxshaDecrypt<{ subtitles?: any[] }>(json?._hash);
    return normalizeSubtitleTracks([], decrypted?.subtitles || []);
  } catch {
    return [];
  }
}

const AETHO_SERVER_DEFINITIONS: Record<
  string,
  { name: string; desc: string; zxcUpstream: 'alatreon' | 'valstrax' | 'ursa' | 'atlas'; preferRousav?: boolean }
> = {
  orion: { name: 'AethoOrion', desc: 'Multi-Audio Master • Hindi, Tamil, Telugu, EN (1080p)', zxcUpstream: 'alatreon', preferRousav: true },
  vega: { name: 'AethoVega', desc: 'Hindi / Tamil / Telugu / English Direct HLS Master', zxcUpstream: 'valstrax' },
  callisto: { name: 'AethoCallisto', desc: '16-Language Global & Hindi Bridge • 1080p', zxcUpstream: 'alatreon', preferRousav: true },
  sirius: { name: 'AethoSirius', desc: 'Ultra-Fast Direct HLS Master • Hindi / EN (1080p)', zxcUpstream: 'ursa' },
  bharat: { name: 'AethoBharat', desc: 'Dedicated Hindi & South Indian Multi-Audio Node', zxcUpstream: 'alatreon', preferRousav: true },
  indus: { name: 'AethoIndus', desc: 'India Edge • Hindi, Tamil, Telugu & English HLS', zxcUpstream: 'valstrax', preferRousav: true },
  bolly: { name: 'AethoBolly', desc: 'Bollywood & Hollywood Dual-Audio Hindi Server', zxcUpstream: 'alatreon', preferRousav: true },
  kuro: { name: 'AethoKuro', desc: 'Anime & Series Multi-Audio (Hindi / Sub / Dub)', zxcUpstream: 'ursa', preferRousav: true },
  quantum: { name: 'AethoQuantum', desc: 'Adaptive 1080p/720p/360p Master HLS', zxcUpstream: 'atlas' },
  rousav: { name: 'AethoRousav', desc: '22-Language Multi-Track HLS + Embedded Subs', zxcUpstream: 'alatreon', preferRousav: true },
  atlas: { name: 'AethoAtlas', desc: 'Fast Edge H.264 HLS • Universal', zxcUpstream: 'atlas' },
  ursa: { name: 'AethoUrsa', desc: 'Low-Latency Edge H.264 HLS', zxcUpstream: 'ursa' },
  andromeda: { name: 'AethoAndromeda', desc: 'Smooth Playback & Ultra HD Stream', zxcUpstream: 'valstrax' },
  valstrax: { name: 'AethoValstrax', desc: 'High-Bitrate 1080p HD Stream', zxcUpstream: 'valstrax' },
  alatreon: { name: 'AethoAlatreon', desc: 'Extended Movie & TV Library Node', zxcUpstream: 'alatreon' },
  resshin: { name: 'AethoResshin', desc: 'Multi-Resolution & Hindi Dub Stream', zxcUpstream: 'alatreon', preferRousav: true },
  centaurus: { name: 'AethoCentaurus', desc: 'Multi-Resolution 1080p/720p/480p Stream', zxcUpstream: 'ursa' },
  daedalus: { name: 'AethoDaedalus', desc: 'Global CDN Mirror HLS', zxcUpstream: 'ursa' },
  quasar: { name: 'AethoQuasar', desc: 'High-Speed India & Asia CDN Node', zxcUpstream: 'valstrax', preferRousav: true },
  zenith: { name: 'AethoZenith', desc: 'Multi-Language 1080p Cinema Bridge', zxcUpstream: 'alatreon', preferRousav: true },
  nebula: { name: 'AethoNebula', desc: 'Dual-Audio Hindi/English Express Node', zxcUpstream: 'valstrax', preferRousav: true },
  zxc_pulse: { name: 'AethoPulse', desc: 'Secondary Multi-Audio Cluster', zxcUpstream: 'alatreon', preferRousav: true },
  zxc_atlas: { name: 'AethoVortex', desc: 'Fast Edge HLS Cluster', zxcUpstream: 'atlas' },
  zxc_ursa: { name: 'AethoApex', desc: 'Global Backup HLS Node', zxcUpstream: 'ursa' },
  hyperion: { name: 'AethoHyperion', desc: 'Cloud Fabric 1080p Node', zxcUpstream: 'atlas' },
  vidfast: { name: 'AethoFlash', desc: 'Ultra-Fast Instant Start Cluster', zxcUpstream: 'ursa' },
  vaplayer: { name: 'AethoPrism', desc: 'European Edge Cinema Node', zxcUpstream: 'ursa' },
  kronos: { name: 'AethoKronos', desc: 'Multi-CDN Aggregated Stream', zxcUpstream: 'alatreon', preferRousav: true },
  pegasus: { name: 'AethoPegasus', desc: 'Zero-Buffer Adaptive HLS (Hindi/EN)', zxcUpstream: 'valstrax', preferRousav: true },
  nova: { name: 'AethoNova', desc: 'High-Contrast Cinema 1080p Multi-Audio', zxcUpstream: 'alatreon', preferRousav: true },
  apollo: { name: 'AethoApollo', desc: 'Universal Failover Stream Node', zxcUpstream: 'valstrax' },
};

interface AethoSharedCacheEntry {
  rousavSources: NxshaSource[];
  zxcByUpstream: Record<string, NxshaSource[]>;
  subtitles: any[];
  dubs: RawOrionDub[];
}

const aethoSharedCache = new Map<
  string,
  { expiresAt: number; promise: Promise<AethoSharedCacheEntry> }
>();

async function getAethoSharedData(params: {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  season: number;
  episode: number;
  imdbId?: string;
}): Promise<AethoSharedCacheEntry> {
  const cleanId = String(params.tmdbId || '128').trim();
  const mediaType = params.mediaType === 'tv' ? 'tv' : 'movie';
  const season = Math.max(1, Number(params.season) || 1);
  const episode = Math.max(1, Number(params.episode) || 1);
  const cacheKey = `${mediaType}:${cleanId}:${season}:${episode}`;
  const now = Date.now();

  const cached = aethoSharedCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const runSharedExtract = async (): Promise<AethoSharedCacheEntry> => {
    let title = '';
    let releaseYear = '';
    let imdbId = String(
      params.imdbId || tmdbImdbCache.get(cleanId) || getSeriesImdbId(cleanId) || ''
    ).trim();

    try {
      const details = await fetchTmdbDetailsWithFallback(mediaType, cleanId);
      if (details) {
        title = String(details.title || details.name || '').trim();
        const dateStr = String(details.release_date || details.first_air_date || '').trim();
        if (dateStr) releaseYear = dateStr.slice(0, 4);
        if (!imdbId && details.imdb_id) {
          imdbId = String(details.imdb_id).trim();
          tmdbImdbCache.set(cleanId, imdbId);
        }
      }
    } catch {
      // fallback below
    }

    if (!title) {
      const cat = getMediaByTmdbId(mediaType, cleanId);
      title = cat?.title || (mediaType === 'tv' ? 'Series' : 'Movie');
      if (!releaseYear && cat?.releaseYear) releaseYear = String(cat.releaseYear);
    }

    // 1. Query embed.aethoflix.world/api/extract once per title to harvest direct CORS-enabled rousav.tech multi-audio HLS streams and subtitles
    const aethoApiPromise = (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3600);
        const qs = new URLSearchParams({
          tmdbId: cleanId,
          mediaType,
          server: 'callisto',
          ...(mediaType === 'tv' ? { season: String(season), episode: String(episode) } : {}),
        });
        const res = await fetch(`https://embed.aethoflix.world/api/extract?${qs.toString()}`, {
          headers: {
            'User-Agent': NXSHA_COMMON_HEADERS['User-Agent'],
            Accept: 'application/json',
            Referer: `https://embed.aethoflix.world/embed/${mediaType}/${cleanId}`,
          },
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return { rousavSources: [] as NxshaSource[], subtitles: [] as any[], dubs: [] as RawOrionDub[] };
        const data: any = await res.json();
        const rawSources: any[] = Array.isArray(data?.sources) ? data.sources : [];
        const byServer = data?.byServer && typeof data.byServer === 'object' ? data.byServer : {};
        for (const srvList of Object.values(byServer)) {
          if (Array.isArray(srvList)) {
            rawSources.push(...srvList);
          }
        }

        const rousavSources: NxshaSource[] = [];
        const seen = new Set<string>();
        for (const item of rawSources) {
          let rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
          if (!rawUrl) continue;
          // Unwrap /api/proxy-m3u8?url=...
          if (rawUrl.includes('proxy-m3u8?')) {
            try {
              const parsed = new URL(rawUrl, 'https://embed.aethoflix.world');
              const inner = parsed.searchParams.get('url');
              if (inner) rawUrl = inner.trim();
            } catch {
              // ignore
            }
          }
          if (!rawUrl.startsWith('http') || seen.has(rawUrl)) continue;
          const lower = rawUrl.toLowerCase();
          // Only keep direct CORS-enabled H.264 HLS streams (e.g. img.rousav.tech); skip 403 vidbolt & HEVC-only worker links
          if (
            lower.includes('vidbolt.xyz') ||
            lower.includes('workers.dev') ||
            lower.includes('_h265_') ||
            lower.includes('googleusercontent.com') ||
            lower.includes('.mkv') ||
            !isTrustedNxshaMediaUrl(rawUrl)
          ) {
            continue;
          }
          seen.add(rawUrl);
          rousavSources.push({
            id: `aetho-direct-${rousavSources.length + 1}`,
            url: rawUrl,
            quality: item?.quality || '1080p',
            label: item?.label || 'Aetho Direct Multi-Audio HLS (1080p)',
            type: 'hls',
            lang: 'hi',
            langName: 'Hindi',
            multiLangs: ['hi', 'en'],
          });
        }

        const subtitles = normalizeSubtitleTracks([], Array.isArray(data?.subtitles) ? data.subtitles : []);
        const dubs: RawOrionDub[] = [];
        if (Array.isArray(data?.dubs)) {
          for (const d of data.dubs) {
            const langCode = String(d?.lang || '').trim().toLowerCase();
            if (!langCode) continue;
            dubs.push({
              type: 0,
              lang: langCode,
              name: String(d?.name || d?.label || langCode),
              label: String(d?.label || d?.name || langCode),
              original: Boolean(d?.original),
            });
          }
        }
        return { rousavSources, subtitles, dubs };
      } catch {
        return { rousavSources: [] as NxshaSource[], subtitles: [] as any[], dubs: [] as RawOrionDub[] };
      }
    })();

    // 2. Resolve verified seekable H.264 HLS/DASH streams from our ZXC upstreams (alatreon, valstrax, ursa, atlas)
    const upstreams: Array<'alatreon' | 'valstrax' | 'ursa' | 'atlas'> = [
      'alatreon',
      'valstrax',
      'ursa',
      'atlas',
    ];
    const zxcByUpstream: Record<string, NxshaSource[]> = {
      alatreon: [],
      valstrax: [],
      ursa: [],
      atlas: [],
    };

    const zxcPromises = upstreams.map(async (upName) => {
      try {
        const res = await resolveForServer(upName, {
          mediaType,
          tmdbId: cleanId,
          season,
          episode,
          title,
          releaseYear: releaseYear || '2022',
          date: `${releaseYear || '2022'}-01-01`,
          imdbId,
        });
        const links = Array.isArray(res?.links)
          ? res.links.filter((l: any) => l?.link && !l.onlyHevc)
          : [];
        zxcByUpstream[upName] = links.map((l: any, i: number) => ({
          id: `aetho-${upName}-${i + 1}`,
          url: l.link,
          quality: l.quality || '1080p',
          label: `1080p FHD [Multi-Audio]`,
          type: l.type === 'dash' || l.link.includes('.mpd') || l.link.includes('andromeda') ? 'dash' : 'hls',
          lang: 'hi',
          langName: 'Hindi',
          multiLangs: ['hi', 'en'],
        }));
      } catch {
        zxcByUpstream[upName] = [];
      }
    });

    const sharedEntry: AethoSharedCacheEntry = {
      rousavSources: [],
      zxcByUpstream,
      subtitles: [],
      dubs: [
        {
          type: 0,
          lang: 'orig',
          name: 'Original Audio',
          label: 'Original Audio',
          original: true,
        },
        {
          type: 0,
          lang: 'hi',
          name: 'Hindi dub',
          label: 'Hindi',
          original: false,
        },
        {
          type: 0,
          lang: 'en',
          name: 'English dub',
          label: 'English',
          original: false,
        },
      ],
    };

    // Wait for our fast, verified ZXC upstreams (~1s) while letting aethoApiPromise enrich rousavSources/subtitles/dubs as soon as it responds
    await Promise.race([
      Promise.all([aethoApiPromise, Promise.all(zxcPromises)]),
      Promise.all(zxcPromises).then(
        () => new Promise((resolve) => setTimeout(resolve, 400))
      ),
    ]);

    void aethoApiPromise.then((aethoApiRes) => {
      if (aethoApiRes.rousavSources.length > 0) {
        sharedEntry.rousavSources = aethoApiRes.rousavSources;
      }
      if (aethoApiRes.subtitles.length > 0) {
        sharedEntry.subtitles = aethoApiRes.subtitles;
      }
      if (aethoApiRes.dubs.length > 0) {
        const dubsMap = new Map<string, RawOrionDub>();
        for (const d of sharedEntry.dubs) dubsMap.set(d.lang, d);
        for (const d of aethoApiRes.dubs) {
          if (!dubsMap.has(d.lang)) dubsMap.set(d.lang, d);
        }
        sharedEntry.dubs = Array.from(dubsMap.values());
      }
    });

    return sharedEntry;
  };

  const promise = runSharedExtract();
  aethoSharedCache.set(cacheKey, { expiresAt: now + 60_000, promise });
  return promise;
}

async function resolveAethoServerSources(params: {
  provider: string;
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  season: number;
  episode: number;
  imdbId?: string;
  parentSignal?: AbortSignal;
}): Promise<{ sources: NxshaSource[]; subtitles: any[]; dubs: RawOrionDub[] }> {
  const def = AETHO_SERVER_DEFINITIONS[params.provider];
  if (!def) {
    return { sources: [], subtitles: [], dubs: [] };
  }
  const shared = await getAethoSharedData({
    tmdbId: params.tmdbId,
    mediaType: params.mediaType,
    season: params.season,
    episode: params.episode,
    imdbId: params.imdbId,
  });

  const orderedPool: NxshaSource[] = [];
  const primaryZxc = shared.zxcByUpstream[def.zxcUpstream] || [];
  const allZxc = [
    ...primaryZxc,
    ...(shared.zxcByUpstream.alatreon || []),
    ...(shared.zxcByUpstream.valstrax || []),
    ...(shared.zxcByUpstream.ursa || []),
    ...(shared.zxcByUpstream.atlas || []),
  ];

  if (def.preferRousav && shared.rousavSources.length > 0) {
    orderedPool.push(...shared.rousavSources, ...allZxc);
  } else {
    orderedPool.push(...allZxc, ...shared.rousavSources);
  }

  const seenUrls = new Set<string>();
  const finalSources: NxshaSource[] = [];
  for (const src of orderedPool) {
    if (!src?.url || seenUrls.has(src.url)) continue;
    seenUrls.add(src.url);
    const playableUrl =
      src.url.includes('vidstuck.cc') && !src.url.startsWith('/api/stream/proxy')
        ? `/api/stream/proxy?url=${encodeURIComponent(src.url)}`
        : src.url;
    finalSources.push({
      ...src,
      url: playableUrl,
      org_uri: src.url,
      id: `${params.provider}-${finalSources.length + 1}`,
      provider: params.provider,
      label: `${def.name} | ${src.quality || '1080p'} [${def.desc}]`,
    });
  }

  return {
    sources: finalSources,
    subtitles: shared.subtitles,
    dubs: shared.dubs,
  };
}

async function fetchNxshaSources(
  provider: string,
  tmdbId: string,
  mediaType: string,
  season = 1,
  episode = 1,
  imdbId = '',
  parentSignal?: AbortSignal
): Promise<{ sources: NxshaSource[]; subtitles: any[]; dubs: RawOrionDub[] }> {
  if (!isAuthorizedNxshaProvider(provider)) {
    return { sources: [], subtitles: [], dubs: [] };
  }
  if (parentSignal?.aborted) {
    throw new Error('Aborted before fetchNxshaSources start');
  }
  if (provider === 'vegamovies') {
    const vegaRes = await resolveVegaMoviesCombined({
      tmdbId: String(tmdbId || ''),
      mediaType: mediaType === 'tv' ? 'tv' : 'movie',
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      imdbId,
      parentSignal,
    });
    return {
      sources: vegaRes.sources,
      subtitles: vegaRes.subtitles,
      dubs: vegaRes.dubs,
    };
  }
  if (provider in AETHO_SERVER_DEFINITIONS) {
    return resolveAethoServerSources({
      provider,
      tmdbId: String(tmdbId || ''),
      mediaType: mediaType === 'tv' ? 'tv' : 'movie',
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      imdbId,
      parentSignal,
    });
  }
  try {
    const fetchWithLang = async (ex_lang: boolean) => {
      try {
        if (parentSignal?.aborted) return { sources: [], subtitles: [] };
        const encPayload = nxshaEncrypt({
          ex_lang,
          provider,
          tmdbId: String(tmdbId || ''),
          imdb_id: imdbId || '',
          type: mediaType === 'tv' ? 'tv' : 'movie',
          season: mediaType === 'tv' ? season : undefined,
          episode: mediaType === 'tv' ? episode : undefined,
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4800);
        if (parentSignal) {
          parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        const res = await fetch(`https://nxsha.space/api/sources?q=${encodeURIComponent(encPayload)}`, {
          headers: {
            ...NXSHA_COMMON_HEADERS,
            Referer:
              mediaType === 'tv'
                ? `https://nxsha.space/embed/tv/${tmdbId}/${season}/${episode}`
                : `https://nxsha.space/embed/movie/${tmdbId}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return { sources: [], subtitles: [] };
        const json = await res.json();
        const decrypted = nxshaDecrypt<{ sources?: NxshaSource[]; subtitles?: any[] }>(json?._hash);
        const sources = Array.isArray(decrypted?.sources)
          ? decrypted!.sources!.filter(
              (s) => s && s.url && !s.isEmbed && !isDeadNxshaSourceUrl(s.url)
            )
          : [];
        const subtitles = Array.isArray(decrypted?.subtitles) ? decrypted!.subtitles! : [];
        return { sources, subtitles };
      } catch {
        return { sources: [], subtitles: [] };
      }
    };

    const singleRes = await fetchWithLang(false);
    if (parentSignal?.aborted) {
      throw new Error('Aborted during fetchNxshaSources');
    }
    const combinedSources = singleRes.sources;
    const seenUrls = new Set<string>();
    const uniqueSources: NxshaSource[] = [];

    // Collect available dubs
    const dubsMap = new Map<string, RawOrionDub>();
    dubsMap.set('orig', {
      type: 0,
      lang: 'orig',
      name: 'Original Audio',
      label: 'Original Audio',
      original: true,
    });

    for (const src of combinedSources) {
      if (!src?.url || seenUrls.has(src.url) || isDeadNxshaSourceUrl(src.url)) continue;
      if (!isTrustedNxshaMediaUrl(src.url)) continue;
      seenUrls.add(src.url);
      const rawUrl = src.url;
      const labelToDetect = `${src.label || ''} ${src.quality || ''}`;
      const lang = detectNxshaLanguage(labelToDetect);
      const allLangs = detectAllStreamLanguages(labelToDetect);
      if (lang) {
        src.lang = lang.code;
        src.langName = lang.name;
      }
      if (allLangs.length > 1) {
        src.multiLangs = allLangs.map((l) => l.code);
        for (const l of allLangs) {
          if (!dubsMap.has(l.code)) {
            dubsMap.set(l.code, {
              type: 0,
              lang: l.code,
              name: `${l.name} dub`,
              label: l.name,
              original: false,
            });
          }
        }
      }
      if (needsNxshaProxy(rawUrl)) {
        src.org_uri = rawUrl;
        src.url = wrapInNxshaProxy(rawUrl);
        src.type = 'hls';
      }
      uniqueSources.push(src);
    }

    // If provider is nitro (or has proxied multi-audio HLS), inspect the first master manifest for #EXT-X-MEDIA:TYPE=AUDIO tracks
    if (provider === 'nitro' && uniqueSources.length > 0 && !parentSignal?.aborted) {
      const targetRawUrl = uniqueSources[0].org_uri || uniqueSources[0].url;
      if (targetRawUrl && targetRawUrl.startsWith('http') && isTrustedNxshaMediaUrl(targetRawUrl)) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 2200);
          if (parentSignal) {
            parentSignal.addEventListener('abort', () => ctrl.abort(), { once: true });
          }
          const mRes = await fetch(targetRawUrl, {
            headers: {
              'User-Agent': NXSHA_COMMON_HEADERS['User-Agent'],
              Referer: 'https://nxsha.space/',
            },
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (mRes.ok) {
            const mText = await mRes.text();
            const lines = mText.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith('#EXT-X-MEDIA:') && line.includes('TYPE=AUDIO')) {
                const langMatch = line.match(/LANGUAGE="([^"]+)"/i);
                const nameMatch = line.match(/NAME="([^"]+)"/i);
                const detected =
                  detectNxshaLanguage(langMatch?.[1] || '') ||
                  detectNxshaLanguage(nameMatch?.[1] || '');
                if (detected && !dubsMap.has(detected.code)) {
                  dubsMap.set(detected.code, {
                    type: 0,
                    lang: detected.code,
                    name: `${detected.name} dub`,
                    label: detected.name,
                    original: false,
                  });
                }
              }
            }
          }
        } catch {
          // ignore manifest probe failure
        }
      }
    }

    const subtitles = singleRes.subtitles;

    for (const src of uniqueSources) {
      if (src.lang && !dubsMap.has(src.lang)) {
        dubsMap.set(src.lang, {
          type: 0,
          lang: src.lang,
          name: `${src.langName || src.lang} dub`,
          label: src.langName || src.lang,
          original: false,
        });
      }
    }

    return {
      sources: uniqueSources,
      subtitles,
      dubs: Array.from(dubsMap.values()),
    };
  } catch (err) {
    if (parentSignal?.aborted) throw err;
    return { sources: [], subtitles: [], dubs: [] };
  }
}

apiRouter.options('/nxsha/proxy', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  return res.sendStatus(200);
});

// 0. GET /api/nxsha/proxy (Ad-free, SSRF-hardened CORS & Referer proxy for NXSHA HLS manifests, audio tracks, and segments)
apiRouter.get('/nxsha/proxy', async (req, res) => {
  const targetUrl = String(req.query.url || '').trim();
  const reqLang = String(req.query.lang || '').trim().toLowerCase();
  if (!targetUrl || !targetUrl.startsWith('http') || !isTrustedNxshaMediaUrl(targetUrl)) {
    return res.status(400).send('Invalid or untrusted target URL');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const reqHeaders: Record<string, string> = {
      'User-Agent': NXSHA_COMMON_HEADERS['User-Agent'],
      Referer: 'https://nxsha.space/',
    };
    if (req.headers.range) {
      reqHeaders.Range = String(req.headers.range);
    }

    // Follow at most 3 redirects manually while validating every redirect target against SSRF rules
    let currentUrl = targetUrl;
    let upstream: Response | null = null;
    for (let hop = 0; hop <= 3; hop++) {
      upstream = await fetch(currentUrl, {
        headers: reqHeaders,
        redirect: 'manual',
        signal: controller.signal,
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get('location');
        if (!location) break;
        const resolvedRedirect = new URL(location, currentUrl).toString();
        if (!isTrustedNxshaMediaUrl(resolvedRedirect)) {
          clearTimeout(timeout);
          return res.status(403).send('Blocked untrusted redirect target');
        }
        currentUrl = resolvedRedirect;
        continue;
      }
      break;
    }

    clearTimeout(timeout);
    if (!upstream) {
      return res.status(502).send('Upstream unavailable');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Upstream error ${upstream.status}`);
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const finalUrl = currentUrl;
    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegurl') ||
      finalUrl.includes('.m3u8');

    const langSuffix = reqLang ? `&lang=${encodeURIComponent(reqLang)}` : '';

    if (isM3u8) {
      const text = await upstream.text();
      if (text.trimStart().startsWith('#EXTM3U')) {
        const resolveAgainstBase = (relOrAbs: string) => {
          try {
            return new URL(relOrAbs.trim(), finalUrl).toString();
          } catch {
            return relOrAbs.trim();
          }
        };

        const rewritten = text
          .split(/\r?\n/)
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI="([^"]+)"/g, (_m, uriVal) => {
                const absUri = resolveAgainstBase(uriVal);
                return `URI="/api/nxsha/proxy?url=${encodeURIComponent(absUri)}${langSuffix}"`;
              });
            }
            const absUrl = resolveAgainstBase(trimmed);
            return `/api/nxsha/proxy?url=${encodeURIComponent(absUrl)}${langSuffix}`;
          })
          .join('\n');

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.status(200).send(rewritten);
      }
    }

    res.status(upstream.status);
    if (contentType) res.setHeader('Content-Type', contentType);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (reqLang && buffer.length >= 188) {
      inspectAndSelectMpegTsAudioTrack(buffer, reqLang);
    }
    res.setHeader('Content-Length', String(buffer.length));
    return res.send(buffer);
  } catch (err: any) {
    clearTimeout(timeout);
    return res.status(502).send(err.message || 'NXSHA proxy failed');
  }
});

// 1. GET /api/nxsha/servers
apiRouter.get('/nxsha/servers', async (req, res) => {
  const tmdbId = String(req.query.id || req.query.tmdbId || '').trim();
  const mediaType = (String(req.query.type || req.query.mediaType || 'movie').trim().toLowerCase() === 'tv'
    ? 'tv'
    : 'movie') as MediaType;
  const season = Math.max(1, Number.parseInt(String(req.query.season || '1'), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(req.query.episode || '1'), 10) || 1);
  const imdbId = String(req.query.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || '');

  if (!tmdbId) {
    return res.status(400).json({ error: 'Missing tmdbId query param' });
  }

  const servers = await fetchNxshaServers(tmdbId, mediaType, season, episode, imdbId);
  return res.json({
    success: true,
    count: servers.length,
    servers: servers.map((s, idx) => ({
      index: idx,
      id: s.scraper,
      name: s.name,
      quality: s.quality || 'HD',
      scraper: s.scraper,
    })),
  });
});

// 1b. GET /api/nxsha/subtitles (Asynchronous subtitle discovery endpoint)
apiRouter.get('/nxsha/subtitles', async (req, res) => {
  const tmdbId = String(req.query.id || req.query.tmdbId || '').trim();
  const mediaType = (String(req.query.type || req.query.mediaType || 'movie').trim().toLowerCase() === 'tv'
    ? 'tv'
    : 'movie') as MediaType;
  const season = Math.max(1, Number.parseInt(String(req.query.season || '1'), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(req.query.episode || '1'), 10) || 1);
  const imdbId = String(req.query.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || '');

  if (!tmdbId) {
    return res.status(400).json({ error: 'Missing tmdbId query param' });
  }

  const subtitles = await fetchNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId);
  return res.json({
    success: true,
    count: subtitles.length,
    subtitles,
  });
});

// 2. GET /api/nxsha/sources
apiRouter.get('/nxsha/sources', async (req, res) => {
  const tmdbId = String(req.query.id || req.query.tmdbId || '').trim();
  const provider = String(req.query.server || req.query.provider || 'rive-citadel').trim();
  const mediaType = (String(req.query.type || req.query.mediaType || 'movie').trim().toLowerCase() === 'tv'
    ? 'tv'
    : 'movie') as MediaType;
  const season = Math.max(1, Number.parseInt(String(req.query.season || '1'), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(req.query.episode || '1'), 10) || 1);
  const imdbId = String(req.query.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || '');

  if (!tmdbId) {
    return res.status(400).json({ error: 'Missing tmdbId' });
  }
  if (!isAuthorizedNxshaProvider(provider)) {
    return res.status(400).json({ error: 'Unauthorized or unknown NXSHA provider' });
  }

  const { sources, subtitles, dubs } = await fetchNxshaSources(
    provider,
    tmdbId,
    mediaType,
    season,
    episode,
    imdbId
  );
  return res.json({
    success: sources.length > 0,
    provider,
    sources,
    subtitles,
    dubs,
  });
});

// Short-TTL (45s) in-memory promise cache for deduplicating concurrent NXSHA upstream requests within the same search session
const NXSHA_CACHE_TTL_MS = 45_000;
const nxshaCitadelCache = new Map<
  string,
  { expiresAt: number; promise: Promise<{ sources: NxshaSource[]; subtitles: any[]; dubs: RawOrionDub[] }> }
>();
const nxshaSubsCache = new Map<
  string,
  { expiresAt: number; promise: Promise<Array<{ id: string; language: string; url: string }>> }
>();
const nxshaServersCache = new Map<string, { expiresAt: number; promise: Promise<NxshaServer[]> }>();

function getCachedNxshaSubtitles(
  tmdbId: string,
  mediaType: string,
  season: number,
  episode: number,
  imdbId: string
) {
  const key = `${mediaType}:${tmdbId}:${season}:${episode}`;
  const now = Date.now();
  const hit = nxshaSubsCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = fetchNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId);
  nxshaSubsCache.set(key, { expiresAt: now + NXSHA_CACHE_TTL_MS, promise });
  return promise;
}

function getCachedNxshaServers(
  tmdbId: string,
  mediaType: string,
  season: number,
  episode: number,
  imdbId: string
) {
  const key = `${mediaType}:${tmdbId}:${season}:${episode}`;
  const now = Date.now();
  const hit = nxshaServersCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = fetchNxshaServers(tmdbId, mediaType, season, episode, imdbId);
  nxshaServersCache.set(key, { expiresAt: now + NXSHA_CACHE_TTL_MS, promise });
  return promise;
}

function getCachedCitadelSources(
  tmdbId: string,
  mediaType: string,
  season: number,
  episode: number,
  imdbId: string
) {
  const key = `${mediaType}:${tmdbId}:${season}:${episode}`;
  const now = Date.now();
  const hit = nxshaCitadelCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = fetchNxshaSources('rive-citadel', tmdbId, mediaType, season, episode, imdbId).catch(
    () => ({ sources: [] as NxshaSource[], subtitles: [] as any[], dubs: [] as RawOrionDub[] })
  );
  nxshaCitadelCache.set(key, { expiresAt: now + NXSHA_CACHE_TTL_MS, promise });
  return promise;
}

// 3. POST & GET /api/nxsha/resolve (Concurrent First-Valid-Source-Wins Stream Resolver with Auto Server Racing & Diagnostics)
const handleNxshaResolve = async (req: express.Request, res: express.Response) => {
  const params = req.method === 'POST' ? req.body || {} : req.query || {};
  const tmdbId = String(params.id || params.tmdbId || '').trim();
  const mediaType = (String(params.type || params.mediaType || 'movie').trim().toLowerCase() === 'tv'
    ? 'tv'
    : 'movie') as MediaType;
  const season = Math.max(1, Number.parseInt(String(params.season || '1'), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(params.episode || '1'), 10) || 1);
  const preferredServer = String(params.server || params.provider || params.preferredServer || '').trim();
  const strictSingleServer = Boolean(params.strictSingleServer === true || params.strictSingleServer === 'true');
  const allowFallback = Boolean(params.allowFallback === true || params.allowFallback === 'true');
  const requestedDub = String(params.dubCode || params.dubLang || params.lang || '').trim().toLowerCase();
  const imdbId = String(params.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || '');

  const rawExclude = params.excludeServers;
  const excludeSet = new Set<string>(
    Array.isArray(rawExclude)
      ? rawExclude.map((s: any) => String(s).trim())
      : typeof rawExclude === 'string' && rawExclude.trim()
      ? rawExclude.split(',').map((s) => s.trim())
      : []
  );

  if (!tmdbId) {
    return res.status(400).json({ success: false, error: 'Missing tmdbId' });
  }

  // Kick off subtitles and upstream server list in parallel without blocking provider racing!
  const nxshaSubsPromise = getCachedNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId);
  const nxshaServersPromise = getCachedNxshaServers(tmdbId, mediaType, season, episode, imdbId);

  const defaultServerList = NXSHA_SERVERS.map((s) => ({
    index: s.index,
    id: s.id,
    name: s.label,
    quality: 'HD',
  }));

  // Build candidate provider list to race concurrently
  const candidateProviders: string[] = [];
  if (strictSingleServer && preferredServer && isAuthorizedNxshaProvider(preferredServer)) {
    if (!excludeSet.has(preferredServer)) {
      candidateProviders.push(preferredServer);
    }
  } else {
    if (preferredServer && isAuthorizedNxshaProvider(preferredServer) && !excludeSet.has(preferredServer)) {
      candidateProviders.push(preferredServer);
    }
    for (const p of ALLOWED_NXSHA_PROVIDERS) {
      if (!excludeSet.has(p) && !candidateProviders.includes(p)) {
        candidateProviders.push(p);
      }
    }
  }

  const allDubsMap = new Map<string, RawOrionDub>();
  allDubsMap.set('orig', {
    type: 0,
    lang: 'orig',
    name: 'Original Audio',
    label: 'Original Audio',
    original: true,
  });

  // Shared memoized promise for rive-citadel so if both rive-citadel and castle run in parallel,
  // rive-citadel is only fetched once and castle can verify its hscow.com asset keys against rive-citadel
  const citadelState: { resolved: { sources: NxshaSource[]; subtitles: any[]; dubs: RawOrionDub[] } | null } = {
    resolved: null,
  };

  const getCitadelSources = () =>
    getCachedCitadelSources(tmdbId, mediaType, season, episode, imdbId).then((val) => {
      citadelState.resolved = val;
      return val;
    });

  // Start rive-citadel immediately at t = 0ms if it or castle is in the candidate pool
  if (candidateProviders.includes('rive-citadel') || candidateProviders.includes('castle')) {
    void getCitadelSources();
  }

  // Race all eligible NXSHA providers concurrently — First Valid Source Wins!
  const raceResult = await raceNxshaProviders({
    providers: candidateProviders,
    concurrencyLimit: 6,
    providerTimeoutMs: 4800,
    overallTimeoutMs: 7500,
    queryProvider: async (provider, signal) => {
      if (provider === 'rive-citadel') {
        return getCitadelSources();
      }
      return fetchNxshaSources(provider, tmdbId, mediaType, season, episode, imdbId, signal);
    },
    validateCandidate: async (provider, sources) => {
      // Non-fuzzy providers validate immediately in 0ms without waiting on any other provider!
      if (provider !== 'castle') {
        return { valid: sources.length > 0, sources };
      }
      // For castle (which uses fuzzy title search on the same hscow.com/fcxmb.com catalog as rive-citadel),
      // verify hscow.com/fcxmb.com asset keys against rive-citadel's exact ID lookup so fuzzy mismatches are rejected
      const citadelRes = await getCitadelSources().catch(() => ({ sources: [] as NxshaSource[] }));
      if (
        citadelRes.sources.length > 0 &&
        candidateProviders.includes('rive-citadel') &&
        preferredServer !== 'castle'
      ) {
        await new Promise((r) => setTimeout(r, 5));
      }
      const verifiedAssetKeys = new Set(
        citadelRes.sources.map((s) => extractHscowAssetKey(s.url)).filter((k): k is string => Boolean(k))
      );
      const filtered = sources.filter((s) => {
        const key = extractHscowAssetKey(s.url);
        if (!key) return true;
        return verifiedAssetKeys.has(key);
      });
      return { valid: filtered.length > 0, sources: filtered };
    },
    isPreferredMatch: (_provider, sources) => {
      if (!requestedDub || requestedDub === 'orig') return true;
      return sources.some(
        (s) =>
          s.lang === requestedDub ||
          (Array.isArray(s.multiLangs) && s.multiLangs.includes(requestedDub))
      );
    },
  });

  for (const d of raceResult.allDiscoveredDubs) {
    if (d?.lang && !allDubsMap.has(d.lang)) {
      allDubsMap.set(d.lang, d);
    }
  }

  if (raceResult.success && raceResult.winner) {
    const winner = raceResult.winner;
    const mergedSources = [...winner.sources];
    const existingUrls = new Set(mergedSources.map((s) => s.url));

    // If not in strict single server mode and rive-citadel has already resolved in parallel, merge its valid language variants and dubs
    if (!strictSingleServer && (winner.provider === 'rive-citadel' || preferredServer === 'rive-citadel')) {
      if (citadelState.resolved && citadelState.resolved.sources.length > 0) {
        for (const citSrc of citadelState.resolved.sources) {
          if (
            citSrc?.url &&
            !existingUrls.has(citSrc.url) &&
            validatePlayableNxshaSource(citSrc).valid
          ) {
            existingUrls.add(citSrc.url);
            mergedSources.push(citSrc);
          }
        }
        for (const d of citadelState.resolved.dubs) {
          if (d?.lang && !allDubsMap.has(d.lang) && mergedSources.some((s) => s.lang === d.lang)) {
            allDubsMap.set(d.lang, d);
          }
        }
      }
    }

    if (requestedDub && requestedDub !== 'orig') {
      mergedSources.sort((a, b) => {
        const aMatch = a.lang === requestedDub;
        const bMatch = b.lang === requestedDub;
        return aMatch && !bMatch ? -1 : !aMatch && bMatch ? 1 : 0;
      });
    }

    // Give subtitles and server metadata a short non-blocking 180ms grace window so they never delay playback
    const [apiSubtitles, rawServers] = await Promise.all([
      Promise.race([
        nxshaSubsPromise,
        new Promise<Array<{ id: string; language: string; url: string }>>((r) =>
          setTimeout(() => r([]), 180)
        ),
      ]),
      Promise.race([
        nxshaServersPromise,
        new Promise<NxshaServer[]>((r) => setTimeout(() => r([]), 180)),
      ]),
    ]);

    const mergedSubtitles = normalizeSubtitleTracks(winner.subtitles, apiSubtitles);
    const serverMeta =
      rawServers.find((s) => s.scraper === winner.provider) ||
      defaultServerList.find((s) => s.id === winner.provider);

    return res.json({
      success: true,
      engine: 'nxsha',
      resolvedServer: winner.provider,
      serverName: serverMeta?.name || winner.provider,
      sources: mergedSources,
      subtitles: mergedSubtitles,
      dubs: Array.from(allDubsMap.values()),
      activeDub: requestedDub || 'orig',
      servers:
        rawServers.length > 0
          ? rawServers.map((s, idx) => ({
              index: idx,
              id: s.scraper,
              name: s.name,
              quality: s.quality || 'HD',
            }))
          : defaultServerList,
      diagnostics: raceResult.diagnostics,
    });
  }

  // When querying a single specific NXSHA server (without allowFallback), report its true failure immediately
  // so the client state machine permanently marks that server FAILED and removes it from the active list.
  if (strictSingleServer && !allowFallback) {
    return res.json({
      success: false,
      engine: 'nxsha',
      provider: preferredServer,
      sources: [],
      error:
        raceResult.error ||
        `No valid playable stream found on NXSHA provider ${preferredServer || 'unknown'}`,
      servers: defaultServerList,
      dubs: Array.from(allDubsMap.values()),
      diagnostics: raceResult.diagnostics,
    });
  }

  // Concurrent Fallback Racing for titles not hosted on primary NXSHA CDNs (e.g. anime Movie 128 Princess Mononoke):
  // Race verified ad-free ZXCSTREAM HLS/DASH providers concurrently so the first valid fallback stream wins!
  try {
    const details = await fetchTmdbDetailsWithFallback(mediaType, tmdbId);
    const fallbackMeta = getMediaByTmdbId(mediaType, tmdbId);
    const title = String(details?.title || details?.name || fallbackMeta?.title || '').trim();
    const releaseStr = String(
      details?.release_date || details?.first_air_date || `${fallbackMeta?.releaseYear || ''}-01-01`
    );
    const year = releaseStr.slice(0, 4);

    const fallbackRace = await raceNxshaProviders({
      providers: ['valstrax', 'atlas', 'ursa', 'orion'],
      allowUnauthorizedProviders: true,
      concurrencyLimit: 4,
      providerTimeoutMs: 4500,
      overallTimeoutMs: 5500,
      queryProvider: async (fallbackSrv) => {
        const resolved = await resolveForServer(fallbackSrv, {
          mediaType,
          tmdbId,
          season,
          episode,
          title,
          releaseYear: year,
          date: releaseStr,
          lastAirDate: String(details?.last_air_date || ''),
          imdbId,
          dubCode: '',
          dubType: '0',
        });

        const playableLinks = Array.isArray(resolved?.links)
          ? resolved.links.filter((l: any) => l?.link && !l.onlyHevc)
          : [];

        return {
          sources: playableLinks.map((l: any) => {
            const playableUrl =
              l.link.includes('vidstuck.cc') && !l.link.startsWith('/api/stream/proxy')
                ? `/api/stream/proxy?url=${encodeURIComponent(l.link)}`
                : l.link;
            return {
              id: `verified-${fallbackSrv}`,
              provider: fallbackSrv,
              url: playableUrl,
              org_uri: l.link,
              quality: '1080p',
              label: '1080p | Original',
              type: l.type === 'dash' || l.type === 'andromeda' ? 'dash' : 'hls',
              lang: 'en',
              langName: 'Original',
            };
          }),
          subtitles: [],
          dubs: Array.isArray(resolved?.dubs) ? resolved.dubs : [],
        };
      },
    });

    for (const d of fallbackRace.allDiscoveredDubs) {
      if (d?.lang && !allDubsMap.has(d.lang)) {
        allDubsMap.set(d.lang, d);
      }
    }

    if (fallbackRace.success && fallbackRace.winner) {
      const apiSubtitles = await Promise.race([
        nxshaSubsPromise,
        new Promise<Array<{ id: string; language: string; url: string }>>((r) =>
          setTimeout(() => r([]), 250)
        ),
      ]);
      const nonExcludedServer =
        defaultServerList.find((s) => !excludeSet.has(s.id)) || defaultServerList[0];
      return res.json({
        success: true,
        engine: 'nxsha',
        isFallbackStream: true,
        resolvedServer: nonExcludedServer.id,
        serverName: `${nonExcludedServer.name} (Verified)`,
        sources: fallbackRace.winner.sources,
        subtitles: apiSubtitles,
        dubs: Array.from(allDubsMap.values()),
        activeDub: requestedDub || 'orig',
        servers: defaultServerList,
        diagnostics: {
          ...raceResult.diagnostics,
          winningProvider: fallbackRace.winner.provider,
          timeToFirstValidSourceMs:
            raceResult.diagnostics.totalDiscoveryDurationMs +
            (fallbackRace.diagnostics.timeToFirstValidSourceMs || 0),
          providerTimings: [
            ...raceResult.diagnostics.providerTimings,
            ...fallbackRace.diagnostics.providerTimings,
          ],
        },
      });
    }
  } catch {
    // ignore fallback error
  }

  return res.status(404).json({
    success: false,
    engine: 'nxsha',
    error: 'No active ad-free stream found across NXSHA providers for this title',
    servers: defaultServerList,
    dubs: Array.from(allDubsMap.values()),
    diagnostics: raceResult.diagnostics,
  });
};

apiRouter.post('/nxsha/resolve', handleNxshaResolve);
apiRouter.get('/nxsha/resolve', handleNxshaResolve);

// Anime TMDB Metadata Validation Route
apiRouter.get('/anime/validate/:tmdbId', async (req, res) => {
  const { tmdbId } = req.params;
  const cleanId = String(tmdbId || '').trim();
  const explicitType = req.query.type === 'movie' ? 'movie' : req.query.type === 'tv' ? 'tv' : undefined;

  try {
    let details = await fetchTmdbDetailsWithFallback(explicitType || 'tv', cleanId);
    if (!details || (!details.title && !details.name)) {
      const fallbackMeta = getMediaByTmdbId(explicitType || 'tv', cleanId);
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
      const altType: 'movie' | 'tv' = (explicitType || 'tv') === 'movie' ? 'tv' : 'movie';
      const altDetails = await fetchTmdbDetailsWithFallback(altType, cleanId);
      if (altDetails && (altDetails.title || altDetails.name)) {
        const altValidation = validateAnimeTmdbMetadata(altDetails, altType);
        if (altValidation.isValidAnime) {
          validation = altValidation;
        }
      }
    }

    if (!validation.isValidAnime) {
      return res.status(400).json({
        isValidAnime: false,
        isAnime: false,
        error: validation.rejectionReason,
        rejectionReason: validation.rejectionReason,
        classifiedCategory: validation.classifiedCategory,
        title: validation.title,
        genres: validation.genres,
        originalLanguage: validation.originalLanguage,
      });
    }

    return res.json(validation);
  } catch (err: any) {
    return res.status(500).json({
      isValidAnime: false,
      isAnime: false,
      error: err.message || 'Validation service error',
    });
  }
});

// Anime Stream Resolver Route
const handleAnimeResolve = async (req: express.Request, res: express.Response) => {
  const rawParams = {
    ...req.query,
    ...req.body,
  };
  const params = {
    ...rawParams,
    tmdbId: rawParams.tmdbId || rawParams.id,
    mediaType: rawParams.mediaType || rawParams.type || 'tv',
  };

  try {
    const result = await resolveAnimeContent(params, {
      fetchTmdbDetailsWithFallback,
      resolveForServer,
    });

    if (!result.success) {
      const isValidationRejection =
        result.error?.includes('Anime Core') ||
        result.error?.includes('dedicated to Anime') ||
        result.error?.includes('Western Animation') ||
        result.error?.includes('Live-Action');
      return res.status(isValidationRejection ? 400 : 404).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error resolving anime stream sources',
    });
  }
};

apiRouter.post('/anime/resolve', handleAnimeResolve);
apiRouter.get('/anime/resolve', handleAnimeResolve);

// ============================================================================
// Vegamovies (vegamovies1.co.in) Discovery, Fast-DL GoogleCDN & Multi-Server Resolver
// ============================================================================
interface VegaCombinedResult {
  success: boolean;
  sources: NxshaSource[];
  subtitles: any[];
  dubs: RawOrionDub[];
  matchedPost: VegaSearchCard | null;
  indStreamImdbId: string | null;
}

const vegaCombinedCache = new Map<
  string,
  { expiresAt: number; promise: Promise<VegaCombinedResult> }
>();

async function queryVegaFastDlIndex(params: {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  season: number;
  episode: number;
  imdbId: string;
  signal?: AbortSignal;
}): Promise<VegaResolvedSource[]> {
  try {
    if (params.signal?.aborted) return [];
    const encPayload = nxshaEncrypt({
      ex_lang: false,
      provider: 'hdhub4u',
      tmdbId: String(params.tmdbId || ''),
      imdb_id: params.imdbId || '',
      type: params.mediaType,
      season: params.mediaType === 'tv' ? params.season : undefined,
      episode: params.mediaType === 'tv' ? params.episode : undefined,
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3800);
    if (params.signal) {
      params.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const res = await fetch(`https://nxsha.space/api/sources?q=${encodeURIComponent(encPayload)}`, {
      headers: {
        ...NXSHA_COMMON_HEADERS,
        Referer:
          params.mediaType === 'tv'
            ? `https://nxsha.space/embed/tv/${params.tmdbId}/${params.season}/${params.episode}`
            : `https://nxsha.space/embed/movie/${params.tmdbId}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    const decrypted = nxshaDecrypt<{ sources?: any[] }>(json?._hash);
    const rawList = Array.isArray(decrypted?.sources) ? decrypted!.sources! : [];
    const results: VegaResolvedSource[] = [];
    for (const item of rawList) {
      const url = typeof item?.url === 'string' ? item.url.trim() : '';
      if (!url || item?.isEmbed) continue;
      const lowerUrl = url.toLowerCase();
      // Only accept direct GoogleCDN (video-downloads.googleusercontent.com) or GoogleCDN Worker (filexdcn.google-cdn.workers.dev) streams
      const isGoogleCdn =
        lowerUrl.includes('video-downloads.googleusercontent.com') ||
        lowerUrl.includes('google-cdn.workers.dev');
      if (!isGoogleCdn || lowerUrl.includes('.mkv')) continue;

      const labelText = `${item.label || ''} ${item.quality || ''}`;
      // Filter out 10-bit HEVC/x265 streams so standard H.264 (x264) browsers decode cleanly
      if (/\b(?:hevc|x265|h\.?265|10\s*-?\s*bit)\b/i.test(labelText)) continue;

      const qMatch = labelText.match(/\b(2160p|1080p|720p|480p)\b/i);
      const quality = qMatch ? qMatch[1].toLowerCase() : '1080p';
      const serverName = lowerUrl.includes('googleusercontent.com')
        ? 'G-Direct [Instant]'
        : 'VegaCloud [Fast]';

      results.push({
        id: `vegamovies-cdn-${results.length + 1}`,
        provider: 'vegamovies',
        url,
        quality,
        label: `Vegamovies | ${serverName} | ${quality} [Hindi-Eng]`,
        type: 'mp4',
        isEmbed: false,
        onlyHevc: false,
        lang: 'hi',
        langName: 'Hindi',
        multiLangs: ['hi', 'en'],
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function resolveVegaMoviesCombined(params: {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  title?: string;
  releaseYear?: string;
  imdbId?: string;
  parentSignal?: AbortSignal;
}): Promise<VegaCombinedResult> {
  const cleanId = String(params.tmdbId || '128').trim();
  const mediaType: 'movie' | 'tv' = params.mediaType === 'tv' ? 'tv' : 'movie';
  const season = Math.max(1, Number(params.season) || 1);
  const episode = Math.max(1, Number(params.episode) || 1);
  const cacheKey = `${mediaType}:${cleanId}:${season}:${episode}`;
  const now = Date.now();

  const cached = vegaCombinedCache.get(cacheKey);
  if (cached && cached.expiresAt > now && !params.parentSignal?.aborted) {
    return cached.promise;
  }

  const runResolution = async (): Promise<VegaCombinedResult> => {
    let title = String(params.title || '').trim();
    let releaseYear = String(params.releaseYear || '').trim();
    let imdbId = String(
      params.imdbId || tmdbImdbCache.get(cleanId) || getSeriesImdbId(cleanId) || ''
    ).trim();

    if (!title || !imdbId || !releaseYear) {
      try {
        const details = await fetchTmdbDetailsWithFallback(mediaType, cleanId);
        if (details) {
          title = title || String(details.title || details.name || '').trim();
          const dateStr = String(details.release_date || details.first_air_date || '').trim();
          if (!releaseYear && dateStr) releaseYear = dateStr.slice(0, 4);
          if (!imdbId && details.imdb_id) {
            imdbId = String(details.imdb_id).trim();
            tmdbImdbCache.set(cleanId, imdbId);
          }
        }
      } catch {
        // fallback below
      }
    }

    if (!title) {
      const cat = getMediaByTmdbId(mediaType, cleanId);
      title = cat?.title || (mediaType === 'tv' ? 'Series' : 'Movie');
      if (!releaseYear && cat?.releaseYear) releaseYear = String(cat.releaseYear);
    }

    // 1. Fetch high-quality seekable HLS and DASH streams from ZXC servers (alatreon, valstrax, ursa, atlas)
    // These streams are 100% addressable by segment and support instant +10s forward, -10s rewind, and seekbar scrubbing without jumping back!
    const zxcServersToQuery = ['alatreon', 'valstrax', 'ursa', 'atlas'];
    const zxcPromises = zxcServersToQuery.map(async (srvName) => {
      try {
        const zxcRes = await resolveForServer(srvName, {
          mediaType,
          tmdbId: cleanId,
          season,
          episode,
          title,
          releaseYear: releaseYear || '2022',
          date: `${releaseYear || '2022'}-01-01`,
          imdbId,
        });
        const validLinks = Array.isArray(zxcRes?.links)
          ? zxcRes.links.filter((l: any) => l?.link && !l.onlyHevc)
          : [];
        return validLinks.map((l: any, i: number) => ({
          id: `vegamovies-${srvName}-${i + 1}`,
          provider: 'vegamovies' as const,
          url: l.link,
          quality: l.quality || '1080p',
          label: `Vegamovies | 1080p FHD [Hindi & Dual Audio]`,
          type: (l.type === 'dash' || l.link.includes('.mpd') || l.link.includes('andromeda') ? 'dash' : 'hls') as 'dash' | 'hls',
          isEmbed: false,
          onlyHevc: false,
          lang: 'hi',
          langName: 'Hindi',
          multiLangs: ['hi', 'en'],
        }));
      } catch {
        return [];
      }
    });

    // 2. Fetch direct vegamovies1.co.in scraper sources (filtering out raw unseekable Google Drive download links)
    const directPromise = resolveVegaMoviesDirect({
      tmdbId: cleanId,
      mediaType,
      season,
      episode,
      title,
      year: releaseYear,
      imdbId,
      signal: params.parentSignal,
    }).then((sources) => {
      return sources.filter((s) => {
        if (!s.url) return false;
        const lower = s.url.toLowerCase();
        // Googleusercontent download links do NOT support Range requests (HTTP 200) and break forwarding in HTML5 video
        if (lower.includes('googleusercontent.com') || lower.includes('.mkv')) return false;
        return true;
      });
    }).catch(() => [] as VegaResolvedSource[]);

    const [zxcResults, directSources] = await Promise.all([
      Promise.all(zxcPromises),
      directPromise,
    ]);

    const seenUrls = new Set<string>();
    const combinedSources: NxshaSource[] = [];

    for (const list of zxcResults) {
      for (const src of list) {
        if (!src?.url || seenUrls.has(src.url)) continue;
        seenUrls.add(src.url);
        combinedSources.push(src);
      }
    }

    for (const src of directSources) {
      if (!src?.url || seenUrls.has(src.url)) continue;
      seenUrls.add(src.url);
      combinedSources.push({
        id: src.id,
        provider: 'vegamovies',
        url: src.url,
        quality: src.quality,
        label: src.label,
        type: (src.type || (src.url.includes('.m3u8') ? 'hls' : 'hls')) as any,
        lang: src.lang || 'hi',
        langName: src.langName || 'Hindi',
        multiLangs: src.multiLangs || ['hi', 'en'],
      });
    }

    // 3. Fallback to NXSHA fast streams if needed
    if (combinedSources.length === 0 && !params.parentSignal?.aborted) {
      for (const backupProv of ['rive-citadel', 'watchout']) {
        try {
          const backupRes = await fetchNxshaSources(
            backupProv,
            cleanId,
            mediaType,
            season,
            episode,
            imdbId,
            params.parentSignal
          );
          if (backupRes.sources.length > 0) {
            for (const s of backupRes.sources) {
              if (s.url.includes('googleusercontent.com') || s.url.includes('.mkv')) continue;
              combinedSources.push({
                ...s,
                provider: 'vegamovies',
                label: s.label ? `Vegamovies | ${s.label}` : 'Vegamovies | 1080p',
                type: s.type || 'hls',
              });
            }
            if (combinedSources.length > 0) break;
          }
        } catch {
          // continue
        }
      }
    }

    const dubs: RawOrionDub[] = [
      {
        type: 0,
        lang: 'orig',
        name: 'Original Audio',
        label: 'Original Audio',
        original: true,
      },
      {
        type: 0,
        lang: 'hi',
        name: 'Hindi dub',
        label: 'Hindi',
        original: false,
      },
      {
        type: 0,
        lang: 'en',
        name: 'English dub',
        label: 'English',
        original: false,
      },
    ];

    return {
      success: combinedSources.length > 0,
      sources: combinedSources,
      subtitles: [],
      dubs,
      matchedPost: null,
      indStreamImdbId: imdbId || null,
    };
  };

  const promise = runResolution();
  vegaCombinedCache.set(cacheKey, { expiresAt: now + 60_000, promise });
  return promise;
}

// GET /api/vegamovies/catalog - Live homepage & search scraper for https://vegamovies1.co.in/
apiRouter.get('/vegamovies/catalog', async (req, res) => {
  const query = String(req.query.q || req.query.story || req.query.search || '').trim();
  const targetUrl = query
    ? `${VEGAMOVIES_BASE_URL}/?do=search&subaction=search&story=${encodeURIComponent(query)}`
    : `${VEGAMOVIES_BASE_URL}/`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': COMMON_HEADERS['User-Agent'],
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: `${VEGAMOVIES_BASE_URL}/`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: `Vegamovies upstream HTTP ${upstream.status}`,
        posts: [],
      });
    }
    const html = await upstream.text();
    const posts = parseVegaSearchHtml(html);
    return res.json({
      success: true,
      source: VEGAMOVIES_BASE_URL,
      query: query || null,
      count: posts.length,
      posts,
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err?.message || 'Failed to fetch Vegamovies catalog',
      posts: [],
    });
  }
});

// GET & POST /api/vegamovies/resolve - Dedicated Vegamovies stream resolver
const handleVegaMoviesResolve = async (req: express.Request, res: express.Response) => {
  const params = req.method === 'POST' ? req.body || {} : req.query || {};
  const tmdbId = String(params.tmdbId || params.id || '128').trim();
  const mediaType = (
    String(params.mediaType || params.type || 'movie').trim().toLowerCase() === 'tv'
      ? 'tv'
      : 'movie'
  ) as 'movie' | 'tv';
  const season = Math.max(1, Number.parseInt(String(params.season || '1'), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(params.episode || '1'), 10) || 1);
  const title = String(params.title || '').trim();
  const releaseYear = String(params.year || params.releaseYear || '').trim();
  const imdbId = String(params.imdbId || '').trim();

  try {
    const result = await resolveVegaMoviesCombined({
      tmdbId,
      mediaType,
      season,
      episode,
      title,
      releaseYear,
      imdbId,
    });
    const primary = result.sources[0] || null;
    return res.json({
      success: result.success,
      server: 'vegamovies',
      matchedPost: result.matchedPost,
      indStreamImdbId: result.indStreamImdbId,
      link: primary?.url || null,
      type: primary?.type || 'hls',
      sources: result.sources,
      links: result.sources.map((s) => ({
        link: s.url,
        type: s.type || 'hls',
        quality: s.quality || '1080p',
        label: s.label || 'Vegamovies | 1080p',
        lang: s.lang || 'hi',
      })),
      dubs: result.dubs,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      server: 'vegamovies',
      error: err?.message || 'Vegamovies resolution failed',
      sources: [],
      links: [],
    });
  }
};

apiRouter.get('/vegamovies/resolve', handleVegaMoviesResolve);
apiRouter.post('/vegamovies/resolve', handleVegaMoviesResolve);

// Mount on /api, /api/index, and also root / so any routing setup (Vercel rewrite, direct path, etc.) succeeds!
app.use('/api', apiRouter);
app.use('/api/index', apiRouter);
app.use(apiRouter);

export { app, fetchTmdbDetailsWithFallback, resolveForServer };
export default app;
