import crypto from 'node:crypto';
import { detectAllStreamLanguages, detectSingleStreamLanguage } from './urlBuilder.js';

export const VEGAMOVIES_BASE_URL = 'https://vegamovies1.co.in';

export interface VegaSearchCard {
  id: string;
  url: string;
  title: string;
  year: string;
  qualityBadge: string;
  rating: string;
  posterUrl: string;
  isSeries: boolean;
}

export interface VegaNexDriveEntry {
  url: string;
  quality: string;
  label: string;
  isHevc: boolean;
}

export interface VegaDetailMetadata {
  imdbId: string | null;
  fastDlLinks: Array<{ url: string; quality: string; label: string; isHevc: boolean }>;
  nexDriveLinks: VegaNexDriveEntry[];
  languages: string[];
}

export interface VegaResolvedSource {
  id: string;
  provider: 'vegamovies';
  url: string;
  quality: string;
  label: string;
  type: 'mp4' | 'hls';
  isEmbed: boolean;
  onlyHevc: boolean;
  lang?: string;
  langName?: string;
  multiLangs?: string[];
}

const VEGA_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Normalizes a movie or TV series title into a clean search query for vegamovies1.co.in
 */
export function normalizeVegaSearchQuery(title: string): string {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts significant lowercase word tokens from a title for accurate post matching
 */
export function tokenizeVegaTitle(title: string): string[] {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from']);
  return normalizeVegaSearchQuery(title)
    .toLowerCase()
    .split(' ')
    .filter((w) => w.length >= 2 && !stopWords.has(w));
}

/**
 * Parses movie/series cards from vegamovies1.co.in homepage or search HTML
 */
export function parseVegaSearchHtml(html: string): VegaSearchCard[] {
  if (!html || typeof html !== 'string') return [];
  const results: VegaSearchCard[] = [];
  const seenUrls = new Set<string>();

  // Match <article> blocks first to avoid sidebar / footer noise when possible
  const articleRegex = /<article[\s\S]*?<\/article>/gi;
  const articleBlocks = html.match(articleRegex) || [html];

  for (const block of articleBlocks) {
    const linkMatch = block.match(
      /href=["'](https?:\/\/vegamovies1\.co\.in\/(\d+)-[a-z0-9-]+\.html)["']/i
    );
    if (!linkMatch) continue;
    const url = linkMatch[1];
    const id = linkMatch[2];
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const imgAltMatch = block.match(/<img[^>]+alt=["']([^"']+)["'][^>]*>/i);
    const h3TextMatch = block.match(/<h3[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const rawTitle = (
      imgAltMatch?.[1] ||
      h3TextMatch?.[1]?.replace(/<[^>]+>/g, '') ||
      url.split('/').pop()?.replace(/^\d+-|\.html$/g, '').replace(/-/g, ' ') ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim();

    const posterMatch = block.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/i);
    let posterUrl = posterMatch?.[1] || '';
    if (posterUrl && posterUrl.startsWith('/')) {
      posterUrl = `${VEGAMOVIES_BASE_URL}${posterUrl}`;
    }

    const yearMatch = rawTitle.match(/\b(19\d{2}|20\d{2})\b/) || url.match(/-(19\d{2}|20\d{2})-/);
    const year = yearMatch ? yearMatch[1] : '';

    const qualityMatch = rawTitle.match(/\b(4K|2160p|1080p|720p|480p|WEB-DL|BluRay|HDRip|HDTC)\b/i);
    const qualityBadge = qualityMatch ? qualityMatch[1].toUpperCase() : 'HD';

    const ratingMatch = block.match(/(\d+(?:\.\d+)?)\/10/);
    const rating = ratingMatch ? ratingMatch[1] : '';

    const lowerCheck = `${rawTitle} ${url}`.toLowerCase();
    const isSeries =
      /\b(season|s\d{1,2}|ep\s*-?\s*\d+|all-episodes|tv-show|web-series|series)\b/i.test(
        lowerCheck
      );

    results.push({
      id,
      url,
      title: rawTitle,
      year,
      qualityBadge,
      rating,
      posterUrl,
      isSeries,
    });
  }

  return results;
}

/**
 * Scores a candidate vegamovies post against target movie/TV criteria.
 * Returns <= 0 when the candidate does not match (e.g., wrong title or movie vs TV mismatch).
 */
export function scoreVegaCandidatePost(
  postUrl: string,
  postTitle: string,
  target: {
    title: string;
    year?: string;
    mediaType: 'movie' | 'tv';
    season?: number;
  }
): number {
  const combined = `${postTitle} ${postUrl}`.toLowerCase();
  const slugPart = (postUrl.split('/').pop() || '').replace(/^\d+-|\.html$/g, '').toLowerCase();

  const tokens = tokenizeVegaTitle(target.title);
  if (tokens.length === 0) return 0;

  let matchedTokens = 0;
  for (const token of tokens) {
    if (slugPart.includes(token) || combined.includes(token)) {
      matchedTokens++;
    }
  }

  // Require strong token overlap so unrelated sidebar posts (like "jeevan-bheema-yojana") are rejected
  const overlapRatio = matchedTokens / tokens.length;
  if (overlapRatio < 0.65) {
    return 0;
  }

  const isSeriesPost =
    /\b(season[-\s]*\d+|s0?\d+|ep[-\s]*\d+|all[-\s]*episodes|tv[-\s]*show)\b/i.test(combined);

  if (target.mediaType === 'movie' && isSeriesPost) {
    return 0;
  }

  let score = Math.round(overlapRatio * 100);

  if (target.mediaType === 'tv') {
    const sNum = Number(target.season) || 1;
    const padded = sNum < 10 ? `0${sNum}` : `${sNum}`;
    const seasonRegex = new RegExp(
      `\\b(season[-\\s]*0?${sNum}|s${padded}|s${sNum})\\b`,
      'i'
    );
    if (seasonRegex.test(combined)) {
      score += 60;
    } else if (isSeriesPost) {
      // Different season
      return 0;
    }
  }

  if (target.year) {
    if (combined.includes(target.year)) {
      score += 35;
    } else {
      const postYearMatch = slugPart.match(/\b(19\d{2}|20\d{2})\b/);
      if (postYearMatch && postYearMatch[1] !== target.year && target.mediaType === 'movie') {
        score -= 40;
      }
    }
  }

  // Prefer WEB-DL / BluRay / Dual Audio over CAMRip / HDTC
  if (/\b(web-?dl|bluray|brrip|ds4k)\b/i.test(combined)) {
    score += 20;
  }
  if (/\b(camrip|hdcam|hdtc|hdts)\b/i.test(combined)) {
    score -= 15;
  }
  if (/\b(dual[-\s]*audio|hindi)\b/i.test(combined)) {
    score += 10;
  }

  return score;
}

/**
 * Extracts IMDb ID (`IndStreamPlayerConfigs`), direct `fast-dl.one` links, and `nexdrive` links
 * from a vegamovies1.co.in movie/series detail page.
 */
export function extractVegaDetailMetadata(html: string): VegaDetailMetadata {
  if (!html || typeof html !== 'string') {
    return { imdbId: null, fastDlLinks: [], nexDriveLinks: [], languages: [] };
  }

  const indMatch =
    html.match(/IndStreamPlayerConfigs[\s\S]*?src:\s*['"](tt\d+)['"]/i) ||
    html.match(/imdb\.com\/title\/(tt\d+)/i) ||
    html.match(/\/play\/(tt\d+)/i);
  const imdbId = indMatch ? indMatch[1].trim() : null;

  const detectedLangs = detectAllStreamLanguages(html.slice(0, 12000)).map((l) => l.code);

  const parseContextQuality = (contextText: string): { quality: string; isHevc: boolean; label: string } => {
    const clean = contextText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const qMatch = clean.match(/\b(2160p|4K|1080p|720p|480p)\b/i);
    const quality = qMatch ? (qMatch[1].toUpperCase() === '4K' ? '2160p' : qMatch[1].toLowerCase()) : '720p';
    const isHevc = /\b(hevc|x265|10\s*bit)\b/i.test(clean);
    const sizeMatch = clean.match(/\[(\d+(?:\.\d+)?\s*(?:MB|GB))\]/i);
    const sizeStr = sizeMatch ? ` [${sizeMatch[1]}]` : '';
    return {
      quality,
      isHevc,
      label: `Vegamovies | ${quality}${sizeStr}${isHevc ? ' HEVC' : ' x264'}`,
    };
  };

  const getNearestHeadingContext = (idx: number): string => {
    const before = html.slice(Math.max(0, idx - 500), idx);
    const lastHeadingIdx = Math.max(
      before.lastIndexOf('<h2'),
      before.lastIndexOf('<h3'),
      before.lastIndexOf('<h4'),
      before.lastIndexOf('<h5'),
      before.lastIndexOf('<hr')
    );
    const relevantBefore = lastHeadingIdx >= 0 ? before.slice(lastHeadingIdx) : before.slice(-200);
    const after = html.slice(idx, Math.min(html.length, idx + 140));
    return `${relevantBefore} ${after}`;
  };

  const fastDlLinks: Array<{ url: string; quality: string; label: string; isHevc: boolean }> = [];
  const seenFast = new Set<string>();
  const fastMatches = Array.from(
    html.matchAll(/href=["'](https?:\/\/fast-dl\.[a-z]+\/dl\/[a-zA-Z0-9]+)["']/gi)
  );
  for (const m of fastMatches) {
    const url = m[1];
    if (seenFast.has(url)) continue;
    seenFast.add(url);
    const idx = m.index || 0;
    const meta = parseContextQuality(getNearestHeadingContext(idx));
    fastDlLinks.push({ url, ...meta });
  }

  const nexDriveLinks: VegaNexDriveEntry[] = [];
  const seenNex = new Set<string>();
  const nexMatches = Array.from(
    html.matchAll(/href=["'](https?:\/\/nexdrive\.[a-z]+\/genxfm[a-zA-Z0-9]+\/?)["']/gi)
  );
  for (const m of nexMatches) {
    const url = m[1];
    if (seenNex.has(url)) continue;
    seenNex.add(url);
    const idx = m.index || 0;
    const meta = parseContextQuality(getNearestHeadingContext(idx));
    nexDriveLinks.push({ url, ...meta });
  }

  return {
    imdbId,
    fastDlLinks,
    nexDriveLinks,
    languages: detectedLangs,
  };
}

/**
 * Extracts `https://fast-dl.one/dl/<code>` links from a `nexdrive.you` (movie) or `nexdrive.bet` (TV episode) page.
 */
export function extractFastDlFromNexDriveHtml(
  html: string,
  mediaType: 'movie' | 'tv',
  episode = 1
): string[] {
  if (!html || typeof html !== 'string') return [];

  if (mediaType === 'tv') {
    const targetEp = Math.max(1, Number(episode) || 1);
    const paddedEp = targetEp < 10 ? `0${targetEp}` : `${targetEp}`;
    // Match <section class="episode"> blocks
    const sections = html.match(/<section[^>]*class=["'][^"']*episode[^"']*["'][\s\S]*?<\/section>/gi) || [];
    for (const sec of sections) {
      const epHeaderMatch = sec.match(/Episodes?:\s*0?(\d+)\b/i) || sec.match(/\bEP(?:ISODE)?\s*[-:]?\s*0?(\d+)\b/i);
      if (epHeaderMatch && Number.parseInt(epHeaderMatch[1], 10) === targetEp) {
        const links = Array.from(
          sec.matchAll(/https?:\/\/fast-dl\.[a-z]+\/dl\/[a-zA-Z0-9]+/gi)
        ).map((m) => m[0]);
        if (links.length > 0) return Array.from(new Set(links));
      }
    }

    // Fallback: look around "Episodes: X" or "Episode X" heading in raw HTML
    const headingRegex = new RegExp(
      `(?:Episodes?\\s*:\\s*(?:${targetEp}|${paddedEp})|\\bEpisode\\s+(?:${targetEp}|${paddedEp})\\b)[\\s\\S]{0,600}?(https?:\\/\\/fast-dl\\.[a-z]+\\/dl\\/[a-zA-Z0-9]+)`,
      'i'
    );
    const fallbackMatch = html.match(headingRegex);
    if (fallbackMatch?.[1]) {
      return [fallbackMatch[1]];
    }
    return [];
  }

  const allLinks = Array.from(
    html.matchAll(/https?:\/\/fast-dl\.[a-z]+\/dl\/[a-zA-Z0-9]+/gi)
  ).map((m) => m[0]);
  return Array.from(new Set(allLinks));
}

/**
 * Parses the `dl.php?code=...&secret=...` preparation URL from a `fast-dl.one/dl/<code>` HTML page.
 */
export function parseFastDlButtonHref(html: string, baseUrl: string): string | null {
  if (!html || typeof html !== 'string') return null;
  const hrefMatch =
    html.match(/id=["'](?:download-button|vd)["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/href=["'](dl\.php\?[^"']+)["']/i);
  if (!hrefMatch?.[1]) return null;
  try {
    const rawHref = hrefMatch[1].replace(/&amp;/g, '&').trim();
    const origin = new URL(baseUrl).origin;
    const normalizedPath = rawHref.startsWith('http')
      ? rawHref
      : `${origin}/${rawHref.replace(/^\/+/, '')}`;
    const resolved = new URL(normalizedPath);
    resolved.searchParams.set('prepare', '1');
    resolved.searchParams.set('hash', crypto.randomBytes(12).toString('hex'));
    resolved.searchParams.set('cfs', crypto.randomBytes(8).toString('hex'));
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Resolves a `https://fast-dl.one/dl/<code>` page into a direct GoogleCDN (`video-downloads.googleusercontent.com`) video stream URL.
 */
export async function resolveFastDlCodeToStreamUrl(
  fastDlUrl: string,
  parentSignal?: AbortSignal
): Promise<string | null> {
  try {
    const ctrl1 = new AbortController();
    const t1 = setTimeout(() => ctrl1.abort(), 3200);
    if (parentSignal) {
      if (parentSignal.aborted) {
        clearTimeout(t1);
        return null;
      }
      parentSignal.addEventListener('abort', () => ctrl1.abort(), { once: true });
    }

    const res1 = await fetch(fastDlUrl, {
      headers: {
        'User-Agent': VEGA_USER_AGENT,
        Referer: `${VEGAMOVIES_BASE_URL}/`,
      },
      signal: ctrl1.signal,
    });
    clearTimeout(t1);
    if (!res1.ok) return null;

    const cookies = (res1.headers as any).getSetCookie?.() || [];
    const cookieHeader = Array.isArray(cookies)
      ? cookies.map((c: string) => c.split(';')[0]).join('; ')
      : '';

    const html = await res1.text();
    const prepareUrl = parseFastDlButtonHref(html, res1.url || fastDlUrl);
    if (!prepareUrl) return null;

    const ctrl2 = new AbortController();
    const t2 = setTimeout(() => ctrl2.abort(), 3500);
    if (parentSignal) {
      parentSignal.addEventListener('abort', () => ctrl2.abort(), { once: true });
    }

    const res2 = await fetch(prepareUrl, {
      headers: {
        'User-Agent': VEGA_USER_AGENT,
        Accept: 'application/json',
        Referer: res1.url || fastDlUrl,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      signal: ctrl2.signal,
    });
    clearTimeout(t2);
    if (!res2.ok) return null;

    const data = await res2.json().catch(() => null);
    if (data && data.ok && typeof data.url === 'string' && data.url.startsWith('http')) {
      return data.url.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Searches `https://vegamovies1.co.in/` and resolves direct playable GoogleCDN video streams
 * for the requested movie or TV series episode.
 */
export async function resolveVegaMoviesDirect(params: {
  tmdbId: string;
  imdbId?: string;
  title: string;
  year?: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  signal?: AbortSignal;
}): Promise<VegaResolvedSource[]> {
  const { title, year, imdbId, mediaType, season = 1, episode = 1, signal } = params;
  const cleanQuery = normalizeVegaSearchQuery(title);
  if (!cleanQuery) return [];

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2800);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        return [];
      }
      signal.addEventListener('abort', () => ctrl.abort(), { once: true });
    }

    const searchUrl = `${VEGAMOVIES_BASE_URL}/?do=search&subaction=search&story=${encodeURIComponent(
      cleanQuery
    )}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': VEGA_USER_AGENT,
        Referer: `${VEGAMOVIES_BASE_URL}/`,
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!searchRes.ok) return [];

    const searchHtml = await searchRes.text();
    const cards = parseVegaSearchHtml(searchHtml);

    const scored = cards
      .map((card) => ({
        card,
        score: scoreVegaCandidatePost(card.url, card.title, {
          title,
          year,
          mediaType,
          season,
        }),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return [];

    // Inspect top 2 candidate detail pages
    for (const candidate of scored.slice(0, 2)) {
      if (signal?.aborted) break;
      try {
        const detailCtrl = new AbortController();
        const detailTimer = setTimeout(() => detailCtrl.abort(), 2500);
        if (signal) {
          signal.addEventListener('abort', () => detailCtrl.abort(), { once: true });
        }
        const detailRes = await fetch(candidate.card.url, {
          headers: {
            'User-Agent': VEGA_USER_AGENT,
            Referer: searchUrl,
          },
          signal: detailCtrl.signal,
        });
        clearTimeout(detailTimer);
        if (!detailRes.ok) continue;

        const detailHtml = await detailRes.text();
        const detailMeta = extractVegaDetailMetadata(detailHtml);

        // If both page and caller have an IMDb ID and they don't match, skip this post
        if (
          imdbId &&
          detailMeta.imdbId &&
          imdbId.toLowerCase() !== detailMeta.imdbId.toLowerCase()
        ) {
          continue;
        }

        const fastDlCandidates: Array<{ url: string; quality: string; label: string; isHevc: boolean }> =
          [];

        if (mediaType === 'movie' && detailMeta.fastDlLinks.length > 0) {
          fastDlCandidates.push(...detailMeta.fastDlLinks);
        }

        // Follow up to 2 nexdrive links (preferring non-HEVC x264 720p/1080p)
        if (fastDlCandidates.length === 0 && detailMeta.nexDriveLinks.length > 0) {
          const sortedNex = [...detailMeta.nexDriveLinks].sort((a, b) => {
            if (a.isHevc !== b.isHevc) return a.isHevc ? 1 : -1;
            const qScore = (q: string) => (q === '1080p' ? 3 : q === '720p' ? 2 : 1);
            return qScore(b.quality) - qScore(a.quality);
          });

          const nexPromises = sortedNex.slice(0, 2).map(async (nexItem) => {
            try {
              const nexCtrl = new AbortController();
              const nexTimer = setTimeout(() => nexCtrl.abort(), 2500);
              if (signal) {
                signal.addEventListener('abort', () => nexCtrl.abort(), { once: true });
              }
              const nexRes = await fetch(nexItem.url, {
                headers: {
                  'User-Agent': VEGA_USER_AGENT,
                  Referer: candidate.card.url,
                },
                signal: nexCtrl.signal,
              });
              clearTimeout(nexTimer);
              if (!nexRes.ok) return [];
              const nexHtml = await nexRes.text();
              const extractedUrls = extractFastDlFromNexDriveHtml(nexHtml, mediaType, episode);
              return extractedUrls.map((u) => ({
                url: u,
                quality: nexItem.quality,
                label: nexItem.label,
                isHevc: nexItem.isHevc,
              }));
            } catch {
              return [];
            }
          });

          const nestedLists = await Promise.all(nexPromises);
          for (const list of nestedLists) {
            fastDlCandidates.push(...list);
          }
        }

        if (fastDlCandidates.length === 0) continue;

        // Sort so non-HEVC (x264) comes first, then 1080p / 720p / 480p
        fastDlCandidates.sort((a, b) => {
          if (a.isHevc !== b.isHevc) return a.isHevc ? 1 : -1;
          const qOrder = (q: string) => (q === '1080p' ? 3 : q === '720p' ? 2 : 1);
          return qOrder(b.quality) - qOrder(a.quality);
        });

        const resolvedStreams = await Promise.all(
          fastDlCandidates.slice(0, 3).map(async (item, idx) => {
            const directUrl = await resolveFastDlCodeToStreamUrl(item.url, signal);
            if (!directUrl) return null;
            const singleLang = detectSingleStreamLanguage(candidate.card.title);
            const multiLangs = Array.from(
              new Set([
                ...detailMeta.languages,
                ...detectAllStreamLanguages(candidate.card.title).map((l) => l.code),
              ])
            );
            return {
              id: `vegamovies-direct-${idx}`,
              provider: 'vegamovies' as const,
              url: directUrl,
              quality: item.quality || '1080p',
              label: `${item.label} (${candidate.card.title.includes('Hindi') ? 'Hindi Dual' : 'Original'})`,
              type: 'mp4' as const,
              isEmbed: false,
              onlyHevc: item.isHevc,
              lang: singleLang?.code || (multiLangs.includes('hi') ? 'hi' : 'en'),
              langName: singleLang?.name || (multiLangs.includes('hi') ? 'Hindi' : 'English'),
              multiLangs: multiLangs.length > 0 ? multiLangs : ['hi', 'en'],
            };
          })
        );

        const validResolved = resolvedStreams.filter(
          (s): s is NonNullable<typeof s> => s !== null
        );
        if (validResolved.length > 0) {
          return validResolved;
        }
      } catch {
        // try next candidate
      }
    }
  } catch {
    // ignore outer error
  }

  return [];
}
