import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  Key,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import { triggerNativeBrowserDownload } from '../services/downloadEngineTypes';
import {
  buildDownloadUrl,
  buildSimpleApiJsonUrl,
  buildSimpleDirectMp4Url,
  getDefaultOrigin,
} from '../utils/urlBuilder';

export interface DeveloperDashboardPageProps {
  onNavigateHome: () => void;
  onNavigateDownload?: (
    mediaType: 'movie' | 'tv',
    tmdbId: string,
    season?: number,
    episode?: number
  ) => void;
}

type DashboardTab = 'overview' | 'keys' | 'jobs' | 'docs';
type CodeSnippetLang = 'javascript' | 'curl' | 'nodejs';

interface ApiKeyItem {
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

interface DownloadJobItem {
  success: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  media: {
    mediaType: 'movie' | 'tv';
    tmdbId: string;
    title: string;
    year: string | null;
    season: number | null;
    episode: number | null;
    lang: string;
    quality: string;
    format: string;
    codec: string | null;
    sizeFormatted: string | null;
    sourceProvider: string | null;
  };
  downloadUrl: string | null;
  relativeDownloadUrl: string | null;
  expiresAt: string | null;
  availableLanguages: Array<{
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
  error: string | null;
}

interface ActivityLogItem {
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

interface UsageMetrics {
  totalRequests: number;
  totalDownloadJobs: number;
  completedDownloads: number;
  failedDownloads: number;
  activeDownloads: number;
  successRatePercent: number;
  activeApiKeys: number;
  revokedApiKeys: number;
}

const SANDBOX_PRESETS = [
  { label: 'Breaking Bad S1E1 (TV 1396/1/1)', mediaType: 'tv' as const, tmdbId: '1396', season: 1, episode: 1, lang: 'hi', quality: '1080p' },
  { label: 'Princess Mononoke (Movie 128)', mediaType: 'movie' as const, tmdbId: '128', season: 1, episode: 1, lang: 'hi', quality: '1080p' },
  { label: 'Gladiator II (Movie 558449)', mediaType: 'movie' as const, tmdbId: '558449', season: 1, episode: 1, lang: 'en', quality: '1080p' },
  { label: 'Stranger Things S1E1 (TV 66732/1/1)', mediaType: 'tv' as const, tmdbId: '66732', season: 1, episode: 1, lang: 'en', quality: '1080p' },
];

export const DeveloperDashboardPage: React.FC<DeveloperDashboardPageProps> = ({
  onNavigateHome,
  onNavigateDownload,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [defaultDemoKey, setDefaultDemoKey] = useState<string>(
    'zxc_live_a1b2c3d4e5f60718293a4b5c6d7e8f90'
  );
  const [metrics, setMetrics] = useState<UsageMetrics>({
    totalRequests: 0,
    totalDownloadJobs: 0,
    completedDownloads: 0,
    failedDownloads: 0,
    activeDownloads: 0,
    successRatePercent: 100,
    activeApiKeys: 1,
    revokedApiKeys: 0,
  });
  const [jobs, setJobs] = useState<DownloadJobItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // API Key creation state
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [creatingKey, setCreatingKey] = useState<boolean>(false);
  const [newlyCreatedSecretKey, setNewlyCreatedSecretKey] = useState<{
    name: string;
    rawKey: string;
  } | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Live API Sandbox & Custom URL Builder state (defaults to TV 1396/1/1 as requested)
  const [sandboxApiKey, setSandboxApiKey] = useState<string>(
    'zxc_live_a1b2c3d4e5f60718293a4b5c6d7e8f90'
  );
  const [sandboxMediaType, setSandboxMediaType] = useState<'movie' | 'tv'>('tv');
  const [sandboxTmdbId, setSandboxTmdbId] = useState<string>('1396');
  const [sandboxSeason, setSandboxSeason] = useState<number>(1);
  const [sandboxEpisode, setSandboxEpisode] = useState<number>(1);
  const [sandboxLang, setSandboxLang] = useState<string>('hi');
  const [sandboxQuality, setSandboxQuality] = useState<string>('1080p');
  const [sandboxRunning, setSandboxRunning] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<DownloadJobItem | null>(null);
  const [sandboxStatusResponse, setSandboxStatusResponse] = useState<Record<string, any> | null>(
    null
  );
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  // Activity log filter
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Documentation code snippet tab
  const [snippetLang, setSnippetLang] = useState<CodeSnippetLang>('javascript');

  const baseOrigin = getDefaultOrigin();
  const baseApiUrl = `${baseOrigin}/api/v1`;

  const copyToClipboard = async (text: string, tokenId: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    setCopiedTokenId(tokenId);
    window.setTimeout(() => {
      setCopiedTokenId((prev) => (prev === tokenId ? null : prev));
    }, 2000);
  };

  const fetchDashboardState = useCallback(async () => {
    try {
      const [keysRes, usageRes] = await Promise.all([
        fetch('/api/v1/developer/keys'),
        fetch('/api/v1/developer/usage'),
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        if (Array.isArray(keysData.keys)) {
          setKeys(keysData.keys);
        }
        if (keysData.defaultDemoKey) {
          setDefaultDemoKey(keysData.defaultDemoKey);
        }
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        if (usageData.metrics) {
          setMetrics(usageData.metrics);
        }
        if (Array.isArray(usageData.jobs)) {
          setJobs(usageData.jobs);
        }
        if (Array.isArray(usageData.recentActivity)) {
          setActivityLogs(usageData.recentActivity);
        }
      }
    } catch {
      // Keep existing state on transient error
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardState();
  }, [fetchDashboardState]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    const trimmedName = newKeyName.trim();
    if (!trimmedName) {
      setKeyError('Please enter a descriptive name for your API key.');
      return;
    }

    setCreatingKey(true);
    try {
      const res = await fetch('/api/v1/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setKeyError(data.error || 'Failed to generate API key.');
      } else {
        setNewlyCreatedSecretKey({
          name: data.key.name,
          rawKey: data.apiKey,
        });
        setSandboxApiKey(data.apiKey);
        setNewKeyName('');
        await fetchDashboardState();
      }
    } catch (err: any) {
      setKeyError(err?.message || 'Network error while generating API key.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/v1/developer/keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDashboardState();
      }
    } catch {
      // ignore
    }
  };

  const handleExecuteSandboxDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSandboxError(null);
    setSandboxStatusResponse(null);

    if (!sandboxTmdbId.trim()) {
      setSandboxError('Please provide a valid TMDB ID (e.g. 128 or 66732).');
      return;
    }

    setSandboxRunning(true);
    try {
      const res = await fetch('/api/v1/downloads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sandboxApiKey.trim()}`,
        },
        body: JSON.stringify({
          mediaType: sandboxMediaType,
          tmdbId: sandboxTmdbId.trim(),
          season: sandboxMediaType === 'tv' ? sandboxSeason : undefined,
          episode: sandboxMediaType === 'tv' ? sandboxEpisode : undefined,
          lang: sandboxLang,
          quality: sandboxQuality,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSandboxError(data.error || `HTTP ${res.status} Request Failed`);
        setSandboxResult(null);
      } else {
        setSandboxResult(data);
      }
      await fetchDashboardState();
    } catch (err: any) {
      setSandboxError(err?.message || 'Network request failed.');
    } finally {
      setSandboxRunning(false);
    }
  };

  const handlePollJobStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/downloads/${encodeURIComponent(jobId)}/status`, {
        headers: {
          Authorization: `Bearer ${sandboxApiKey.trim() || defaultDemoKey}`,
        },
      });
      const data = await res.json();
      setSandboxStatusResponse(data);
      await fetchDashboardState();
    } catch (err: any) {
      setSandboxStatusResponse({ success: false, error: err?.message || 'Status check failed' });
    }
  };

  const handleTriggerSignedFileDownload = (job: DownloadJobItem) => {
    const urlToUse = job.relativeDownloadUrl || job.downloadUrl;
    if (!urlToUse) return;
    const cleanTitle = (job.media.title || 'Media')
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '.');
    const filename = `${cleanTitle}.${job.media.quality}.${job.media.lang.toUpperCase()}.mp4`;
    triggerNativeBrowserDownload({
      url: urlToUse,
      filename,
    });
  };

  const filteredLogs = activityLogs.filter((log) => {
    if (methodFilter !== 'ALL' && log.method !== methodFilter) return false;
    if (!activitySearch.trim()) return true;
    const q = activitySearch.toLowerCase();
    return (
      log.endpoint.toLowerCase().includes(q) ||
      log.summary.toLowerCase().includes(q) ||
      log.keyPrefix.toLowerCase().includes(q) ||
      (log.jobId && log.jobId.toLowerCase().includes(q))
    );
  });

  const activeExampleKey = newlyCreatedSecretKey?.rawKey || sandboxApiKey || defaultDemoKey;

  // Live custom 1-line URLs based on current inputs
  const livePageUrl = buildDownloadUrl(
    sandboxMediaType,
    sandboxTmdbId || (sandboxMediaType === 'tv' ? '1396' : '128'),
    baseOrigin,
    sandboxSeason,
    sandboxEpisode
  );
  const liveDirectMp4Url = buildSimpleDirectMp4Url(
    sandboxMediaType,
    sandboxTmdbId || (sandboxMediaType === 'tv' ? '1396' : '128'),
    {
      season: sandboxSeason,
      episode: sandboxEpisode,
      lang: sandboxLang,
      quality: sandboxQuality,
      baseOrigin,
    }
  );
  const liveSimpleJsonUrl = buildSimpleApiJsonUrl(
    sandboxMediaType,
    sandboxTmdbId || (sandboxMediaType === 'tv' ? '1396' : '128'),
    sandboxSeason,
    sandboxEpisode,
    baseOrigin
  );

  // Ready-to-share message for friend (TV 1396 S1E1 + S1E2, Movie 128 + 533535)
  const friendShareMessage = `✅ ZXC[STREAM] Download API Examples:

1️⃣ TV Series Example: Breaking Bad (TMDB ID 1396):
• Episode 1 (S1E1) Direct MP4: ${baseApiUrl}/dl/tv/1396/1/1?lang=hi&quality=1080p
• Episode 1 (S1E1) Page:       ${baseOrigin}/download/tv/1396/1/1
• Episode 2 (S1E2) Direct MP4: ${baseApiUrl}/dl/tv/1396/1/2?lang=hi&quality=1080p
• Episode 2 (S1E2) Page:       ${baseOrigin}/download/tv/1396/1/2
• Simple JSON API (GET):       ${baseApiUrl}/download/tv/1396/1/2

2️⃣ Movie Examples (Standalone Movies):
• Movie 1: Princess Mononoke (TMDB ID 128 - 2h 14m)
  Direct MP4: ${baseApiUrl}/dl/movie/128?lang=hi&quality=1080p
  Page:       ${baseOrigin}/download/movie/128
• Movie 2: Deadpool & Wolverine (TMDB ID 533535 - 2h 8m)
  Direct MP4: ${baseApiUrl}/dl/movie/533535?lang=hi&quality=1080p
  Page:       ${baseOrigin}/download/movie/533535

📌 Format Rule:
• TV Series: ${baseOrigin}/download/tv/{tmdbId}/{season}/{episode}
• Movies:    ${baseOrigin}/download/movie/{tmdbId}`;

  const jsSnippet = `// ✅ SUPER SIMPLE 1-LINE METHOD (No POST body required!)

// 1. TV Series Example (1396/1/1 -> Season 1, Episode 1):
const tvRes = await fetch('${baseApiUrl}/download/tv/1396/1/1');
const tvData = await tvRes.json();
console.log('TV Series Direct MP4 Link:', tvData.directMp4Url);
console.log('TV Series Download Page:', tvData.downloadPageUrl);

// 2. Movie Example (128):
const movieRes = await fetch('${baseApiUrl}/download/movie/128');
const movieData = await movieRes.json();
console.log('Movie Direct MP4 Link:', movieData.directMp4Url);
console.log('Movie Download Page:', movieData.downloadPageUrl);

// 3. Or put Direct MP4 Link straight into an <a> tag on your site:
// Series: ${baseApiUrl}/dl/tv/1396/1/1?lang=hi&quality=1080p
// Movie:  ${baseApiUrl}/dl/movie/128?lang=hi&quality=1080p`;

  const curlSnippet = `# 1️⃣ TV Series (1396/1/1) — Simple 1-Line GET JSON
curl "${baseApiUrl}/download/tv/1396/1/1"

# 2️⃣ Movie (128) — Simple 1-Line GET JSON
curl "${baseApiUrl}/download/movie/128"

# 3️⃣ Direct .mp4 File Download (TV Series 1396/1/1 & Movie 128)
curl -L -o "Series_1396_S1E1.mp4" "${baseApiUrl}/dl/tv/1396/1/1?lang=hi&quality=1080p"
curl -L -o "Movie_128.mp4" "${baseApiUrl}/dl/movie/128?lang=hi&quality=1080p"`;

  const nodeSnippet = `import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const BASE_URL = '${baseApiUrl}';

// Download TV Series (e.g. 1396/1/1) or Movie (e.g. 128) directly to disk:
export async function downloadMediaSimple() {
  // TV Series 1396 Season 1 Episode 1:
  const tvStream = await fetch(\`\${BASE_URL}/dl/tv/1396/1/1?lang=hi&quality=1080p\`);
  await pipeline(Readable.fromWeb(tvStream.body), fs.createWriteStream('Series_1396_S1E1.mp4'));

  // Movie 128:
  const movieStream = await fetch(\`\${BASE_URL}/dl/movie/128?lang=hi&quality=1080p\`);
  await pipeline(Readable.fromWeb(movieStream.body), fs.createWriteStream('Movie_128.mp4'));
}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Bar Contract: Brand | Navigation Tabs | Primary Action */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onNavigateHome}
            data-testid="dev-back-home-btn"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Studio</span>
          </button>
          <span className="text-zinc-700" aria-hidden="true">
            /
          </span>
          <span className="text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0">
            ZXC[STREAM] Developer API
          </span>
        </div>

        <nav
          aria-label="Developer Portal Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            data-testid="dev-tab-overview"
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Overview & Sandbox
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keys')}
            data-testid="dev-tab-keys"
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'keys'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            API Keys ({keys.filter((k) => k.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            data-testid="dev-tab-jobs"
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'jobs'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Download Jobs ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            data-testid="dev-tab-docs"
            className={`py-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'docs'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            API Documentation
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('keys');
            }}
            data-testid="dev-header-create-key-btn"
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Manage API Keys
          </button>
        </div>
      </header>

      {/* Mobile Tab Selector */}
      <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
        {(['overview', 'keys', 'jobs', 'docs'] as DashboardTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === 'overview'
              ? 'Overview'
              : tab === 'keys'
              ? `API Keys (${keys.filter((k) => k.status === 'active').length})`
              : tab === 'jobs'
              ? `Jobs (${jobs.length})`
              : 'Documentation'}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero / Architecture Summary Bar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span>REST API v1</span>
              <span aria-hidden="true">·</span>
              <span>Direct Download Engine Bridge</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Unlimited Requests & Downloads</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Public Media Download API & Developer Console
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Integrate our multi-audio MP4 download engine directly into external websites and
              backend services. Every authenticated API key receives unlimited request throughput,
              unlimited concurrent download jobs, and HMAC-signed expiring download links.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-3">
              <div className="text-xs">
                <div className="text-zinc-400">Base Endpoint URL</div>
                <div
                  data-testid="dev-base-api-url"
                  className="font-mono text-zinc-100 mt-0.5 select-all"
                >
                  {baseApiUrl}
                </div>
              </div>
              <button
                type="button"
                aria-label="Copy Base API URL"
                onClick={() => copyToClipboard(baseApiUrl, 'base-url')}
                className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {copiedTokenId === 'base-url' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => void fetchDashboardState()}
              aria-label="Refresh Telemetry"
              data-testid="dev-refresh-btn"
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-200 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </section>

        {/* 4-Column KPI Telemetry Strip */}
        <section
          aria-label="API Usage Statistics"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="p-5 bg-zinc-900/70 border border-zinc-800/90 rounded-xl space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Total API Requests</div>
            <div
              data-testid="metric-total-requests"
              className="text-2xl font-bold text-white font-mono tabular-nums"
            >
              {metrics.totalRequests.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 pt-1">
              Rate Limit: <span className="text-emerald-400 font-medium">Unlimited</span>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/70 border border-zinc-800/90 rounded-xl space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Download Jobs Processed</div>
            <div
              data-testid="metric-total-downloads"
              className="text-2xl font-bold text-white font-mono tabular-nums"
            >
              {metrics.totalDownloadJobs.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400 pt-1">
              Download Quota: <span className="text-emerald-400 font-medium">Unlimited</span>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/70 border border-zinc-800/90 rounded-xl space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Engine Success / Failure</div>
            <div className="flex items-baseline gap-2">
              <span
                data-testid="metric-success-rate"
                className="text-2xl font-bold text-emerald-400 font-mono tabular-nums"
              >
                {metrics.successRatePercent}%
              </span>
              <span className="text-xs text-zinc-400 font-mono tabular-nums">
                ({metrics.completedDownloads} ok · {metrics.failedDownloads} failed)
              </span>
            </div>
            <div className="text-xs text-zinc-400 pt-1">
              Direct CDN & Multi-Audio MP4 Engine
            </div>
          </div>

          <div className="p-5 bg-zinc-900/70 border border-zinc-800/90 rounded-xl space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Active Developer Keys</div>
            <div
              data-testid="metric-active-keys"
              className="text-2xl font-bold text-white font-mono tabular-nums"
            >
              {metrics.activeApiKeys}
            </div>
            <div className="text-xs text-zinc-400 pt-1 font-mono tabular-nums">
              {metrics.revokedApiKeys} revoked · SHA-256 verified
            </div>
          </div>
        </section>

        {/* TAB 1: OVERVIEW & INTERACTIVE SANDBOX */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* ULTRA-SIMPLE 1-LINE EXAMPLES FOR SERIES (1396/1/1) & MOVIE (128) */}
            <section
              data-testid="simple-examples-section"
              className="p-6 bg-zinc-900/80 border border-blue-500/30 rounded-xl space-y-5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                    Simple 1-Line URLs · Zero Setup Required
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5">
                    Ready-to-Use Examples: TV Series (1396/1/1) &amp; Movie (128)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Bas URL me TMDB ID (aur Series ke liye Season/Episode) lagao — koi complex code ya
                    setup nahi chahiye.
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="copy-friend-examples-btn"
                  onClick={() => copyToClipboard(friendShareMessage, 'friend-share-msg')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0 self-start md:self-auto"
                >
                  {copiedTokenId === 'friend-share-msg' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied Both Examples!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Both Examples (Series 1396/1/1 + Movie)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Card 1: TV Series 1396 (Breaking Bad S1E1 & S1E2) */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        TV SERIES EXAMPLE (ID: 1396)
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">
                        Breaking Bad — Season 1 (Episodes 1 &amp; 2)
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Format: <code className="text-zinc-200">/download/tv/{'{tmdbId}'}/{'{season}'}/{'{episode}'}</code>
                      </p>
                    </div>
                    {onNavigateDownload && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onNavigateDownload('tv', '1396', 1, 1)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="Open S1E1 Download Page"
                        >
                          <span>S1E1</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateDownload('tv', '1396', 1, 2)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="Open S1E2 Download Page"
                        >
                          <span>S1E2</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* S1E1 */}
                    <div className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">
                          Episode 1 (Pilot — S1E1):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseApiUrl}/dl/tv/1396/1/1?lang=hi&quality=1080p`, 'tv-mp4-s1e1')
                            }
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'tv-mp4-s1e1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Direct MP4</span>
                          </button>
                          <span className="text-zinc-600">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseOrigin}/download/tv/1396/1/1`, 'tv-page-s1e1')
                            }
                            className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'tv-page-s1e1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Page</span>
                          </button>
                        </div>
                      </div>
                      <code className="block font-mono text-[11px] text-zinc-300 break-all select-all">
                        {baseApiUrl}/dl/tv/1396/1/1?lang=hi&amp;quality=1080p
                      </code>
                    </div>

                    {/* S1E2 */}
                    <div className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">
                          Episode 2 (Cat&apos;s in the Bag... — S1E2):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseApiUrl}/dl/tv/1396/1/2?lang=hi&quality=1080p`, 'tv-mp4-s1e2')
                            }
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'tv-mp4-s1e2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Direct MP4</span>
                          </button>
                          <span className="text-zinc-600">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseOrigin}/download/tv/1396/1/2`, 'tv-page-s1e2')
                            }
                            className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'tv-page-s1e2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Page</span>
                          </button>
                        </div>
                      </div>
                      <code className="block font-mono text-[11px] text-emerald-400 break-all select-all">
                        {baseApiUrl}/dl/tv/1396/1/2?lang=hi&amp;quality=1080p
                      </code>
                    </div>

                    {/* Simple JSON API */}
                    <div className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-zinc-400">
                          Simple 1-Line JSON API (GET):
                        </div>
                        <code
                          data-testid="example-tv-json-url"
                          className="font-mono text-blue-300 break-all select-all"
                        >
                          {baseApiUrl}/download/tv/1396/1/2
                        </code>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy TV JSON API URL"
                        onClick={() =>
                          copyToClipboard(`${baseApiUrl}/download/tv/1396/1/2`, 'tv-json-url')
                        }
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer shrink-0"
                      >
                        {copiedTokenId === 'tv-json-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Movie Examples (ID: 128 & ID: 533535) */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-semibold text-blue-400">
                        MOVIE EXAMPLES (ID: 128 &amp; 533535)
                      </span>
                      <h3 className="text-sm font-bold text-white mt-0.5">
                        Standalone Movies (No Seasons or Episodes)
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Format: <code className="text-zinc-200">/download/movie/{'{tmdbId}'}</code>
                      </p>
                    </div>
                    {onNavigateDownload && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onNavigateDownload('movie', '128')}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="Open Princess Mononoke (128)"
                        >
                          <span>128</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateDownload('movie', '533535')}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                          title="Open Deadpool & Wolverine (533535)"
                        >
                          <span>533535</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Movie 1: Princess Mononoke (128) */}
                    <div className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">
                          Movie 1: Princess Mononoke (TMDB ID 128 · 2h 14m):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseApiUrl}/dl/movie/128?lang=hi&quality=1080p`, 'movie-mp4-128')
                            }
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'movie-mp4-128' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Direct MP4</span>
                          </button>
                          <span className="text-zinc-600">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseOrigin}/download/movie/128`, 'movie-page-128')
                            }
                            className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'movie-page-128' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Page</span>
                          </button>
                        </div>
                      </div>
                      <code className="block font-mono text-[11px] text-emerald-400 break-all select-all">
                        {baseApiUrl}/dl/movie/128?lang=hi&amp;quality=1080p
                      </code>
                    </div>

                    {/* Movie 2: Deadpool & Wolverine (533535) */}
                    <div className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-300">
                          Movie 2: Deadpool &amp; Wolverine (TMDB ID 533535 · 2h 8m):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseApiUrl}/dl/movie/533535?lang=hi&quality=1080p`, 'movie-mp4-533535')
                            }
                            className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'movie-mp4-533535' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Direct MP4</span>
                          </button>
                          <span className="text-zinc-600">·</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(`${baseOrigin}/download/movie/533535`, 'movie-page-533535')
                            }
                            className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1 cursor-pointer font-mono"
                          >
                            {copiedTokenId === 'movie-page-533535' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Page</span>
                          </button>
                        </div>
                      </div>
                      <code className="block font-mono text-[11px] text-zinc-300 break-all select-all">
                        {baseApiUrl}/dl/movie/533535?lang=hi&amp;quality=1080p
                      </code>
                    </div>

                    {/* Simple JSON API */}
                    <div className="p-2.5 bg-zinc-900/90 border border-zinc-800/80 rounded-lg flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-zinc-400">
                          Simple 1-Line JSON API (GET):
                        </div>
                        <code
                          data-testid="example-movie-json-url"
                          className="font-mono text-blue-300 break-all select-all"
                        >
                          {baseApiUrl}/download/movie/128
                        </code>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy Movie JSON API URL"
                        onClick={() =>
                          copyToClipboard(`${baseApiUrl}/download/movie/128`, 'movie-json-url')
                        }
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer shrink-0"
                      >
                        {copiedTokenId === 'movie-json-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Interactive Custom URL Builder & Live API Sandbox */}
              <div className="lg:col-span-7 p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-5">
                <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Manchaha Custom URL Builder &amp; Live API Sandbox
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Kisi bhi Movie ya Series ka TMDB ID, Season, Episode daalo — turant uske
                      ready-made URLs aur live API response pao.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 shrink-0">
                    Real Engine Execution
                  </span>
                </div>

                {/* Quick Media Presets */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-400">Quick Test Presets</div>
                  <div className="flex flex-wrap gap-2">
                    {SANDBOX_PRESETS.map((preset) => (
                      <button
                        key={`${preset.mediaType}-${preset.tmdbId}`}
                        type="button"
                        onClick={() => {
                          setSandboxMediaType(preset.mediaType);
                          setSandboxTmdbId(preset.tmdbId);
                          setSandboxSeason(preset.season);
                          setSandboxEpisode(preset.episode);
                          setSandboxLang(preset.lang);
                          setSandboxQuality(preset.quality);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleExecuteSandboxDownload} className="space-y-4">
                  <div>
                    <label
                      htmlFor="sandbox-api-key-input"
                      className="block text-xs font-medium text-zinc-300 mb-1.5"
                    >
                      Developer API Key (Authorization: Bearer)
                    </label>
                    <input
                      id="sandbox-api-key-input"
                      type="text"
                      value={sandboxApiKey}
                      onChange={(e) => setSandboxApiKey(e.target.value)}
                      placeholder="zxc_live_..."
                      className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label
                        htmlFor="sandbox-media-type"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        Media Type
                      </label>
                      <select
                        id="sandbox-media-type"
                        value={sandboxMediaType}
                        onChange={(e) => setSandboxMediaType(e.target.value as 'movie' | 'tv')}
                        className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                      >
                        <option value="movie">movie</option>
                        <option value="tv">tv</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="sandbox-tmdb-id"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        TMDB ID
                      </label>
                      <input
                        id="sandbox-tmdb-id"
                        type="text"
                        value={sandboxTmdbId}
                        onChange={(e) => setSandboxTmdbId(e.target.value)}
                        placeholder="128"
                        className="w-full px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="sandbox-lang"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        Audio Language
                      </label>
                      <select
                        id="sandbox-lang"
                        value={sandboxLang}
                        onChange={(e) => setSandboxLang(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                      >
                        <option value="en">en (English)</option>
                        <option value="hi">hi (Hindi)</option>
                        <option value="ja">ja (Japanese)</option>
                        <option value="es">es (Spanish)</option>
                        <option value="ta">ta (Tamil)</option>
                        <option value="te">te (Telugu)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="sandbox-quality"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        Resolution Quality
                      </label>
                      <select
                        id="sandbox-quality"
                        value={sandboxQuality}
                        onChange={(e) => setSandboxQuality(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                      >
                        <option value="1080p">1080p Full HD</option>
                        <option value="720p">720p HD</option>
                        <option value="480p">480p SD</option>
                        <option value="360p">360p Mobile</option>
                        <option value="2160p">2160p 4K</option>
                      </select>
                    </div>
                  </div>

                  {sandboxMediaType === 'tv' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="sandbox-season"
                          className="block text-xs font-medium text-zinc-300 mb-1.5"
                        >
                          Season Number
                        </label>
                        <input
                          id="sandbox-season"
                          type="number"
                          min={1}
                          value={sandboxSeason}
                          onChange={(e) => setSandboxSeason(Number(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="sandbox-episode"
                          className="block text-xs font-medium text-zinc-300 mb-1.5"
                        >
                          Episode Number
                        </label>
                        <input
                          id="sandbox-episode"
                          type="number"
                          min={1}
                          value={sandboxEpisode}
                          onChange={(e) => setSandboxEpisode(Number(e.target.value) || 1)}
                          className="w-full px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
                        />
                      </div>
                    </div>
                  )}

                  {/* Live Custom Generated URLs */}
                  <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5 text-xs">
                    <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Your Live Custom URLs ({sandboxMediaType.toUpperCase()}{' '}
                      {sandboxTmdbId || (sandboxMediaType === 'tv' ? '1396' : '128')}
                      {sandboxMediaType === 'tv' ? `/${sandboxSeason}/${sandboxEpisode}` : ''})
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800/80">
                      <div className="min-w-0 flex-1">
                        <span className="text-zinc-400 mr-2">Page URL:</span>
                        <code
                          data-testid="live-custom-page-url"
                          className="font-mono text-zinc-100 break-all select-all"
                        >
                          {livePageUrl}
                        </code>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy Live Page URL"
                        onClick={() => copyToClipboard(livePageUrl, 'live-page-url')}
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer shrink-0"
                      >
                        {copiedTokenId === 'live-page-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800/80">
                      <div className="min-w-0 flex-1">
                        <span className="text-zinc-400 mr-2">Direct MP4:</span>
                        <code
                          data-testid="live-custom-mp4-url"
                          className="font-mono text-emerald-400 break-all select-all"
                        >
                          {liveDirectMp4Url}
                        </code>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy Live Direct MP4 URL"
                        onClick={() => copyToClipboard(liveDirectMp4Url, 'live-mp4-url')}
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer shrink-0"
                      >
                        {copiedTokenId === 'live-mp4-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800/80">
                      <div className="min-w-0 flex-1">
                        <span className="text-zinc-400 mr-2">JSON API:</span>
                        <code
                          data-testid="live-custom-json-url"
                          className="font-mono text-blue-300 break-all select-all"
                        >
                          {liveSimpleJsonUrl}
                        </code>
                      </div>
                      <button
                        type="button"
                        aria-label="Copy Live JSON API URL"
                        onClick={() => copyToClipboard(liveSimpleJsonUrl, 'live-json-url')}
                        className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer shrink-0"
                      >
                        {copiedTokenId === 'live-json-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {sandboxError && (
                    <div
                      role="alert"
                      data-testid="sandbox-error-banner"
                      className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200"
                    >
                      {sandboxError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={sandboxRunning}
                      data-testid="sandbox-submit-btn"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {sandboxRunning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Resolving in Download Engine...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Test Live API Response</span>
                        </>
                      )}
                    </button>
                    {onNavigateDownload && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateDownload(
                            sandboxMediaType,
                            sandboxTmdbId.trim() || (sandboxMediaType === 'tv' ? '1396' : '128'),
                            sandboxSeason,
                            sandboxEpisode
                          )
                        }
                        className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Open Download Page</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>

                {/* Sandbox Execution Result */}
                {sandboxResult && (
                  <div
                    data-testid="sandbox-job-result"
                    className="mt-5 pt-5 border-t border-zinc-800 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-zinc-400 font-mono">
                          Job ID: <span className="text-zinc-100">{sandboxResult.jobId}</span> ·
                          Status:{' '}
                          <span className="text-emerald-400 font-semibold uppercase">
                            {sandboxResult.status}
                          </span>{' '}
                          ({sandboxResult.progress}%)
                        </div>
                        <div className="text-sm font-semibold text-white mt-0.5">
                          {sandboxResult.media.title} · {sandboxResult.media.quality} ·{' '}
                          {sandboxResult.media.lang.toUpperCase()} ({sandboxResult.media.sizeFormatted})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handlePollJobStatus(sandboxResult.jobId)}
                          data-testid="sandbox-poll-status-btn"
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          Check /status
                        </button>
                        {sandboxResult.downloadUrl && (
                          <button
                            type="button"
                            onClick={() => handleTriggerSignedFileDownload(sandboxResult)}
                            data-testid="sandbox-download-file-btn"
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download MP4</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {sandboxResult.downloadUrl && (
                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-zinc-400">
                            Expiring Signed Download URL (Valid until{' '}
                            {sandboxResult.expiresAt
                              ? new Date(sandboxResult.expiresAt).toLocaleString()
                              : '24h'}
                            )
                          </div>
                          <div
                            data-testid="sandbox-signed-url"
                            className="text-xs font-mono text-emerald-400 truncate mt-0.5"
                          >
                            {sandboxResult.downloadUrl}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Copy Signed Download URL"
                          onClick={() =>
                            copyToClipboard(sandboxResult.downloadUrl!, 'sandbox-signed-url')
                          }
                          className="p-2 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedTokenId === 'sandbox-signed-url' ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}

                    {sandboxStatusResponse && (
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-zinc-400">
                          GET {baseApiUrl}/downloads/{sandboxResult.jobId}/status Response:
                        </div>
                        <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 overflow-x-auto max-h-40">
                          {JSON.stringify(sandboxStatusResponse, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="text-xs font-mono text-zinc-400">
                        POST {baseApiUrl}/downloads Full JSON Response:
                      </div>
                      <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto max-h-56">
                        {JSON.stringify(sandboxResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Quick Credentials & Endpoint Summary */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">
                      Active Sandbox Credentials
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('keys')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                    >
                      Manage Keys →
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Use this pre-provisioned production key to test external integrations immediately,
                    or generate additional keys in the API Keys tab.
                  </p>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between gap-2">
                    <code
                      data-testid="default-demo-api-key"
                      className="text-xs font-mono text-zinc-200 truncate select-all"
                    >
                      {defaultDemoKey}
                    </code>
                    <button
                      type="button"
                      aria-label="Copy Default API Key"
                      onClick={() => copyToClipboard(defaultDemoKey, 'default-key')}
                      className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer shrink-0"
                    >
                      {copiedTokenId === 'default-key' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1 pt-1">
                    <div>Authentication Header:</div>
                    <code className="block p-2.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 font-mono text-xs overflow-x-auto">
                      Authorization: Bearer {defaultDemoKey}
                    </code>
                  </div>
                </div>

                <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">REST API Endpoints</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('docs')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                    >
                      Full Docs →
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-800/80 text-xs font-mono">
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-emerald-400 font-semibold shrink-0">POST</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/downloads</span>
                      <span className="text-zinc-400 font-sans shrink-0">Create download job</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-blue-400 font-semibold shrink-0">GET</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/downloads/:id</span>
                      <span className="text-zinc-400 font-sans shrink-0">Job details &amp; links</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-blue-400 font-semibold shrink-0">GET</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/downloads/:id/status</span>
                      <span className="text-zinc-400 font-sans shrink-0">Poll progress %</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-blue-400 font-semibold shrink-0">GET</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/downloads/:id/file</span>
                      <span className="text-zinc-400 font-sans shrink-0">Stream MP4 file</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-blue-400 font-semibold shrink-0">GET</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/developer/usage</span>
                      <span className="text-zinc-400 font-sans shrink-0">Usage telemetry</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-emerald-400 font-semibold shrink-0">POST</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/developer/keys</span>
                      <span className="text-zinc-400 font-sans shrink-0">Generate API key</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between gap-2">
                      <span className="text-rose-400 font-semibold shrink-0">DELETE</span>
                      <span className="text-zinc-200 flex-1 truncate">{baseApiUrl}/developer/keys/:id</span>
                      <span className="text-zinc-400 font-sans shrink-0">Revoke API key</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent API Activity Table */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Recent API Activity</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time request log across all authenticated developer keys and endpoints.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      aria-label="Filter Activity Logs"
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      placeholder="Filter by endpoint or job ID..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
                    {['ALL', 'POST', 'GET', 'DELETE'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethodFilter(m)}
                        className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                          methodFilter === m
                            ? 'bg-zinc-800 text-white font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-400">
                  No API requests match the current filter. Trigger a request in the sandbox above to
                  populate live activity.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                        <th className="py-2.5 pr-4">Timestamp</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Endpoint</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Key Prefix</th>
                        <th className="py-2.5 px-3">Summary</th>
                        <th className="py-2.5 pl-3 text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums">
                      {filteredLogs.slice(0, 20).map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 pr-4 text-zinc-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <span
                              className={
                                log.method === 'POST'
                                  ? 'text-emerald-400'
                                  : log.method === 'DELETE'
                                  ? 'text-rose-400'
                                  : 'text-blue-400'
                              }
                            >
                              {log.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-200 whitespace-nowrap">
                            {log.endpoint.startsWith('http')
                              ? log.endpoint
                              : `${baseOrigin}${log.endpoint}`}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={
                                log.statusCode >= 200 && log.statusCode < 300
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }
                            >
                              {log.statusCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                            {log.keyPrefix}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300 font-sans max-w-md truncate">
                            {log.summary}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-zinc-400 whitespace-nowrap">
                            {log.latencyMs} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: API KEY MANAGEMENT */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            {/* Create New API Key Panel */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Generate New Developer API Key</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Keys are hashed with SHA-256 on the server and enjoy unlimited API requests and
                  unlimited media downloads.
                </p>
              </div>

              <form
                onSubmit={handleCreateApiKey}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-2xl"
              >
                <div className="flex-1">
                  <label htmlFor="new-api-key-name" className="sr-only">
                    API Key Name
                  </label>
                  <input
                    id="new-api-key-name"
                    data-testid="new-api-key-name-input"
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Movie Portal or Mobile App Backend"
                    className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingKey}
                  data-testid="generate-api-key-submit-btn"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {creatingKey ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Generate API Key</span>
                </button>
              </form>

              {keyError && (
                <div
                  role="alert"
                  className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-200 max-w-2xl"
                >
                  {keyError}
                </div>
              )}

              {newlyCreatedSecretKey && (
                <div
                  data-testid="newly-created-key-banner"
                  className="p-4 bg-emerald-950/30 border border-emerald-700/60 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">
                      New Secret API Key Generated: &ldquo;{newlyCreatedSecretKey.name}&rdquo;
                    </span>
                    <span className="text-xs text-zinc-400">
                      Copy and store this key now — only its SHA-256 hash is stored on the server
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <code
                      data-testid="newly-created-raw-key"
                      className="text-xs font-mono text-emerald-400 break-all select-all"
                    >
                      {newlyCreatedSecretKey.rawKey}
                    </code>
                    <button
                      type="button"
                      aria-label="Copy Newly Generated API Key"
                      onClick={() => copyToClipboard(newlyCreatedSecretKey.rawKey, 'new-raw-key')}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedTokenId === 'new-raw-key' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Existing API Keys Table */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Developer API Keys</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Active keys have unlimited API requests and unlimited download jobs. Revoked keys
                    are rejected immediately.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table
                  data-testid="api-keys-table"
                  className="w-full text-left border-collapse text-xs"
                >
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                      <th className="py-3 pr-4">Name</th>
                      <th className="py-3 px-3">Key Prefix</th>
                      <th className="py-3 px-3">SHA-256 Hash Fingerprint</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Access Policy</th>
                      <th className="py-3 px-3 text-right">Requests</th>
                      <th className="py-3 px-3 text-right">Downloads</th>
                      <th className="py-3 px-3">Created</th>
                      <th className="py-3 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums">
                    {keys.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 pr-4 font-sans font-medium text-white whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-zinc-300 whitespace-nowrap">
                          {item.keyPrefix}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                          {item.keyHash.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-3 font-sans whitespace-nowrap">
                          {item.status === 'active' ? (
                            <span className="text-emerald-400 font-medium">Active</span>
                          ) : (
                            <span className="text-zinc-500 font-medium">Revoked</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans text-zinc-300 whitespace-nowrap">
                          Unlimited
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-200 whitespace-nowrap">
                          {item.requestCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-200 whitespace-nowrap">
                          {item.downloadCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pl-3 text-right font-sans whitespace-nowrap">
                          {item.status === 'active' ? (
                            <button
                              type="button"
                              aria-label={`Revoke API key ${item.name}`}
                              data-testid={`revoke-key-btn-${item.id}`}
                              onClick={() => void handleRevokeApiKey(item.id)}
                              className="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-white hover:bg-rose-600/80 border border-rose-800/60 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          ) : (
                            <span className="text-zinc-400 text-xs">Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: DOWNLOAD JOBS */}
        {activeTab === 'jobs' && (
          <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Download Jobs & Signed Links</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Every download job is resolved by the existing Download Engine and assigned an
                  expiring HMAC-SHA256 signed download URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                + New Download Request
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-zinc-400">
                  No API download jobs have been dispatched yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  Open API Sandbox to Create First Job
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-testid="download-jobs-table"
                  className="w-full text-left border-collapse text-xs"
                >
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                      <th className="py-3 pr-4">Job ID</th>
                      <th className="py-3 px-3">Media Title</th>
                      <th className="py-3 px-3">Type / TMDB</th>
                      <th className="py-3 px-3">Quality & Lang</th>
                      <th className="py-3 px-3">Size</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Created</th>
                      <th className="py-3 pl-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono tabular-nums">
                    {jobs.map((job) => (
                      <tr key={job.jobId} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 pr-4 text-zinc-200 whitespace-nowrap">{job.jobId}</td>
                        <td className="py-3 px-3 font-sans font-medium text-white whitespace-nowrap">
                          {job.media.title}
                          {job.media.mediaType === 'tv' &&
                            ` (S${job.media.season}E${job.media.episode})`}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap uppercase">
                          {job.media.mediaType} #{job.media.tmdbId}
                        </td>
                        <td className="py-3 px-3 text-zinc-200 whitespace-nowrap">
                          {job.media.quality} · {job.media.lang.toUpperCase()}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                          {job.media.sizeFormatted || '—'}
                        </td>
                        <td className="py-3 px-3 font-sans whitespace-nowrap">
                          {job.status === 'completed' ? (
                            <span className="text-emerald-400 font-medium">
                              Completed (100%)
                            </span>
                          ) : job.status === 'failed' ? (
                            <span className="text-rose-400 font-medium">Failed</span>
                          ) : (
                            <span className="text-amber-400 font-medium">
                              {job.status} ({job.progress}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-zinc-400 whitespace-nowrap">
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 pl-3 text-right font-sans whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {job.downloadUrl && (
                              <>
                                <button
                                  type="button"
                                  aria-label={`Copy download link for ${job.media.title}`}
                                  onClick={() => copyToClipboard(job.downloadUrl!, job.jobId)}
                                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedTokenId === job.jobId ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>Copy URL</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Download MP4 for ${job.media.title}`}
                                  onClick={() => handleTriggerSignedFileDownload(job)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 4: COMPLETE API DOCUMENTATION */}
        {activeTab === 'docs' && (
          <div data-testid="api-documentation-section" className="space-y-8">
            {/* Base URL & Authentication Section */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">1. Base URL & Authentication</h2>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                  All Public Download API requests are made over HTTP/HTTPS to the{' '}
                  <code className="font-mono text-zinc-200">{baseApiUrl}</code> base path.
                  Authenticated developer keys have unlimited request and download access with no
                  daily or monthly quotas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-zinc-300">
                    Option A: Bearer Token Header (Recommended)
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto">
                    {`Authorization: Bearer ${activeExampleKey}`}
                  </pre>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="text-xs font-semibold text-zinc-300">
                    Option B: X-API-Key Header
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto">
                    {`X-API-Key: ${activeExampleKey}`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Code Integration Examples */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">2. Quickstart Integration Code</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Copy-paste examples showing the full workflow: create job, check status, and
                    stream the authorized MP4 file.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setSnippetLang('javascript')}
                    data-testid="docs-lang-javascript"
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      snippetLang === 'javascript'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    JavaScript (fetch)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetLang('curl')}
                    data-testid="docs-lang-curl"
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      snippetLang === 'curl'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    type="button"
                    onClick={() => setSnippetLang('nodejs')}
                    data-testid="docs-lang-nodejs"
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                      snippetLang === 'nodejs'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Node.js Stream
                  </button>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Copy Code Example"
                  onClick={() =>
                    copyToClipboard(
                      snippetLang === 'javascript'
                        ? jsSnippet
                        : snippetLang === 'curl'
                        ? curlSnippet
                        : nodeSnippet,
                      'code-snippet'
                    )
                  }
                  className="absolute top-3 right-3 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedTokenId === 'code-snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
                <pre className="p-5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                  {snippetLang === 'javascript'
                    ? jsSnippet
                    : snippetLang === 'curl'
                    ? curlSnippet
                    : nodeSnippet}
                </pre>
              </div>
            </section>

            {/* Endpoint Reference */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">3. REST API Endpoint Reference</h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Complete specification of request parameters and response payloads.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-zinc-800">
                {/* Endpoint 1 */}
                <div className="pt-4 first:pt-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                    <span className="text-emerald-400 font-bold">POST</span>
                    <span className="text-white font-semibold">{baseApiUrl}/downloads</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Create a new download job via the existing Download Engine
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Validates parameters, resolves multi-audio MP4 streams and direct CDN sources
                    through the existing Download Engine, generates a unique{' '}
                    <code className="font-mono text-zinc-200">jobId</code>, and returns an
                    HMAC-signed expiring download URL.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400">
                          <th className="py-2 pr-4">Body Parameter</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Required</th>
                          <th className="py-2 pl-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50 font-mono">
                        <tr>
                          <td className="py-2 pr-4 text-zinc-200">mediaType</td>
                          <td className="py-2 px-3 text-zinc-400">&quot;movie&quot; | &quot;tv&quot;</td>
                          <td className="py-2 px-3 text-emerald-400">Yes</td>
                          <td className="py-2 pl-3 font-sans text-zinc-300">
                            Target media category.
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-zinc-200">tmdbId</td>
                          <td className="py-2 px-3 text-zinc-400">string</td>
                          <td className="py-2 px-3 text-emerald-400">Yes</td>
                          <td className="py-2 pl-3 font-sans text-zinc-300">
                            TMDB numeric ID (e.g. &quot;128&quot;, &quot;1393907&quot;, &quot;66732&quot;).
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-zinc-200">lang</td>
                          <td className="py-2 px-3 text-zinc-400">string</td>
                          <td className="py-2 px-3 text-zinc-400">Optional (default &quot;en&quot;)</td>
                          <td className="py-2 pl-3 font-sans text-zinc-300">
                            ISO audio language code (&quot;en&quot;, &quot;hi&quot;, &quot;ja&quot;, &quot;es&quot;, &quot;ta&quot;, &quot;te&quot;).
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-zinc-200">quality</td>
                          <td className="py-2 px-3 text-zinc-400">string</td>
                          <td className="py-2 px-3 text-zinc-400">Optional (default &quot;1080p&quot;)</td>
                          <td className="py-2 pl-3 font-sans text-zinc-300">
                            Target resolution (&quot;360p&quot;, &quot;480p&quot;, &quot;720p&quot;, &quot;1080p&quot;, &quot;2160p&quot;).
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-zinc-200">season / episode</td>
                          <td className="py-2 px-3 text-zinc-400">number</td>
                          <td className="py-2 px-3 text-zinc-400">Optional (default 1)</td>
                          <td className="py-2 pl-3 font-sans text-zinc-300">
                            Season and episode numbers when mediaType is &quot;tv&quot;.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Endpoint 2 & 3 */}
                <div className="pt-5 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                    <span className="text-blue-400 font-bold">GET</span>
                    <span className="text-white font-semibold">{baseApiUrl}/downloads/:id</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Retrieve full download job metadata, language groups, and signed URL
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm pt-2">
                    <span className="text-blue-400 font-bold">GET</span>
                    <span className="text-white font-semibold">{baseApiUrl}/downloads/:id/status</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Poll lightweight job status (`queued`, `processing`, `completed`, `failed`) &amp;
                      progress %
                    </span>
                  </div>
                </div>

                {/* Endpoint 4 */}
                <div className="pt-5 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                    <span className="text-blue-400 font-bold">GET</span>
                    <span className="text-white font-semibold">{baseApiUrl}/downloads/:id/file</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Stream or download the resolved MP4 binary with HTTP 206 Range support
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Accepts either the HMAC-signed query parameters (
                    <code className="font-mono text-zinc-200">?token=...&amp;expires=...</code>)
                    included in <code className="font-mono text-zinc-200">downloadUrl</code> or a
                    valid Developer API Key header. Streams directly from our existing MP4 download
                    pipeline.
                  </p>
                </div>

                {/* Endpoint 5, 6, 7 */}
                <div className="pt-5 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                    <span className="text-blue-400 font-bold">GET</span>
                    <span className="text-white font-semibold">{baseApiUrl}/developer/usage</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Retrieve request telemetry, download job statistics, and recent activity logs
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm pt-2">
                    <span className="text-emerald-400 font-bold">POST</span>
                    <span className="text-white font-semibold">{baseApiUrl}/developer/keys</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Provision a new unlimited API key (Body: `{`{ "name": "My App" }`}`)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-sm pt-2">
                    <span className="text-rose-400 font-bold">DELETE</span>
                    <span className="text-white font-semibold">{baseApiUrl}/developer/keys/:id</span>
                    <span className="text-zinc-400 font-sans text-xs">
                      · Immediately revoke an API key by ID
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Error Codes Table */}
            <section className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">4. Standard Error Codes</h2>
                <p className="text-sm text-zinc-400 mt-0.5">
                  All error responses return JSON with{' '}
                  <code className="font-mono text-zinc-200">success: false</code>, a machine-readable{' '}
                  <code className="font-mono text-zinc-200">code</code>, and a descriptive{' '}
                  <code className="font-mono text-zinc-200">error</code> message. Note: HTTP 429
                  (Too Many Requests) is never returned because all authenticated keys have
                  unlimited access.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-2.5 pr-4">HTTP Status</th>
                      <th className="py-2.5 px-3">Error Code</th>
                      <th className="py-2.5 pl-3">Meaning & Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 font-mono tabular-nums">
                    <tr>
                      <td className="py-2.5 pr-4 text-amber-400">400 Bad Request</td>
                      <td className="py-2.5 px-3 text-zinc-200">
                        INVALID_MEDIA_TYPE / INVALID_TMDB_ID / INVALID_QUALITY
                      </td>
                      <td className="py-2.5 pl-3 font-sans text-zinc-300">
                        Missing or malformed request parameters. Verify mediaType (&quot;movie&quot;
                        or &quot;tv&quot;), numeric tmdbId, and quality (&quot;360p&quot;–&quot;2160p&quot;).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-rose-400">401 Unauthorized</td>
                      <td className="py-2.5 px-3 text-zinc-200">
                        MISSING_API_KEY / INVALID_API_KEY / REVOKED_API_KEY
                      </td>
                      <td className="py-2.5 pl-3 font-sans text-zinc-300">
                        No API key was supplied, or the key was revoked. Pass a valid active key via
                        Authorization: Bearer or X-API-Key.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-rose-400">403 Forbidden</td>
                      <td className="py-2.5 px-3 text-zinc-200">
                        INVALID_OR_EXPIRED_DOWNLOAD_URL
                      </td>
                      <td className="py-2.5 pl-3 font-sans text-zinc-300">
                        The HMAC signature token on /file was altered or has passed its expiration
                        timestamp.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-amber-400">404 Not Found</td>
                      <td className="py-2.5 px-3 text-zinc-200">JOB_NOT_FOUND / KEY_NOT_FOUND</td>
                      <td className="py-2.5 pl-3 font-sans text-zinc-300">
                        The requested download job ID or API key ID does not exist.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-amber-400">409 Conflict</td>
                      <td className="py-2.5 px-3 text-zinc-200">JOB_NOT_READY</td>
                      <td className="py-2.5 pl-3 font-sans text-zinc-300">
                        Attempted to stream /file before job status reached &quot;completed&quot;.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
