export interface DownloadQualityOption {
  quality: string; // '360p' | '480p' | '720p' | '1080p' | '2160p'
  resolution: number;
  label: string;
  sizeFormatted: string;
  format: 'mp4';
  codec: string;
  downloadUrl: string;
  directUrl?: string;
  sourceProvider: string;
  isAuthorized: boolean;
}

export interface DownloadLanguageGroup {
  langCode: string;
  langName: string;
  flag?: string;
  qualities: DownloadQualityOption[];
}

export interface DownloadResolutionResult {
  success: boolean;
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  title: string;
  year?: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  languages: DownloadLanguageGroup[];
  hasDirectDownload: boolean;
  unsupportedReason?: string;
}

export const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  ml: 'Malayalam',
  kn: 'Kannada',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  id: 'Indonesian',
  tl: 'Tagalog',
  zh: 'Chinese',
  ar: 'Arabic',
  tr: 'Turkish',
  th: 'Thai',
  vi: 'Vietnamese',
};

/**
 * Maps standard quality height to appropriate file sizes and metadata
 */
export function estimateMediaSize(durationSeconds: number, quality: string): string {
  const mins = Math.max(1, durationSeconds / 60);
  switch (quality) {
    case '2160p':
      return `${(mins * 0.08).toFixed(2)} GB`;
    case '1080p':
      return `${(mins * 0.022).toFixed(2)} GB`;
    case '720p':
      return `${Math.round(mins * 11.5)} MB`;
    case '480p':
      return `${Math.round(mins * 6.2)} MB`;
    case '360p':
      return `${Math.round(mins * 3.8)} MB`;
    default:
      return `${(mins * 0.02).toFixed(2)} GB`;
  }
}

/**
 * Unwraps any nested /api/stream/proxy?url=... or /api/download/file?...&sourceUrl=...
 * and returns the direct GoogleCDN attachment URL if present.
 */
export function extractDirectCdnUrlFromProxy(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let current = rawUrl.trim();
  for (let depth = 0; depth < 3; depth++) {
    if (current.startsWith('https://video-downloads.googleusercontent.com/')) {
      return current;
    }
    try {
      const parsed = new URL(current, 'http://localhost:3000');
      const inner = parsed.searchParams.get('sourceUrl') || parsed.searchParams.get('url');
      if (inner && inner !== current) {
        current = inner.trim();
        continue;
      }
    } catch {
      // ignore URL parse error
    }
    break;
  }
  if (current.startsWith('https://video-downloads.googleusercontent.com/')) {
    return current;
  }
  return null;
}

/**
 * Builds the secure, authenticated download URL for our streaming proxy backend
 */
export function buildDownloadProxyUrl(params: {
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  season?: number;
  episode?: number;
  lang: string;
  quality: string;
  title: string;
  rawUrl?: string;
}): string {
  const qs = new URLSearchParams({
    mediaType: params.mediaType,
    tmdbId: params.tmdbId,
    lang: params.lang,
    quality: params.quality,
    title: params.title,
  });
  if (params.mediaType === 'tv') {
    qs.set('season', String(params.season || 1));
    qs.set('episode', String(params.episode || 1));
  }
  if (
    params.rawUrl &&
    !params.rawUrl.startsWith('blob:') &&
    (params.rawUrl.startsWith('http://') ||
      params.rawUrl.startsWith('https://') ||
      params.rawUrl.startsWith('/api/'))
  ) {
    const directCdn = extractDirectCdnUrlFromProxy(params.rawUrl);
    qs.set('sourceUrl', directCdn || params.rawUrl);
  }
  return `/api/download/file?${qs.toString()}`;
}

/**
 * Verifies that the first binary chunk of a downloaded response is an ISO-BMFF / MP4 / Matroska video
 * and never an HTML page (such as an iframe proxy Cookie check page) or JSON error.
 */
export function validateMp4BinaryChunk(
  firstChunk: Uint8Array | null | undefined,
  contentType?: string | null
): { valid: boolean; reason?: string } {
  const normalizedCt = (contentType || '').toLowerCase();
  if (
    normalizedCt.includes('text/html') ||
    normalizedCt.includes('text/plain') ||
    normalizedCt.includes('application/json')
  ) {
    return {
      valid: false,
      reason: `Server returned non-video Content-Type (${contentType})`,
    };
  }

  if (!firstChunk || firstChunk.byteLength < 8) {
    return {
      valid: false,
      reason: 'Empty or truncated media stream received',
    };
  }

  const headPreview = new TextDecoder('utf-8', { fatal: false })
    .decode(firstChunk.subarray(0, Math.min(256, firstChunk.byteLength)))
    .trimStart()
    .toLowerCase();

  if (
    headPreview.startsWith('<!doctype html') ||
    headPreview.startsWith('<html') ||
    headPreview.startsWith('<head') ||
    headPreview.includes('cookie check')
  ) {
    return {
      valid: false,
      reason: 'HTML or Cookie check page intercepted download stream',
    };
  }

  // Accept Matroska / EBML header (0x1A 0x45 0xDF 0xA3)
  if (
    firstChunk[0] === 0x1a &&
    firstChunk[1] === 0x45 &&
    firstChunk[2] === 0xdf &&
    firstChunk[3] === 0xa3
  ) {
    return { valid: true };
  }

  const boxType = String.fromCharCode(
    firstChunk[4],
    firstChunk[5],
    firstChunk[6],
    firstChunk[7]
  );
  const validBoxes = new Set(['ftyp', 'styp', 'moov', 'moof', 'mdat', 'free', 'skip', 'wide']);
  if (!validBoxes.has(boxType)) {
    return {
      valid: false,
      reason: `Invalid MP4 header signature (${boxType})`,
    };
  }

  return { valid: true };
}

/**
 * Extracts all segment URLs (including optional #EXT-X-MAP initialization segment)
 * from an HLS media playlist (.m3u8) for full-length parallel downloading.
 */
export function extractHlsSegmentUrls(m3u8Text: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const lines = m3u8Text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#EXT-X-MAP:')) {
      const uriMatch = line.match(/URI="([^"]+)"/i);
      if (uriMatch && uriMatch[1]) {
        try {
          urls.push(new URL(uriMatch[1], baseUrl).toString());
        } catch {
          // ignore malformed URI
        }
      }
      continue;
    }
    if (!line.startsWith('#')) {
      try {
        urls.push(new URL(line, baseUrl).toString());
      } catch {
        // ignore malformed segment line
      }
    }
  }
  return urls;
}

/**
 * Extracts all full-length movie/episode segment URLs (initialization + all media chunks)
 * from a DASH MPD XML manifest for either 'audio' or 'video'.
 */
export function extractDashSegmentUrls(
  mpdXml: string,
  contentType: 'audio' | 'video',
  preferredHeight = 720
): string[] {
  if (!mpdXml || !mpdXml.includes('<MPD')) return [];

  const adaptationRegex = /<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/gi;
  let match: RegExpExecArray | null;

  while ((match = adaptationRegex.exec(mpdXml)) !== null) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    const isTargetType =
      attrs.toLowerCase().includes(`contenttype="${contentType}"`) ||
      body.toLowerCase().includes(`mimetype="${contentType}/`);

    if (!isTargetType) continue;

    const repRegex = /<Representation\b([^>]*)>([\s\S]*?)<\/Representation>/gi;
    const candidates: Array<{ id: string; height: number; content: string }> = [];
    let repMatch: RegExpExecArray | null;

    while ((repMatch = repRegex.exec(body)) !== null) {
      const repAttrs = repMatch[1] || '';
      const repBody = repMatch[2] || '';
      const idMatch = repAttrs.match(/\bid="([^"]+)"/i);
      const heightMatch = repAttrs.match(/\bheight="(\d+)"/i);
      candidates.push({
        id: idMatch ? idMatch[1] : '0',
        height: heightMatch ? Number(heightMatch[1]) : 0,
        content: repBody || body,
      });
    }

    if (candidates.length === 0) continue;

    if (contentType === 'video') {
      candidates.sort(
        (a, b) => Math.abs(a.height - preferredHeight) - Math.abs(b.height - preferredHeight)
      );
    }

    const chosen = candidates[0];
    const templateScope = chosen.content.includes('<SegmentTemplate') ? chosen.content : body;
    const tplMatch = templateScope.match(/<SegmentTemplate\b([^>]*)>([\s\S]*?)<\/SegmentTemplate>/i);
    if (!tplMatch) continue;

    const tplAttrs = tplMatch[1] || '';
    const tplBody = tplMatch[2] || '';

    const initMatch = tplAttrs.match(/\binitialization="([^"]+)"/i);
    const mediaMatch = tplAttrs.match(/\bmedia="([^"]+)"/i);
    if (!mediaMatch) continue;

    const startNumMatch = tplAttrs.match(/\bstartNumber="(\d+)"/i);
    const startNumber = startNumMatch ? Number(startNumMatch[1]) : 1;

    const unescapeXmlUrl = (raw: string) =>
      raw
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\$RepresentationID\$/g, chosen.id);

    const urls: string[] = [];
    if (initMatch && initMatch[1]) {
      urls.push(unescapeXmlUrl(initMatch[1]));
    }

    const mediaTemplate = unescapeXmlUrl(mediaMatch[1]);
    let totalSegments = 0;
    const sRegex = /<S\b([^>]*)\/?>/gi;
    let sMatch: RegExpExecArray | null;
    while ((sMatch = sRegex.exec(tplBody)) !== null) {
      const sAttrs = sMatch[1] || '';
      const rMatch = sAttrs.match(/\br="(-?\d+)"/i);
      const repeat = rMatch ? Number(rMatch[1]) : 0;
      totalSegments += 1 + Math.max(0, repeat);
    }

    if (totalSegments <= 0) continue;

    for (let i = 0; i < totalSegments; i++) {
      const segNum = startNumber + i;
      const segUrl = mediaTemplate.replace(
        /\$Number(?:%0(\d+)d)?\$/g,
        (_full, widthStr) =>
          widthStr ? String(segNum).padStart(Number(widthStr), '0') : String(segNum)
      );
      urls.push(segUrl);
    }

    return urls;
  }

  return [];
}

function getOrCreateDownloadCarrierFrame(): HTMLIFrameElement {
  const frameId = 'zxc-native-dl-carrier';
  let dlFrame = document.getElementById(frameId) as HTMLIFrameElement | null;
  if (!dlFrame) {
    dlFrame = document.createElement('iframe');
    dlFrame.id = frameId;
    dlFrame.name = frameId;
    dlFrame.setAttribute('aria-hidden', 'true');
    dlFrame.setAttribute('referrerpolicy', 'no-referrer');
    dlFrame.tabIndex = -1;
    dlFrame.style.position = 'fixed';
    dlFrame.style.top = '-9999px';
    dlFrame.style.left = '-9999px';
    dlFrame.style.width = '1px';
    dlFrame.style.height = '1px';
    dlFrame.style.opacity = '0';
    dlFrame.style.border = '0';
    dlFrame.style.pointerEvents = 'none';
    document.body.appendChild(dlFrame);
  }
  return dlFrame;
}

function triggerDirectExternalAttachmentDownload(directUrl: string): void {
  const dlFrame = getOrCreateDownloadCarrierFrame();
  // Use an anchor targeting the hidden frame WITHOUT 'noopener' (since 'noopener' on a named
  // target forces a new tab in Chromium) and WITHOUT 'download' (so Chrome uses the external
  // CDN's own Content-Disposition: attachment header without hitting same-origin Cookie check).
  const a = document.createElement('a');
  a.href = directUrl;
  a.target = dlFrame.name;
  a.rel = 'noreferrer';
  a.referrerPolicy = 'no-referrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    try {
      a.remove();
    } catch {}
  }, 250);
}

function triggerVerifiedBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.setAttribute('download', filename);
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    try {
      a.remove();
    } catch {}
  }, 500);
  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 60_000);
}

/**
 * Triggers a full movie or episode download in the browser while guaranteeing that
 * an HTML file (such as an iframe proxy Cookie check page or SPA index.html) is NEVER saved.
 *
 * 1. If a direct GoogleCDN attachment URL (`video-downloads.googleusercontent.com`) is available,
 *    it hands the URL directly to the browser's native download manager via the hidden carrier frame.
 * 2. Otherwise, it checks `/api/download/direct-check` inside the authenticated iframe session
 *    for a direct CDN link, and if the stream is HLS/DASH-only, streams via authenticated `fetch()`
 *    with `validateMp4BinaryChunk` verification before saving the `.mp4` file.
 */
export function triggerNativeBrowserDownload(options: {
  url: string;
  filename: string;
  directUrl?: string;
  onProgress?: (percent: number, statusText: string) => void;
  onComplete?: () => void;
  onError?: (reason: string) => void;
}): void {
  if (typeof document === 'undefined') return;

  const immediateDirectUrl =
    extractDirectCdnUrlFromProxy(options.directUrl) ||
    extractDirectCdnUrlFromProxy(options.url);

  if (immediateDirectUrl) {
    try {
      options.onProgress?.(100, 'Download Started');
      triggerDirectExternalAttachmentDownload(immediateDirectUrl);
      options.onComplete?.();
      return;
    } catch (err) {
      console.warn('[triggerNativeBrowserDownload] Direct attachment trigger error:', err);
    }
  }

  void (async () => {
    try {
      // Handle subtitle (.srt) downloads via authenticated fetch so HTML is never saved
      if (options.url.includes('/api/download/subtitle')) {
        const subRes = await fetch(options.url, { credentials: 'include' });
        if (subRes.ok) {
          const text = await subRes.text();
          if (!text.trimStart().toLowerCase().startsWith('<!doctype html')) {
            const blob = new Blob([text], { type: 'application/x-subrip;charset=utf-8' });
            triggerVerifiedBlobDownload(blob, options.filename);
          }
        }
        options.onComplete?.();
        return;
      }

      // First check if a direct GoogleCDN download link can be resolved for this title & quality
      if (options.url.includes('/api/download/file')) {
        options.onProgress?.(15, 'Preparing download...');
        const qsIdx = options.url.indexOf('?');
        const qs = qsIdx >= 0 ? options.url.slice(qsIdx) : '';
        try {
          const checkRes = await fetch(`/api/download/direct-check${qs}`, {
            credentials: 'include',
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            const resolvedDirect = extractDirectCdnUrlFromProxy(checkData?.directUrl);
            if (resolvedDirect) {
              options.onProgress?.(100, 'Download Started');
              triggerDirectExternalAttachmentDownload(resolvedDirect);
              options.onComplete?.();
              return;
            }
          }
        } catch {
          // Proceed to authenticated stream download
        }
      }

      // Stream via authenticated fetch() and verify binary MP4 header so HTML is NEVER saved
      options.onProgress?.(25, 'Connecting to stream...');
      const response = await fetch(options.url, { credentials: 'include' });
      if (!response.ok || !response.body) {
        options.onError?.(`Download HTTP ${response.status}`);
        return;
      }

      const contentType = response.headers.get('content-type');
      const totalBytes = Number(response.headers.get('content-length') || 0);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let validatedHeader = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          if (!validatedHeader) {
            const check = validateMp4BinaryChunk(value, contentType);
            if (!check.valid) {
              await reader.cancel();
              options.onError?.(check.reason || 'Invalid video stream');
              return;
            }
            validatedHeader = true;
          }
          chunks.push(value);
          receivedBytes += value.byteLength;
          const mb = (receivedBytes / (1024 * 1024)).toFixed(1);
          const pct =
            totalBytes > 0
              ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100))
              : Math.min(95, 25 + Math.round(Math.log10(1 + receivedBytes / (1024 * 512)) * 25));
          options.onProgress?.(pct, `Downloading ${mb} MB...`);
        }
      }

      if (!validatedHeader || receivedBytes === 0) {
        options.onError?.('Empty media stream');
        return;
      }

      options.onProgress?.(100, 'Saving MP4...');
      const mp4Blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
      triggerVerifiedBlobDownload(mp4Blob, options.filename);
      options.onComplete?.();
    } catch (err: any) {
      console.warn('[triggerNativeBrowserDownload] Stream download failed:', err);
      options.onError?.(err?.message || 'Download failed');
    }
  })();
}



