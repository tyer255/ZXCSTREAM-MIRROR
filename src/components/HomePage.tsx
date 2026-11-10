import React, { useState } from 'react';
import {
  Eclipse,
  ArrowRight,
  SlidersVertical,
  Film,
  Tv,
  Copy,
  Check,
  ExternalLink,
  Code,
  ShieldCheck,
  Play,
  Flame,
  Zap,
} from 'lucide-react';
import {
  DUB_LANGUAGES,
  MediaType,
  PlayerMode,
  buildPlayerUrl,
  getDefaultOrigin,
  buildEmbedIframeCode,
} from '../utils/urlBuilder';
import { CustomPlayerView } from './CustomPlayerView';
import { AnimePlayer } from '../anime/AnimePlayer';
import { AnnouncementModal } from './AnnouncementModal';

export const ANIME_PRESETS = [
  { id: '85937', type: 'tv' as MediaType, season: '1', ep: '1', title: 'Demon Slayer', badge: 'TV • S1E1' },
  { id: '1429', type: 'tv' as MediaType, season: '1', ep: '1', title: 'Attack on Titan', badge: 'TV • S1E1' },
  { id: '95479', type: 'tv' as MediaType, season: '1', ep: '1', title: 'Jujutsu Kaisen', badge: 'TV • S1E1' },
  { id: '128', type: 'movie' as MediaType, season: '1', ep: '1', title: 'Princess Mononoke', badge: 'Movie' },
  { id: '372058', type: 'movie' as MediaType, season: '1', ep: '1', title: 'Your Name', badge: 'Movie' },
];

export interface HomePageProps {
  announcementOpen: boolean;
  onDismissAnnouncement: () => void;
  onNavigateDevelopers?: () => void;
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
  onNavigateDevelopers,
  onNavigateDownload,
  onOpenStandalonePlayer,
}) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('custom');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [tmdbId, setTmdbId] = useState<string>('128');
  const [season, setSeason] = useState<string>('1');
  const [episode, setEpisode] = useState<string>('1');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedIframe, setCopiedIframe] = useState<boolean>(false);

  const handleSelectPlayer = (nextMode: PlayerMode) => {
    setPlayerMode(nextMode);
    const clean = tmdbId.trim();
    if (nextMode === 'anime') {
      if (mediaType === 'tv' && (clean === '66732' || clean === '1396' || clean === '94997')) {
        setTmdbId('85937');
        setSeason('1');
        setEpisode('1');
      } else if (mediaType === 'movie' && (clean === '85937' || clean === '66732' || clean === '558449')) {
        setTmdbId('128');
      }
    } else {
      if (mediaType === 'movie' && clean === '85937') {
        setTmdbId('128');
      }
    }
  };

  const handleTmdbIdChange = (raw: string) => {
    let val = raw.trim();
    if (val.includes('themoviedb.org/tv/') || val.includes('/tv/')) {
      setMediaType('tv');
    } else if (val.includes('themoviedb.org/movie/') || val.includes('/movie/')) {
      setMediaType('movie');
    }
    const tmdbMatch = val.match(/(?:movie|tv)\/(\d+)/i);
    if (tmdbMatch) {
      val = tmdbMatch[1];
    } else {
      const imdbMatch = val.match(/(tt\d+)/i);
      if (imdbMatch) {
        val = imdbMatch[1];
      } else {
        val = val.replace(/^[#\s]+/, '');
      }
    }
    setTmdbId(val);
  };

  const currentOrigin = getDefaultOrigin();

  const generatedUrl = buildPlayerUrl({
    baseOrigin: currentOrigin,
    playerMode,
    mediaType,
    tmdbId,
    season,
    episode,
  });

  const embedIframeCode = buildEmbedIframeCode(
    mediaType,
    tmdbId,
    season,
    episode,
    currentOrigin,
    playerMode
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
    } catch {
      // Fallback copy if clipboard API is restricted
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyIframe = async () => {
    try {
      await navigator.clipboard.writeText(embedIframeCode);
    } catch {
      // Fallback copy
    }
    setCopiedIframe(true);
    window.setTimeout(() => setCopiedIframe(false), 2000);
  };

  // Dynamic Brand Identity & Restrained Lighting per Player
  const brandTitle =
    playerMode === 'bingr'
      ? 'BINGR CRACK'
      : playerMode === 'overpower'
      ? 'OVER POWER'
      : playerMode === 'nxsha'
      ? 'NXSHA'
      : playerMode === 'anime'
      ? 'ANIME CORE'
      : 'ZXCSTREAM';

  const lampRgba =
    playerMode === 'bingr'
      ? 'rgba(245, 158, 11, 0.75)'
      : playerMode === 'overpower'
      ? 'rgba(168, 85, 247, 0.7)'
      : playerMode === 'nxsha'
      ? 'rgba(8, 145, 178, 0.7)'
      : playerMode === 'anime'
      ? 'rgba(225, 29, 72, 0.65)'
      : 'rgba(37, 99, 235, 0.7)';

  const lampGlowSoftClass =
    playerMode === 'bingr'
      ? 'bg-amber-600/10'
      : playerMode === 'overpower'
      ? 'bg-purple-600/10'
      : playerMode === 'nxsha'
      ? 'bg-cyan-600/10'
      : playerMode === 'anime'
      ? 'bg-rose-600/10'
      : 'bg-blue-600/10';

  const lampBarClass =
    playerMode === 'bingr'
      ? 'bg-amber-500/70'
      : playerMode === 'overpower'
      ? 'bg-purple-600/70'
      : playerMode === 'nxsha'
      ? 'bg-cyan-600/70'
      : playerMode === 'anime'
      ? 'bg-rose-600/70'
      : 'bg-blue-600/70';

  const activeButtonClass =
    playerMode === 'bingr'
      ? 'bg-amber-600 text-white shadow-md scale-100'
      : playerMode === 'overpower'
      ? 'bg-purple-900 text-white shadow-md scale-100'
      : playerMode === 'nxsha'
      ? 'bg-cyan-900 text-white shadow-md scale-100'
      : playerMode === 'anime'
      ? 'bg-rose-900 text-white shadow-md scale-100'
      : 'bg-blue-900 text-white shadow-md scale-100';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Important Announcement Modal */}
      <AnnouncementModal open={announcementOpen} onDismiss={onDismissAnnouncement} />

      {/* Top Endpoint Notification Banner */}
      <div className="dark bg-zinc-900 px-4 py-3 text-zinc-50 border-b border-white/5 relative z-30">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Eclipse className="shrink-0 opacity-60 h-4 w-4" aria-hidden="true" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-3 text-sm">
              <p className="text-zinc-200 leading-snug">
                Download endpoint &amp; Public Developer API now available:{' '}
                <span className="font-mono text-zinc-100 break-words">
                  {currentOrigin}/download/&#123;media_type&#125;/&#123;tmdbId&#125;
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onNavigateDevelopers) {
                  onNavigateDevelopers();
                } else {
                  window.location.href = '/developers';
                }
              }}
              data-testid="open-developer-api-btn"
              className="group shrink-0 text-xs sm:text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-white transition cursor-pointer"
            >
              <Code className="h-3.5 w-3.5 text-blue-400" />
              <span>Public Developer API</span>
            </button>
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
      </div>

      {/* Main Lamp Spotlight Section */}
      <div className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-zinc-950 w-full rounded-md z-0">
        {/* Top Three-Player Switcher under Sample Link Banner */}
        <div className="z-20 absolute inset-x-0 top-0 flex justify-center items-center p-6">
          <div
            data-testid="top-player-switcher"
            className="inline-flex items-center bg-zinc-900/90 border border-white/5 p-1 rounded-lg gap-1 text-xs lg:text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => handleSelectPlayer('custom')}
              data-testid="header-engine-zxcstream"
              className={`px-3.5 py-1.5 rounded-md transition-all duration-300 cursor-pointer font-semibold ${
                playerMode === 'custom'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ZXCSTREAM
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlayer('nxsha')}
              data-testid="header-engine-nxsha"
              className={`px-3.5 py-1.5 rounded-md transition-all duration-300 cursor-pointer font-semibold ${
                playerMode === 'nxsha'
                  ? 'bg-cyan-900 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              NXSHA
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlayer('overpower')}
              data-testid="header-engine-overpower"
              className={`px-3.5 py-1.5 rounded-md transition-all duration-300 cursor-pointer font-semibold ${
                playerMode === 'overpower'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              OVER POWER
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlayer('anime')}
              data-testid="header-engine-anime"
              className={`px-3.5 py-1.5 rounded-md transition-all duration-300 cursor-pointer font-semibold ${
                playerMode === 'anime'
                  ? 'bg-rose-900 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ANIME CORE
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlayer('bingr')}
              data-testid="header-engine-bingr"
              className={`px-3.5 py-1.5 rounded-md transition-all duration-300 cursor-pointer font-semibold ${
                playerMode === 'bingr'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              BINGR CRACK
            </button>
          </div>
        </div>

        {/* Dynamic Lamp Conic Glow Effect */}
        <div className="relative flex w-full scale-y-125 items-center justify-center isolate z-0 pt-[14rem] lg:pt-[15.5rem]">
          <div
            style={{
              width: '30rem',
              backgroundImage: `conic-gradient(from 70deg at center top, ${lampRgba}, transparent, transparent)`,
            }}
            className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] text-white transition-all duration-500"
          >
            <div className="absolute w-full left-0 bg-zinc-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
            <div className="absolute w-40 h-full left-0 bg-zinc-950 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
          </div>

          <div
            style={{
              width: '30rem',
              backgroundImage: `conic-gradient(from 290deg at center top, transparent, transparent, ${lampRgba})`,
            }}
            className="absolute inset-auto left-1/2 h-56 w-[30rem] text-white transition-all duration-500"
          >
            <div className="absolute w-40 h-full right-0 bg-zinc-950 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
            <div className="absolute w-full right-0 bg-zinc-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          </div>

          <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-zinc-950 blur-2xl" />
          <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
          <div
            className={`absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full ${lampGlowSoftClass} opacity-50 blur-3xl transition-colors duration-500`}
          />
          <div
            className={`absolute inset-auto z-30 h-36 w-64 -translate-y-24 rounded-full ${lampGlowSoftClass} blur-2xl transition-colors duration-500`}
          />
          <div
            className={`absolute inset-auto z-50 h-0.5 w-[20rem] sm:w-[30rem] -translate-y-28 ${lampBarClass} transition-colors duration-500`}
          />
          <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-zinc-950" />
        </div>

        {/* Hero & Interactive Controls Container */}
        <div className="relative z-50 -mt-16 lg:-mt-20 pb-16 flex flex-col items-center px-5 w-full max-w-6xl">
          <div className="w-full flex flex-col items-center justify-center text-center">
            {/* Join our Discord Pill */}
            <a
              href="https://discord.gg/FRHmkQWUP"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="discord-cta-button"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-zinc-800 hover:bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-50 gap-1 mb-2 transition"
            >
              <span>Join our Discord</span>
              <ArrowRight className="-mr-1 opacity-60 h-3 w-3" aria-hidden="true" />
            </a>

            {/* Dynamic Animated Brand Title */}
            <h1
              data-testid="hero-brand-title"
              className="animate-zxc-title text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tighter bg-gradient-to-r from-[rgb(237,236,233)] via-[rgb(94,84,72)] to-[rgb(172,149,119)] bg-clip-text text-transparent transition-all duration-500"
            >
              {brandTitle}
            </h1>

            <p className="text-zinc-400 text-xs lg:text-base max-w-lg mt-2">
              {playerMode === 'bingr'
                ? 'Dedicated Bingr Crack Cinema Engine for Movies & TV Shows with 100% Ad-Free playback and instant stream resolution'
                : playerMode === 'anime'
                ? 'Dedicated anime streaming player with TMDB anime verification and multi-audio Sub & Dub playback'
                : playerMode === 'overpower'
                ? 'Overpowered 4-server ultra-low-latency streaming engine with unlimited bandwidth and multi-audio'
                : playerMode === 'nxsha'
                ? 'High-speed ad-free streaming engine for Movies & TV Shows with multi-server parallel discovery'
                : 'Dive into endless hours of free streaming of Movies & TV Shows. A free, easy-to-embed player you can drop into any website'}
            </p>

            {/* Four-Player Switcher */}
            <span className="mt-8 text-xs font-mono text-zinc-400 mb-1">PLAYER</span>
            <div
              data-testid="main-player-switcher"
              className="inline-flex bg-zinc-900 p-0.5 rounded-lg flex-wrap justify-center gap-1 sm:gap-0"
            >
              <button
                type="button"
                onClick={() => handleSelectPlayer('custom')}
                data-testid="toggle-custom-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'custom'
                    ? 'bg-blue-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <SlidersVertical className="w-4 h-4" />
                <span>ZXCSTREAM</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPlayer('nxsha')}
                data-testid="toggle-nxsha-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'nxsha'
                    ? 'bg-cyan-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>NXSHA</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPlayer('overpower')}
                data-testid="toggle-overpower-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'overpower'
                    ? 'bg-purple-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <Flame className="w-4 h-4 text-purple-400" />
                <span>OVER POWER</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPlayer('anime')}
                data-testid="toggle-anime-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'anime'
                    ? 'bg-rose-900 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>ANIME CORE</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPlayer('bingr')}
                data-testid="toggle-bingr-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  playerMode === 'bingr'
                    ? 'bg-amber-600 text-white shadow-md scale-100'
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>BINGR CRACK</span>
              </button>
            </div>

            {/* MEDIA TYPE Toggle */}
            <span className="mt-6 text-xs font-mono text-zinc-400 mb-1">MEDIA TYPE</span>
            <div className="inline-flex bg-zinc-900 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMediaType('movie');
                  const clean = tmdbId.trim();
                  if (clean === '66732' || clean === '1396' || clean === '85937' || clean === '1429' || clean === '95479') {
                    setTmdbId('128');
                  }
                }}
                data-testid="toggle-movie-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  mediaType === 'movie'
                    ? activeButtonClass
                    : 'text-zinc-400 hover:text-zinc-50'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Movie Player</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaType('tv');
                  const clean = tmdbId.trim();
                  if (clean === '128' || clean === '1184918' || clean === '372058') {
                    setTmdbId(playerMode === 'anime' ? '85937' : '66732');
                    setSeason('1');
                    setEpisode('1');
                  }
                }}
                data-testid="toggle-series-player"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-xs lg:text-sm cursor-pointer transition-all duration-300 ${
                  mediaType === 'tv'
                    ? activeButtonClass
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
                  onChange={(e) => handleTmdbIdChange(e.target.value)}
                  className="h-9 w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition"
                />
              ) : (
                <div className="grid grid-cols-3 gap-3 max-w-md w-full">
                  <input
                    type="text"
                    placeholder="ID"
                    aria-label="TMDB ID"
                    data-testid="tmdb-id-input"
                    value={tmdbId}
                    onChange={(e) => handleTmdbIdChange(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition"
                  />
                  <input
                    type="number"
                    placeholder="S"
                    aria-label="Season Number"
                    data-testid="tmdb-season-input"
                    min={1}
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition"
                  />
                  <input
                    type="number"
                    placeholder="EP"
                    aria-label="Episode Number"
                    data-testid="tmdb-episode-input"
                    min={1}
                    value={episode}
                    onChange={(e) => setEpisode(e.target.value)}
                    className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-center text-sm text-zinc-50 placeholder:text-zinc-400 shadow-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition"
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
                title="Copy Direct URL"
                aria-label="Copy player URL"
                className="inline-flex items-center gap-1.5 justify-center rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-800 transition cursor-pointer text-zinc-300 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="hidden sm:inline text-green-400">Copied URL</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy URL</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyIframe}
                data-testid="copy-embed-code-button"
                title="Copy Iframe Embed Code for your website"
                aria-label="Copy Iframe Embed Code"
                className="inline-flex items-center gap-1.5 justify-center rounded-md px-2.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer border border-white/5"
              >
                {copiedIframe ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-green-400">Copied Embed Code</span>
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 text-zinc-300" />
                    <span className="hidden sm:inline">Copy Embed Code</span>
                  </>
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
                  className="inline-flex items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 16:9 Player Viewport */}
            <div className="mt-4 w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/5">
              {playerMode === 'anime' ? (
                <AnimePlayer
                  key={`anime-${tmdbId.trim()}`}
                  tmdbId={tmdbId.trim() || '85937'}
                  season={Number.parseInt(season, 10) || 1}
                  episode={Number.parseInt(episode, 10) || 1}
                  mediaType={mediaType}
                  audioPreference="ja"
                  autoplay={true}
                  accentColor="#e11d48"
                  showBackButton={false}
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
              ) : tmdbId.trim() ? (
                <CustomPlayerView
                  key={`${playerMode}-${tmdbId.trim()}`}
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

          {/* ANIME CORE Documentation Section (Clean ZXCSTREAM Style) */}
          {playerMode === 'anime' && (
            <div data-testid="anime-core-doc-section" className="mt-10 w-full max-w-4xl text-left">
              <div className="space-y-5">
                <h2 className="text-sm font-mono tracking-wider text-zinc-400 uppercase mb-6">
                  ANIME CORE Endpoints &amp; Parameters
                </h2>

                <div className="space-y-4 text-sm border-b border-zinc-800 pb-5">
                  <div className="font-mono text-zinc-50 text-base">Anime-Exclusive Endpoints</div>
                  <p className="text-zinc-400 leading-relaxed">
                    ANIME CORE validates TMDB metadata before loading streams. Only verified Japanese
                    anime movies and series are permitted; live-action and non-anime titles are blocked.
                  </p>
                  <div>
                    <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                      Usage
                    </div>
                    <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs font-mono overflow-x-auto text-zinc-200">
                      {`/anime/tv/85937/1/1\n/anime/movie/128`}
                    </pre>
                  </div>
                  <div>
                    <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                      Sample Verified Titles
                    </div>
                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                      {ANIME_PRESETS.map((p) => (
                        <button
                          key={`${p.id}-${p.type}`}
                          type="button"
                          onClick={() => {
                            setTmdbId(p.id);
                            setMediaType(p.type);
                            setSeason(p.season);
                            setEpisode(p.ep);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-50 transition cursor-pointer"
                        >
                          #{p.id} {p.title} ({p.badge})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">audio = e.g ja | en | hi</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Sets the preferred audio language (Japanese Sub, English Dub, or Hindi Dub) when available.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">color = e.g e11d48</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Sets the primary accent color of the player using a hex value (without{' '}
                    <code className="font-mono">#</code>).
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-zinc-800 pb-5">
                  <div className="font-mono text-sm text-zinc-50">autoplay = e.g true</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Automatically starts playback as soon as the player finishes loading.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-2">
                  <div className="font-mono text-sm text-zinc-50">back = e.g true</div>
                  <div className="md:col-span-2 text-sm text-zinc-400">
                    Shows a back button inside the player for easier navigation.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUERY PARAMETERS Documentation Section */}
          {(playerMode === 'custom' || playerMode === 'nxsha' || playerMode === 'overpower' || playerMode === 'bingr') && (
            <div className="mt-10 w-full max-w-4xl text-left">
              <div className="space-y-5">
                <h2 className="text-sm font-mono tracking-wider text-zinc-400 uppercase mb-6">
                  {playerMode === 'bingr'
                    ? 'BINGR CRACK Engine & Parameters'
                    : playerMode === 'overpower'
                    ? 'OVER POWER Engine & Parameters'
                    : playerMode === 'nxsha'
                    ? 'NXSHA Engine & Parameters'
                    : 'Query Parameters'}
                </h2>

                {playerMode === 'bingr' && (
                  <div className="space-y-4 text-sm border-b border-zinc-800 pb-5">
                    <div className="font-mono text-zinc-50 text-base">BINGR CRACK Direct Endpoints</div>
                    <p className="text-zinc-400 leading-relaxed">
                      BINGR CRACK is a dedicated ad-free cinema player featuring instant stream resolution, multi-audio selection, full subtitles, and zero popups or redirects.
                    </p>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                        Usage
                      </div>
                      <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs font-mono overflow-x-auto text-zinc-200">
                        {`/bingr/movie/1381071\n/bingr/tv/1396/1/1\n/watch/movie/1381071`}
                      </pre>
                    </div>
                  </div>
                )}

                {playerMode === 'overpower' && (
                  <div className="space-y-4 text-sm border-b border-zinc-800 pb-5">
                    <div className="font-mono text-zinc-50 text-base">OVER POWER Direct Endpoints</div>
                    <p className="text-zinc-400 leading-relaxed">
                      OVER POWER provides direct high-performance streaming servers (Source 1–6 Multi-Audio/Direct HD, Orion I, Valstrax II, Vegamovies III, Atlas IV, Ursa V, Alatreon VI, Daedalus VII, Bingr Core) engineered for instantaneous playback, zero rate-limiting delays, and full multi-audio support.
                    </p>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                        Usage
                      </div>
                      <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs font-mono overflow-x-auto text-zinc-200">
                        {`/overpower/movie/128\n/overpower/tv/66732/1/1`}
                      </pre>
                    </div>
                  </div>
                )}

                {playerMode === 'nxsha' && (
                  <div className="space-y-4 text-sm border-b border-zinc-800 pb-5">
                    <div className="font-mono text-zinc-50 text-base">NXSHA Direct Endpoints</div>
                    <p className="text-zinc-400 leading-relaxed">
                      NXSHA resolves high-speed HLS streams directly across multiple providers with
                      synchronized multi-language audio dubs and zero pop-up interruptions.
                    </p>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">
                        Usage
                      </div>
                      <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-3 text-xs font-mono overflow-x-auto text-zinc-200">
                        {`/nxsha/movie/128\n/nxsha/tv/66732/1/1`}
                      </pre>
                    </div>
                  </div>
                )}

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
                    domainAd = e.g yourdomain.com
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
            <div className="flex items-center justify-center gap-6 text-sm">
              <a
                href="https://discord.gg/FRHmkQWUP"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-zinc-50 hover:opacity-70 transition flex items-center gap-2"
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
