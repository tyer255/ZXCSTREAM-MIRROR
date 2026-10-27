import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

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

async function fetchTmdbDetailsWithFallback(mediaType: string, tmdbId: string, language = 'en-US') {
  const tryType = async (type: string) => {
    const res = await fetch(
      `https://zxcstream.cc/backend/tmdb/details/${encodeURIComponent(type)}/${encodeURIComponent(tmdbId)}?language=${encodeURIComponent(language)}`,
      {
        headers: {
          ...COMMON_HEADERS,
          Referer: `https://zxcstream.cc/player/${type}/${tmdbId}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (!data.title && !data.name && !data.id)) return null;
    return { ...data, resolvedMediaType: type };
  };

  const primary = await tryType(mediaType);
  if (primary) return primary;

  const altType = mediaType === 'movie' ? 'tv' : 'movie';
  return await tryType(altType);
}

// 1. TMDB Details Proxy Route (with automatic movie <-> tv fallback if ID belongs to the other type)
app.get('/api/tmdb/details/:mediaType/:tmdbId', async (req, res) => {
  const { mediaType, tmdbId } = req.params;
  const language = (req.query.language as string) || 'en-US';

  try {
    const data = await fetchTmdbDetailsWithFallback(mediaType, tmdbId, language);
    if (!data) {
      return res.status(404).json({ error: 'TMDB Details not found' });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. TMDB TV Season Episodes Proxy Route
app.get('/api/tmdb/season/:tmdbId/season/:seasonNumber', async (req, res) => {
  const { tmdbId, seasonNumber } = req.params;
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
      return res.status(response.status).json({ episodes: [] });
    }
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.json({ episodes: [] });
  }
});

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

  const fuckuBody: Record<string, any> = {
    [FIELD_MAP.id]: String(tmdbId),
    [FIELD_MAP.mediaType]: mediaType,
    [FIELD_MAP.path]: targetServer,
  };

  if (mediaType === 'tv') {
    fuckuBody[FIELD_MAP.season] = Number(season) || 1;
    fuckuBody[FIELD_MAP.episode] = Number(episode) || 1;
  }

  const tokenRes = await fetch('https://zxcstream.cc/backend/fucku', {
    method: 'POST',
    headers: {
      ...COMMON_HEADERS,
      Referer: `https://zxcstream.cc/player/${mediaType}/${tmdbId}${mediaType === 'tv' ? `/${season}/${episode}` : ''}`,
    },
    body: JSON.stringify(fuckuBody),
  });

  if (!tokenRes.ok) {
    return { success: false, server: targetServer, error: 'Token request failed', links: [] };
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.token) {
    return { success: false, server: targetServer, error: 'No token', links: [] };
  }

  const query = new URLSearchParams({
    [FIELD_MAP.id]: String(tmdbId),
    [FIELD_MAP.path]: targetServer,
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

  if (dubCode && dubType !== '') {
    query.set('dubCode', dubCode);
    query.set('dubType', dubType);
  }

  const sourceRes = await fetch(
    `https://zxcstream.cc/backend_/sources/${encodeURIComponent(targetServer)}?${query.toString()}`,
    {
      headers: {
        ...COMMON_HEADERS,
        Referer: `https://zxcstream.cc/player/${mediaType}/${tmdbId}${mediaType === 'tv' ? `/${season}/${episode}` : ''}`,
      },
    }
  );

  if (!sourceRes.ok) {
    return { success: false, server: targetServer, error: `HTTP ${sourceRes.status}`, links: [] };
  }

  const sourceData = await sourceRes.json();
  const rawLinks = (sourceData.links || []).map((item: any) => ({
    ...item,
    link: decryptCryptoJS(item.link, DECRYPTION_KEY),
  }));

  // Verify DASH links actually return a valid MPD with video representations
  const verifiedLinks: any[] = [];
  for (const item of rawLinks) {
    if (!item.link || !item.link.startsWith('http')) continue;
    const isDash = item.type === 'dash' || item.link.includes('andromeda') || item.link.includes('.mpd');
    if (isDash) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const mpdRes = await fetch(item.link, {
          headers: { Referer: 'https://zxcstream.cc/', Origin: 'https://zxcstream.cc' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!mpdRes.ok) continue;
        const mpdText = await mpdRes.text();
        if (!mpdText.includes('<MPD') || !mpdText.includes('video')) continue;
        const codecs = mpdText.match(/codecs="([^"]+)"/g) || [];
        const videoCodecs = codecs.filter((c) => !c.includes('mp4a') && !c.includes('ac-3') && !c.includes('ec-3'));
        const onlyHevc =
          videoCodecs.length > 0 &&
          videoCodecs.every((c) => c.includes('hev1') || c.includes('hvc1'));
        verifiedLinks.push({ ...item, onlyHevc });
      } catch {
        // Skip broken DASH manifest
      }
    } else {
      verifiedLinks.push({ ...item, onlyHevc: false });
    }
  }

  return {
    ...sourceData,
    success: verifiedLinks.length > 0,
    links: verifiedLinks,
    server: targetServer,
  };
}

// 3. Stream Source Resolver Route
app.post('/api/stream/resolve', async (req, res) => {
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
  let { title = '', releaseYear = '', date = '', imdbId = '', lastAirDate = '' } = req.body;

  try {
    if (!title || !date || !releaseYear) {
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

// 4. Subtitles Resolver Route
app.post('/api/subtitles/resolve', async (req, res) => {
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
    if (!tokenRes.ok) return res.json([]);
    const tokenData = await tokenRes.json();
    if (!tokenData.token) return res.json([]);

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
    if (!subRes.ok) return res.json([]);
    const subData = await subRes.json();
    return res.json(Array.isArray(subData) ? subData : subData.subtitles || []);
  } catch {
    return res.json([]);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ZXC[STREAM] full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
