import crypto from 'node:crypto';
import { detectAllStreamLanguages, detectSingleStreamLanguage } from './urlBuilder.js';

export const VEGAMOVIES_BASE_URL = 'https://vegamovies6.co.in';
export const VEGAMOVIES_MIRRORS = [
  'https://vegamovies6.co.in',
  'https://vegamovies1.co.in',
  'https://vegamovies.yt',
];

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
  sizeFormatted?: string;
}

export interface VegaDetailMetadata {
  imdbId: string | null;
  fastDlLinks: Array<{
    url: string;
    quality: string;
    label: string;
    isHevc: boolean;
    sizeFormatted?: string;
  }>;
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
  sizeFormatted?: string;
  lang?: string;
  langName?: string;
  multiLangs?: string[];
}

export interface VegaDirectResolution {
  sources: VegaResolvedSource[];
  matchedPost: VegaSearchCard | null;
  imdbId: string | null;
}

const VEGA_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Normalizes a movie or TV series title into a clean search query for vegamovies mirrors
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
 * Normalizes romanized Hindi/South Asian phonetic spelling variations
 * (e.g. "Nai" <-> "Nayi" <-> "Nayyi", "Naveli" <-> "Navelli")
 */
export function normalizePhoneticHindiToken(token: string): string {
  if (!token || typeof token !== 'string') return '';
  return token
    .toLowerCase()
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/([a-z])\1+/g, '$1')
    .replace(/ayee|ayi|aai|eye/g, 'ai');
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
 * Parses movie/series cards from vegamovies homepage or search HTML across all current mirrors
 */
export function parseVegaSearchHtml(html: string): VegaSearchCard[] {
  if (!html || typeof html !== 'string') return [];
  const results: VegaSearchCard[] = [];
  const seenUrls = new Set<string>();

  // 1. Process <article> blocks first if present
  const articleRegex = /<article[\s\S]*?<\/article>/gi;
  const articleBlocks = html.match(articleRegex);

  if (articleBlocks && articleBlocks.length > 0) {
    for (const block of articleBlocks) {
      const linkMatch = block.match(
        /href=["'](https?:\/\/(?:vegamovies\d*\.[a-z.]+|vegamovies\.[a-z]+)\/(\d+)-([a-z0-9-]+)\.html)["']/i
      );
      if (!linkMatch) continue;
      const url = linkMatch[1];
      const id = linkMatch[2];
      const slug = linkMatch[3];
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const imgAltMatch = block.match(/<img[^>]+alt=["']([^"']+)["'][^>]*>/i);
      const h3TextMatch = block.match(/<h[234][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
      const titleMatch = block.match(/title=["']([^"']+)["']/i);
      const rawTitle = (
        imgAltMatch?.[1] ||
        h3TextMatch?.[1]?.replace(/<[^>]+>/g, '') ||
        titleMatch?.[1] ||
        slug.replace(/-/g, ' ')
      )
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

      const posterMatch = block.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/i);
      let posterUrl = posterMatch?.[1] || '';
      if (posterUrl && posterUrl.startsWith('/')) {
        try {
          posterUrl = new URL(posterUrl, url).toString();
        } catch {
          posterUrl = `${VEGAMOVIES_BASE_URL}${posterUrl}`;
        }
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
  }

  // 2. Also process direct post links (e.g. for vegamovies6.co.in which uses div / blog-item grid)
  const postLinkRegex =
    /href=["'](https?:\/\/(?:vegamovies\d*\.[a-z.]+|vegamovies\.[a-z]+)\/(\d+)-([a-z0-9-]+)\.html)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = postLinkRegex.exec(html)) !== null) {
    const url = match[1];
    const id = match[2];
    const slug = match[3];
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const idx = match.index;
    const block = html.slice(Math.max(0, idx - 400), Math.min(html.length, idx + 700));

    const imgAltMatch = block.match(/<img[^>]+alt=["']([^"']+)["'][^>]*>/i);
    const h3Match = block.match(/<h[234][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const titleMatch = block.match(/title=["']([^"']+)["']/i);

    const rawTitle = (
      imgAltMatch?.[1] ||
      h3Match?.[1]?.replace(/<[^>]+>/g, '') ||
      titleMatch?.[1] ||
      slug.replace(/-/g, ' ')
    )
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    const posterMatch = block.match(/<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/i);
    let posterUrl = posterMatch?.[1] || '';
    if (posterUrl && posterUrl.startsWith('/')) {
      try {
        posterUrl = new URL(posterUrl, url).toString();
      } catch {
        posterUrl = `${VEGAMOVIES_BASE_URL}${posterUrl}`;
      }
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
    originalTitle?: string;
    postId?: string;
    year?: string;
    mediaType: 'movie' | 'tv';
    season?: number;
  }
): number {
  const combined = `${postTitle} ${postUrl}`.toLowerCase();
  const slugPart = (postUrl.split('/').pop() || '').replace(/^\d+-|\.html$/g, '').toLowerCase();

  // Direct numeric Vegamovies post ID match (e.g. 59682 -> /59682-nayi-naveli...)
  if (target.postId && /^\d+$/.test(target.postId) && postUrl.includes(`/${target.postId}-`)) {
    return 500;
  }

  const candidateTitles = [target.title, target.originalTitle].filter(
    (t): t is string => Boolean(t && t.trim())
  );
  if (candidateTitles.length === 0) return 0;

  const postTokens = tokenizeVegaTitle(`${postTitle} ${slugPart.replace(/-/g, ' ')}`);
  const postTokenSet = new Set(postTokens);
  const postPhoneticSet = new Set(postTokens.map(normalizePhoneticHindiToken));

  let bestOverlapRatio = 0;
  for (const candTitle of candidateTitles) {
    const tokens = tokenizeVegaTitle(candTitle);
    if (tokens.length === 0) continue;
    let matchedTokens = 0;
    for (const token of tokens) {
      if (postTokenSet.has(token)) {
        matchedTokens++;
      } else {
        const phonetic = normalizePhoneticHindiToken(token);
        if (phonetic.length >= 2 && postPhoneticSet.has(phonetic)) {
          matchedTokens++;
        }
      }
    }
    const ratio = matchedTokens / tokens.length;
    if (ratio > bestOverlapRatio) {
      bestOverlapRatio = ratio;
    }
  }

  // Require strong token overlap so unrelated sidebar posts (like "jeevan-bheema-yojana") are rejected
  if (bestOverlapRatio < 0.65) {
    return 0;
  }

  const isSeriesPost =
    /\b(season[-\s]*\d+|s0?\d+|ep[-\s]*\d+|all[-\s]*episodes|tv[-\s]*show)\b/i.test(combined);

  if (target.mediaType === 'movie' && isSeriesPost) {
    return 0;
  }

  let score = Math.round(bestOverlapRatio * 100);

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
        const yearDiff = Math.abs(Number(postYearMatch[1]) - Number(target.year));
        if (yearDiff > 2) {
          return 0;
        }
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
 * from a vegamovies1.co.in / vegamovies6.co.in movie/series detail page.
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

  const parseContextQuality = (
    contextText: string
  ): { quality: string; isHevc: boolean; label: string; sizeFormatted?: string } => {
    const clean = contextText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const qMatch = clean.match(/\b(2160p|4K|1080p|720p|480p)\b/i);
    const quality = qMatch
      ? qMatch[1].toUpperCase() === '4K'
        ? '2160p'
        : qMatch[1].toLowerCase()
      : '720p';
    const isHevc = /\b(hevc|x265|10\s*bit)\b/i.test(clean);
    const sizeMatch = clean.match(/\[?(\d+(?:\.\d+)?\s*(?:MB|GB))\]?/i);
    const sizeFormatted = sizeMatch
      ? sizeMatch[1].replace(/\s+/g, '').replace(/(MB|GB)$/i, ' $1').toUpperCase()
      : undefined;
    const sizeStr = sizeMatch ? ` [${sizeMatch[1]}]` : '';
    return {
      quality,
      isHevc,
      sizeFormatted,
      label: `Vegamovies | ${quality}${sizeStr}${isHevc ? ' HEVC' : ' x264'}`,
    };
  };

  const getNearestHeadingContext = (idx: number): string => {
    const before = html.slice(Math.max(0, idx - 500), idx);
    // Find the nearest preceding heading (<h2..<h5 or <p>) that explicitly mentions resolution or codec
    const headingMatches = Array.from(
      before.matchAll(/<(?:h[2-5]|p)[^>]*>([\s\S]*?)<\/(?:h[2-5]|p)>/gi)
    );
    let qualityHeading = '';
    for (let i = headingMatches.length - 1; i >= 0; i--) {
      const txt = headingMatches[i][1].replace(/<[^>]+>/g, ' ');
      if (/\b(2160p|4K|1080p|720p|480p|hevc|x264|x265|10\s*bit)\b/i.test(txt)) {
        qualityHeading = txt;
        break;
      }
    }
    if (!qualityHeading) {
      const lastHeadingIdx = Math.max(
        before.lastIndexOf('<h2'),
        before.lastIndexOf('<h3'),
        before.lastIndexOf('<h4'),
        before.lastIndexOf('<h5'),
        before.lastIndexOf('<hr')
      );
      qualityHeading = lastHeadingIdx >= 0 ? before.slice(lastHeadingIdx) : before.slice(-250);
    }
    const closeAnchorIdx = html.indexOf('</a>', idx);
    const afterEnd =
      closeAnchorIdx > idx
        ? Math.min(closeAnchorIdx + 4, idx + 160)
        : Math.min(html.length, idx + 100);
    const after = html.slice(idx, afterEnd);
    return `${qualityHeading} ${after}`;
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
    const baseDir = baseUrl.endsWith('/') ? baseUrl : `${baseUrl.slice(0, baseUrl.lastIndexOf('/') + 1)}`;
    const resolved = rawHref.startsWith('http')
      ? new URL(rawHref)
      : new URL(rawHref, baseDir);
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
 * Searches Vegamovies mirrors and resolves direct playable GoogleCDN video streams
 * along with the matched post metadata.
 */
export async function resolveVegaMoviesWithPost(params: {
  tmdbId: string;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  year?: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  signal?: AbortSignal;
}): Promise<VegaDirectResolution> {
  const { title, originalTitle, year, imdbId, mediaType, season = 1, episode = 1, signal } = params;
  const cleanQuery = normalizeVegaSearchQuery(title);
  const cleanOrigQuery = normalizeVegaSearchQuery(originalTitle || '');
  const cleanId = String(params.tmdbId || '').trim();

  try {
    let cards: VegaSearchCard[] = [];
    let searchUrlUsed = '';

    const addUniqueQuery = (list: string[], q: string) => {
      const trimmed = q.trim();
      if (
        trimmed &&
        trimmed.toLowerCase() !== 'movie' &&
        trimmed.toLowerCase() !== 'series' &&
        !list.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())
      ) {
        list.push(trimmed);
      }
    };

    const queriesToTry: string[] = [];
    if (cleanOrigQuery) {
      addUniqueQuery(queriesToTry, cleanOrigQuery);
    }
    if (cleanQuery) {
      addUniqueQuery(queriesToTry, cleanQuery);
      // Romanized Hindi transliteration variant (e.g., "Nai Naveli" <-> "Nayi Naveli")
      if (/\bnai\b/i.test(cleanQuery)) {
        addUniqueQuery(queriesToTry, cleanQuery.replace(/\bnai\b/gi, 'Nayi'));
      } else if (/\bnayi\b/i.test(cleanQuery)) {
        addUniqueQuery(queriesToTry, cleanQuery.replace(/\bnayi\b/gi, 'Nai'));
      }
      if (year && !cleanQuery.includes(year)) {
        addUniqueQuery(queriesToTry, `${cleanQuery} ${year}`);
      }
      // Also add the longest distinctive word (>= 4 chars) as fallback so DLE search succeeds
      // even when one word in a multi-word title has an alternate transliteration on Vegamovies
      const words = tokenizeVegaTitle(cleanQuery)
        .filter((w) => w.length >= 4 && !/^\d+$/.test(w))
        .sort((a, b) => b.length - a.length);
      if (words.length > 0 && cleanQuery.includes(' ')) {
        addUniqueQuery(queriesToTry, words[0]);
      }
    }
    if (cleanId) {
      addUniqueQuery(queriesToTry, cleanId);
    }

    // Try primary mirror then fallback mirrors only if primary mirror is unreachable
    for (const mirror of VEGAMOVIES_MIRRORS) {
      if (cards.length > 0 || signal?.aborted) break;
      let mirrorReachable = false;

      for (const q of queriesToTry) {
        if (cards.length > 0 || signal?.aborted) break;
        // Skip raw numeric ID in DLE story search (handled via index.php?newsid= below)
        if (/^\d+$/.test(q)) continue;
        try {
          const searchCtrl = new AbortController();
          const searchTimer = setTimeout(() => searchCtrl.abort(), 3200);
          if (signal) {
            signal.addEventListener('abort', () => searchCtrl.abort(), { once: true });
          }
          const sUrl = `${mirror}/?do=search&subaction=search&story=${encodeURIComponent(q)}`;
          const searchRes = await fetch(sUrl, {
            headers: {
              'User-Agent': VEGA_USER_AGENT,
              Referer: `${mirror}/`,
            },
            signal: searchCtrl.signal,
          });
          clearTimeout(searchTimer);
          if (searchRes.ok) {
            mirrorReachable = true;
            const html = await searchRes.text();
            const parsed = parseVegaSearchHtml(html);
            // Verify at least one parsed card actually scores > 0 before stopping query loop
            const matching = parsed.filter(
              (card) =>
                scoreVegaCandidatePost(card.url, card.title, {
                  title,
                  originalTitle,
                  postId: cleanId,
                  year,
                  mediaType,
                  season,
                }) > 0
            );
            if (matching.length > 0) {
              cards = parsed;
              searchUrlUsed = sUrl;
              break;
            }
          }
        } catch {
          // try next query or mirror
        }
      }

      // If no title match and cleanId is a 4-6 digit number, check if it's a direct Vegamovies newsid (e.g. 59682)
      if (cards.length === 0 && /^\d{4,6}$/.test(cleanId) && !signal?.aborted) {
        try {
          const newsCtrl = new AbortController();
          const newsTimer = setTimeout(() => newsCtrl.abort(), 2500);
          if (signal) {
            signal.addEventListener('abort', () => newsCtrl.abort(), { once: true });
          }
          const newsRes = await fetch(`${mirror}/index.php?newsid=${cleanId}`, {
            method: 'HEAD',
            redirect: 'manual',
            headers: { 'User-Agent': VEGA_USER_AGENT },
            signal: newsCtrl.signal,
          });
          clearTimeout(newsTimer);
          const loc = newsRes.headers.get('location') || '';
          const locMatch = loc.match(/\/(\d+)-([a-z0-9-]+)\.html/i);
          if (locMatch && locMatch[1] === cleanId) {
            mirrorReachable = true;
            const fullPostUrl = loc.startsWith('http') ? loc : `${mirror}${loc.startsWith('/') ? '' : '/'}${loc}`;
            const slugTitle = locMatch[2].replace(/-/g, ' ');
            const yearMatch = slugTitle.match(/\b(19\d{2}|20\d{2})\b/);
            cards = [
              {
                id: cleanId,
                url: fullPostUrl,
                title: slugTitle,
                year: yearMatch ? yearMatch[1] : '',
                qualityBadge: 'HD',
                rating: '',
                posterUrl: '',
                isSeries: /\b(season|s\d{1,2}|series)\b/i.test(slugTitle),
              },
            ];
            searchUrlUsed = `${mirror}/`;
          }
        } catch {
          // ignore
        }
      }

      // If search returns no matching cards, inspect homepage posts
      if (cards.length === 0 && !signal?.aborted) {
        try {
          const homeCtrl = new AbortController();
          const homeTimer = setTimeout(() => homeCtrl.abort(), 3200);
          if (signal) {
            signal.addEventListener('abort', () => homeCtrl.abort(), { once: true });
          }
          const homeRes = await fetch(`${mirror}/`, {
            headers: {
              'User-Agent': VEGA_USER_AGENT,
            },
            signal: homeCtrl.signal,
          });
          clearTimeout(homeTimer);
          if (homeRes.ok) {
            mirrorReachable = true;
            const html = await homeRes.text();
            const parsed = parseVegaSearchHtml(html);
            const matching = parsed.filter(
              (card) =>
                scoreVegaCandidatePost(card.url, card.title, {
                  title,
                  originalTitle,
                  postId: cleanId,
                  year,
                  mediaType,
                  season,
                }) > 0
            );
            if (matching.length > 0) {
              cards = parsed;
              searchUrlUsed = `${mirror}/`;
            }
          }
        } catch {
          // continue
        }
      }

      if (mirrorReachable) {
        break;
      }
    }

    if (cards.length === 0) {
      return { sources: [], matchedPost: null, imdbId: null };
    }

    const scored = cards
      .map((card) => ({
        card,
        score: scoreVegaCandidatePost(card.url, card.title, {
          title,
          originalTitle,
          postId: cleanId,
          year,
          mediaType,
          season,
        }),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return { sources: [], matchedPost: null, imdbId: null };
    }

    const bestCandidate = scored[0].card;
    let extractedImdbId: string | null = null;

    // Inspect top 2 candidate detail pages
    for (const candidate of scored.slice(0, 2)) {
      if (signal?.aborted) break;
      try {
        const detailCtrl = new AbortController();
        const detailTimer = setTimeout(() => detailCtrl.abort(), 2800);
        if (signal) {
          signal.addEventListener('abort', () => detailCtrl.abort(), { once: true });
        }
        const detailRes = await fetch(candidate.card.url, {
          headers: {
            'User-Agent': VEGA_USER_AGENT,
            Referer: searchUrlUsed || `${VEGAMOVIES_BASE_URL}/`,
          },
          signal: detailCtrl.signal,
        });
        clearTimeout(detailTimer);
        if (!detailRes.ok) continue;

        const detailHtml = await detailRes.text();
        const detailMeta = extractVegaDetailMetadata(detailHtml);
        if (detailMeta.imdbId) {
          extractedImdbId = detailMeta.imdbId;
        }

        // If both page and caller have an IMDb ID and they don't match, skip this post (unless matched by direct postId)
        if (
          candidate.card.id !== cleanId &&
          imdbId &&
          detailMeta.imdbId &&
          imdbId.toLowerCase() !== detailMeta.imdbId.toLowerCase()
        ) {
          continue;
        }

        const fastDlCandidates: Array<{
          url: string;
          quality: string;
          label: string;
          isHevc: boolean;
          sizeFormatted?: string;
        }> = [];

        if (mediaType === 'movie' && detailMeta.fastDlLinks.length > 0) {
          fastDlCandidates.push(...detailMeta.fastDlLinks);
        }

        // Follow up to 4 nexdrive links (strictly preferring non-HEVC x264 across distinct 2160p/1080p/720p/480p qualities)
        if (fastDlCandidates.length === 0 && detailMeta.nexDriveLinks.length > 0) {
          const nonHevcNex = detailMeta.nexDriveLinks.filter((n) => !n.isHevc);
          const nexPool = nonHevcNex.length > 0 ? nonHevcNex : detailMeta.nexDriveLinks;
          const sortedNex = [...nexPool].sort((a, b) => {
            if (a.isHevc !== b.isHevc) return a.isHevc ? 1 : -1;
            const qScore = (q: string) =>
              q === '2160p' ? 4 : q === '1080p' ? 3 : q === '720p' ? 2 : 1;
            return qScore(b.quality) - qScore(a.quality);
          });

          // Select up to 4 links preferring distinct resolutions (2160p, 1080p, 720p, 480p)
          const chosenNex: VegaNexDriveEntry[] = [];
          const seenQuals = new Set<string>();
          for (const item of sortedNex) {
            if (!seenQuals.has(item.quality) && chosenNex.length < 4) {
              seenQuals.add(item.quality);
              chosenNex.push(item);
            }
          }
          for (const item of sortedNex) {
            if (chosenNex.length >= 4) break;
            if (!chosenNex.includes(item)) chosenNex.push(item);
          }

          const nexPromises = chosenNex.map(async (nexItem) => {
            try {
              const nexCtrl = new AbortController();
              const nexTimer = setTimeout(() => nexCtrl.abort(), 2800);
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
                sizeFormatted: nexItem.sizeFormatted,
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

        // Sort so non-HEVC (x264) comes first, then 2160p / 1080p / 720p / 480p
        fastDlCandidates.sort((a, b) => {
          if (a.isHevc !== b.isHevc) return a.isHevc ? 1 : -1;
          const qOrder = (q: string) =>
            q === '2160p' ? 4 : q === '1080p' ? 3 : q === '720p' ? 2 : 1;
          return qOrder(b.quality) - qOrder(a.quality);
        });

        // Pick one candidate per distinct resolution first so 1080p, 720p, and 480p are all resolved
        const pickedFastDl: typeof fastDlCandidates = [];
        const seenFastQuals = new Set<string>();
        for (const cand of fastDlCandidates) {
          if (!seenFastQuals.has(cand.quality) && pickedFastDl.length < 4) {
            seenFastQuals.add(cand.quality);
            pickedFastDl.push(cand);
          }
        }
        for (const cand of fastDlCandidates) {
          if (pickedFastDl.length >= 4) break;
          if (!pickedFastDl.includes(cand)) {
            pickedFastDl.push(cand);
          }
        }

        const resolvedStreams = await Promise.all(
          pickedFastDl.map(async (item, idx) => {
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
              sizeFormatted: item.sizeFormatted,
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
          return {
            sources: validResolved,
            matchedPost: candidate.card,
            imdbId: extractedImdbId,
          };
        }
      } catch {
        // try next candidate
      }
    }

    return {
      sources: [],
      matchedPost: bestCandidate,
      imdbId: extractedImdbId,
    };
  } catch {
    return { sources: [], matchedPost: null, imdbId: null };
  }
}

/**
 * Searches Vegamovies mirrors and resolves direct playable GoogleCDN video streams
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
  const res = await resolveVegaMoviesWithPost(params);
  return res.sources;
}
