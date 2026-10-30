import React from 'react';
import { Loader, LoaderCircle, Minus, X } from 'lucide-react';
import { MediaType, PLAYER_HINTS, PlayerMode } from '../utils/urlBuilder.js';

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

export const EpisodesToggleSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="3"
      y="4"
      width="14"
      height="10"
      rx="2"
      stroke="white"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path
      d="M7 18H19C20.1 18 21 17.1 21 16V8"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
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
}> = ({ backdropPath, logoPath, title, activeServerStatus, metadataError, hintIndex }) => (
  <div data-testid="zxc-loading-screen" className="absolute inset-0 z-20 overflow-hidden bg-black">
    {backdropPath && (
      <img
        src={`https://image.tmdb.org/t/p/w1280${backdropPath}`}
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
      {logoPath ? (
        <img
          src={`https://image.tmdb.org/t/p/w780${logoPath}`}
          alt={title || 'Logo'}
          className="absolute bottom-12 left-12 max-h-14 max-w-xs lg:max-h-40 lg:max-w-md w-auto h-auto object-contain animate-pulse drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
        />
      ) : (
        title && (
          <div className="absolute bottom-12 left-12 max-w-md animate-pulse drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
            <h2 className="text-2xl lg:text-5xl font-black tracking-tight text-white uppercase">
              {title}
            </h2>
          </div>
        )
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

export const PlayerServerCarousel: React.FC<{
  canPlay: boolean;
  servers: ServerItemState[];
  currentServerIndex: number;
  onClose: () => void;
  onSelectServer: (index: number) => void;
}> = ({ canPlay, servers, currentServerIndex, onClose, onSelectServer }) => (
  <div
    data-testid="zxc-server-carousel"
    onClick={() => {
      if (canPlay) onClose();
    }}
    className={`absolute inset-0 flex justify-end overflow-hidden z-30 ${
      canPlay ? 'bg-black/75' : 'pointer-events-none'
    }`}
  >
    <div onClick={(e) => e.stopPropagation()} className="relative h-full w-full pointer-events-auto">
      {servers.map((srv, idx) => {
        const offset = idx - currentServerIndex;
        const isCurrent = offset === 0;
        const isAdjacent = Math.abs(offset) === 1;
        return (
          <div
            key={srv.code}
            data-testid={`server-carousel-item-${srv.index}`}
            onClick={() => onSelectServer(idx)}
            style={{ top: `calc(50% + ${offset * 65}px)` }}
            className={`absolute right-0 -translate-y-1/2 transition-all duration-500 flex items-center gap-3 cursor-pointer ${
              isCurrent
                ? 'lg:-translate-x-18 -translate-x-8 scale-115 opacity-100 font-semibold text-white'
                : isAdjacent
                ? 'lg:-translate-x-10 -translate-x-4 scale-95 opacity-80 text-white'
                : 'scale-90 lg:opacity-30 opacity-10 text-white'
            } ${srv.status === 'connecting' ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center justify-center rounded-full bg-white/10 p-2 backdrop-blur-sm">
              {srv.status === 'checking' ? (
                <Loader className="size-3.5 lg:size-4 animate-spin text-white" />
              ) : srv.status === 'connecting' ? (
                <LoaderCircle className="size-3.5 lg:size-4 animate-spin text-white" />
              ) : srv.status === 'available' ? (
                <CastConnectedSvg />
              ) : srv.status === 'failed' ? (
                <X className="text-red-600 size-3.5 lg:size-4" />
              ) : (
                <Minus className="size-3.5 lg:size-4 text-white" />
              )}
            </div>
            <div>
              <div
                className={`text-base lg:text-2xl leading-tight ${
                  srv.status === 'failed' ? 'line-through text-zinc-400' : ''
                }`}
              >
                {srv.name}
              </div>
              <div className="text-xs lg:text-sm text-zinc-400">
                {srv.status === 'checking' && 'checking...'}
                {srv.status === 'connecting' && 'connecting...'}
                {srv.status === 'available' && 'connected'}
                {srv.status === 'failed' && 'No video found'}
                {srv.status === 'queue' && 'queue'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const PlayerEpisodeDrawer: React.FC<{
  loadingEpisodes: boolean;
  seasonEpisodes: EpisodeItem[];
  selectedSeasonForDrawer: number;
  currentSeason: number;
  currentEpisode: number;
  onClose: () => void;
  onSelectEpisode: (epNum: number) => void;
}> = ({
  loadingEpisodes,
  seasonEpisodes,
  selectedSeasonForDrawer,
  currentSeason,
  currentEpisode,
  onClose,
  onSelectEpisode,
}) => (
  <div
    data-testid="zxc-episode-drawer"
    onClick={onClose}
    className="absolute inset-0 z-30 bg-black/60 flex justify-end"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-80 lg:w-96 h-full bg-zinc-950/90 backdrop-blur-md border-l border-white/10 pt-16 pb-6 px-4 overflow-y-auto space-y-3"
    >
      {loadingEpisodes ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : seasonEpisodes.length === 0 ? (
        <p className="text-xs text-zinc-400 text-center py-8">No episodes found.</p>
      ) : (
        seasonEpisodes.map((ep) => {
          const isActive =
            selectedSeasonForDrawer === currentSeason && ep.episode_number === currentEpisode;
          return (
            <button
              key={ep.id || ep.episode_number}
              type="button"
              onClick={() => onSelectEpisode(ep.episode_number)}
              className={`w-full text-left rounded-lg overflow-hidden border transition cursor-pointer flex gap-3 p-2 ${
                isActive
                  ? 'bg-white/15 border-white/40'
                  : 'bg-zinc-900/70 border-white/5 hover:bg-white/10'
              }`}
            >
              <div className="relative w-28 aspect-video rounded overflow-hidden bg-zinc-800 shrink-0">
                {ep.still_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                    alt={ep.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                    EP {ep.episode_number}
                  </div>
                )}
                <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  E{ep.episode_number}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs lg:text-sm font-semibold text-white truncate">
                  {ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                  {ep.overview || 'Click to play this episode.'}
                </p>
              </div>
            </button>
          );
        })
      )}
    </div>
  </div>
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
