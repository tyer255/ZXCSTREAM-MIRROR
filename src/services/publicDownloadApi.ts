import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DownloadLanguageGroup,
  DownloadQualityOption,
  DownloadResolutionResult,
} from './downloadEngineTypes.js';

export type DownloadJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface DeveloperApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  status: 'active' | 'revoked';
  requestCount: number;
  downloadCount: number;
  rateLimit: 'UNLIMITED';
  quota: 'UNLIMITED';
}

export interface DownloadJobRecord {
  id: string;
  keyId: string;
  keyPrefix: string;
  status: DownloadJobStatus;
  progress: number;
  stage: string;
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  season?: number;
  episode?: number;
  lang: string;
  quality: string;
  title: string;
  year?: string;
  sizeFormatted?: string;
  format: 'mp4';
  codec?: string;
  sourceProvider?: string;
  internalDownloadUrl?: string;
  directUrl?: string;
  availableLanguages?: Array<{
    langCode: string;
    langName: string;
    qualities: Array<{
      quality: string;
      resolution: number;
      sizeFormatted: string;
      codec: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string;
  expiresAtMs: number;
  signedToken: string;
  error: string | null;
}

export interface ApiActivityLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  statusCode: number;
  keyId: string;
  keyPrefix: string;
  latencyMs: number;
  jobId?: string;
  summary: string;
}

export interface CreateDownloadRequestInput {
  mediaType?: unknown;
  tmdbId?: unknown;
  season?: unknown;
  episode?: unknown;
  lang?: unknown;
  quality?: unknown;
  title?: unknown;
  year?: unknown;
}

export interface ValidatedDownloadRequest {
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  season: number;
  episode: number;
  lang: string;
  quality: string;
  title?: string;
  year?: string;
}

export const DEFAULT_DEMO_API_KEY = 'zxc_live_a1b2c3d4e5f60718293a4b5c6d7e8f90';

const HMAC_SECRET =
  process.env.ZXC_DOWNLOAD_API_SECRET || 'zxcstream-public-download-api-hmac-secret-2026';
const STATE_FILE_PATH = path.join('/tmp', 'zxc_public_download_api_state_v1.json');
const DEFAULT_URL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours expiring download URLs

/**
 * Computes SHA-256 hex digest of an API key for secure storage and comparison.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

/**
 * Generates a cryptographically strong API key with prefix and SHA-256 hash.
 */
export function generateDeveloperApiKeyPair(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const randomHex = crypto.randomBytes(16).toString('hex');
  const rawKey = `zxc_live_${randomHex}`;
  const keyPrefix = `${rawKey.slice(0, 13)}...${rawKey.slice(-4)}`;
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyPrefix, keyHash };
}

/**
 * Signs a download job ID + expiration timestamp using HMAC-SHA256 for expiring download URLs.
 */
export function signDownloadFileToken(
  jobId: string,
  keyId: string,
  expiresAtMs: number,
  secret = HMAC_SECRET
): string {
  const payload = `${jobId}:${keyId}:${expiresAtMs}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verifies an expiring download URL HMAC token.
 */
export function verifyDownloadFileToken(params: {
  jobId: string;
  keyId: string;
  token: string;
  expiresAtMs: number;
  nowMs?: number;
  secret?: string;
}): { valid: boolean; reason?: string } {
  const {
    jobId,
    keyId,
    token,
    expiresAtMs,
    nowMs = Date.now(),
    secret = HMAC_SECRET,
  } = params;

  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing download authorization token' };
  }
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
    return { valid: false, reason: 'Invalid expiration timestamp' };
  }
  if (nowMs > expiresAtMs) {
    return { valid: false, reason: 'Download URL has expired' };
  }

  const expected = signDownloadFileToken(jobId, keyId, expiresAtMs, secret);
  try {
    const a = Buffer.from(token, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, reason: 'Invalid download signature token' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Malformed download token' };
  }
}

/**
 * Extracts API key from Authorization Bearer header, X-API-Key header, or query parameter.
 */
export function extractApiKeyFromRequest(
  headers: Record<string, string | string[] | undefined>,
  query?: Record<string, unknown>
): string | null {
  const authHeader = headers['authorization'] || headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.trim()) {
    const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (authHeader.trim().startsWith('zxc_')) {
      return authHeader.trim();
    }
  }

  const xApiKey = headers['x-api-key'] || headers['X-API-Key'] || headers['X-Api-Key'];
  if (typeof xApiKey === 'string' && xApiKey.trim()) {
    return xApiKey.trim();
  }
  if (Array.isArray(xApiKey) && typeof xApiKey[0] === 'string' && xApiKey[0].trim()) {
    return xApiKey[0].trim();
  }

  if (query) {
    const qKey = query['api_key'] ?? query['apiKey'];
    if (typeof qKey === 'string' && qKey.trim()) {
      return qKey.trim();
    }
  }

  return null;
}

/**
 * Validates and normalizes incoming POST /api/v1/downloads request payload.
 */
export function validateDownloadRequestInput(
  input: CreateDownloadRequestInput
): { valid: true; data: ValidatedDownloadRequest } | { valid: false; error: string; code: string } {
  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      code: 'INVALID_PAYLOAD',
      error: 'Request body must be a valid JSON object.',
    };
  }

  const rawType = String(input.mediaType ?? 'movie').trim().toLowerCase();
  if (rawType !== 'movie' && rawType !== 'tv') {
    return {
      valid: false,
      code: 'INVALID_MEDIA_TYPE',
      error: 'Parameter "mediaType" must be either "movie" or "tv".',
    };
  }

  const rawTmdbId = String(input.tmdbId ?? '').trim();
  if (!rawTmdbId || !/^(?:tt\d+|\d+)$/i.test(rawTmdbId)) {
    return {
      valid: false,
      code: 'INVALID_TMDB_ID',
      error: 'Parameter "tmdbId" is required and must be a valid numeric TMDB ID or IMDb ID (e.g. "128" or "66732").',
    };
  }

  const season = input.season !== undefined && input.season !== null && input.season !== ''
    ? Number(input.season)
    : 1;
  const episode = input.episode !== undefined && input.episode !== null && input.episode !== ''
    ? Number(input.episode)
    : 1;

  if (!Number.isInteger(season) || season < 1 || season > 200) {
    return {
      valid: false,
      code: 'INVALID_SEASON',
      error: 'Parameter "season" must be a positive integer between 1 and 200.',
    };
  }

  if (!Number.isInteger(episode) || episode < 1 || episode > 5000) {
    return {
      valid: false,
      code: 'INVALID_EPISODE',
      error: 'Parameter "episode" must be a positive integer between 1 and 5000.',
    };
  }

  const rawLang = String(input.lang ?? 'en').trim().toLowerCase() || 'en';
  if (!/^[a-z]{2,8}$/.test(rawLang)) {
    return {
      valid: false,
      code: 'INVALID_LANGUAGE',
      error: 'Parameter "lang" must be a valid ISO language code (e.g. "en", "hi", "ja", "es").',
    };
  }

  const rawQuality = String(input.quality ?? '1080p').trim().toLowerCase() || '1080p';
  const normalizedQuality =
    rawQuality === '4k' || rawQuality === '2160' || rawQuality === '2160p'
      ? '2160p'
      : rawQuality === '1080' || rawQuality === '1080p' || rawQuality === 'fhd'
      ? '1080p'
      : rawQuality === '720' || rawQuality === '720p' || rawQuality === 'hd'
      ? '720p'
      : rawQuality === '480' || rawQuality === '480p' || rawQuality === 'sd'
      ? '480p'
      : rawQuality === '360' || rawQuality === '360p'
      ? '360p'
      : '';

  if (!normalizedQuality) {
    return {
      valid: false,
      code: 'INVALID_QUALITY',
      error: 'Parameter "quality" must be one of: "360p", "480p", "720p", "1080p", "2160p" (or "4K").',
    };
  }

  const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim() : undefined;
  const year = typeof input.year === 'string' && input.year.trim() ? input.year.trim() : undefined;

  return {
    valid: true,
    data: {
      mediaType: rawType,
      tmdbId: rawTmdbId,
      season,
      episode,
      lang: rawLang,
      quality: normalizedQuality,
      title,
      year,
    },
  };
}

/**
 * Selects the best matching language group and quality option from a DownloadResolutionResult.
 */
export function selectResolvedDownloadOption(
  resolution: DownloadResolutionResult,
  requestedLang: string,
  requestedQuality: string
): {
  langGroup: DownloadLanguageGroup;
  qualityOption: DownloadQualityOption;
} | null {
  if (!resolution || !Array.isArray(resolution.languages) || resolution.languages.length === 0) {
    return null;
  }

  const cleanLang = requestedLang.toLowerCase().trim();
  const langGroup =
    resolution.languages.find((l) => l.langCode.toLowerCase() === cleanLang) ||
    resolution.languages.find((l) => l.langCode === 'en') ||
    resolution.languages[0];

  if (!langGroup || !Array.isArray(langGroup.qualities) || langGroup.qualities.length === 0) {
    return null;
  }

  const reqHeight = Number((requestedQuality.match(/(\d{3,4})/) || [])[1]) || 1080;
  const exactQuality = langGroup.qualities.find(
    (q) => q.quality.toLowerCase() === requestedQuality.toLowerCase() || q.resolution === reqHeight
  );

  if (exactQuality) {
    return { langGroup, qualityOption: exactQuality };
  }

  const sortedByClosest = [...langGroup.qualities].sort(
    (a, b) => Math.abs(a.resolution - reqHeight) - Math.abs(b.resolution - reqHeight)
  );

  return {
    langGroup,
    qualityOption: sortedByClosest[0],
  };
}

/**
 * Stateful Public Download API Manager (Unlimited Access, Zero Rate Limits, Zero Quotas).
 */
export class PublicDownloadApiManager {
  private keys = new Map<string, DeveloperApiKey>();
  private jobs = new Map<string, DownloadJobRecord>();
  private activityLogs: ApiActivityLogEntry[] = [];
  private persistEnabled: boolean;

  constructor(options?: { persistEnabled?: boolean }) {
    this.persistEnabled = options?.persistEnabled ?? true;
    this.loadState();
    this.ensureDefaultKey();
  }

  private ensureDefaultKey(): void {
    const defaultHash = hashApiKey(DEFAULT_DEMO_API_KEY);
    const existing = Array.from(this.keys.values()).find((k) => k.keyHash === defaultHash);
    if (!existing) {
      const defaultKey: DeveloperApiKey = {
        id: 'key_default_prod',
        name: 'Default Production API Key',
        keyPrefix: `${DEFAULT_DEMO_API_KEY.slice(0, 13)}...${DEFAULT_DEMO_API_KEY.slice(-4)}`,
        keyHash: defaultHash,
        createdAt: new Date(Date.now() - 3600_000 * 24).toISOString(),
        lastUsedAt: new Date().toISOString(),
        revokedAt: null,
        status: 'active',
        requestCount: 0,
        downloadCount: 0,
        rateLimit: 'UNLIMITED',
        quota: 'UNLIMITED',
      };
      this.keys.set(defaultKey.id, defaultKey);
      this.saveState();
    }
  }

  private loadState(): void {
    if (!this.persistEnabled) return;
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.keys)) {
          for (const k of parsed.keys) {
            if (k && k.id) this.keys.set(k.id, k);
          }
        }
        if (Array.isArray(parsed.jobs)) {
          for (const j of parsed.jobs) {
            if (j && j.id) this.jobs.set(j.id, j);
          }
        }
        if (Array.isArray(parsed.activityLogs)) {
          this.activityLogs = parsed.activityLogs.slice(0, 200);
        }
      }
    } catch {
      // Ignore corrupt state file
    }
  }

  private saveState(): void {
    if (!this.persistEnabled) return;
    try {
      const payload = {
        keys: Array.from(this.keys.values()),
        jobs: Array.from(this.jobs.values()).slice(-200),
        activityLogs: this.activityLogs.slice(0, 200),
      };
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Ignore write errors
    }
  }

  /**
   * Creates a new Developer API Key with unlimited access.
   */
  public createApiKey(name?: string): {
    key: DeveloperApiKey;
    rawKey: string;
  } {
    const cleanName = (name || '').trim() || `API Key ${this.keys.size + 1}`;
    const { rawKey, keyPrefix, keyHash } = generateDeveloperApiKeyPair();
    const id = `key_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const record: DeveloperApiKey = {
      id,
      name: cleanName,
      keyPrefix,
      keyHash,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revokedAt: null,
      status: 'active',
      requestCount: 0,
      downloadCount: 0,
      rateLimit: 'UNLIMITED',
      quota: 'UNLIMITED',
    };
    this.keys.set(id, record);
    this.logActivity({
      method: 'POST',
      endpoint: '/api/v1/developer/keys',
      statusCode: 201,
      keyId: id,
      keyPrefix,
      latencyMs: 2,
      summary: `Created API key "${cleanName}" (${keyPrefix})`,
    });
    this.saveState();
    return { key: record, rawKey };
  }

  /**
   * Lists all Developer API Keys (never exposing raw secrets).
   */
  public listApiKeys(): DeveloperApiKey[] {
    return Array.from(this.keys.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Revokes a Developer API Key by ID.
   */
  public revokeApiKey(keyId: string): DeveloperApiKey | null {
    const record = this.keys.get(keyId);
    if (!record) return null;
    record.status = 'revoked';
    record.revokedAt = new Date().toISOString();
    this.logActivity({
      method: 'DELETE',
      endpoint: `/api/v1/developer/keys/${keyId}`,
      statusCode: 200,
      keyId: record.id,
      keyPrefix: record.keyPrefix,
      latencyMs: 1,
      summary: `Revoked API key "${record.name}" (${record.keyPrefix})`,
    });
    this.saveState();
    return record;
  }

  /**
   * Validates a raw API key without imposing any rate limits or quotas.
   */
  public authenticateKey(rawKey: string | null | undefined): {
    authenticated: boolean;
    key?: DeveloperApiKey;
    error?: string;
    code?: string;
  } {
    if (!rawKey || !rawKey.trim()) {
      return {
        authenticated: false,
        code: 'MISSING_API_KEY',
        error: 'Authentication required. Provide a valid API key via "Authorization: Bearer <API_KEY>" or "X-API-Key: <API_KEY>".',
      };
    }

    const incomingHash = hashApiKey(rawKey);
    const matched = Array.from(this.keys.values()).find((k) => k.keyHash === incomingHash);

    if (!matched) {
      return {
        authenticated: false,
        code: 'INVALID_API_KEY',
        error: 'Invalid API key provided.',
      };
    }

    if (matched.status === 'revoked') {
      return {
        authenticated: false,
        code: 'REVOKED_API_KEY',
        error: `API key "${matched.keyPrefix}" has been revoked and can no longer be used.`,
      };
    }

    matched.lastUsedAt = new Date().toISOString();
    matched.requestCount += 1;
    this.saveState();

    return {
      authenticated: true,
      key: matched,
    };
  }

  /**
   * Creates a new Download Job and transitions it through the existing Download Engine.
   */
  public createDownloadJob(params: {
    key: DeveloperApiKey;
    request: ValidatedDownloadRequest;
  }): DownloadJobRecord {
    const { key, request } = params;
    const jobId = `job_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
    const nowIso = new Date().toISOString();
    const expiresAtMs = Date.now() + DEFAULT_URL_TTL_MS;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const signedToken = signDownloadFileToken(jobId, key.id, expiresAtMs);

    const job: DownloadJobRecord = {
      id: jobId,
      keyId: key.id,
      keyPrefix: key.keyPrefix,
      status: 'processing',
      progress: 15,
      stage: 'Resolving media streams via Download Engine',
      mediaType: request.mediaType,
      tmdbId: request.tmdbId,
      season: request.mediaType === 'tv' ? request.season : undefined,
      episode: request.mediaType === 'tv' ? request.episode : undefined,
      lang: request.lang,
      quality: request.quality,
      title: request.title || (request.mediaType === 'tv' ? `Series #${request.tmdbId}` : `Movie #${request.tmdbId}`),
      year: request.year,
      format: 'mp4',
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null,
      expiresAt,
      expiresAtMs,
      signedToken,
      error: null,
    };

    key.downloadCount += 1;
    this.jobs.set(jobId, job);
    this.saveState();
    return job;
  }

  /**
   * Updates an existing Download Job with the output from the existing Download Engine.
   */
  public completeDownloadJobWithResolution(
    jobId: string,
    resolution: DownloadResolutionResult
  ): DownloadJobRecord | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    if (!resolution || !resolution.success) {
      job.status = 'failed';
      job.progress = 0;
      job.stage = 'Failed to resolve media stream';
      job.error = resolution?.unsupportedReason || 'Media resolution failed in Download Engine';
      job.updatedAt = new Date().toISOString();
      this.saveState();
      return job;
    }

    const selected = selectResolvedDownloadOption(resolution, job.lang, job.quality);
    if (!selected) {
      job.status = 'failed';
      job.progress = 0;
      job.stage = 'No matching downloadable stream found';
      job.error = `No downloadable stream available for language "${job.lang}" at "${job.quality}".`;
      job.updatedAt = new Date().toISOString();
      this.saveState();
      return job;
    }

    const nowIso = new Date().toISOString();
    job.title = resolution.title || job.title;
    job.year = resolution.year || job.year;
    job.lang = selected.langGroup.langCode;
    job.quality = selected.qualityOption.quality;
    job.sizeFormatted = selected.qualityOption.sizeFormatted;
    job.codec = selected.qualityOption.codec;
    job.sourceProvider = selected.qualityOption.sourceProvider;
    job.internalDownloadUrl = selected.qualityOption.downloadUrl;
    job.directUrl = selected.qualityOption.directUrl;
    job.availableLanguages = resolution.languages.map((lg) => ({
      langCode: lg.langCode,
      langName: lg.langName,
      qualities: lg.qualities.map((q) => ({
        quality: q.quality,
        resolution: q.resolution,
        sizeFormatted: q.sizeFormatted,
        codec: q.codec,
      })),
    }));
    job.status = 'completed';
    job.progress = 100;
    job.stage = 'Ready for download';
    job.updatedAt = nowIso;
    job.completedAt = nowIso;
    job.error = null;

    this.saveState();
    return job;
  }

  /**
   * Marks a Download Job as failed.
   */
  public failDownloadJob(jobId: string, errorMessage: string): DownloadJobRecord | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'failed';
    job.progress = 0;
    job.stage = 'Download resolution failed';
    job.error = errorMessage;
    job.updatedAt = new Date().toISOString();
    this.saveState();
    return job;
  }

  /**
   * Retrieves a Download Job by ID.
   */
  public getDownloadJob(jobId: string): DownloadJobRecord | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Lists all Download Jobs sorted newest first.
   */
  public listDownloadJobs(filterKeyId?: string): DownloadJobRecord[] {
    const all = Array.from(this.jobs.values());
    const filtered = filterKeyId ? all.filter((j) => j.keyId === filterKeyId) : all;
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Builds the public-facing JSON representation of a Download Job, including the expiring signed download URL.
   */
  public formatPublicJobResponse(
    job: DownloadJobRecord,
    baseOrigin: string = PUBLIC_API_DEPLOYMENT_ORIGIN
  ): Record<string, any> {
    const cleanOrigin = resolvePublicDeploymentOrigin(baseOrigin);
    const filePath = `/api/v1/downloads/${encodeURIComponent(job.id)}/file?token=${encodeURIComponent(
      job.signedToken
    )}&expires=${job.expiresAtMs}`;
    const fullDownloadUrl = `${cleanOrigin}${filePath}`;

    return {
      success: job.status !== 'failed',
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      baseApiUrl: `${cleanOrigin}/api/v1`,
      media: {
        mediaType: job.mediaType,
        tmdbId: job.tmdbId,
        title: job.title,
        year: job.year || null,
        season: job.season ?? null,
        episode: job.episode ?? null,
        lang: job.lang,
        quality: job.quality,
        format: job.format,
        codec: job.codec || null,
        sizeFormatted: job.sizeFormatted || null,
        sourceProvider: job.sourceProvider || null,
      },
      downloadUrl: job.status === 'completed' ? fullDownloadUrl : null,
      statusUrl: `${cleanOrigin}/api/v1/downloads/${encodeURIComponent(job.id)}/status`,
      detailUrl: `${cleanOrigin}/api/v1/downloads/${encodeURIComponent(job.id)}`,
      relativeDownloadUrl: job.status === 'completed' ? filePath : null,
      expiresAt: job.status === 'completed' ? job.expiresAt : null,
      availableLanguages: job.availableLanguages || [],
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      error: job.error,
      policy: {
        rateLimit: 'UNLIMITED',
        quota: 'UNLIMITED',
      },
    };
  }

  /**
   * Logs an API request in the activity log.
   */
  public logActivity(entry: Omit<ApiActivityLogEntry, 'id' | 'timestamp'>): ApiActivityLogEntry {
    const fullEntry: ApiActivityLogEntry = {
      id: `req_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.activityLogs.unshift(fullEntry);
    if (this.activityLogs.length > 250) {
      this.activityLogs.length = 250;
    }
    this.saveState();
    return fullEntry;
  }

  /**
   * Computes real-time Developer API usage statistics (with unlimited policy).
   */
  public getUsageStatistics(filterKeyId?: string) {
    const allKeys = this.listApiKeys();
    const activeKeysCount = allKeys.filter((k) => k.status === 'active').length;
    const revokedKeysCount = allKeys.filter((k) => k.status === 'revoked').length;

    const allJobs = this.listDownloadJobs(filterKeyId);
    const completedJobs = allJobs.filter((j) => j.status === 'completed').length;
    const failedJobs = allJobs.filter((j) => j.status === 'failed').length;
    const processingJobs = allJobs.filter(
      (j) => j.status === 'processing' || j.status === 'queued'
    ).length;

    const logs = filterKeyId
      ? this.activityLogs.filter((l) => l.keyId === filterKeyId)
      : this.activityLogs;

    const totalRequestsFromKeys = allKeys
      .filter((k) => !filterKeyId || k.id === filterKeyId)
      .reduce((acc, k) => acc + k.requestCount, 0);

    const totalRequests = Math.max(logs.length, totalRequestsFromKeys);
    const finishedCount = completedJobs + failedJobs;
    const successRate =
      finishedCount > 0 ? Number(((completedJobs / finishedCount) * 100).toFixed(1)) : 100;

    const endpointBreakdown: Record<string, number> = {};
    for (const log of logs) {
      const normalizedEp = log.endpoint.replace(/\/job_[a-z0-9_]+/gi, '/:id').replace(/\/key_[a-z0-9_]+/gi, '/:id');
      endpointBreakdown[normalizedEp] = (endpointBreakdown[normalizedEp] || 0) + 1;
    }

    return {
      success: true,
      baseUrl: PUBLIC_API_BASE_URL,
      siteOrigin: PUBLIC_API_DEPLOYMENT_ORIGIN,
      accessTier: 'UNLIMITED',
      rateLimit: null,
      quota: null,
      unlimitedRequests: true,
      unlimitedDownloads: true,
      metrics: {
        totalRequests,
        totalDownloadJobs: allJobs.length,
        completedDownloads: completedJobs,
        failedDownloads: failedJobs,
        activeDownloads: processingJobs,
        successRatePercent: successRate,
        activeApiKeys: activeKeysCount,
        revokedApiKeys: revokedKeysCount,
      },
      endpointBreakdown,
      recentActivity: logs.slice(0, 50),
    };
  }
}

export const PUBLIC_API_DEPLOYMENT_ORIGIN = 'https://zxcstream-mirror.vercel.app';
export const PUBLIC_API_BASE_URL = `${PUBLIC_API_DEPLOYMENT_ORIGIN}/api/v1`;

export function resolvePublicDeploymentOrigin(rawOrigin?: string): string {
  const trimmed = (rawOrigin || '').trim().replace(/\/+$/, '');
  if (
    !trimmed ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1') ||
    trimmed.includes('.run.app')
  ) {
    return PUBLIC_API_DEPLOYMENT_ORIGIN;
  }
  return trimmed;
}

export const publicDownloadApiManager = new PublicDownloadApiManager();
