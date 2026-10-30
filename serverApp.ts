import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import {
  getCatalogSeasonEpisodes,
  getEpisodeTimingMetadata,
  getSeriesImdbId,
  getSeriesTvdbId,
  getMediaByTmdbId,
} from './src/data/tmdbCatalog.js';
import { normalizeIntervalSeconds, MediaType } from './src/utils/urlBuilder.js';

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

const FIELD_MAP: Record<string, string> = {
  id: 'a7f39c821d604e5b91e547b',
  fToken: 'e83c4b719a52105479c1635a',
  ts: '61d9a5274c8e3b2f38c291e6',
  token: 'c492f7a183d01e436c538a716d',
  title: '5e28c9147a06d1e29f3674b392a1',
  year: 'b731e6c94f8675f8341c306e',
  season: 'd8427b5c38a2f957c3613e85b',
  episode: '91c6ea753d1f785c92346b713d',
  imdbId: 'f35a81943265e871c4933a725f',
  path: '6b491e258d392e7561a9384c',
  mediaType: 'c81b306d28147a35632e816b',
  date: 'e164931a39e5814b3027',
  latestDate: 'e9543416ad739e5814b3027',
};

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
      const timer = setTimeout(() => controller.abort(), 4500);
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
    const resZxc = await tryTypeOnHost('https://zxcstream.cc', type);
    if (resZxc) return resZxc;
    return await tryTypeOnHost('https://vidstuck.cc', type);
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

  const queryProvider = async (
    baseHost: string,
    tokenEndpoint: string,
    sourcesPrefix: string,
    serverKey: string
  ) => {
    const refererUrl = `${baseHost}/player/${mediaType}/${tmdbId}${
      mediaType === 'tv' ? `/${season}/${episode}` : ''
    }`;

    const tokenBody: Record<string, any> = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: serverKey,
    };

    if (mediaType === 'tv') {
      tokenBody[FIELD_MAP.season] = Number(season) || 1;
      tokenBody[FIELD_MAP.episode] = Number(episode) || 1;
    }

    let sourceData: any = null;
    let lastError = 'Request failed';

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const tokenController = new AbortController();
        const tokenTimer = setTimeout(() => tokenController.abort(), 4500);
        const tokenRes = await fetch(`${baseHost}${tokenEndpoint}`, {
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

        if (!tokenRes.ok) {
          lastError = `Token HTTP ${tokenRes.status}`;
          if (attempt === 0 && (tokenRes.status >= 500 || tokenRes.status === 429)) {
            await new Promise((r) => setTimeout(r, 200));
            continue;
          }
          return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
        }

        const tokenData = await tokenRes.json();
        if (!tokenData.token) {
          return { success: false, server: targetServer, error: 'No token', links: [], dubs: [] };
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
        const srcTimer = setTimeout(() => srcController.abort(), 5000);
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
            await new Promise((r) => setTimeout(r, 250));
            continue;
          }
          return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
        }

        sourceData = await sourceRes.json();
        break;
      } catch (err: any) {
        lastError = err?.message || 'Network error';
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 200));
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
          const timer = setTimeout(() => controller.abort(), 4500);
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
          verifiedLinks.push({ ...item, type: 'dash', onlyHevc, hasAudio });
        } catch {
          // Skip broken DASH manifest
        }
      } else if (isWorkerUrl) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3000);
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

    const verifiedAudioLink =
      verifiedLinks.find((l) => l.hasAudio !== false)?.link || verifiedLinks[0]?.link || null;

    return {
      ...sourceData,
      success: verifiedLinks.length > 0,
      links: verifiedLinks,
      dubAudioUrl: verifiedAudioLink,
      server: targetServer,
    };
  };

  // For 'atlas' (Atlas III), vidstuck.cc/backend/servers/atlas provides the active H.264 HLS edge stream,
  // whereas zxcstream.cc/backend_/sources/atlas points to deprecated workers.dev links.
  if (targetServer === 'atlas') {
    const vidstuckAtlas = await queryProvider(
      'https://vidstuck.cc',
      '/backend/qwerty',
      '/backend/servers',
      'atlas'
    );
    if (vidstuckAtlas.links && vidstuckAtlas.links.length > 0) {
      return vidstuckAtlas;
    }
  }

  const primaryRes = await queryProvider(
    'https://zxcstream.cc',
    '/backend/fucku',
    '/backend_/sources',
    targetServer
  );
  if (primaryRes.links && primaryRes.links.length > 0) {
    return primaryRes;
  }

  // Automatic failover to vidstuck.cc mirror backend
  const vidstuckMap: Record<string, string> = {
    orion: 'orion',
    valstrax: 'andromeda',
    atlas: 'atlas',
    ursa: 'ursa',
    alatreon: 'atlas',
    daedalus: 'daedalus',
  };
  const mappedKey = vidstuckMap[targetServer] || targetServer;
  const fallbackRes = await queryProvider(
    'https://vidstuck.cc',
    '/backend/qwerty',
    '/backend/servers',
    mappedKey
  );
  if (fallbackRes.links && fallbackRes.links.length > 0) {
    return {
      ...fallbackRes,
      dubs:
        Array.isArray(primaryRes.dubs) && primaryRes.dubs.length > 0
          ? primaryRes.dubs
          : fallbackRes.dubs,
      server: targetServer,
    };
  }

  return primaryRes;
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

    if ((!result.links || result.links.length === 0) && autoFallback) {
      const fallbackServers = ['valstrax', 'atlas', 'ursa', 'alatreon', 'daedalus', 'orion'].filter(
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
    const fuckuBody: Record<string, any> = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: 'subtitle_',
    };
    if (mediaType === 'tv') {
      fuckuBody[FIELD_MAP.season] = Number(season) || 1;
      fuckuBody[FIELD_MAP.episode] = Number(episode) || 1;
    }

    const tokenRes = await fetch('https://zxcstream.cc/backend/fucku', {
      method: 'POST',
      headers: COMMON_HEADERS,
      body: JSON.stringify(fuckuBody),
    });
    if (!tokenRes.ok) return res.json({ subtitles: [] });
    const tokenData = await tokenRes.json();
    if (!tokenData.token) return res.json({ subtitles: [] });

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

    const subRes = await fetch(`https://zxcstream.cc/backend_/subtitle_?${query.toString()}`, {
      headers: COMMON_HEADERS,
    });
    if (!subRes.ok) return res.json({ subtitles: [] });
    const subData = await subRes.json();
    const list = Array.isArray(subData) ? subData : subData.subtitles || [];
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
    const fuckuBody: Record<string, any> = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: 'subtitle_',
    };
    if (mediaType === 'tv') {
      fuckuBody[FIELD_MAP.season] = Number(season) || 1;
      fuckuBody[FIELD_MAP.episode] = Number(episode) || 1;
    }

    const tokenRes = await fetch('https://zxcstream.cc/backend/fucku', {
      method: 'POST',
      headers: COMMON_HEADERS,
      body: JSON.stringify(fuckuBody),
    });
    if (!tokenRes.ok) return res.json({ captions: [] });
    const tokenData = await tokenRes.json();
    if (!tokenData.token) return res.json({ captions: [] });

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

// Universal Proxy endpoint for subtitles (.vtt, .srt) & stream manifest chunks
apiRouter.get('/stream/proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid or missing target URL');
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': COMMON_HEADERS['User-Agent'],
        Referer: 'https://zxcstream.cc/',
        Origin: 'https://zxcstream.cc',
      },
    });

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

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

// Mount on /api, /api/index, and also root / so any routing setup (Vercel rewrite, direct path, etc.) succeeds!
app.use('/api', apiRouter);
app.use('/api/index', apiRouter);
app.use(apiRouter);

export { app, fetchTmdbDetailsWithFallback, resolveForServer };
export default app;
