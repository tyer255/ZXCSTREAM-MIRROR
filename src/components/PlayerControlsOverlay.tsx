import React from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  SkipForward,
  Volume1,
  Volume2,
} from 'lucide-react';
import {
  DUB_LANGUAGES,
  MediaType,
  NextEpisodeInfo,
  PlayerMode,
  RawOrionDub,
  ResolvedEpisodeTiming,
  formatPlayerTime,
} from '../utils/urlBuilder.js';
import {
  BackSvg,
  EpisodesToggleSvg,
  FullscreenEnterSvg,
  FullscreenExitSvg,
  PauseSvg,
  PlaySvg,
  ServerInboxSvg,
  SettingsGearSvg,
  SubtitleTrack,
  TmdbMetadata,
  VolumeHighSvg,
  VolumeMutedSvg,
} from './PlayerIconsAndTypes.js';

export const SmartPlaybackControls: React.FC<{
  canPlay: boolean;
  settingsOpen: boolean;
  showServersOverlay: boolean;
  showEpisodeDrawer: boolean;
  controlsVisible: boolean;
  playing: boolean;
  activeCueText: string;
  skipState: {
    showSkipRecap: boolean;
    showSkipIntro: boolean;
    showSkipOutro: boolean;
    showNextEpisode: boolean;
  };
  nextEpisodeInfo: NextEpisodeInfo | null;
  autoPlayNext: boolean;
  countdownCancelled: boolean;
  nextCountdown: number | null;
  onSkipRecap: () => void;
  onSkipIntro: () => void;
  onSkipOutro: () => void;
  onNextEpisode: () => void;
  onCancelCountdown: (e: React.MouseEvent) => void;
}> = ({
  canPlay,
  settingsOpen,
  showServersOverlay,
  showEpisodeDrawer,
  controlsVisible,
  playing,
  activeCueText,
  skipState,
  nextEpisodeInfo,
  autoPlayNext,
  countdownCancelled,
  nextCountdown,
  onSkipRecap,
  onSkipIntro,
  onSkipOutro,
  onNextEpisode,
  onCancelCountdown,
}) => {
  if (
    !canPlay ||
    settingsOpen ||
    showServersOverlay ||
    showEpisodeDrawer ||
    (!skipState.showSkipRecap &&
      !skipState.showSkipIntro &&
      !skipState.showSkipOutro &&
      !(skipState.showNextEpisode && nextEpisodeInfo))
  ) {
    return null;
  }

  return (
    <div
      data-testid="smart-playback-controls"
      onClick={(e) => e.stopPropagation()}
      className={`absolute right-4 sm:right-6 lg:right-8 z-30 flex flex-col items-end gap-2.5 transition-all duration-300 pointer-events-auto ${
        controlsVisible || !playing
          ? 'bottom-24 sm:bottom-28 lg:bottom-32'
          : activeCueText
          ? 'bottom-16 sm:bottom-20'
          : 'bottom-8 sm:bottom-10'
      }`}
    >
      {skipState.showSkipRecap && (
        <button
          type="button"
          data-testid="skip-recap-button"
          aria-label="Skip Recap"
          onClick={onSkipRecap}
          className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-zinc-900/90 hover:bg-white text-white hover:text-zinc-950 font-semibold text-xs sm:text-sm tracking-wide backdrop-blur-md border border-white/25 hover:border-white shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current transition-transform group-hover:translate-x-0.5" />
          <span>Skip Recap</span>
        </button>
      )}
      {skipState.showSkipIntro && (
        <button
          type="button"
          data-testid="skip-intro-button"
          aria-label="Skip Intro"
          onClick={onSkipIntro}
          className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-zinc-900/90 hover:bg-white text-white hover:text-zinc-950 font-semibold text-xs sm:text-sm tracking-wide backdrop-blur-md border border-white/25 hover:border-white shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current transition-transform group-hover:translate-x-0.5" />
          <span>Skip Intro</span>
        </button>
      )}
      {skipState.showSkipOutro && (
        <button
          type="button"
          data-testid="skip-outro-button"
          aria-label="Skip Outro"
          onClick={onSkipOutro}
          className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-zinc-900/90 hover:bg-white text-white hover:text-zinc-950 font-semibold text-xs sm:text-sm tracking-wide backdrop-blur-md border border-white/25 hover:border-white shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current transition-transform group-hover:translate-x-0.5" />
          <span>Skip Outro</span>
        </button>
      )}
      {skipState.showNextEpisode && nextEpisodeInfo && (
        <div
          data-testid="next-episode-container"
          className="flex flex-col gap-1.5 rounded-xl bg-zinc-950/90 backdrop-blur-xl border border-white/15 p-2.5 sm:p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] w-64 sm:w-72"
        >
          <div className="w-full flex items-center justify-between gap-2 px-0.5">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Up Next • S{nextEpisodeInfo.season}E{nextEpisodeInfo.episode}
            </span>
            {autoPlayNext && !countdownCancelled && nextCountdown !== null && (
              <span
                data-testid="next-episode-countdown"
                className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 tabular-nums"
              >
                Playing in {nextCountdown}s
              </span>
            )}
          </div>
          <div className="w-full text-xs sm:text-sm font-semibold text-white truncate px-0.5 mb-0.5">
            {nextEpisodeInfo.title}
          </div>
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              data-testid="next-episode-button"
              aria-label="Next Episode"
              onClick={onNextEpisode}
              className="relative flex-1 overflow-hidden flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-zinc-950 text-zinc-950 shrink-0" />
              <span>
                Next Episode
                {autoPlayNext && !countdownCancelled && nextCountdown !== null
                  ? ` (${nextCountdown}s)`
                  : ''}
              </span>
            </button>
            {autoPlayNext && !countdownCancelled && nextCountdown !== null && (
              <button
                type="button"
                data-testid="cancel-next-episode-countdown"
                aria-label="Cancel autoplay countdown"
                onClick={onCancelCountdown}
                className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export interface PlayerControlsOverlayProps {
  canPlay: boolean;
  controlsVisible: boolean;
  playing: boolean;
  showBackButton: boolean;
  onBack?: () => void;
  showEpisodeDrawer: boolean;
  activeMediaType: MediaType;
  selectedSeasonForDrawer: number;
  setSelectedSeasonForDrawer: (s: number) => void;
  metadata: TmdbMetadata | null;
  playerMode: PlayerMode;
  setShowServersOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEpisodeDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  normalizedColor: string;
  currentSeason: number;
  currentEpisode: number;
  genreLabel: string;
  statusLabel: string;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onSeekBarMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSeekBarLeave: () => void;
  onSeekBarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  hoverTime: number | null;
  hoverPercent: number;
  bufferedPercent: number;
  progressPercent: number;
  duration: number;
  currentTime: number;
  resolvedTiming: ResolvedEpisodeTiming;
  onTogglePlay: () => void;
  onSkip: (sec: number) => void;
  muted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  settingsOpen: boolean;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  loadingDub: boolean;
  effectiveDub: { isOriginal: boolean; dubCode: string; displayLabel: string };
  audioTracks: { id: number; label: string; lang?: string }[];
  selectedAudioTrack: number;
  onSelectAudioTrack: (id: number) => void;
  selectedSubtitle: string | null;
  setSelectedSubtitle: (lang: string | null) => void;
  dualSubtitle: string | null;
  setDualSubtitle: (lang: string | null) => void;
  subtitles: SubtitleTrack[];
  subtitleSearch: string;
  setSubtitleSearch: (q: string) => void;
  setSubtitleModalOpen: (open: boolean) => void;
  selectedQuality: number;
  qualities: { index: number; height: number }[];
  onSelectQuality: (q: number) => void;
  playbackRate: number;
  onSelectSpeed: (r: number) => void;
  brightness: number;
  setBrightness: (b: number) => void;
  aspectMode: 'contain' | 'cover' | 'fill';
  setAspectMode: React.Dispatch<React.SetStateAction<'contain' | 'cover' | 'fill'>>;
  rotation: number;
  setRotation: React.Dispatch<React.SetStateAction<number>>;
  mirrored: boolean;
  setMirrored: React.Dispatch<React.SetStateAction<boolean>>;
  autoPlayNext: boolean;
  setAutoPlayNext: React.Dispatch<React.SetStateAction<boolean>>;
  setCountdownCancelled: (c: boolean) => void;
  sleepTimer: number;
  setSleepTimer: React.Dispatch<React.SetStateAction<number>>;
  filteredDubs: RawOrionDub[];
  selectedDub: string;
  selectedDubType: string;
  onSelectDub: (code: string, typeVal: number | string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const PlayerControlsOverlay: React.FC<PlayerControlsOverlayProps> = ({
  canPlay,
  controlsVisible,
  playing,
  showBackButton,
  onBack,
  showEpisodeDrawer,
  activeMediaType,
  selectedSeasonForDrawer,
  setSelectedSeasonForDrawer,
  metadata,
  playerMode,
  setShowServersOverlay,
  setShowEpisodeDrawer,
  setSettingsOpen,
  normalizedColor,
  currentSeason,
  currentEpisode,
  genreLabel,
  statusLabel,
  seekBarRef,
  onSeekBarMouseMove,
  onSeekBarLeave,
  onSeekBarClick,
  hoverTime,
  hoverPercent,
  bufferedPercent,
  progressPercent,
  duration,
  currentTime,
  resolvedTiming,
  onTogglePlay,
  onSkip,
  muted,
  volume,
  onToggleMute,
  onVolumeChange,
  settingsOpen,
  settingsTab,
  setSettingsTab,
  loadingDub,
  effectiveDub,
  audioTracks,
  selectedAudioTrack,
  onSelectAudioTrack,
  selectedSubtitle,
  setSelectedSubtitle,
  dualSubtitle,
  setDualSubtitle,
  subtitles,
  subtitleSearch,
  setSubtitleSearch,
  setSubtitleModalOpen,
  selectedQuality,
  qualities,
  onSelectQuality,
  playbackRate,
  onSelectSpeed,
  brightness,
  setBrightness,
  aspectMode,
  setAspectMode,
  rotation,
  setRotation,
  mirrored,
  setMirrored,
  autoPlayNext,
  setAutoPlayNext,
  setCountdownCancelled,
  sleepTimer,
  setSleepTimer,
  filteredDubs,
  selectedDub,
  selectedDubType,
  onSelectDub,
  isFullscreen,
  onToggleFullscreen,
}) => (
  <div
    className={`absolute inset-0 z-25 flex flex-col justify-between p-4 lg:p-6 pointer-events-none transition-opacity duration-300 ${
      canPlay && (controlsVisible || !playing) ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <div className="flex items-center justify-between pointer-events-auto">
      <div>
        {showBackButton && (
          <button
            type="button"
            aria-label="Back"
            onClick={(e) => {
              e.stopPropagation();
              if (onBack) onBack();
            }}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            <BackSvg />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {showEpisodeDrawer && activeMediaType === 'tv' && (
          <select
            aria-label="Select Season"
            value={selectedSeasonForDrawer}
            onChange={(e) => setSelectedSeasonForDrawer(Number(e.target.value))}
            className="bg-zinc-900/90 text-white text-xs lg:text-sm px-3 py-1.5 rounded-md border border-white/15 outline-none cursor-pointer"
          >
            {(metadata?.seasons?.length
              ? metadata.seasons
              : [{ season_number: 1, episode_count: 24 }]
            ).map((s) => (
              <option key={s.season_number} value={s.season_number}>
                Season {s.season_number} ({s.episode_count})
              </option>
            ))}
          </select>
        )}
        {playerMode === 'custom' && (
          <button
            type="button"
            aria-label="Toggle Servers"
            data-testid="toggle-servers-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowServersOverlay((prev) => !prev);
              setShowEpisodeDrawer(false);
              setSettingsOpen(false);
            }}
            className="cursor-pointer hover:scale-110 transition-transform text-white"
          >
            <ServerInboxSvg />
          </button>
        )}
      </div>
    </div>

    <div
      onClick={(e) => e.stopPropagation()}
      className="space-y-3 pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent -mx-4 -mb-4 p-4 lg:-mx-6 lg:-mb-6 lg:p-6 pt-12"
    >
      {playerMode === 'custom' && metadata && (
        <div className="hidden md:block space-y-0.5 mb-2 max-w-[55%] pointer-events-none">
          <div className="flex items-center gap-2">
            <div style={{ backgroundColor: normalizedColor }} className="w-1 h-4 rounded-full" />
            <span className="text-xs text-zinc-300 font-medium">You&apos;re Watching</span>
          </div>
          <div className="text-sm lg:text-base font-bold text-white leading-snug truncate">
            {metadata.title}{' '}
            {activeMediaType === 'tv' ? `S${currentSeason}E${currentEpisode}` : ''}{' '}
            {metadata.year ? `(${metadata.year})` : ''}
          </div>
          <div className="text-[11px] lg:text-xs text-zinc-300">
            {activeMediaType === 'tv' ? 'TV Show' : 'Movie'} / {genreLabel} / {statusLabel}
          </div>
        </div>
      )}

      <div
        ref={seekBarRef}
        onMouseMove={onSeekBarMouseMove}
        onMouseLeave={onSeekBarLeave}
        onClick={onSeekBarClick}
        className="relative h-4 flex items-center cursor-pointer group"
      >
        {hoverTime !== null && (
          <div
            style={{ left: `${hoverPercent}%` }}
            className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs font-mono px-2 py-0.5 rounded border border-white/10 pointer-events-none"
          >
            {formatPlayerTime(hoverTime)}
          </div>
        )}
        <div className="w-full h-1.5 group-hover:h-2 bg-white/25 rounded-full overflow-hidden relative transition-all">
          <div
            style={{ width: `${bufferedPercent}%` }}
            className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
          />
          {duration > 0 &&
            resolvedTiming.introStart !== null &&
            resolvedTiming.introEnd !== null && (
              <div
                data-testid="seekbar-intro-marker"
                style={{
                  left: `${(resolvedTiming.introStart / duration) * 100}%`,
                  width: `${Math.max(
                    0.5,
                    ((resolvedTiming.introEnd - resolvedTiming.introStart) / duration) * 100
                  )}%`,
                }}
                className="absolute inset-y-0 bg-amber-400/60 pointer-events-none z-10"
              />
            )}
          {duration > 0 &&
            resolvedTiming.outroStart !== null &&
            resolvedTiming.outroEnd !== null && (
              <div
                data-testid="seekbar-outro-marker"
                style={{
                  left: `${(resolvedTiming.outroStart / duration) * 100}%`,
                  width: `${Math.max(
                    0.5,
                    ((resolvedTiming.outroEnd - resolvedTiming.outroStart) / duration) * 100
                  )}%`,
                }}
                className="absolute inset-y-0 bg-amber-400/60 pointer-events-none z-10"
              />
            )}
          <div
            style={{ width: `${progressPercent}%`, backgroundColor: normalizedColor }}
            className="absolute inset-y-0 left-0 rounded-full"
          />
        </div>
        <div
          style={{ left: `${progressPercent}%` }}
          className="absolute -translate-x-1/2 h-4 w-1.5 lg:h-5 lg:w-2 bg-white rounded-full shadow-md transition-transform group-hover:scale-110 z-20"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            data-testid="player-play-pause"
            onClick={onTogglePlay}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            {playing ? <PauseSvg /> : <PlaySvg />}
          </button>
          <button
            type="button"
            aria-label="Rewind 10 seconds"
            data-testid="player-rewind-10"
            onClick={() => onSkip(-10)}
            className="cursor-pointer hover:scale-110 transition-transform flex items-center gap-0.5 text-white/90 hover:text-white"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-5 h-5 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-xs font-bold">10</span>
          </button>
          <button
            type="button"
            aria-label="Forward 10 seconds"
            data-testid="player-forward-10"
            onClick={() => onSkip(10)}
            className="cursor-pointer hover:scale-110 transition-transform flex items-center gap-0.5 text-white/90 hover:text-white"
            title="Forward 10 seconds"
          >
            <span className="text-[10px] lg:text-xs font-bold">10</span>
            <RotateCw className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <div className="flex items-center gap-2 group/vol">
            <button
              type="button"
              aria-label={muted ? 'Unmute' : 'Mute'}
              onClick={onToggleMute}
              className="cursor-pointer hover:scale-110 transition-transform"
            >
              {muted || volume === 0 ? <VolumeMutedSvg /> : <VolumeHighSvg />}
            </button>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeChange(Number.parseFloat(e.target.value))}
              className="w-0 group-hover/vol:w-20 focus:w-20 transition-all duration-300 accent-white cursor-pointer h-1 bg-white/30 rounded-lg overflow-hidden"
            />
          </div>
          <div
            data-testid="player-time-display"
            className="text-xs lg:text-sm font-medium text-zinc-200 tabular-nums whitespace-nowrap"
          >
            {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
          </div>
        </div>

        <div className="flex items-center gap-3 lg:gap-4 relative">
          {settingsOpen && (
            <div
              data-testid="player-settings-menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-full mb-2.5 right-0 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[min(320px,calc(100vh-6rem))] landscape:max-h-[min(250px,calc(100vh-4.5rem))] overflow-y-auto no-scrollbar rounded-2xl bg-zinc-950/75 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-3 text-xs lg:text-sm space-y-1 z-40"
            >
              {settingsTab === 'main' && (
                <>
                  <button
                    type="button"
                    data-testid="settings-open-dub-tab"
                    onClick={() => setSettingsTab('dub')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Audio Dub</span>
                    <span
                      data-testid="settings-current-dub-label"
                      className="flex items-center gap-1 font-semibold text-white"
                    >
                      {loadingDub
                        ? 'Switching...'
                        : effectiveDub.isOriginal
                        ? 'Original'
                        : (effectiveDub.displayLabel || 'Original').replace(/\s+dub$/i, '')}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </span>
                  </button>
                  {audioTracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSettingsTab('audio')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <span className="text-zinc-300 font-medium">Audio track</span>
                      <span className="flex items-center gap-1 font-semibold text-white">
                        {audioTracks[selectedAudioTrack]?.label || 'Default'}
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSettingsTab('subtitles')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Subtitles</span>
                    <span className="flex items-center gap-1 font-semibold text-white">
                      {selectedSubtitle || 'Off'}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('dualsubtitles')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Dual subtitles</span>
                    <span className="flex items-center gap-1 font-semibold text-white">
                      {dualSubtitle || 'Off'}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setSubtitleModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Subtitle settings</span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('quality')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Quality</span>
                    <span className="flex items-center gap-1 font-semibold text-white">
                      {selectedQuality === -1
                        ? 'Auto'
                        : `${qualities.find((q) => q.index === selectedQuality)?.height || 1080}p`}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('speed')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Playback speed</span>
                    <span className="flex items-center gap-1 font-semibold text-white">
                      {playbackRate === 1 ? 'Normal' : `${playbackRate}x`}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsTab('brightness')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Brightness</span>
                    <span className="flex items-center gap-1 font-semibold text-white">
                      {brightness}%
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAspectMode((prev) =>
                        prev === 'contain' ? 'cover' : prev === 'cover' ? 'fill' : 'contain'
                      )
                    }
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Aspect ratio</span>
                    <span className="font-semibold text-white uppercase">{aspectMode}</span>
                  </button>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-zinc-300 font-medium">Transform</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer transition-colors"
                      >
                        Rotate {rotation}°
                      </button>
                      <button
                        type="button"
                        onClick={() => setMirrored((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer transition-colors"
                      >
                        {mirrored ? 'Mirrored' : 'Mirror'}
                      </button>
                    </div>
                  </div>
                  {activeMediaType === 'tv' && (
                    <button
                      type="button"
                      data-testid="settings-toggle-autoplay-next"
                      onClick={() => {
                        setAutoPlayNext((prev) => !prev);
                        setCountdownCancelled(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <span className="text-zinc-300 font-medium">Autoplay next</span>
                      <span
                        data-testid="settings-autoplay-next-status"
                        className="font-semibold text-white"
                      >
                        {autoPlayNext ? 'On' : 'Off'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setSleepTimer((prev) =>
                        prev === 0 ? 15 : prev === 15 ? 30 : prev === 30 ? 60 : 0
                      )
                    }
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span className="text-zinc-300 font-medium">Sleep timer</span>
                    <span className="font-semibold text-white">
                      {sleepTimer === 0 ? 'Off' : `${sleepTimer}m`}
                    </span>
                  </button>
                </>
              )}

              {settingsTab === 'dub' && (
                <div className="space-y-1" data-testid="settings-dub-submenu">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('main')}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Audio Dub</span>
                  </button>
                  <button
                    type="button"
                    data-testid="dub-option-original"
                    onClick={() => onSelectDub('', 0)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span>Original Audio</span>
                    {effectiveDub.isOriginal && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                  {filteredDubs.filter((d) => !d.original).length > 0
                    ? filteredDubs
                        .filter((d) => !d.original)
                        .map((d, idx) => {
                          const code = (d.lang || '').toLowerCase();
                          const isSelected =
                            !effectiveDub.isOriginal &&
                            effectiveDub.dubCode === code &&
                            String(selectedDubType) === String(d.type ?? 0);
                          return (
                            <button
                              key={`${code}-${d.type ?? 0}-${idx}`}
                              type="button"
                              data-testid={`dub-option-${code}`}
                              onClick={() => onSelectDub(code, d.type ?? 0)}
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                            >
                              <span>
                                {d.name || code.toUpperCase()} ({code.toUpperCase()})
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-green-400" />}
                            </button>
                          );
                        })
                    : DUB_LANGUAGES.map((d) => (
                        <button
                          key={d.code}
                          type="button"
                          data-testid={`dub-option-${d.code}`}
                          onClick={() => onSelectDub(d.code, 0)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                        >
                          <span>
                            {d.label} ({d.code.toUpperCase()})
                          </span>
                          {selectedDub === d.code && <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      ))}
                </div>
              )}

              {settingsTab === 'audio' && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('main')}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Audio Track</span>
                  </button>
                  {audioTracks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectAudioTrack(t.id)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <span>{t.label}</span>
                      {selectedAudioTrack === t.id && <Check className="w-4 h-4 text-green-400" />}
                    </button>
                  ))}
                </div>
              )}

              {(settingsTab === 'subtitles' || settingsTab === 'dualsubtitles') && (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('main')}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{settingsTab === 'subtitles' ? 'Subtitles' : 'Dual Subtitles'}</span>
                  </button>
                  <div className="relative px-2">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search language..."
                      value={subtitleSearch}
                      onChange={(e) => setSubtitleSearch(e.target.value)}
                      className="w-full bg-white/[0.08] border border-white/10 rounded-xl pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-zinc-400 outline-none focus:bg-white/[0.12] focus:border-white/20 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (settingsTab === 'subtitles') setSelectedSubtitle(null);
                      else setDualSubtitle(null);
                      setSettingsTab('main');
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span>Off</span>
                    {(settingsTab === 'subtitles' ? !selectedSubtitle : !dualSubtitle) && (
                      <Check className="w-4 h-4 text-green-400" />
                    )}
                  </button>
                  {subtitles
                    .filter((s) => s.language.toLowerCase().includes(subtitleSearch.toLowerCase()))
                    .map((s, idx) => (
                      <button
                        key={`${s.language}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (settingsTab === 'subtitles') setSelectedSubtitle(s.language);
                          else setDualSubtitle(s.language);
                          setSettingsTab('main');
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span>{s.language}</span>
                        {(settingsTab === 'subtitles'
                          ? selectedSubtitle === s.language
                          : dualSubtitle === s.language) && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    ))}
                </div>
              )}

              {settingsTab === 'quality' && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('main')}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Quality</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectQuality(-1)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                  >
                    <span>Auto</span>
                    {selectedQuality === -1 && <Check className="w-4 h-4 text-green-400" />}
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.index}
                      type="button"
                      onClick={() => onSelectQuality(q.index)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <span>{q.height}p</span>
                      {selectedQuality === q.index && <Check className="w-4 h-4 text-green-400" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsTab === 'speed' && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('main')}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Playback speed</span>
                  </button>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onSelectSpeed(r)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <span>{r === 1 ? 'Normal (1x)' : `${r}x`}</span>
                      {playbackRate === r && <Check className="w-4 h-4 text-green-400" />}
                    </button>
                  ))}
                </div>
              )}

              {settingsTab === 'brightness' && (
                <div className="space-y-3 p-2">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('main')}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Brightness ({brightness}%)</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Volume1 className="w-4 h-4 text-zinc-400" />
                    <input
                      type="range"
                      min={30}
                      max={150}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="flex-1 accent-white cursor-pointer"
                    />
                    <Volume2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label="Settings"
            data-testid="player-settings-button"
            onClick={() => {
              setSettingsOpen((prev) => !prev);
              setSettingsTab('main');
              setShowServersOverlay(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs text-xs lg:text-sm font-medium text-white transition cursor-pointer"
          >
            <SettingsGearSvg />
            <span className="hidden sm:inline">Settings</span>
            <ChevronRight className="w-4 h-4 opacity-80" />
          </button>

          {activeMediaType === 'tv' && (
            <button
              type="button"
              aria-label="Episodes"
              data-testid="player-episodes-button"
              onClick={() => {
                setShowEpisodeDrawer((prev) => !prev);
                setShowServersOverlay(false);
                setSettingsOpen(false);
              }}
              className="cursor-pointer hover:scale-110 transition-transform"
            >
              <EpisodesToggleSvg />
            </button>
          )}

          <button
            type="button"
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            data-testid="player-fullscreen-button"
            onClick={onToggleFullscreen}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            {isFullscreen ? <FullscreenExitSvg /> : <FullscreenEnterSvg />}
          </button>
        </div>
      </div>
    </div>
  </div>
);
