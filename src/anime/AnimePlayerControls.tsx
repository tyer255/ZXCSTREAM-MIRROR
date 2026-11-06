/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Search,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import {
  BackSvg,
  EpisodesToggleSvg,
  Forward10Svg,
  FullscreenEnterSvg,
  FullscreenExitSvg,
  PauseSvg,
  PlaySvg,
  Rewind10Svg,
  SettingsGearSvg,
  VolumeHighSvg,
  VolumeMutedSvg,
} from '../components/PlayerIconsAndTypes.js';
import { formatPlayerTime } from '../utils/urlBuilder.js';

export interface AnimePlayerControlsProps {
  canPlay: boolean;
  playing: boolean;
  controlsVisible: boolean;
  title: string;
  year?: string;
  genreLabel?: string;
  mediaType: 'movie' | 'tv';
  currentSeason: number;
  currentEpisode: number;
  totalSeasons?: number;
  currentTime: number;
  duration: number;
  bufferedPercent: number;
  progressPercent: number;
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  audioPreference: string;
  availableAudioTracks: Array<{ code: string; label: string; isSub: boolean; isDub: boolean }>;
  qualities: Array<{ index: number; height: number }>;
  selectedQuality: number;
  subtitles: Array<{ id: string; language: string; url: string }>;
  selectedSubtitle: string | null;
  playbackRate: number;
  autoPlayNext: boolean;
  hasPrevEpisode: boolean;
  hasNextEpisode: boolean;
  introStart?: number | null;
  introEnd?: number | null;
  outroStart?: number | null;
  outroEnd?: number | null;
  episodeDrawerOpen: boolean;
  selectedSeasonForDrawer: number;
  accentColor?: string;
  showBackButton?: boolean;
  aspectMode?: 'contain' | 'cover' | 'fill';
  onBack?: () => void;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onPrevEpisode: () => void;
  onNextEpisode: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFullscreen: () => void;
  onSelectAudio: (code: string) => void;
  onSelectQuality: (qIdx: number) => void;
  onSelectSubtitle: (id: string | null) => void;
  onSelectSpeed: (rate: number) => void;
  onToggleAutoNext: () => void;
  onToggleAspectRatio?: () => void;
  onOpenSubtitleModal?: () => void;
  onToggleEpisodeDrawer: () => void;
  onSelectSeasonForDrawer: (sNum: number) => void;
  seekBarRef: React.RefObject<HTMLDivElement | null>;
  onSeekBarMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSeekBarLeave: () => void;
  onSeekBarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  hoverTime: number | null;
  hoverPercent: number;
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AnimePlayerControls: React.FC<AnimePlayerControlsProps> = ({
  canPlay,
  playing,
  controlsVisible,
  title,
  year,
  genreLabel = 'Anime',
  mediaType,
  currentSeason,
  currentEpisode,
  totalSeasons = 1,
  currentTime,
  duration,
  bufferedPercent,
  progressPercent,
  volume,
  muted,
  isFullscreen,
  audioPreference,
  availableAudioTracks,
  qualities,
  selectedQuality,
  subtitles,
  selectedSubtitle,
  playbackRate,
  autoPlayNext,
  hasPrevEpisode,
  hasNextEpisode,
  introStart,
  introEnd,
  outroStart,
  outroEnd,
  episodeDrawerOpen,
  selectedSeasonForDrawer,
  accentColor = '#e11d48',
  showBackButton = true,
  aspectMode = 'contain',
  onBack,
  onTogglePlay,
  onSkip,
  onPrevEpisode,
  onNextEpisode,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
  onSelectAudio,
  onSelectQuality,
  onSelectSubtitle,
  onSelectSpeed,
  onToggleAutoNext,
  onToggleAspectRatio,
  onOpenSubtitleModal,
  onToggleEpisodeDrawer,
  onSelectSeasonForDrawer,
  seekBarRef,
  onSeekBarMouseMove,
  onSeekBarLeave,
  onSeekBarClick,
  hoverTime,
  hoverPercent,
  settingsOpen,
  setSettingsOpen,
}) => {
  const [settingsTab, setSettingsTab] = useState<'main' | 'audio' | 'quality' | 'subtitles' | 'speed'>('main');
  const [subtitleSearch, setSubtitleSearch] = useState<string>('');
  const [kickLeft, setKickLeft] = useState(false);
  const [kickRight, setKickRight] = useState(false);

  const activeAudioTrack =
    availableAudioTracks.find((t) => t.code === audioPreference) ||
    availableAudioTracks[0] || { code: 'ja', label: 'Japanese (Sub)' };

  const filteredSubtitles = subtitles.filter((sub) =>
    (sub.language || '').toLowerCase().includes(subtitleSearch.toLowerCase())
  );

  return (
    <div
      data-testid="anime-controls-overlay"
      className={`absolute inset-0 z-25 flex flex-col justify-between p-4 lg:p-6 pointer-events-none transition-opacity duration-300 ${
        canPlay && !episodeDrawerOpen && controlsVisible
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Top Bar - Identical layout to ZX Stream & NXSHA */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              type="button"
              aria-label="Back"
              onClick={(e) => {
                e.stopPropagation();
                if (onBack) onBack();
              }}
              className="cursor-pointer hover:scale-110 transition-transform text-white"
            >
              <BackSvg />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3" />
      </div>

      {/* Bottom Bar Container with gradient - Exactly matches PlayerControlsOverlay */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="space-y-3 pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent -mx-4 -mb-4 p-4 lg:-mx-6 lg:-mb-6 lg:p-6 pt-12"
      >
        {/* Seekbar matching ZX Stream / NXSHA 1:1 */}
        <div
          ref={seekBarRef}
          role="slider"
          aria-label="Seek Video"
          aria-valuemin={0}
          aria-valuemax={duration || 100}
          aria-valuenow={currentTime}
          onMouseMove={onSeekBarMouseMove}
          onMouseLeave={onSeekBarLeave}
          onClick={onSeekBarClick}
          className="relative h-4 flex items-center cursor-pointer group select-none"
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
            {/* Buffered track */}
            <div
              style={{ width: `${bufferedPercent}%` }}
              className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
            />

            {/* Intro marker */}
            {duration > 0 &&
              introStart !== undefined &&
              introStart !== null &&
              introEnd !== undefined &&
              introEnd !== null && (
                <div
                  data-testid="seekbar-intro-marker"
                  style={{
                    left: `${(introStart / duration) * 100}%`,
                    width: `${Math.max(0.5, ((introEnd - introStart) / duration) * 100)}%`,
                  }}
                  className="absolute inset-y-0 bg-amber-400/60 pointer-events-none z-10"
                />
              )}

            {/* Outro marker */}
            {duration > 0 &&
              outroStart !== undefined &&
              outroStart !== null &&
              outroEnd !== undefined &&
              outroEnd !== null && (
                <div
                  data-testid="seekbar-outro-marker"
                  style={{
                    left: `${(outroStart / duration) * 100}%`,
                    width: `${Math.max(0.5, ((outroEnd - outroStart) / duration) * 100)}%`,
                  }}
                  className="absolute inset-y-0 bg-amber-400/60 pointer-events-none z-10"
                />
              )}

            {/* Played progress */}
            <div
              style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
              className="absolute inset-y-0 left-0 rounded-full"
            />
          </div>

          {/* Vertical Pill Thumb Slider - Signature ZX Stream / NXSHA element */}
          <div
            style={{ left: `${progressPercent}%` }}
            className="absolute -translate-x-1/2 h-4 w-1.5 lg:h-5 lg:w-2 bg-white rounded-full shadow-md transition-transform group-hover:scale-110 z-20 pointer-events-none"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left Controls: Play, Rewind 10, Forward 10, Episodes navigation, Volume, Time */}
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              data-testid="player-play-pause"
              onClick={onTogglePlay}
              className="cursor-pointer hover:scale-110 transition-transform text-white"
            >
              {playing ? <PauseSvg /> : <PlaySvg />}
            </button>

            {mediaType === 'tv' && (
              <button
                type="button"
                aria-label="Previous episode"
                data-testid="anime-prev-episode-button"
                onClick={onPrevEpisode}
                disabled={!hasPrevEpisode}
                className={`cursor-pointer hover:scale-110 transition-transform flex items-center text-white/90 hover:text-white ${
                  !hasPrevEpisode ? 'opacity-40 pointer-events-none' : ''
                }`}
                title="Previous Episode"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              aria-label="Rewind 10 seconds"
              data-testid="player-rewind-10"
              onClick={() => {
                setKickLeft(false);
                window.requestAnimationFrame(() => setKickLeft(true));
                window.setTimeout(() => setKickLeft(false), 380);
                onSkip(-10);
              }}
              className={`elf-skip10-btn elf-skip10-back ${kickLeft ? 'kicking' : ''}`}
              title="Rewind 10 seconds"
            >
              <Rewind10Svg />
            </button>

            <button
              type="button"
              aria-label="Forward 10 seconds"
              data-testid="player-forward-10"
              onClick={() => {
                setKickRight(false);
                window.requestAnimationFrame(() => setKickRight(true));
                window.setTimeout(() => setKickRight(false), 380);
                onSkip(10);
              }}
              className={`elf-skip10-btn elf-skip10-fwd ${kickRight ? 'kicking' : ''}`}
              title="Forward 10 seconds"
            >
              <Forward10Svg />
            </button>

            {mediaType === 'tv' && (
              <button
                type="button"
                aria-label="Next episode"
                data-testid="anime-next-episode-button"
                onClick={onNextEpisode}
                disabled={!hasNextEpisode}
                className={`cursor-pointer hover:scale-110 transition-transform flex items-center text-white/90 hover:text-white ${
                  !hasNextEpisode ? 'opacity-40 pointer-events-none' : ''
                }`}
                title="Next Episode"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2 group/vol">
              <button
                type="button"
                aria-label={muted ? 'Unmute' : 'Mute'}
                onClick={onToggleMute}
                className="cursor-pointer hover:scale-110 transition-transform text-white"
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

          {/* Right Controls: Settings, Episodes Drawer Toggle, Fullscreen */}
          <div className="flex items-center gap-3 lg:gap-4 relative">
            {/* Settings Popover - Exact match with ZX Stream / NXSHA popover */}
            {settingsOpen && (
              <div
                data-testid="player-settings-menu"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full mb-2.5 right-0 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[min(320px,calc(100vh-6rem))] landscape:max-h-[min(250px,calc(100vh-4.5rem))] overflow-y-auto no-scrollbar rounded-2xl bg-zinc-950/75 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-3 text-xs lg:text-sm space-y-1 z-40"
              >
                {/* Main Settings Menu */}
                {settingsTab === 'main' && (
                  <>
                    <button
                      type="button"
                      data-testid="settings-open-dub-tab"
                      onClick={() => setSettingsTab('audio')}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                    >
                      <span className="text-zinc-300 font-medium">Audio Dub / Language</span>
                      <span
                        data-testid="settings-current-dub-label"
                        className="flex items-center gap-1 font-semibold text-white"
                      >
                        {activeAudioTrack.label}
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </span>
                    </button>

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

                    {onOpenSubtitleModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsOpen(false);
                          onOpenSubtitleModal();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span className="text-zinc-300 font-medium">Subtitle settings</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    )}

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

                    {onToggleAspectRatio && (
                      <button
                        type="button"
                        onClick={onToggleAspectRatio}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span className="text-zinc-300 font-medium">Aspect ratio</span>
                        <span className="font-semibold text-white uppercase">{aspectMode}</span>
                      </button>
                    )}

                    {mediaType === 'tv' && (
                      <button
                        type="button"
                        data-testid="settings-toggle-autoplay-next"
                        onClick={onToggleAutoNext}
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
                  </>
                )}

                {/* Audio Dub Submenu */}
                {settingsTab === 'audio' && (
                  <div className="space-y-1" data-testid="settings-dub-submenu">
                    <button
                      type="button"
                      onClick={() => setSettingsTab('main')}
                      className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Audio Dub / Track</span>
                    </button>

                    {availableAudioTracks.map((track) => (
                      <button
                        key={track.code}
                        type="button"
                        data-testid={`dub-option-${track.code}`}
                        onClick={() => onSelectAudio(track.code)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span>{track.label}</span>
                        {audioPreference === track.code && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Subtitles Submenu */}
                {settingsTab === 'subtitles' && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setSettingsTab('main')}
                      className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Subtitles</span>
                    </button>

                    <div className="relative px-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search subtitles..."
                        value={subtitleSearch}
                        onChange={(e) => setSubtitleSearch(e.target.value)}
                        className="w-full bg-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-zinc-400 outline-none border border-white/10 focus:border-white/30"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        onClick={() => onSelectSubtitle(null)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span>Off</span>
                        {!selectedSubtitle && <Check className="w-4 h-4 text-green-400" />}
                      </button>

                      {filteredSubtitles.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onSelectSubtitle(sub.language)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                        >
                          <span>{sub.language}</span>
                          {selectedSubtitle === sub.language && (
                            <Check className="w-4 h-4 text-green-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quality Submenu */}
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
                        {selectedQuality === q.index && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Playback Speed Submenu */}
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

                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => onSelectSpeed(rate)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span>{rate === 1 ? 'Normal (1x)' : `${rate}x`}</span>
                        {playbackRate === rate && <Check className="w-4 h-4 text-green-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings Button */}
            <button
              type="button"
              aria-label="Settings"
              data-testid="player-settings-button"
              onClick={() => {
                setSettingsOpen((prev) => !prev);
                setSettingsTab('main');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs text-xs lg:text-sm font-medium text-white transition cursor-pointer"
            >
              <SettingsGearSvg />
              <span className="hidden sm:inline">Settings</span>
              <ChevronRight className="w-4 h-4 opacity-80" />
            </button>

            {/* Episodes Drawer Toggle Button */}
            {mediaType === 'tv' && (
              <button
                type="button"
                aria-label="Episodes"
                data-testid="player-episodes-button"
                onClick={onToggleEpisodeDrawer}
                className="elf-episodes-btn"
                title="Episodes"
              >
                <EpisodesToggleSvg />
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              data-testid="player-fullscreen-button"
              onClick={onToggleFullscreen}
              className="cursor-pointer hover:scale-110 transition-transform text-white"
            >
              {isFullscreen ? <FullscreenExitSvg /> : <FullscreenEnterSvg />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimePlayerControls;
