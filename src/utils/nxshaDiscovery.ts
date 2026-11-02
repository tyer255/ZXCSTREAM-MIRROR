import { detectSingleStreamLanguage, parseResolutionHeight } from './urlBuilder.js';

export const ALLOWED_NXSHA_PROVIDERS = [
  'rive-citadel',
  'castle',
  'watchout',
  'streamflix',
  'nitro',
  'xdownloader',
  'purstream',
  'vixolity',
  'rive-primevids',
] as const;

export type AllowedNxshaProvider = (typeof ALLOWED_NXSHA_PROVIDERS)[number];

const ALLOWED_PROVIDER_SET = new Set<string>(ALLOWED_NXSHA_PROVIDERS);

export function isAuthorizedNxshaProvider(provider: string): boolean {
  if (!provider || typeof provider !== 'string') return false;
  return ALLOWED_PROVIDER_SET.has(provider.trim().toLowerCase());
}

/**
 * Known dead, geo-blocked, 403/427, IP-locked worker domains, or HTML embed player pages
 * that must never be selected as a valid playable media source.
 */
export function isDeadNxshaSourceUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const lower = url.trim().toLowerCase();
  if (!lower) return true;
  if (
    lower.includes('nxstreamhub.workers.dev') ||
    lower.includes('worker-inosuke.workers.dev') ||
    lower.includes('silent-math-8425.itsnitrox.tech') ||
    lower.includes('wts.itsnitrox.tech/pitro') ||
    lower.includes('wts.itsnitrox.tech/litro') ||
    lower.includes('husvu445bey.com') ||
    lower.includes('kkphimplayer') ||
    lower.includes('gemma416okl.com/play/')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether a hostname is a loopback, link-local, private RFC1918/RFC4193,
 * cloud metadata (169.254.169.254), or internal hostname to prevent SSRF.
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return true;
  const clean = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!clean) return true;

  if (
    clean === 'localhost' ||
    clean === '0.0.0.0' ||
    clean === '::1' ||
    clean === '0:0:0:0:0:0:0:1' ||
    clean.endsWith('.localhost') ||
    clean.endsWith('.local') ||
    clean.endsWith('.internal') ||
    clean.endsWith('.arpa')
  ) {
    return true;
  }

  // IPv6 private / link-local ranges (fc00::/7, fe80::/10, ::ffff:127.x, etc.)
  if (clean.includes(':')) {
    if (
      clean.startsWith('fc') ||
      clean.startsWith('fd') ||
      clean.startsWith('fe8') ||
      clean.startsWith('fe9') ||
      clean.startsWith('fea') ||
      clean.startsWith('feb') ||
      clean.startsWith('::ffff:127.') ||
      clean.startsWith('::ffff:10.') ||
      clean.startsWith('::ffff:192.168.') ||
      clean.startsWith('::ffff:169.254.')
    ) {
      return true;
    }
    return false;
  }

  // IPv4 numeric check
  const ipv4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = [
      Number.parseInt(ipv4Match[1], 10),
      Number.parseInt(ipv4Match[2], 10),
      Number.parseInt(ipv4Match[3], 10),
      Number.parseInt(ipv4Match[4], 10),
    ];
    if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // Cloud metadata / link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // Multicast / reserved
  }

  return false;
}

/**
 * Validates that a media URL is a well-formed, SSRF-safe HTTP/HTTPS URL
 * (or a local proxy path wrapping a valid external HTTP/HTTPS URL).
 */
export function isTrustedNxshaMediaUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Handle local stream/nxsha proxy wrapper by validating the inner target URL
  if (trimmed.startsWith('/api/nxsha/proxy') || trimmed.startsWith('/api/stream/proxy')) {
    try {
      const parsedProxy = new URL(trimmed, 'https://nxsha.space');
      const innerUrl = parsedProxy.searchParams.get('url') || '';
      if (!innerUrl || innerUrl.startsWith('/')) return false;
      return isTrustedNxshaMediaUrl(innerUrl);
    } catch {
      return false;
    }
  }

  if (isDeadNxshaSourceUrl(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (isPrivateOrLoopbackHost(parsed.hostname)) {
      return false;
    }
    // Reject obvious non-media / script / executable extensions
    const lowerPath = parsed.pathname.toLowerCase();
    if (
      lowerPath.endsWith('.html') ||
      lowerPath.endsWith('.htm') ||
      lowerPath.endsWith('.js') ||
      lowerPath.endsWith('.exe') ||
      lowerPath.endsWith('.swf')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface ValidatedNxshaSource {
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
}

/**
 * Strictly validates an individual source candidate to ensure we never select
 * an invalid, empty, embed-only, dead, or SSRF URL just because a provider returned HTTP 200.
 */
export function validatePlayableNxshaSource(source: any): {
  valid: boolean;
  reason?: string;
  normalizedSource?: ValidatedNxshaSource;
} {
  if (!source || typeof source !== 'object') {
    return { valid: false, reason: 'Source is not an object' };
  }

  if (source.isEmbed === true) {
    return { valid: false, reason: 'Source is an HTML embed iframe, not a direct media stream' };
  }

  const rawUrl = typeof source.url === 'string' ? source.url.trim() : '';
  if (!rawUrl) {
    return { valid: false, reason: 'Missing source URL' };
  }

  if (!isTrustedNxshaMediaUrl(rawUrl)) {
    return { valid: false, reason: 'Untrusted, dead, or SSRF-blocked source URL' };
  }

  if (source.org_uri && typeof source.org_uri === 'string') {
    if (!isTrustedNxshaMediaUrl(source.org_uri)) {
      return { valid: false, reason: 'Untrusted original URI on proxied source' };
    }
  }

  // Reject signed CDN URLs whose Expires unix timestamp has already expired (prevents 403 Forbidden in player)
  try {
    const urlToInspect =
      source.org_uri && typeof source.org_uri === 'string' ? source.org_uri : rawUrl;
    const parsed = new URL(urlToInspect, 'https://nxsha.space');
    const expParam =
      parsed.searchParams.get('Expires') ||
      parsed.searchParams.get('expires') ||
      parsed.searchParams.get('exp');
    if (expParam && /^\d{10}$/.test(expParam.trim())) {
      const expSec = Number.parseInt(expParam.trim(), 10);
      const nowSec = Math.floor(Date.now() / 1000);
      if (expSec <= nowSec + 30) {
        return {
          valid: false,
          reason: `Source URL signature expired (Expires=${expSec} <= now=${nowSec})`,
        };
      }
    }
  } catch {
    // ignore
  }

  const explicitType = typeof source.type === 'string' ? source.type.trim().toLowerCase() : '';
  const lowerUrl = `${source.org_uri || ''} ${rawUrl}`.toLowerCase();

  // Reject raw .mkv Matroska files masquerading as mp4 (browsers lack native AC3/EAC3 Matroska support)
  if (lowerUrl.includes('.mkv')) {
    return { valid: false, reason: 'Unsupported Matroska (.mkv) container for web playback' };
  }

  let normalizedType = explicitType;
  if (!normalizedType) {
    if (lowerUrl.includes('.mpd') || explicitType === 'dash' || explicitType === 'andromeda') {
      normalizedType = 'dash';
    } else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.webm')) {
      normalizedType = 'mp4';
    } else {
      normalizedType = 'hls';
    }
  }

  const supportedTypes = new Set(['hls', 'dash', 'andromeda', 'mp4', 'm3u8', 'video/mp4']);
  if (!supportedTypes.has(normalizedType)) {
    return { valid: false, reason: `Unsupported stream type: ${normalizedType}` };
  }

  const labelToDetect = `${source.label || ''} ${source.quality || ''}`;
  const detectedLang = detectSingleStreamLanguage(labelToDetect);

  const normalizedSource: ValidatedNxshaSource = {
    ...source,
    url: rawUrl,
    type: normalizedType === 'm3u8' ? 'hls' : normalizedType === 'video/mp4' ? 'mp4' : normalizedType,
    lang: source.lang || detectedLang?.code || undefined,
    langName: source.langName || detectedLang?.name || undefined,
  };

  return { valid: true, normalizedSource };
}

/**
 * Validates the structure and sources of an NXSHA provider response.
 */
export function validateNxshaProviderResponse(
  provider: string,
  response: any
): {
  valid: boolean;
  validSources: ValidatedNxshaSource[];
  reason?: string;
} {
  if (!response || typeof response !== 'object') {
    return { valid: false, validSources: [], reason: 'Malformed provider response' };
  }

  const rawSources = Array.isArray(response.sources) ? response.sources : [];
  if (rawSources.length === 0) {
    return { valid: false, validSources: [], reason: 'Empty sources list' };
  }

  const seenUrls = new Set<string>();
  const validSources: ValidatedNxshaSource[] = [];
  let lastRejectionReason = 'No valid playable sources';

  for (const item of rawSources) {
    const check = validatePlayableNxshaSource(item);
    if (!check.valid || !check.normalizedSource) {
      if (check.reason) lastRejectionReason = check.reason;
      continue;
    }
    const u = check.normalizedSource.url;
    if (seenUrls.has(u)) continue;
    seenUrls.add(u);
    validSources.push({
      ...check.normalizedSource,
      provider: check.normalizedSource.provider || provider,
    });
  }

  if (validSources.length === 0) {
    return { valid: false, validSources: [], reason: lastRejectionReason };
  }

  // Sort valid sources so Original/English comes first by default, then higher resolutions (1080p/720p) before lower resolutions (480p/360p)
  validSources.sort((a, b) => {
    const aOrig = !a.lang || a.lang === 'en';
    const bOrig = !b.lang || b.lang === 'en';
    if (aOrig !== bOrig) return aOrig ? -1 : 1;
    const hA = parseResolutionHeight(`${a.label || ''} ${a.quality || ''} ${a.url || ''}`) || 720;
    const hB = parseResolutionHeight(`${b.label || ''} ${b.quality || ''} ${b.url || ''}`) || 720;
    return hB - hA;
  });

  return { valid: true, validSources };
}

export type ProviderDiagnosticStatus =
  | 'winner'
  | 'valid_late'
  | 'valid_fallback'
  | 'invalid_response'
  | 'failed'
  | 'timeout'
  | 'aborted'
  | 'unauthorized';

export interface ProviderTimingDiagnostic {
  provider: string;
  startTimeMs: number;
  requestDurationMs: number;
  validationDurationMs: number;
  totalDurationMs: number;
  status: ProviderDiagnosticStatus;
  sourceCount: number;
  reason?: string;
}

export interface NxshaDiscoveryDiagnostics {
  discoveryStartTimeMs: number;
  timeToFirstValidSourceMs: number | null;
  totalDiscoveryDurationMs: number;
  winningProvider: string | null;
  totalProvidersQueried: number;
  totalFailedProviders: number;
  cancelledProvidersCount: number;
  lateIgnoredCount: number;
  providerTimings: ProviderTimingDiagnostic[];
}

export interface NxshaProviderRawPayload<TSource = any> {
  sources: TSource[];
  subtitles?: any[];
  dubs?: any[];
}

export interface NxshaWinningProviderResult {
  provider: string;
  sources: ValidatedNxshaSource[];
  subtitles: any[];
  dubs: any[];
}

export interface NxshaDiscoveryResult {
  success: boolean;
  winner: NxshaWinningProviderResult | null;
  allDiscoveredDubs: any[];
  diagnostics: NxshaDiscoveryDiagnostics;
  error?: string;
}

export interface RaceNxshaProvidersOptions {
  providers: string[];
  queryProvider: (
    provider: string,
    signal: AbortSignal
  ) => Promise<NxshaProviderRawPayload>;
  validateCandidate?: (
    provider: string,
    sources: ValidatedNxshaSource[],
    signal: AbortSignal
  ) =>
    | Promise<{ valid: boolean; sources: ValidatedNxshaSource[]; reason?: string }>
    | { valid: boolean; sources: ValidatedNxshaSource[]; reason?: string };
  isPreferredMatch?: (provider: string, sources: ValidatedNxshaSource[]) => boolean;
  allowUnauthorizedProviders?: boolean;
  concurrencyLimit?: number;
  providerTimeoutMs?: number;
  overallTimeoutMs?: number;
  parentSignal?: AbortSignal;
  now?: () => number;
}

/**
 * Concurrent First-Valid-Source-Wins Discovery Engine for NXSHA Providers.
 *
 * - Dispatches discovery requests concurrently up to `concurrencyLimit` (default 6).
 * - Validates each provider's response structure and playable stream URLs.
 * - Immediately resolves with the first provider that passes validation.
 * - Cancels all remaining in-flight requests via AbortController as soon as a winner is chosen.
 * - Ignores duplicate or late responses after a winner is selected.
 * - Collects high-precision performance.now() diagnostics for every provider.
 */
export async function raceNxshaProviders(
  options: RaceNxshaProvidersOptions
): Promise<NxshaDiscoveryResult> {
  const getNow =
    options.now ??
    (() => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()));

  const discoveryStartTimeMs = Number(getNow().toFixed(2));
  const concurrencyLimit = Math.max(1, Math.min(12, options.concurrencyLimit ?? 6));
  const providerTimeoutMs = Math.max(50, options.providerTimeoutMs ?? 4800);
  const overallTimeoutMs = Math.max(100, options.overallTimeoutMs ?? 8000);

  // Deduplicate providers while preserving order
  const uniqueProviders: string[] = [];
  const seenProviders = new Set<string>();
  for (const rawP of options.providers || []) {
    const clean = String(rawP || '').trim();
    if (!clean || seenProviders.has(clean)) continue;
    seenProviders.add(clean);
    uniqueProviders.push(clean);
  }

  const diagnosticsMap = new Map<string, ProviderTimingDiagnostic>();
  const eligibleProviders: string[] = [];

  for (const provider of uniqueProviders) {
    if (!options.allowUnauthorizedProviders && !isAuthorizedNxshaProvider(provider)) {
      diagnosticsMap.set(provider, {
        provider,
        startTimeMs: 0,
        requestDurationMs: 0,
        validationDurationMs: 0,
        totalDurationMs: 0,
        status: 'unauthorized',
        sourceCount: 0,
        reason: 'Provider is not in ALLOWED_NXSHA_PROVIDERS',
      });
      continue;
    }
    eligibleProviders.push(provider);
  }

  if (eligibleProviders.length === 0) {
    const endMs = Number(getNow().toFixed(2));
    return {
      success: false,
      winner: null,
      allDiscoveredDubs: [],
      error: 'No eligible NXSHA providers configured',
      diagnostics: {
        discoveryStartTimeMs,
        timeToFirstValidSourceMs: null,
        totalDiscoveryDurationMs: Number(Math.max(0, endMs - discoveryStartTimeMs).toFixed(2)),
        winningProvider: null,
        totalProvidersQueried: 0,
        totalFailedProviders: diagnosticsMap.size,
        cancelledProvidersCount: 0,
        lateIgnoredCount: 0,
        providerTimings: Array.from(diagnosticsMap.values()),
      },
    };
  }

  const controllers = new Map<string, AbortController>();
  const providerStartTimes = new Map<string, { startOffsetMs: number; providerStartMs: number }>();
  const timeoutHandles = new Map<string, ReturnType<typeof setTimeout>>();
  const allDubsMap = new Map<string, any>();

  let winnerSelected = false;
  let winningResult: NxshaWinningProviderResult | null = null;
  let bestFallbackResult: NxshaWinningProviderResult | null = null;
  let bestFallbackTiming: ProviderTimingDiagnostic | null = null;
  let timeToFirstValidSourceMs: number | null = null;
  let cancelledProvidersCount = 0;
  let lateIgnoredCount = 0;
  let settled = false;

  const cancelAllPending = (exceptProvider?: string) => {
    const cancelNowMs = getNow();
    for (const [prov, timer] of timeoutHandles.entries()) {
      if (prov !== exceptProvider) {
        clearTimeout(timer);
      }
    }
    for (const [prov, ctrl] of controllers.entries()) {
      if (prov !== exceptProvider && !ctrl.signal.aborted) {
        cancelledProvidersCount++;
        if (!diagnosticsMap.has(prov)) {
          const started = providerStartTimes.get(prov);
          const reqDur = started
            ? Number(Math.max(0, cancelNowMs - started.providerStartMs).toFixed(2))
            : 0;
          diagnosticsMap.set(prov, {
            provider: prov,
            startTimeMs: started?.startOffsetMs ?? 0,
            requestDurationMs: reqDur,
            validationDurationMs: 0,
            totalDurationMs: reqDur,
            status: 'aborted',
            sourceCount: 0,
            reason: 'Cancelled because a valid winning source was already selected',
          });
        }
        ctrl.abort(new Error('Cancelled because a valid winning source was already selected'));
      }
    }
  };

  if (options.parentSignal) {
    if (options.parentSignal.aborted) {
      return {
        success: false,
        winner: null,
        allDiscoveredDubs: [],
        error: 'Discovery aborted before start',
        diagnostics: {
          discoveryStartTimeMs,
          timeToFirstValidSourceMs: null,
          totalDiscoveryDurationMs: 0,
          winningProvider: null,
          totalProvidersQueried: 0,
          totalFailedProviders: 0,
          cancelledProvidersCount: eligibleProviders.length,
          lateIgnoredCount: 0,
          providerTimings: [],
        },
      };
    }
    options.parentSignal.addEventListener(
      'abort',
      () => {
        cancelAllPending();
      },
      { once: true }
    );
  }

  const buildDiagnostics = (): NxshaDiscoveryDiagnostics => {
    const nowVal = Number(getNow().toFixed(2));
    const timings = uniqueProviders
      .map((p) => diagnosticsMap.get(p))
      .filter((t): t is ProviderTimingDiagnostic => Boolean(t));

    const totalFailedProviders = timings.filter(
      (t) =>
        t.status === 'failed' ||
        t.status === 'timeout' ||
        t.status === 'invalid_response' ||
        t.status === 'unauthorized'
    ).length;

    return {
      discoveryStartTimeMs,
      timeToFirstValidSourceMs,
      totalDiscoveryDurationMs: Number(Math.max(0, nowVal - discoveryStartTimeMs).toFixed(2)),
      winningProvider: winningResult?.provider ?? null,
      totalProvidersQueried: timings.filter((t) => t.status !== 'unauthorized').length,
      totalFailedProviders,
      cancelledProvidersCount,
      lateIgnoredCount,
      providerTimings: timings,
    };
  };

  return new Promise<NxshaDiscoveryResult>((resolve) => {
    let activeCount = 0;
    let nextIndex = 0;
    let completedCount = 0;

    const finalize = (result: NxshaWinningProviderResult | null, errMessage?: string) => {
      if (settled) return;
      settled = true;
      if (overallTimer) clearTimeout(overallTimer);
      for (const timer of timeoutHandles.values()) {
        clearTimeout(timer);
      }
      resolve({
        success: result !== null,
        winner: result,
        allDiscoveredDubs: Array.from(allDubsMap.values()),
        diagnostics: buildDiagnostics(),
        ...(result === null
          ? { error: errMessage || 'No active ad-free stream found across NXSHA providers for this title' }
          : {}),
      });
    };

    const overallTimer = setTimeout(() => {
      if (settled) return;
      if (!winnerSelected && bestFallbackResult && bestFallbackTiming) {
        winnerSelected = true;
        winningResult = bestFallbackResult;
        bestFallbackTiming.status = 'winner';
        if (timeToFirstValidSourceMs === null) {
          timeToFirstValidSourceMs = bestFallbackTiming.totalDurationMs;
        }
        cancelAllPending(bestFallbackResult.provider);
        finalize(winningResult);
        return;
      }
      cancelAllPending();
      finalize(null, 'Discovery timed out across all NXSHA providers');
    }, overallTimeoutMs);

    const launchNext = () => {
      while (!winnerSelected && !settled && activeCount < concurrencyLimit && nextIndex < eligibleProviders.length) {
        const provider = eligibleProviders[nextIndex++];
        activeCount++;
        void runProvider(provider);
      }
    };

    const onProviderDone = () => {
      activeCount--;
      completedCount++;
      if (winnerSelected || settled) {
        return;
      }
      if (nextIndex < eligibleProviders.length) {
        launchNext();
        return;
      }
      if (completedCount >= eligibleProviders.length) {
        // All eligible providers have finished. If we held a fallback candidate (e.g. Original audio when specific dub wasn't found natively), promote it to winner!
        if (bestFallbackResult && bestFallbackTiming) {
          winnerSelected = true;
          winningResult = bestFallbackResult;
          bestFallbackTiming.status = 'winner';
          if (timeToFirstValidSourceMs === null) {
            timeToFirstValidSourceMs = bestFallbackTiming.totalDurationMs;
          }
          finalize(winningResult);
        } else {
          finalize(null);
        }
      }
    };

    const runProvider = async (provider: string) => {
      const startOffsetMs = Number(Math.max(0, getNow() - discoveryStartTimeMs).toFixed(2));
      const providerStartMs = getNow();
      providerStartTimes.set(provider, { startOffsetMs, providerStartMs });
      const ctrl = new AbortController();
      controllers.set(provider, ctrl);

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (!ctrl.signal.aborted) {
          ctrl.abort(new Error(`Provider ${provider} timed out after ${providerTimeoutMs}ms`));
        }
      }, providerTimeoutMs);
      timeoutHandles.set(provider, timer);

      try {
        const rawPayload = await options.queryProvider(provider, ctrl.signal);
        clearTimeout(timer);
        timeoutHandles.delete(provider);

        const afterRequestMs = getNow();
        const requestDurationMs = Number(Math.max(0, afterRequestMs - providerStartMs).toFixed(2));

        // If another provider already won while this request was in flight, ignore this late response
        if (winnerSelected || settled) {
          lateIgnoredCount++;
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs: 0,
            totalDurationMs: requestDurationMs,
            status: ctrl.signal.aborted ? 'aborted' : 'valid_late',
            sourceCount: Array.isArray(rawPayload?.sources) ? rawPayload.sources.length : 0,
            reason: 'Ignored late response after winner was already selected',
          });
          onProviderDone();
          return;
        }

        const validationStartMs = getNow();
        const baseValidation = validateNxshaProviderResponse(provider, rawPayload);

        let finalValid = baseValidation.valid;
        let finalSources = baseValidation.validSources;
        let rejectionReason = baseValidation.reason;

        if (finalValid && options.validateCandidate) {
          const customCheck = await options.validateCandidate(provider, finalSources, ctrl.signal);
          finalValid = customCheck.valid && customCheck.sources.length > 0;
          finalSources = customCheck.sources;
          if (!finalValid) {
            rejectionReason = customCheck.reason || 'Rejected by custom candidate validator';
          }
        }

        const afterValidationMs = getNow();
        const validationDurationMs = Number(
          Math.max(0, afterValidationMs - validationStartMs).toFixed(2)
        );
        const totalDurationMs = Number(Math.max(0, afterValidationMs - providerStartMs).toFixed(2));

        // Re-check winnerSelected in case another provider won during async custom validation
        if (winnerSelected || settled) {
          lateIgnoredCount++;
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs,
            totalDurationMs,
            status: 'valid_late',
            sourceCount: finalSources.length,
            reason: 'Ignored late response after winner was already selected',
          });
          onProviderDone();
          return;
        }

        if (!finalValid || finalSources.length === 0) {
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs,
            totalDurationMs,
            status: 'invalid_response',
            sourceCount: 0,
            reason: rejectionReason || 'No valid playable sources',
          });
          onProviderDone();
          return;
        }

        // Collect dubs from valid providers
        if (Array.isArray(rawPayload.dubs)) {
          for (const d of rawPayload.dubs) {
            if (d?.lang && !allDubsMap.has(d.lang)) {
              allDubsMap.set(d.lang, d);
            }
          }
        }

        const isPreferred = options.isPreferredMatch
          ? options.isPreferredMatch(provider, finalSources)
          : true;

        const candidateResult: NxshaWinningProviderResult = {
          provider,
          sources: finalSources,
          subtitles: Array.isArray(rawPayload.subtitles) ? rawPayload.subtitles : [],
          dubs: Array.isArray(rawPayload.dubs) ? rawPayload.dubs : [],
        };

        if (isPreferred) {
          winnerSelected = true;
          winningResult = candidateResult;
          timeToFirstValidSourceMs = Number(
            Math.max(0, afterValidationMs - discoveryStartTimeMs).toFixed(2)
          );

          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs,
            totalDurationMs,
            status: 'winner',
            sourceCount: finalSources.length,
          });

          cancelAllPending(provider);
          finalize(winningResult);
          return;
        }

        // Valid playable source, but did not match optional preferred dub filter -> keep as fallback
        const diagEntry: ProviderTimingDiagnostic = {
          provider,
          startTimeMs: startOffsetMs,
          requestDurationMs,
          validationDurationMs,
          totalDurationMs,
          status: 'valid_fallback',
          sourceCount: finalSources.length,
          reason: 'Valid playable source held as fallback while checking for exact dub match',
        };
        diagnosticsMap.set(provider, diagEntry);

        if (!bestFallbackResult) {
          bestFallbackResult = candidateResult;
          bestFallbackTiming = diagEntry;
          if (timeToFirstValidSourceMs === null) {
            timeToFirstValidSourceMs = Number(
              Math.max(0, afterValidationMs - discoveryStartTimeMs).toFixed(2)
            );
          }
        }

        onProviderDone();
      } catch (err: any) {
        clearTimeout(timer);
        timeoutHandles.delete(provider);
        const afterErrMs = getNow();
        const reqDur = Number(Math.max(0, afterErrMs - providerStartMs).toFixed(2));

        const status: ProviderDiagnosticStatus = timedOut
          ? 'timeout'
          : winnerSelected || ctrl.signal.aborted
          ? 'aborted'
          : 'failed';

        diagnosticsMap.set(provider, {
          provider,
          startTimeMs: startOffsetMs,
          requestDurationMs: reqDur,
          validationDurationMs: 0,
          totalDurationMs: reqDur,
          status,
          sourceCount: 0,
          reason: timedOut
            ? `Timed out after ${providerTimeoutMs}ms`
            : err?.message || 'Provider request failed',
        });

        onProviderDone();
      }
    };

    launchNext();
  });
}

export type NxshaServerState =
  | 'PENDING'
  | 'PROCESSING'
  | 'AVAILABLE'
  | 'FAILED'
  | 'SELECTED';

export type LegacyServerProbeStatus =
  | 'queue'
  | 'checking'
  | 'connecting'
  | 'available'
  | 'failed';

export interface ServerDescriptor {
  index: number;
  id: string;
  label: string;
}

export interface ManagedServerItemState {
  index: number;
  code: string;
  name: string;
  state: NxshaServerState;
  status: LegacyServerProbeStatus;
  sources: ValidatedNxshaSource[];
  subtitles: any[];
  dubs: any[];
  dispatched: boolean;
  activeRequestId: string | null;
  isPlaybackEstablished: boolean;
  errorReason?: string;
}

/**
 * Authoritative, race-condition-safe state machine for NXSHA server discovery and selection.
 *
 * Enforces:
 * - One authoritative state per provider per search session (PENDING, PROCESSING, AVAILABLE, FAILED, SELECTED).
 * - Permanent exclusion of FAILED servers for the duration of the current search session.
 * - FAILED servers never transition back to PENDING, PROCESSING, AVAILABLE, or SELECTED in the same session.
 * - SELECTED servers never transition to FAILED due to unrelated late responses.
 * - Stale responses from previous search sessions (or stale request IDs) are ignored.
 * - Duplicate requests for the same provider in the same search session are prevented.
 * - Automatic fallback only selects from AVAILABLE or PROCESSING/PENDING servers, never FAILED servers.
 */
export class NxshaServerStateMachine {
  private sessionCounter = 0;
  private requestCounter = 0;
  private currentSessionId = '';
  private entries = new Map<string, ManagedServerItemState>();
  private failedCodes = new Set<string>();
  private dispatchedCodes = new Set<string>();
  private selectedCode: string | null = null;

  startSession(mediaKey: string, servers: readonly ServerDescriptor[]): string {
    this.sessionCounter += 1;
    const cleanKey = String(mediaKey || 'default').trim();
    this.currentSessionId = `nxsha_session_${this.sessionCounter}_${cleanKey}`;
    this.entries.clear();
    this.failedCodes.clear();
    this.dispatchedCodes.clear();
    this.selectedCode = null;

    for (const srv of servers) {
      const code = String(srv.id).trim();
      this.entries.set(code, {
        index: srv.index,
        code,
        name: srv.label,
        state: 'PENDING',
        status: 'checking',
        sources: [],
        subtitles: [],
        dubs: [],
        dispatched: false,
        activeRequestId: null,
        isPlaybackEstablished: false,
      });
    }

    return this.currentSessionId;
  }

  getSessionId(): string {
    return this.currentSessionId;
  }

  isCurrentSession(sessionId: string): boolean {
    return Boolean(sessionId && this.currentSessionId && sessionId === this.currentSessionId);
  }

  isProviderFailed(sessionId: string, code: string): boolean {
    if (!this.isCurrentSession(sessionId)) return false;
    const entry = this.entries.get(code);
    return this.failedCodes.has(code) || entry?.state === 'FAILED';
  }

  getFailedProviderCodes(sessionId?: string): string[] {
    if (sessionId && !this.isCurrentSession(sessionId)) return [];
    return Array.from(this.failedCodes);
  }

  getSelectedProviderCode(sessionId?: string): string | null {
    if (sessionId && !this.isCurrentSession(sessionId)) return null;
    return this.selectedCode;
  }

  getSelectedServer(sessionId?: string): ManagedServerItemState | null {
    if (sessionId && !this.isCurrentSession(sessionId)) return null;
    if (!this.selectedCode) return null;
    const entry = this.entries.get(this.selectedCode);
    return entry ? { ...entry, sources: [...entry.sources] } : null;
  }

  getServer(code: string, sessionId?: string): ManagedServerItemState | null {
    if (sessionId && !this.isCurrentSession(sessionId)) return null;
    const entry = this.entries.get(code);
    return entry ? { ...entry, sources: [...entry.sources] } : null;
  }

  getAllServers(sessionId?: string): ManagedServerItemState[] {
    if (sessionId && !this.isCurrentSession(sessionId)) return [];
    return Array.from(this.entries.values()).map((entry) => ({
      ...entry,
      sources: [...entry.sources],
    }));
  }

  /**
   * Returns only active/eligible servers for UI display.
   * FAILED servers are immediately excluded.
   * PENDING, PROCESSING, AVAILABLE, and SELECTED servers remain visible.
   */
  getVisibleServers(sessionId?: string): ManagedServerItemState[] {
    if (sessionId && !this.isCurrentSession(sessionId)) return [];
    return Array.from(this.entries.values())
      .filter((entry) => entry.state !== 'FAILED' && !this.failedCodes.has(entry.code))
      .map((entry) => ({
        ...entry,
        sources: [...entry.sources],
      }));
  }

  /**
   * Returns servers eligible for automatic fallback (AVAILABLE or PROCESSING/PENDING, never FAILED).
   */
  getEligibleFallbackServers(sessionId: string, excludeCode?: string): ManagedServerItemState[] {
    if (!this.isCurrentSession(sessionId)) return [];
    return Array.from(this.entries.values())
      .filter(
        (entry) =>
          entry.code !== excludeCode &&
          entry.state !== 'FAILED' &&
          !this.failedCodes.has(entry.code) &&
          (entry.state === 'AVAILABLE' ||
            entry.state === 'PROCESSING' ||
            entry.state === 'PENDING')
      )
      .map((entry) => ({
        ...entry,
        sources: [...entry.sources],
      }));
  }

  /**
   * Transitions a provider from PENDING -> PROCESSING and assigns a unique requestId.
   * Prevents duplicate requests for the same provider in the same search session,
   * and blocks restarting any FAILED provider.
   */
  beginProviderDiscovery(
    sessionId: string,
    code: string,
    customRequestId?: string
  ): { started: boolean; requestId: string; reason?: string } {
    if (!this.isCurrentSession(sessionId)) {
      return { started: false, requestId: '', reason: 'stale_session' };
    }
    const entry = this.entries.get(code);
    if (!entry) {
      return { started: false, requestId: '', reason: 'unknown_provider' };
    }
    if (entry.state === 'FAILED' || this.failedCodes.has(code)) {
      return { started: false, requestId: '', reason: 'cannot_restart_failed_provider' };
    }
    if (
      this.dispatchedCodes.has(code) ||
      entry.dispatched ||
      entry.state === 'PROCESSING' ||
      entry.state === 'AVAILABLE' ||
      entry.state === 'SELECTED'
    ) {
      return {
        started: false,
        requestId: entry.activeRequestId || '',
        reason: 'duplicate_request_in_session',
      };
    }

    this.requestCounter += 1;
    const reqId = customRequestId || `${sessionId}:${code}:req_${this.requestCounter}`;
    this.dispatchedCodes.add(code);
    entry.dispatched = true;
    entry.activeRequestId = reqId;
    entry.state = 'PROCESSING';
    entry.status = 'checking';

    return { started: true, requestId: reqId };
  }

  /**
   * Processes a successful provider discovery response.
   * - Ignores stale sessions or stale request IDs.
   * - Never transitions a FAILED provider back to PROCESSING/AVAILABLE/SELECTED.
   * - Validates sources; if invalid/empty, marks the provider FAILED.
   * - First valid provider becomes SELECTED automatically; subsequent valid providers become AVAILABLE without overriding SELECTED.
   */
  resolveProviderSuccess(
    sessionId: string,
    code: string,
    payload: { sources: any[]; subtitles?: any[]; dubs?: any[] },
    options?: { requestId?: string; autoSelectIfNoWinner?: boolean }
  ): {
    applied: boolean;
    state?: NxshaServerState;
    becameSelected: boolean;
    validSources: ValidatedNxshaSource[];
    reason?: string;
  } {
    if (!this.isCurrentSession(sessionId)) {
      return { applied: false, becameSelected: false, validSources: [], reason: 'stale_session' };
    }
    const entry = this.entries.get(code);
    if (!entry) {
      return {
        applied: false,
        becameSelected: false,
        validSources: [],
        reason: 'unknown_provider',
      };
    }
    if (entry.state === 'FAILED' || this.failedCodes.has(code)) {
      return {
        applied: false,
        becameSelected: false,
        validSources: [],
        reason: 'cannot_transition_from_failed',
      };
    }
    if (
      options?.requestId &&
      entry.activeRequestId &&
      options.requestId !== entry.activeRequestId
    ) {
      return {
        applied: false,
        becameSelected: false,
        validSources: [],
        reason: 'stale_request_id',
      };
    }

    const validation = validateNxshaProviderResponse(code, payload);
    if (!validation.valid || validation.validSources.length === 0) {
      this.markProviderFailed(
        sessionId,
        code,
        validation.reason || 'No valid playable sources',
        { requestId: options?.requestId }
      );
      return {
        applied: true,
        state: 'FAILED',
        becameSelected: false,
        validSources: [],
        reason: validation.reason || 'No valid playable sources',
      };
    }

    entry.sources = validation.validSources;
    entry.subtitles = Array.isArray(payload.subtitles) ? payload.subtitles : [];
    entry.dubs = Array.isArray(payload.dubs) ? payload.dubs : [];

    const autoSelect = options?.autoSelectIfNoWinner ?? true;

    if (this.selectedCode === code) {
      entry.state = 'SELECTED';
      entry.status = entry.isPlaybackEstablished ? 'available' : 'connecting';
      return {
        applied: true,
        state: 'SELECTED',
        becameSelected: true,
        validSources: [...entry.sources],
      };
    }

    if (this.selectedCode === null && autoSelect) {
      this.selectedCode = code;
      entry.state = 'SELECTED';
      entry.status = entry.isPlaybackEstablished ? 'available' : 'connecting';
      return {
        applied: true,
        state: 'SELECTED',
        becameSelected: true,
        validSources: [...entry.sources],
      };
    }

    entry.state = 'AVAILABLE';
    entry.status = 'available';
    return {
      applied: true,
      state: 'AVAILABLE',
      becameSelected: false,
      validSources: [...entry.sources],
    };
  }

  /**
   * Permanently marks a provider as FAILED for the current search session.
   * - Protects SELECTED and AVAILABLE providers with validated sources from being overwritten by unrelated late responses.
   */
  markProviderFailed(
    sessionId: string,
    code: string,
    reason = 'Provider unavailable',
    options?: { requestId?: string; isPlaybackError?: boolean }
  ): { applied: boolean; wasSelected: boolean; reason?: string } {
    if (!this.isCurrentSession(sessionId)) {
      return { applied: false, wasSelected: false, reason: 'stale_session' };
    }
    const entry = this.entries.get(code);
    if (!entry) {
      return { applied: false, wasSelected: false, reason: 'unknown_provider' };
    }
    if (entry.state === 'FAILED' || this.failedCodes.has(code)) {
      return { applied: false, wasSelected: false, reason: 'already_failed' };
    }

    const isPlaybackError = Boolean(options?.isPlaybackError);

    // Protect SELECTED server from unrelated late responses
    if (entry.state === 'SELECTED' && !isPlaybackError) {
      if (
        entry.sources.length > 0 ||
        entry.isPlaybackEstablished ||
        (options?.requestId &&
          entry.activeRequestId &&
          options.requestId !== entry.activeRequestId)
      ) {
        return {
          applied: false,
          wasSelected: false,
          reason: 'protected_selected_from_late_response',
        };
      }
    }

    // Protect AVAILABLE server (which already validated playable sources) from late/stale errors
    if (entry.state === 'AVAILABLE' && !isPlaybackError) {
      if (
        entry.sources.length > 0 ||
        (options?.requestId &&
          entry.activeRequestId &&
          options.requestId !== entry.activeRequestId)
      ) {
        return {
          applied: false,
          wasSelected: false,
          reason: 'protected_available_from_late_response',
        };
      }
    }

    if (
      !isPlaybackError &&
      options?.requestId &&
      entry.activeRequestId &&
      options.requestId !== entry.activeRequestId
    ) {
      return { applied: false, wasSelected: false, reason: 'stale_request_id' };
    }

    const wasSelected = this.selectedCode === code || entry.state === 'SELECTED';
    entry.state = 'FAILED';
    entry.status = 'failed';
    entry.sources = [];
    entry.activeRequestId = null;
    entry.isPlaybackEstablished = false;
    entry.errorReason = reason;
    this.failedCodes.add(code);

    if (this.selectedCode === code) {
      this.selectedCode = null;
    }

    return { applied: true, wasSelected };
  }

  /**
   * Marks that the currently SELECTED provider has successfully established playback.
   */
  markPlaybackEstablished(sessionId: string, code: string): boolean {
    if (!this.isCurrentSession(sessionId)) return false;
    const entry = this.entries.get(code);
    if (!entry || entry.state === 'FAILED' || this.failedCodes.has(code)) return false;
    if (this.selectedCode !== code) return false;
    entry.state = 'SELECTED';
    entry.isPlaybackEstablished = true;
    entry.status = 'available';
    return true;
  }

  /**
   * Explicitly selects an eligible server (never FAILED, prevents duplicate selection).
   */
  selectServer(
    sessionId: string,
    code: string
  ): { selected: boolean; entry?: ManagedServerItemState; reason?: string } {
    if (!this.isCurrentSession(sessionId)) {
      return { selected: false, reason: 'stale_session' };
    }
    const entry = this.entries.get(code);
    if (!entry) {
      return { selected: false, reason: 'unknown_provider' };
    }
    if (entry.state === 'FAILED' || this.failedCodes.has(code)) {
      return { selected: false, reason: 'cannot_select_failed_server' };
    }
    if (this.selectedCode === code && entry.state === 'SELECTED') {
      return {
        selected: false,
        entry: { ...entry, sources: [...entry.sources] },
        reason: 'duplicate_selection',
      };
    }

    if (this.selectedCode && this.selectedCode !== code) {
      const prev = this.entries.get(this.selectedCode);
      if (prev && prev.state === 'SELECTED') {
        prev.isPlaybackEstablished = false;
        if (prev.sources.length > 0) {
          prev.state = 'AVAILABLE';
          prev.status = 'available';
        } else {
          prev.state = 'PROCESSING';
          prev.status = 'checking';
        }
      }
    }

    this.selectedCode = code;
    entry.state = 'SELECTED';
    entry.status = entry.isPlaybackEstablished
      ? 'available'
      : entry.sources.length > 0
      ? 'connecting'
      : 'checking';

    return { selected: true, entry: { ...entry, sources: [...entry.sources] } };
  }

  /**
   * Atomically marks a failing server as FAILED and selects the next eligible server.
   * Priority:
   * 1. First server with state === 'AVAILABLE' and validated sources.
   * 2. Wait for remaining 'PROCESSING' or 'PENDING' servers without restarting failed ones.
   * 3. Never selects a FAILED server.
   */
  failSelectedAndSelectNext(
    sessionId: string,
    failedCode: string,
    reason = 'Playback failed'
  ): {
    nextSelected: ManagedServerItemState | null;
    waitingForProcessing: boolean;
    allFailed: boolean;
  } {
    if (!this.isCurrentSession(sessionId)) {
      return { nextSelected: null, waitingForProcessing: false, allFailed: false };
    }

    this.markProviderFailed(sessionId, failedCode, reason, { isPlaybackError: true });

    // If a different server was already selected and is not failed, keep it
    if (this.selectedCode && this.selectedCode !== failedCode) {
      const current = this.getSelectedServer(sessionId);
      if (current && current.state !== 'FAILED') {
        return { nextSelected: current, waitingForProcessing: false, allFailed: false };
      }
    }

    // 1. Prefer an already validated AVAILABLE server
    for (const entry of this.entries.values()) {
      if (
        entry.code !== failedCode &&
        !this.failedCodes.has(entry.code) &&
        entry.state === 'AVAILABLE' &&
        entry.sources.length > 0
      ) {
        const res = this.selectServer(sessionId, entry.code);
        if (res.selected && res.entry) {
          return { nextSelected: res.entry, waitingForProcessing: false, allFailed: false };
        }
      }
    }

    // 2. Otherwise check if any servers are still PROCESSING or PENDING
    const hasInFlight = Array.from(this.entries.values()).some(
      (entry) =>
        entry.code !== failedCode &&
        !this.failedCodes.has(entry.code) &&
        (entry.state === 'PROCESSING' || entry.state === 'PENDING')
    );

    if (hasInFlight) {
      return { nextSelected: null, waitingForProcessing: true, allFailed: false };
    }

    return { nextSelected: null, waitingForProcessing: false, allFailed: true };
  }
}

