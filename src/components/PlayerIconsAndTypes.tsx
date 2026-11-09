import React, { useEffect, useRef } from 'react';
import { Check, CheckCircle, LayoutGrid, List, Loader, LoaderCircle, Play, Search, X } from 'lucide-react';
import { MediaType, PLAYER_HINTS, PlayerMode } from '../utils/urlBuilder.js';
import type { NxshaServerState } from '../utils/nxshaDiscovery.js';

export const Rewind10Svg = () => (
  <span className="elf-skip10-inner">
    <svg
      className="elf-skip10-chev"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
    <span className="elf-skip10-num">10</span>
  </span>
);

export const Forward10Svg = () => (
  <span className="elf-skip10-inner">
    <span className="elf-skip10-num">10</span>
    <svg
      className="elf-skip10-chev"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  </span>
);

export const BackSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15 6L9 12L15 18"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FullscreenEnterSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 9V6C4 4.89543 4.89543 4 6 4H9"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M20 9V6C20 4.89543 19.1046 4 18 4H15"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M4 15V18C4 19.1046 4.89543 20 6 20H9"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M20 15V18C20 19.1046 19.1046 20 18 20H15"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export const FullscreenExitSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9 4V7C9 8.10457 8.10457 9 7 9H4"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M15 4V7C15 8.10457 15.8954 9 17 9H20"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M9 20V17C9 15.8954 8.10457 15 7 15H4"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M15 20V17C15 15.8954 15.8954 15 17 15H20"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export const PlaySvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7 5.5V18.5C7 19.6 8.2 20.3 9.2 19.7L19 13.2C19.9 12.6 19.9 11.4 19 10.8L9.2 4.3C8.2 3.7 7 4.4 7 5.5Z"
      fill="white"
    />
  </svg>
);

export const PauseSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="4" height="16" rx="1.8" fill="white" />
    <rect x="14" y="4" width="4" height="16" rx="1.8" fill="white" />
  </svg>
);

export const VolumeMutedSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 9V15H9L14 19V5L9 9H5Z"
      stroke="white"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path d="M17 9L21 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M21 9L17 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const VolumeHighSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 9V15H9L14 19V5L9 9H5Z"
      stroke="white"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M17 9C18.5 10.5 18.5 13.5 17 15"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M19.5 6.5C22 9 22 15 19.5 17.5"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export const SettingsGearSvg = () => (
  <svg
    className="w-6 h-6 lg:w-7 lg:h-7"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="3.2" stroke="white" strokeWidth="2.2" />
    <path
      d="M19.4 15A7.8 7.8 0 0 0 19.6 12A7.8 7.8 0 0 0 19.4 9L21.2 7.6C21.4 7.4 21.5 7.1 21.3 6.8L19.6 3.8C19.4 3.5 19.1 3.4 18.8 3.5L16.7 4.4A7.6 7.6 0 0 0 14.2 3L13.9 0.8C13.8 0.5 13.5 0.3 13.2 0.3H10.8C10.5 0.3 10.2 0.5 10.1 0.8L9.8 3A7.6 7.6 0 0 0 7.3 4.4L5.2 3.5C4.9 3.4 4.6 3.5 4.4 3.8L2.7 6.8C2.5 7.1 2.6 7.4 2.8 7.6L4.6 9A7.8 7.8 0 0 0 4.4 12A7.8 7.8 0 0 0 4.6 15L2.8 16.4C2.6 16.6 2.5 16.9 2.7 17.2L4.4 20.2C4.6 20.5 4.9 20.6 5.2 20.5L7.3 19.6A7.6 7.6 0 0 0 9.8 21L10.1 23.2C10.2 23.5 10.5 23.7 10.8 23.7H13.2C13.5 23.7 13.8 23.5 13.9 23.2L14.2 21A7.6 7.6 0 0 0 16.7 19.6L18.8 20.5C19.1 20.6 19.4 20.5 19.6 20.2L21.3 17.2C21.5 16.9 21.4 16.6 21.2 16.4L19.4 15Z"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ServerInboxSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-inbox"
    aria-hidden="true"
  >
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const PlayerDownloadSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-download shrink-0"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export const EpisodesToggleSvg = () => (
  <>
    <svg
      className="elf-episodes-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path className="elf-episodes-chevron" d="m7 10 5-5 5 5" />
      <path d="M22 13v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5" />
      <path d="M2 13h6l2 3h4l2-3h6" />
    </svg>
    <span className="elf-episodes-label">Episodes</span>
  </>
);

export const CastConnectedSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-cast text-green-500 size-3.5 lg:size-4"
    aria-hidden="true"
  >
    <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
    <path d="M2 12a9 9 0 0 1 8 8" />
    <path d="M2 16a5 5 0 0 1 4 4" />
    <line x1="2" x2="2.01" y1="20" y2="20" />
  </svg>
);

export const TailspinLoader: React.FC<{ size?: number; stroke?: number; color?: string }> = ({
  size = 60,
  stroke = 8,
  color = 'white',
}) => {
  const r = Math.max(0, 20 - stroke * 0.5);
  const d = `M 20 ${20 - r} A ${r} ${r} 0 0 1 ${20 + r} 20`;
  return (
    <div
      className="container_2e2e0b"
      style={
        {
          '--uib-size': `${size}px`,
          '--uib-color': color,
          '--uib-speed': '0.9s',
          '--uib-stroke': `${stroke}px`,
        } as React.CSSProperties
      }
    >
      <div className="inner_010d1a" />
      <svg height="0" width="0" className="svg_f2edf9">
        <defs>
          <mask id="uib-tailspin-mask" maskUnits="objectBoundingBox">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <path
                fill="none"
                stroke="white"
                strokeWidth={stroke}
                strokeLinecap="round"
                d={d}
              />
              <circle cx="20" cy="20" r="20" fill="url(#uib-tailspin-grad)" />
            </svg>
          </mask>
          <radialGradient id="uib-tailspin-grad">
            <stop offset="0%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export interface CustomPlayerViewProps {
  playerMode: PlayerMode;
  mediaType: MediaType;
  tmdbId: string;
  season: number;
  episode: number;
  dubLang?: string;
  initialServer?: number;
  accentColor?: string;
  autoplay?: boolean;
  showBackButton?: boolean;
  isStandalonePage?: boolean;
  onBack?: () => void;
  onEpisodeChange?: (season: number, episode: number) => void;
  onMediaTypeResolved?: (resolvedType: MediaType) => void;
}

export type ServerProbeStatus = 'queue' | 'checking' | 'connecting' | 'available' | 'failed';

export interface ServerItemState {
  index: number;
  code: string;
  name: string;
  status: ServerProbeStatus;
  state?: NxshaServerState;
}

export interface TmdbSeasonSummary {
  season_number: number;
  episode_count: number;
  name?: string;
}

export interface TmdbMetadata {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string;
  releaseDate: string;
  lastAirDate: string;
  imdbId: string;
  backdropPaths: string[];
  logoPaths: string[];
  genres: string[];
  status: string;
  seasons: TmdbSeasonSummary[];
  overview?: string;
  rating?: number | string;
  runtime?: number;
}

export interface EpisodeItem {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime?: number | null;
  introStart?: number | null;
  introEnd?: number | null;
  outroStart?: number | null;
  outroEnd?: number | null;
  nextEpisodeTriggerTime?: number | null;
  nextEpisodeId?: string | null;
}

export interface SubtitleTrack {
  language: string;
  url: string;
  flagUrl?: string;
}

export function canPlayHevcInBrowser(): boolean {
  if (typeof window === 'undefined' || typeof MediaSource === 'undefined') return false;
  try {
    return (
      MediaSource.isTypeSupported('video/mp4; codecs="hev1.1.6.L120.90"') ||
      MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L120.90"')
    );
  } catch {
    return false;
  }
}

export const PlayerLoadingScreen: React.FC<{
  backdropPath: string | null;
  logoPath: string | null;
  title?: string;
  activeServerStatus: ServerProbeStatus;
  metadataError: string | null;
  hintIndex: number;
}> = ({ backdropPath, logoPath, title, activeServerStatus, metadataError, hintIndex }) => {
  const resolvedBackdrop = backdropPath
    ? backdropPath.startsWith('http') || backdropPath.startsWith('data:')
      ? backdropPath
      : `https://image.tmdb.org/t/p/w1280${backdropPath.startsWith('/') ? backdropPath : `/${backdropPath}`}`
    : null;
  const resolvedLogo = logoPath
    ? logoPath.startsWith('http') || logoPath.startsWith('data:')
      ? logoPath
      : `https://image.tmdb.org/t/p/w780${logoPath.startsWith('/') ? logoPath : `/${logoPath}`}`
    : null;

  return (
    <div data-testid="zxc-loading-screen" className="absolute inset-0 z-20 overflow-hidden bg-black">
      {resolvedBackdrop && (
        <img
          src={resolvedBackdrop}
          alt={title || 'Backdrop'}
          style={{
            filter:
              activeServerStatus === 'checking' || activeServerStatus === 'queue'
                ? 'grayscale(1) contrast(1.3) brightness(0.75)'
                : 'grayscale(0)',
          }}
          className="w-full h-full object-cover object-center transition-all duration-700"
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.85)_100%)]">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        {resolvedLogo && (
          <img
            src={resolvedLogo}
            alt={title || 'Logo'}
            className="absolute bottom-12 left-12 max-h-14 max-w-xs lg:max-h-40 lg:max-w-md w-auto h-auto object-contain animate-pulse"
          />
        )}
      </div>
    {metadataError && (
      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80 p-6">
        <div className="text-center max-w-md space-y-2">
          <p className="text-red-400 font-semibold text-base">{metadataError}</p>
          <p className="text-zinc-400 text-xs">
            Check the TMDB ID and try another movie or series ID.
          </p>
        </div>
      </div>
    )}
    <div className="text-center text-white text-xs lg:text-sm absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity duration-500 whitespace-nowrap z-20">
      {PLAYER_HINTS[hintIndex]}
    </div>
  </div>
  );
};

const SERVER_SUBTITLES: Record<string, string> = {
  'source-1': 'Multi-Audio • 18 Languages & HD Stream',
  'source-2': 'Multi-Audio • Hindi, Tamil, Telugu & English 1080p',
  'source-3': 'Independent Multi-Language HD Stream',
  'source-4': '1080p Multi-Audio • Hindi, English & Dual',
  'source-5': '1080p Multi-Audio • Fast HLS Stream',
  'source-6': 'Global Backup HD Stream',
  orion: 'Multi Audio Support',
  valstrax: 'HD Quality & Reliable',
  atlas: 'Fast & Stable',
  ursa: 'Alternative',
  alatreon: 'Extensive Movie & TV Library',
  daedalus: 'Alternative',
  vegamovies: 'Hindi & Dual Audio',
  'rive-citadel': 'Hindi & Multi Audio',
  castle: 'Multi-Language HLS',
  watchout: 'Fast HLS',
  streamflix: 'Direct Edge MP4',
  nitro: '1080p Multi-Audio',
  xdownloader: 'Alternative Edge',
  purstream: 'Fast Multi-Audio',
  vixolity: 'UHD Direct',
  'rive-primevids': 'Backup Mirror',
  vega: 'Hindi / Tamil / Telugu / English Direct HLS Master',
  callisto: '16-Language Global & Hindi Bridge • 1080p',
  sirius: 'Ultra-Fast Direct HLS Master • Hindi / EN (1080p)',
  bharat: 'Dedicated Hindi & South Indian Multi-Audio Node',
  indus: 'India Edge • Hindi, Tamil, Telugu & English HLS',
  bolly: 'Bollywood & Hollywood Dual-Audio Hindi Server',
  kuro: 'Anime & Series Multi-Audio (Hindi / Sub / Dub)',
  quantum: 'Adaptive 1080p/720p/360p Master HLS',
  rousav: '22-Language Multi-Track HLS + Embedded Subs',
  andromeda: 'Smooth Playback & Ultra HD Stream',
  resshin: 'Multi-Resolution & Hindi Dub Stream',
  centaurus: 'Multi-Resolution 1080p/720p/480p Stream',
  quasar: 'High-Speed India & Asia CDN Node',
  zenith: 'Multi-Language 1080p Cinema Bridge',
  nebula: 'Dual-Audio Hindi/English Express Node',
  zxc_pulse: 'Secondary Multi-Audio Cluster',
  zxc_atlas: 'Fast Edge HLS Cluster',
  zxc_ursa: 'Global Backup HLS Node',
  hyperion: 'Cloud Fabric 1080p Node',
  vidfast: 'Ultra-Fast Instant Start Cluster',
  vaplayer: 'European Edge Cinema Node',
  kronos: 'Multi-CDN Aggregated Stream',
  pegasus: 'Zero-Buffer Adaptive HLS (Hindi/EN)',
  nova: 'High-Contrast Cinema 1080p Multi-Audio',
  apollo: 'Universal Failover Stream Node',
};

export const PlayerServerCarousel: React.FC<{
  canPlay: boolean;
  servers: ServerItemState[];
  currentServerIndex: number;
  onClose: () => void;
  onSelectServer: (index: number) => void;
}> = ({ canPlay, servers, currentServerIndex, onClose, onSelectServer }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  // Show all servers so the original server list is preserved with its distinct status badges and subtitles
  const visibleServers = servers;

  // Keep the selected server centered smoothly STRICTLY inside the server scroll container.
  // NEVER call native window-level scrollIntoView which causes the browser window to scroll and shifts the movie player view in portrait mode!
  useEffect(() => {
    const container = containerRef.current;
    const selectedEl = itemRefs.current.get(currentServerIndex);
    if (container && selectedEl) {
      try {
        const containerRect = container.getBoundingClientRect();
        const elRect = selectedEl.getBoundingClientRect();
        const currentScrollTop = container.scrollTop;
        const elOffsetTop = elRect.top - containerRect.top + currentScrollTop;
        const targetScrollTop = elOffsetTop - (container.clientHeight / 2) + (selectedEl.clientHeight / 2);
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      } catch {
        // ignore in headless/older browsers
      }
    }
  }, [currentServerIndex, visibleServers.length]);

  return (
    <div
      data-testid="zxc-server-carousel"
      onClick={() => {
        if (canPlay) onClose();
      }}
      className={`absolute inset-0 flex items-center justify-end z-30 transition-all duration-300 ${
        canPlay
          ? 'bg-black/65 backdrop-blur-xs pointer-events-auto cursor-pointer'
          : 'pointer-events-none bg-gradient-to-l from-black/75 via-black/25 to-transparent'
      }`}
    >
      <div
        ref={containerRef}
        data-testid="zxc-server-scroll-container"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-auto min-w-[240px] max-w-sm sm:max-w-md overflow-y-auto overscroll-contain scroll-smooth pointer-events-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 my-auto mr-2 sm:mr-6 lg:mr-12 flex flex-col no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex flex-col gap-1 sm:gap-2 w-full py-4 items-end">
          {visibleServers.map((srv) => {
            const authoritativeState: NxshaServerState =
              srv.state ||
              (srv.index === currentServerIndex &&
              (srv.status === 'available' || srv.status === 'connecting')
                ? 'SELECTED'
                : srv.status === 'available'
                ? 'AVAILABLE'
                : srv.status === 'failed'
                ? 'FAILED'
                : 'PROCESSING');

            const isSelected =
              authoritativeState === 'SELECTED' || srv.index === currentServerIndex;
            const isAvailable =
              authoritativeState === 'AVAILABLE' ||
              (authoritativeState === 'SELECTED' && srv.status === 'available');
            const isConnecting =
              srv.status === 'connecting' ||
              (authoritativeState === 'SELECTED' && srv.status !== 'available' && srv.status !== 'failed');
            const isFailed = srv.status === 'failed' || authoritativeState === 'FAILED';

            const subtitle = SERVER_SUBTITLES[srv.code] || 'High Quality Stream';

            const statusLabel =
              isSelected && isAvailable
                ? 'connected'
                : isConnecting
                ? 'connecting...'
                : isAvailable
                ? 'available'
                : isFailed
                ? 'No video found'
                : 'queue';

            return (
              <div
                key={srv.code}
                ref={(el) => {
                  itemRefs.current.set(srv.index, el);
                }}
                data-testid={`server-carousel-item-${srv.index}`}
                data-server-code={srv.code}
                data-server-state={authoritativeState}
                onClick={() => onSelectServer(srv.index)}
                className={`h-auto w-fit ml-auto transition-all duration-300 [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer select-none group text-end py-3 sm:py-4 lg:py-5 px-3 sm:px-4 pointer-events-auto rounded-xl ${
                  isSelected
                    ? 'scale-105 origin-right opacity-100'
                    : isFailed
                    ? 'opacity-25 hover:opacity-50 pointer-events-auto'
                    : 'opacity-35 hover:opacity-85 hover:scale-[1.02] origin-right'
                }`}
              >
                <p
                  className={`transition-all duration-300 ${
                    isFailed
                      ? 'line-through text-zinc-400 font-semibold text-base sm:text-xl lg:text-2xl'
                      : isSelected
                      ? 'font-bold text-lg sm:text-2xl lg:text-3xl text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]'
                      : 'font-semibold text-base sm:text-xl lg:text-2xl text-white/90 group-hover:text-white'
                  }`}
                >
                  {srv.name}
                </p>
                <p
                  className={`font-medium transition-colors duration-300 mt-0.5 sm:mt-1 ${
                    isSelected
                      ? 'text-zinc-200 text-xs sm:text-sm lg:text-base'
                      : isFailed
                      ? 'text-zinc-600 text-xs sm:text-sm'
                      : 'text-zinc-400 text-xs sm:text-sm group-hover:text-zinc-200'
                  }`}
                >
                  {subtitle}
                </p>
                <span
                  data-testid={`server-status-label-${srv.index}`}
                  className={`capitalize font-medium flex justify-end items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base mt-1.5 sm:mt-2 transition-all duration-300 ${
                    isSelected && isAvailable
                      ? 'text-emerald-400 font-semibold'
                      : isConnecting
                      ? 'text-amber-300 font-semibold'
                      : isAvailable
                      ? 'text-emerald-400/90'
                      : isFailed
                      ? 'text-red-500 font-medium'
                      : 'text-zinc-400'
                  }`}
                >
                  <p>{statusLabel}</p>
                  {isSelected && isAvailable ? (
                    <CastConnectedSvg />
                  ) : isConnecting ? (
                    <LoaderCircle className="size-4 animate-spin text-amber-300" />
                  ) : isAvailable ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : isFailed ? (
                    <X className="size-4 text-red-500" strokeWidth={2.5} />
                  ) : (
                    <Loader className="size-3.5 animate-spin text-zinc-400" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const PlayerEpisodeDrawer = React.memo<{
  loadingEpisodes: boolean;
  seasonEpisodes: EpisodeItem[];
  selectedSeasonForDrawer: number;
  currentSeason: number;
  currentEpisode: number;
  seasons?: TmdbSeasonSummary[];
  fallbackBackdropPath?: string | null;
  onClose: () => void;
  onSelectEpisode: (epNum: number) => void;
  onSelectSeason?: (seasonNum: number) => void;
}>(
  ({
    loadingEpisodes,
    seasonEpisodes,
    selectedSeasonForDrawer,
    currentSeason,
    currentEpisode,
    seasons = [],
    fallbackBackdropPath = null,
    onClose,
    onSelectEpisode,
    onSelectSeason,
  }) => {
    const listRef = useRef<HTMLDivElement | null>(null);
    const itemRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
    const metricsRef = useRef<
      Array<{
        epNum: number;
        el: HTMLButtonElement;
        centerY: number;
        isActive: boolean;
        lastR: number;
      }>
    >([]);
    const clientHeightRef = useRef<number>(0);
    const rafRef = useRef<number | null>(null);
    const lastCenteredKeyRef = useRef<string>('');

    const activeSeasonList =
      seasons.length > 0
        ? seasons
        : [{ season_number: 1, episode_count: seasonEpisodes.length || 12 }];

    const resolvedFallbackBackdrop = React.useMemo(() => {
      if (!fallbackBackdropPath) return '';
      if (fallbackBackdropPath.startsWith('http') || fallbackBackdropPath.startsWith('data:')) {
        return fallbackBackdropPath;
      }
      return `https://image.tmdb.org/t/p/w300${
        fallbackBackdropPath.startsWith('/') ? fallbackBackdropPath : `/${fallbackBackdropPath}`
      }`;
    }, [fallbackBackdropPath]);

    // Pure write pass during scroll: uses cached offsetTop/offsetHeight so there are ZERO DOM layout reads per item
    const syncWheelCurve = React.useCallback((forceAll = false) => {
      const listEl = listRef.current;
      if (!listEl) return;
      const clientH = clientHeightRef.current || listEl.clientHeight;
      if (!clientH) return;

      const scrollTop = listEl.scrollTop;
      const viewCenter = scrollTop + clientH * 0.5;
      const halfH = Math.max(120, clientH * 0.52);

      const items = metricsRef.current;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const distPx = Math.abs(item.centerY - viewCenter);
        const r = Math.min(1, distPx / halfH);

        if (!forceAll && r === 1 && item.lastR === 1) {
          continue;
        }
        item.lastR = r;

        const shiftX = r * r * 18;
        const scale = item.isActive ? 1.02 - r * 0.08 : 1 - r * 0.14;
        const opacity = item.isActive ? Math.max(0.75, 1 - r * 0.25) : Math.max(0.32, 1 - r * 0.64);

        item.el.style.transform = `translate3d(${shiftX.toFixed(1)}px, 0, 0) scale(${scale.toFixed(3)})`;
        item.el.style.opacity = opacity.toFixed(2);
      }
    }, []);

    // Pure read pass: caches static offsetTop + offsetHeight once when list renders or resizes
    const measureWheelMetrics = React.useCallback(() => {
      const listEl = listRef.current;
      if (!listEl) return;
      clientHeightRef.current = listEl.clientHeight;
      const nextMetrics: Array<{
        epNum: number;
        el: HTMLButtonElement;
        centerY: number;
        isActive: boolean;
        lastR: number;
      }> = [];

      seasonEpisodes.forEach((ep) => {
        const btn = itemRefs.current.get(ep.episode_number);
        if (!btn) return;
        const isActive =
          selectedSeasonForDrawer === currentSeason && ep.episode_number === currentEpisode;
        nextMetrics.push({
          epNum: ep.episode_number,
          el: btn,
          centerY: btn.offsetTop + btn.offsetHeight * 0.5,
          isActive,
          lastR: -1,
        });
      });

      metricsRef.current = nextMetrics;
      syncWheelCurve(true);
    }, [seasonEpisodes, selectedSeasonForDrawer, currentSeason, currentEpisode, syncWheelCurve]);

    const handleWheelScroll = React.useCallback(() => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        syncWheelCurve(false);
      });
    }, [syncWheelCurve]);

    useEffect(() => {
      const listEl = listRef.current;
      if (!listEl || loadingEpisodes || seasonEpisodes.length === 0) return;

      const centerKey = `${selectedSeasonForDrawer}:${seasonEpisodes.length}`;
      const shouldCenterScroll = lastCenteredKeyRef.current !== centerKey;

      const initFrame = window.requestAnimationFrame(() => {
        measureWheelMetrics();
        if (shouldCenterScroll) {
          lastCenteredKeyRef.current = centerKey;
          const targetEp =
            selectedSeasonForDrawer === currentSeason
              ? currentEpisode
              : seasonEpisodes[0]?.episode_number || 1;
          const targetMetric =
            metricsRef.current.find((m) => m.epNum === targetEp) || metricsRef.current[0];
          if (targetMetric && listEl) {
            const targetScroll = targetMetric.centerY - listEl.clientHeight * 0.5;
            listEl.scrollTop = Math.max(0, targetScroll);
          }
        }
        syncWheelCurve(true);
      });

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          measureWheelMetrics();
        });
        ro.observe(listEl);
      }

      return () => {
        window.cancelAnimationFrame(initFrame);
        if (ro) ro.disconnect();
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }, [
      loadingEpisodes,
      seasonEpisodes,
      selectedSeasonForDrawer,
      currentSeason,
      currentEpisode,
      measureWheelMetrics,
      syncWheelCurve,
    ]);

    return (
      <div
        data-testid="zxc-episode-drawer"
        onClick={onClose}
        className="elf-ep-wheel-overlay"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="elf-ep-wheel-stage"
        >
          <div className="elf-ep-wheel-head">
            <span className="elf-ep-wheel-heading">Episodes</span>
            <button
              type="button"
              aria-label="Close episodes"
              onClick={onClose}
              className="elf-ep-wheel-close"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="elf-ep-wheel-seasons">
            {activeSeasonList.map((s) => {
              const isSelected = s.season_number === selectedSeasonForDrawer;
              return (
                <button
                  key={s.season_number}
                  type="button"
                  data-on={isSelected ? 'true' : 'false'}
                  onClick={() => onSelectSeason?.(s.season_number)}
                  className={`elf-ep-season-pill ${isSelected ? 'active' : ''}`}
                >
                  S{s.season_number}
                </button>
              );
            })}
          </div>

          <div
            ref={listRef}
            onScroll={handleWheelScroll}
            className="elf-ep-wheel-list"
          >
            <div className="elf-ep-wheel-pad" />
            {loadingEpisodes ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-300">
                <Loader className="w-7 h-7 animate-spin text-white" />
                <span className="text-xs font-medium">Loading episodes...</span>
              </div>
            ) : (
              seasonEpisodes.map((ep) => {
                const isActive =
                  selectedSeasonForDrawer === currentSeason &&
                  ep.episode_number === currentEpisode;
                const subTitle =
                  ep.name && ep.name !== `Episode ${ep.episode_number}`
                    ? ep.name
                    : `Episode ${ep.episode_number}`;
                const rawStill = ep.still_path || (ep as any).stillPath || '';
                const thumbUrl = rawStill
                  ? rawStill.startsWith('http') || rawStill.startsWith('data:')
                    ? rawStill
                    : `https://image.tmdb.org/t/p/w300${
                        rawStill.startsWith('/') ? rawStill : `/${rawStill}`
                      }`
                  : resolvedFallbackBackdrop;

                return (
                  <button
                    key={ep.id || ep.episode_number}
                    ref={(el) => {
                      if (el) itemRefs.current.set(ep.episode_number, el);
                      else itemRefs.current.delete(ep.episode_number);
                    }}
                    type="button"
                    data-testid={`episode-item-${ep.episode_number}`}
                    data-playing={isActive ? 'true' : 'false'}
                    onClick={() => onSelectEpisode(ep.episode_number)}
                    className={`elf-ep-wheel-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="elf-epw-thumb">
                      <span className="elf-epw-thumb-fallback">{ep.episode_number}</span>
                      {thumbUrl && (
                        <img
                          src={thumbUrl}
                          alt={`Episode ${ep.episode_number} - ${subTitle}`}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (
                              resolvedFallbackBackdrop &&
                              img.src !== resolvedFallbackBackdrop
                            ) {
                              img.src = resolvedFallbackBackdrop;
                            } else {
                              img.style.display = 'none';
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="elf-epw-copy">
                      <div className="elf-epw-title">Episode {ep.episode_number}</div>
                      <div className="elf-epw-sub">{subTitle}</div>
                      <div className="elf-epw-status">
                        {isActive ? (
                          <span className="elf-epw-live">
                            Playing
                            <svg
                              className="elf-epw-ico"
                              viewBox="0 0 24 24"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                            >
                              <rect x="2" y="4" width="20" height="14" rx="2" />
                              <path d="M8 21h8" />
                            </svg>
                          </span>
                        ) : (
                          <span className="elf-epw-queue">Queue —</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            <div className="elf-ep-wheel-pad" />
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.loadingEpisodes === next.loadingEpisodes &&
    prev.selectedSeasonForDrawer === next.selectedSeasonForDrawer &&
    prev.currentSeason === next.currentSeason &&
    prev.currentEpisode === next.currentEpisode &&
    prev.fallbackBackdropPath === next.fallbackBackdropPath &&
    prev.seasonEpisodes === next.seasonEpisodes &&
    (prev.seasons?.length || 0) === (next.seasons?.length || 0)
);

export const PlayerSubtitleSettingsModal: React.FC<{
  subFontSize: number;
  setSubFontSize: (val: number) => void;
  subBgOpacity: number;
  setSubBgOpacity: (val: number) => void;
  subPosition: number;
  setSubPosition: (val: number) => void;
  subTextColor: string;
  setSubTextColor: (val: string) => void;
  subTimeOffset: number;
  setSubTimeOffset: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}> = ({
  subFontSize,
  setSubFontSize,
  subBgOpacity,
  setSubBgOpacity,
  subPosition,
  setSubPosition,
  subTextColor,
  setSubTextColor,
  subTimeOffset,
  setSubTimeOffset,
  onClose,
}) => (
  <div
    onClick={onClose}
    className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md rounded-xl bg-zinc-950 border border-white/15 p-5 space-y-4 text-xs lg:text-sm"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="font-bold text-white text-sm lg:text-base">Subtitle Settings</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-zinc-300">Font Size ({subFontSize}px)</span>
          <input
            type="range"
            min={14}
            max={42}
            value={subFontSize}
            onChange={(e) => setSubFontSize(Number(e.target.value))}
            className="w-40 accent-white"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-300">Background Opacity ({subBgOpacity}%)</span>
          <input
            type="range"
            min={0}
            max={100}
            value={subBgOpacity}
            onChange={(e) => setSubBgOpacity(Number(e.target.value))}
            className="w-40 accent-white"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-300">Vertical Position ({subPosition}%)</span>
          <input
            type="range"
            min={15}
            max={95}
            value={subPosition}
            onChange={(e) => setSubPosition(Number(e.target.value))}
            className="w-40 accent-white"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-300">Text Color</span>
          <div className="flex items-center gap-2">
            {['#ffffff', '#facc15', '#38bdf8', '#4ade80'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSubTextColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border cursor-pointer ${
                  subTextColor === c ? 'border-white scale-110' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-zinc-300">
            Sync Offset ({subTimeOffset >= 0 ? `+${subTimeOffset.toFixed(1)}s` : `${subTimeOffset.toFixed(1)}s`})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubTimeOffset((prev) => Math.max(-10, prev - 0.5))}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              -0.5s
            </button>
            <button
              type="button"
              onClick={() => setSubTimeOffset(0)}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setSubTimeOffset((prev) => Math.min(10, prev + 0.5))}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              +0.5s
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
