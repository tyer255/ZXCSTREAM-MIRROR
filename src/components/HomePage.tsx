import React, { useState } from 'react';
import {
  Eclipse,
  ArrowRight,
  SlidersVertical,
  TvMinimal,
  Film,
  Tv,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  DUB_LANGUAGES,
  MediaType,
  PlayerMode,
  buildPlayerUrl,
} from '../utils/urlBuilder';
import { CustomPlayerView } from './CustomPlayerView';
import { AnnouncementModal } from './AnnouncementModal';

export interface HomePageProps {
  announcementOpen: boolean;
  onDismissAnnouncement: () => void;
  onNavigateDownload: (mediaType: MediaType, tmdbId: string) => void;
  onOpenStandalonePlayer: (
    playerMode: PlayerMode,
    mediaType: MediaType,
    tmdbId: string,
    season: string,
    episode: string
  ) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  announcementOpen,
  onDismissAnnouncement,
  onNavigateDownload,
  onOpenStandalonePlayer,
}) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('custom');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [tmdbId, setTmdbId] = useState<string>('128');
  const [season, setSeason] = useState<string>('1');
  const [episode, setEpisode] = useState<string>('1');
  const [copied, setCopied] = useState<boolean>(false);

  const generatedUrl = buildPlayerUrl({
    baseOrigin: 'https://zxcstream.cc',
    playerMode,
    mediaType,
    tmdbId,
    season,
    episode,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
    } catch {
      // Fallback copy if clipboard API is restricted
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Important Announcement Modal */}
      <AnnouncementModal open={announcementOpen} onDismiss={onDismissAnnouncement} />

      {/* Top Endpoint Notification Banner matching route-home.js */}
      <div className="dark bg-zinc-900 px-4 py-3 text-zinc-50 border-b border-white/5 relative z-30">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Eclipse className="shrink-0 opacity-60 h-4 w-4" aria-hidden="true" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-3 text-sm">
              <p className="text-zinc-200 leading-snug">
                Download endpoint is now available, usage:{' '}
                <span className="font-mono text-zinc-100 break-words">
                  https://zxcstream.cc/download/&#123;media_type&#125;/&#123;tmdbId&#125;
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateDownload('movie', tmdbId.trim() || '128')}
            data-testid="sample-download-link"
            className="group shrink-0 text-sm font-medium whitespace-nowrap inline-flex items-center text-zinc-100 hover:text-blue-400 transition cursor-pointer"
          >
            <span>Sample Link</span>
            <ArrowRight
              className="ms-1 -mt-0.5 inline-flex opacity-60 transition-transform group-hover:translate-x-0.5 h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Main Lamp Spotlight Section matching route-home.js */}
      <div className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-zinc-950 w-full rounded-md z-0">
        {/* Top Sister Domains Header */}
        <div className="z-20 absolute inset-x-0 top-0 flex justify-center items-center p-6">
          <div className="flex items-center gap-4 text-xs lg:text-base font-medium">
            <a
              href="https://zxcprime.icu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-50 transition-colors"
            >
              zxcprime.icu
            </a>
            <span className="text-zinc-500">•</span>
            <a
              href="https://vidstuck.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm lg:text-xl font-semibold text-zinc-50 hover:text-blue-500 transition-colors animate-pulse"
            >
              vidstuck.cc
            </a>
            <span className="text-zinc-500">•</span>
            <a
              href="https://zxcstream.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-50 transition-colors"
            >
              zxcstream.com
            </a>
          </div>
        </div>

        {/* Lamp Conic Glow Effect */}
        <div className="relative flex w-full scale-y-125 items-center justify-center isolate z-0 pt-[14rem] lg:pt-[15.5rem]">
          <div
            style={{
              width: '30rem',
              backgroundImage:
                'conic-gradient(from 70deg at center top, rgba(37, 99, 235, 0.7), transparent, transparent)',
            }}
            className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] text-white"
          >
            <div className="absolute w-full left-0 bg-zinc-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
            <div className="absolute w-40 h-full left-0 bg-zinc-950 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
          </div>

          <div
            style={{
              width: '30rem',
              backgroundImage:
                'conic-gradient(from 290deg at center top, transparent, transparent, rgba(37, 99, 235, 0.7))',
            }}
            className="absolute inset-auto left-1/2 h-56 w-[30rem] text-white"
          >
            <div className="absolute w-40 h-full right-0 bg-zinc-950 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
            <div className="absolute w-full right-0 bg-zinc-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          </div>

          <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-zinc-950 blur-2xl" />
          <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
          <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-blue-600/10 opacity-50 blur-3xl" />
          <div className="absolute inset-auto z-30 h-36 w-64 -translate-y-24 rounded-full bg-blue-600/10 blur-2xl" />
          <div className="absolute inset-auto z-50 h-0.5 w-[20rem] sm:w-[30rem] -translate-y-28 bg-blue-600/70" />
          <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-zinc-950" />
        </div>

        {/* Hero & Interactive Controls Container */}
        <div className="relative z-50 -mt-16 lg:-mt-20 pb-16 flex flex-col items-center px-5 w-full max-w-6xl">
          <div className="w-full flex flex-col items-center justify-center text-center">
            {/* Join our Discord Pill */}
            <a
              href="https://discord.gg/yv7wJV97Jd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-zinc-800 hover:bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-50 gap-1 mb-2 transition"
            >
              <span>Join our Discord</span>
              <ArrowRight className="-mr-1 opacity-60 h-3 w-3" aria-hidden="true" />
            </a>

            {/* Animated Gradient ZXCSTREAM Title */}
            <h1 className="animate-zxc-title text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tighter bg-gradient-to-r from-[rgb(237,236,233)] via-[rgb(94,84,72)] to-[rgb(172,149,119)] bg-clip-text text-transparent">
              ZXCSTREAM
            </h1>

            <p className="text-zinc-400 text-xs lg:text-base max-w-lg mt-2">
              Dive into endless hours of free streaming of Movies &amp; TV Shows. A free,
              easy-to-embed player you can drop into any website
            </p>

            {/* PLAYER Toggle */}
            <span className="mt-8 text-xs font-mono text-zinc-400 mb-1">PLAYER</span>
            <div className="inline-flex bg-zinc-900 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setPlayerMode('custom')}
                data-testid="toggle-custom-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'custom'
                    ? 'bg-blue-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <SlidersVertical className="w-4 h-4" />
                <span>Custom Player</span>
              </button>
              <button
                type="button"
                onClick={() => setPlayerMode('builtin')}
                data-testid="toggle-builtin-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'builtin'
                    ? 'bg-blue-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <TvMinimal className="w-4 h-4" />
                <span>Built-in Player</span>
              </button>
            </div>

            {/* MEDIA TYPE Toggle */}
            <span className="mt-6 text-xs font-mono text-zinc-400 mb-1">MEDIA TYPE</span>
            <div className="inline-flex bg-zinc-900 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setMediaType('movie')}
                data-testid="toggle-movie-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  mediaType === 'movie'
                    ? 'bg-blue-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Movie Player</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaType('tv')}
                data-testid="toggle-series-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  mediaType === 'tv'
                    ? 'bg-blue-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Series Player</span>
              </button>
            </div>

            {/* TMDB ID / SS / EP Inputs */}
            <span className="mt-6 text-xs font-mono text-zinc-400 mb-1">
              {mediaType === 'movie' ? 'TMDB ID' : 'TMDB ID / SS / EP'}
            </span>
            <div className="w-full flex flex-col items-center">
              {mediaType === 'movie' ? (
                <input
                  type="text"
                  placeholder="ID"
                  aria-label="TMDB ID"
                  data-testid="tmdb-id-input"
                  value={tmdbId}
                  onChange={(e) => setTmdbId(e.target.value)}
                  className="h-9 w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                />
              ) : (
                <div className="grid grid-cols-3 gap-3 max-w-md w-full">
                  <input
                    type="text"
                    placeholder="ID"
                    aria-label="TMDB ID"
                    data-testid="tmdb-id-input"
                    value={tmdbId}
                    onChange={(e) => setTmdbId(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                  <input
                    type="number"
                    placeholder="S"
                    aria-label="Season Number"
                    data-testid="tmdb-season-input"
                    min={1}
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                  <input
                    type="number"
                    placeholder="EP"
                    aria-label="Episode Number"
                    data-testid="tmdb-episode-input"
                    min={1}
                    value={episode}
                    onChange={(e) => setEpisode(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                  />
                </div>
              )}
            </div>

            {/* Generated URL Copy Bar */}
            <div className="mt-6 flex items-center gap-2 px-3 py-2 bg-zinc-900/90 rounded-md border border-white/5">
              <div
                data-testid="generated-player-url"
                className="flex-1 text-xs md:text-sm font-mono text-center select-all break-all text-zinc-100"
              >
                {generatedUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                data-testid="copy-url-button"
                aria-label="Copy player URL"
                className="inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-zinc-800 transition cursor-pointer"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-300" />
                )}
              </button>
              {tmdbId.trim() && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenStandalonePlayer(
                      playerMode,
                      mediaType,
                      tmdbId.trim(),
                      season,
                      episode
                    )
                  }
                  data-testid="open-standalone-player"
                  title="Open Standalone Fullscreen Route"
                  className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium text-blue-400 hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 16:9 Player Viewport */}
            <div className="mt-4 w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/5">
              {tmdbId.trim() ? (
                <CustomPlayerView
                  key={`${playerMode}-${tmdbId.trim()}-${season}-${episode}`}
                  playerMode={playerMode}
                  mediaType={mediaType}
                  tmdbId={tmdbId.trim()}
                  season={Number.parseInt(season, 10) || 1}
                  episode={Number.parseInt(episode, 10) || 1}
                  onMediaTypeResolved={(resolvedType) => {
                    if (resolvedType !== mediaType) {
                      setMediaType(resolvedType);
                    }
                  }}
                  onEpisodeChange={(newSeason, newEpisode) => {
                    setSeason(String(newSeason));
                    setEpisode(String(newEpisode));
                  }}
                />
              ) : (
                <div
                  data-testid="empty-player-placeholder"
                  className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 text-sm gap-3 p-6"
                >
                  <p>Enter an ID to load the player</p>
                  <button
                    type="button"
                    onClick={() => setTmdbId('128')}
                    data-testid="load-sample-128"
                    className="rounded-md bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-3 py-1.5 text-xs font-mono text-zinc-200 transition cursor-pointer"
                  >
                    Load Sample ID #128 (Princess Mononoke)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QUERY PARAMETERS Documentation Section (shown when Custom Player is selected, matching route-home.js) */}
          {playerMode === 'custom' && (
            <div className="mt-10 w-full max-w-4xl text-left">
              <div className="space-y-5">
                <h2 className="text-sm font-mono tracking-wider text-zinc-400 uppercase mb-6">
                  Query Parameters
                </h2>

                {/* NEW UPDATE - dubLang */}
                <div className="space-y-4 text-sm border-b border-zinc-800 pb-5">
                  <div className="font-mono text-zinc-50 text-base">NEW UPDATE - dubLang</div>
                  <p className="text-zinc-400 leading-relaxed">
                    Use the <code className="text-zinc-50 font-mono">dubLang</code> query parameter
                    to request a specific dubbed audio language on initial playback. If the
                    requested dub is available, the player will automatically select it.
                  </p>

                  <div>
                    <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                      Usage
                    </div>
                    <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs font-mono overflow-x-auto text-zinc-200">
                      {`/player/movie/1184918?dubLang=hi\n/player/tv/66732/1/2?dubLang=tl`}
                    </pre>
                  </div>

                  <div>
                    <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                      Available Values
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                      {DUB_LANGUAGES.map((lang) => (
                        <div key={lang.code}>
                          <span className="text-zinc-50">{lang.code}</span> — {lang.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 text-zinc-400 text-xs">
                    <div className="font-mono uppercase tracking-wider text-zinc-50">Notes</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Currently works on <span className="text-zinc-50">Server 0</span>.
                      </li>
                      <li>
                        Not all movies or episodes have every dub available. If the selected
                        language is not found, the player will fall back to the default audio track.
                      </li>
                      <li>
                        Parameter values are case-insensitive (e.g.{' '}
                        <code className="text-zinc-50 font-mono">dubLang=HI</code> or{' '}
                        <code className="text-zinc-50 font-mono">dubLang=hi</code>).
                      </li>
                    </ul>
                  </div>
                </div>

                {/* server */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">server = e.g 1</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Starts the player using the specified server number. If the server isn’t
                    available, it stays in the queue.
                  </div>
                </div>

                {/* domainAd */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">
                    domainAd = e.g zxcstream.icu
                  </div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Displays your domain watermark inside the player during playback.
                  </div>
                </div>

                {/* color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">color = e.g fafafa</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Sets the primary accent color of the player using a hex value (without{' '}
                    <code className="font-mono">#</code>).
                  </div>
                </div>

                {/* autoplay */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">autoplay = e.g true</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Automatically starts playback as soon as the player finishes loading.
                  </div>
                </div>

                {/* back */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-2">
                  <div className="font-mono text-sm text-zinc-50">back = e.g true</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Shows a back button inside the player for easier navigation.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Join our community Footer */}
          <div className="mt-10 w-full flex flex-col items-center gap-3 text-center">
            <h2 className="text-sm font-mono tracking-wider text-zinc-400 uppercase">
              Join our community!
            </h2>
            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://t.me/+s77s3A294G5kN2I1"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-zinc-50 hover:opacity-70 transition"
              >
                Telegram
              </a>
              <span className="text-zinc-400">•</span>
              <a
                href="https://discord.gg/yv7wJV97Jd"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-zinc-50 hover:opacity-70 transition"
              >
                Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
