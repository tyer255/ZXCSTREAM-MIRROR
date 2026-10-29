import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Loader,
  LoaderCircle,
  Minus,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  SkipForward,
  Volume1,
  Volume2,
  X,
} from 'lucide-react';
import {
  DUB_LANGUAGES,
  EpisodeTimingMetadata,
  MediaType,
  PLAYER_HINTS,
  PLAYER_SERVERS,
  PlayerMode,
  RawOrionDub,
  evaluatePlaybackSkipState,
  filterAudioDubTracks,
  formatPlayerTime,
  parsePlayerQueryParams,
  resolveEffectiveDubSelection,
  resolveEpisodeTiming,
  resolveNextEpisode,
  shouldSyncDubAudioTime,
} from '../utils/urlBuilder';
import { getEpisodeTimingMetadata } from '../data/tmdbCatalog';

// Exact custom SVGs extracted from zxcstream.cc chunk 00uxoksvhj._d.js
const BackSvg = () => (
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

const FullscreenEnterSvg = () => (
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

const FullscreenExitSvg = () => (
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

const PlaySvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7 5.5V18.5C7 19.6 8.2 20.3 9.2 19.7L19 13.2C19.9 12.6 19.9 11.4 19 10.8L9.2 4.3C8.2 3.7 7 4.4 7 5.5Z"
      fill="white"
    />
  </svg>
);

const PauseSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="4" height="16" rx="1.8" fill="white" />
    <rect x="14" y="4" width="4" height="16" rx="1.8" fill="white" />
  </svg>
);

const VolumeMutedSvg = () => (
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

const VolumeHighSvg = () => (
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

const SettingsGearSvg = () => (
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

const ServerInboxSvg = () => (
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

const EpisodesToggleSvg = () => (
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

const CastConnectedSvg = () => (
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

// Exact Tailspin SVG component from 00uxoksvhj._d.js
const TailspinLoader: React.FC<{ size?: number; stroke?: number; color?: string }> = ({
  size = 60,
  stroke = 8,
  color = 'white',
}) => {
  const r = Math.max(0, 20 - stroke * 0.5);
  const d = `M 20 ${20 - r} A ${r} ${r} 0 0 1 ${20 + r} 20`;
  return (
    <div
      className="container_2e2e0b"
      style={{
        '--uib-size': `${size}px`,
        '--uib-color': color,
        '--uib-speed': '0.9s',
        '--uib-stroke': `${stroke}px`,
      } as React.CSSProperties}
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

type ServerProbeStatus = 'queue' | 'checking' | 'connecting' | 'available' | 'failed';

interface ServerItemState {
  index: number;
  code: string;
  name: string;
  status: ServerProbeStatus;
}

interface TmdbSeasonSummary {
  season_number: number;
  episode_count: number;
  name?: string;
}

interface TmdbMetadata {
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

interface EpisodeItem {
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

interface SubtitleTrack {
  language: string;
  url: string;
  flagUrl?: string;
}

function canPlayHevcInBrowser(): boolean {
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

export const CustomPlayerView: React.FC<CustomPlayerViewProps> = ({
  playerMode,
  mediaType: initialMediaType,
  tmdbId,
  season: initialSeason,
  episode: initialEpisode,
  dubLang = '',
  initialServer = 0,
  accentColor = 'e11d48',
  autoplay = true,
  showBackButton = true,
  isStandalonePage = false,
  onBack,
  onEpisodeChange,
  onMediaTypeResolved,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dubAudioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const dubDashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const loadedStreamDubRef = useRef<string>('');
  const seekBarRef = useRef<HTMLDivElement>(null);

  const [activeMediaType, setActiveMediaType] = useState<MediaType>(initialMediaType);
  const [currentSeason, setCurrentSeason] = useState<number>(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode || 1);

  const [metadata, setMetadata] = useState<TmdbMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Server probing state matching zxcstream.cc u2 component
  const [servers, setServers] = useState<ServerItemState[]>(() =>
    PLAYER_SERVERS.map((s) => ({
      index: s.index,
      code: s.id,
      name: s.label,
      status: 'queue',
    }))
  );
  const [currentServerIndex, setCurrentServerIndex] = useState<number>(
    Math.max(0, Math.min(PLAYER_SERVERS.length - 1, initialServer))
  );
  const [showServersOverlay, setShowServersOverlay] = useState<boolean>(false);

  // Playback state
  const [canPlay, setCanPlay] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);
  const [waiting, setWaiting] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [bufferedEnd, setBufferedEnd] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [muted, setMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [pausedIdleOverlay, setPausedIdleOverlay] = useState<boolean>(false);

  // Seekbar hover state
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  // Skip animation state (-10s / +10s)
  const [skipFeedback, setSkipFeedback] = useState<{
    dir: 'left' | 'right';
    amount: number;
  } | null>(null);
  const skipTimerRef = useRef<number | null>(null);

  // Settings menu state matching lK component
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<string>('main');
  const [selectedDub, setSelectedDub] = useState<string>(dubLang.toLowerCase());
  const [selectedDubType, setSelectedDubType] = useState<string>('0');
  const [availableDubs, setAvailableDubs] = useState<RawOrionDub[]>([]);
  const [usingExternalDub, setUsingExternalDub] = useState<boolean>(false);
  const [loadingDub, setLoadingDub] = useState<boolean>(false);
  const [dubFallbackNotice, setDubFallbackNotice] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [brightness, setBrightness] = useState<number>(100);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [rotation, setRotation] = useState<number>(0);
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [sleepTimer, setSleepTimer] = useState<number>(0);

  // Quality & Audio tracks
  const [qualities, setQualities] = useState<{ index: number; height: number }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1);
  const [audioTracks, setAudioTracks] = useState<{ id: number; label: string; lang?: string }[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(0);

  // Subtitles state matching lz component
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [dualSubtitle, setDualSubtitle] = useState<string | null>(null);
  const [subtitleSearch, setSubtitleSearch] = useState<string>('');
  const [subtitleModalOpen, setSubtitleModalOpen] = useState<boolean>(false);
  const [subFontSize, setSubFontSize] = useState<number>(22);
  const [subTextColor, setSubTextColor] = useState<string>('#ffffff');
  const [subBgOpacity, setSubBgOpacity] = useState<number>(60);
  const [subPosition, setSubPosition] = useState<number>(85);
  const [subTimeOffset, setSubTimeOffset] = useState<number>(0);
  const [activeCueText, setActiveCueText] = useState<string>('');
  const [parsedCues, setParsedCues] = useState<{ start: number; end: number; text: string }[]>([]);

  // TV Episodes drawer & season episode cache matching uq component
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [selectedSeasonForDrawer, setSelectedSeasonForDrawer] = useState<number>(initialSeason || 1);
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, EpisodeItem[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);

  // Deterministic Skip Intro, Skip Recap, Skip Outro & Next Episode state (TheIntroDB v4 + rule-based)
  const [apiEpisodeTiming, setApiEpisodeTiming] = useState<EpisodeTimingMetadata | null>(null);
  const [skippedIntro, setSkippedIntro] = useState<boolean>(false);
  const [skippedRecap, setSkippedRecap] = useState<boolean>(false);
  const [skippedOutro, setSkippedOutro] = useState<boolean>(false);
  const [videoEnded, setVideoEnded] = useState<boolean>(false);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(autoplay);
  const [countdownCancelled, setCountdownCancelled] = useState<boolean>(false);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const hasTriggeredNextRef = useRef<boolean>(false);

  // Rotating hint index matching dr component
  const [hintIndex, setHintIndex] = useState<number>(0);

  // Ref for sequential server probing cancellation
  const probeRunIdRef = useRef<number>(0);

  const normalizedColor = `#${accentColor.replace(/^#/, '') || 'e11d48'}`;

  // Rotate loading hints every 6 seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIndex((prev) => (prev + 1) % PLAYER_HINTS.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  // Sync props when parent changes season/episode/mediaType/autoplay
  useEffect(() => {
    setActiveMediaType(initialMediaType);
  }, [initialMediaType]);

  useEffect(() => {
    setCurrentSeason(initialSeason || 1);
    setSelectedSeasonForDrawer(initialSeason || 1);
  }, [initialSeason]);

  useEffect(() => {
    setCurrentEpisode(initialEpisode || 1);
  }, [initialEpisode]);

  useEffect(() => {
    setAutoPlayNext(autoplay);
  }, [autoplay]);

  useEffect(() => {
    setSelectedDub(dubLang.toLowerCase());
    setSelectedDubType('0');
  }, [dubLang]);

  const pendingSkipSeekRef = useRef<boolean>(false);
  const isProgrammaticSkipRef = useRef<boolean>(false);
  const lastReportedTimeRef = useRef<number>(0);
  const activeEpisodeKeyRef = useRef<string>('');
  const seekCleanupRef = useRef<(() => void) | null>(null);

  // Reset episode-scoped skip/countdown states whenever media or episode changes
  useEffect(() => {
    if (seekCleanupRef.current) {
      seekCleanupRef.current();
      seekCleanupRef.current = null;
    }
    pendingSkipSeekRef.current = false;
    isProgrammaticSkipRef.current = false;
    lastReportedTimeRef.current = 0;
    hasTriggeredNextRef.current = false;
    setApiEpisodeTiming(null);
    setSkippedIntro(false);
    setSkippedRecap(false);
    setSkippedOutro(false);
    setVideoEnded(false);
    setCountdownCancelled(false);
    setNextCountdown(null);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
  }, [tmdbId, activeMediaType, currentSeason, currentEpisode]);

  // Reset season cache when switching series
  useEffect(() => {
    setEpisodesBySeason({});
  }, [tmdbId]);

  const selectedDubTypeRef = useRef<string>(selectedDubType);
  selectedDubTypeRef.current = selectedDubType;

  const availableDubsRef = useRef<RawOrionDub[]>(availableDubs);
  availableDubsRef.current = availableDubs;

  const usingExternalDubRef = useRef<boolean>(usingExternalDub);
  usingExternalDubRef.current = usingExternalDub;

  const mutedRef = useRef<boolean>(muted);
  mutedRef.current = muted;

  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  const dubRequestIdRef = useRef<number>(0);
  const lastDriftSyncTimeRef = useRef<number>(0);
  const dubFallbackTimerRef = useRef<number | null>(null);

  const showDubFallbackBanner = useCallback((message: string) => {
    setDubFallbackNotice(message);
    if (dubFallbackTimerRef.current) {
      window.clearTimeout(dubFallbackTimerRef.current);
    }
    dubFallbackTimerRef.current = window.setTimeout(() => {
      setDubFallbackNotice(null);
    }, 4000);
  }, []);

  const cleanupDubAudioEngine = useCallback(() => {
    if (dubDashRef.current) {
      try {
        dubDashRef.current.reset();
      } catch {
        // ignore
      }
      dubDashRef.current = null;
    }
    if (dubAudioRef.current) {
      dubAudioRef.current.pause();
      dubAudioRef.current.removeAttribute('src');
      dubAudioRef.current.load();
    }
    usingExternalDubRef.current = false;
    setUsingExternalDub(false);
    setLoadingDub(false);
  }, []);

  const cleanupMediaEngines = useCallback(() => {
    cleanupDubAudioEngine();
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // ignore
      }
      hlsRef.current = null;
    }
    if (dashRef.current) {
      try {
        dashRef.current.reset();
      } catch {
        // ignore
      }
      dashRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
  }, [cleanupDubAudioEngine]);

  useEffect(() => {
    return () => cleanupMediaEngines();
  }, [cleanupMediaEngines]);

  // 1. Fetch TMDB Metadata from /api/tmdb/details/:mediaType/:tmdbId (with automatic movie<->tv fallback)
  useEffect(() => {
    const cleanId = tmdbId.trim();
    if (!cleanId) return;

    let cancelled = false;
    setMetadata(null);
    setMetadataError(null);
    setCanPlay(false);
    setPlaying(false);

    fetch(`/api/tmdb/details/${ initialMediaType }/${encodeURIComponent(cleanId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`No media found for TMDB ID ${cleanId}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const raw = json?.data || json;
        if (!raw || (!raw.title && !raw.name)) {
          throw new Error(`No media found for TMDB ID ${cleanId}`);
        }
        const resolvedType: MediaType =
          raw.resolvedMediaType === 'tv' || raw.media_type === 'tv' || (!raw.title && raw.name)
            ? 'tv'
            : 'movie';

        if (resolvedType !== activeMediaType) {
          setActiveMediaType(resolvedType);
          onMediaTypeResolved?.(resolvedType);
        }

        const releaseStr = raw.release_date || raw.first_air_date || '';
        const year = releaseStr ? String(releaseStr).slice(0, 4) : '';
        const backdropPaths: string[] = Array.isArray(raw.backdrop_paths)
          ? raw.backdrop_paths
          : raw.backdrop_path
          ? [raw.backdrop_path]
          : [];
        const logoPaths: string[] = Array.isArray(raw.logo_paths)
          ? raw.logo_paths
          : raw.logo_path
          ? [raw.logo_path]
          : [];
        const genres: string[] = Array.isArray(raw.genres)
          ? raw.genres.map((g: { name?: string } | string) =>
              typeof g === 'string' ? g : g?.name || ''
            ).filter(Boolean)
          : [];
        const seasons: TmdbSeasonSummary[] = Array.isArray(raw.seasons)
          ? raw.seasons.filter((s: TmdbSeasonSummary) => s.season_number > 0)
          : [];

        setMetadata({
          id: Number(raw.id || cleanId),
          mediaType: resolvedType,
          title: raw.title || raw.name || `TMDB #${cleanId}`,
          year,
          releaseDate: releaseStr,
          lastAirDate: raw.last_air_date || '',
          imdbId: raw.imdb_id || '',
          backdropPaths,
          logoPaths,
          genres,
          status: raw.status || 'Released',
          seasons,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setMetadataError(err instanceof Error ? err.message : 'Failed to load TMDB metadata');
      });

    return () => {
      cancelled = true;
    };
  }, [tmdbId, initialMediaType]);

  // 2. Fetch Subtitles from /api/subtitles/resolve when metadata is ready
  useEffect(() => {
    if (!metadata) return;
    let cancelled = false;
    fetch('/api/subtitles/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId: metadata.id,
        imdbId: metadata.imdbId,
        mediaType: metadata.mediaType,
        season: metadata.mediaType === 'tv' ? currentSeason : undefined,
        episode: metadata.mediaType === 'tv' ? currentEpisode : undefined,
      }),
    })
      .then((r) => (r.ok ? r.json() : { subtitles: [] }))
      .then((data) => {
        if (cancelled) return;
        const list: SubtitleTrack[] = Array.isArray(data?.subtitles) ? data.subtitles : [];
        setSubtitles(list);
      })
      .catch(() => {
        if (!cancelled) setSubtitles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [metadata, currentSeason, currentEpisode]);

  // 3. Load and parse selected subtitle VTT/SRT
  useEffect(() => {
    if (!selectedSubtitle) {
      setParsedCues([]);
      setActiveCueText('');
      return;
    }
    const track = subtitles.find((s) => s.language === selectedSubtitle);
    if (!track?.url) return;

    let cancelled = false;
    fetch(`/api/stream/proxy?url=${encodeURIComponent(track.url)}`)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const cues: { start: number; end: number; text: string }[] = [];
        const blocks = text.replace(/\r\n/g, '\n').split(/\n\n+/);
        const parseTime = (t: string) => {
          const clean = t.trim().replace(',', '.');
          const parts = clean.split(':');
          if (parts.length === 3) {
            return (
              Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number.parseFloat(parts[2] || '0')
            );
          }
          if (parts.length === 2) {
            return Number(parts[0]) * 60 + Number.parseFloat(parts[1] || '0');
          }
          return 0;
        };
        for (const block of blocks) {
          const lines = block.trim().split('\n');
          const timeIdx = lines.findIndex((l) => l.includes('-->'));
          if (timeIdx !== -1) {
            const [sStr, eStr] = lines[timeIdx].split('-->');
            const start = parseTime(sStr);
            const end = parseTime((eStr || '').split(' ')[0]);
            const cueText = lines
              .slice(timeIdx + 1)
              .join('\n')
              .replace(/<[^>]+>/g, '')
              .trim();
            if (cueText) cues.push({ start, end, text: cueText });
          }
        }
        setParsedCues(cues);
      })
      .catch(() => {
        if (!cancelled) setParsedCues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubtitle, subtitles]);

  useEffect(() => {
    if (!parsedCues.length) {
      setActiveCueText('');
      return;
    }
    const adjusted = currentTime - subTimeOffset;
    const hit = parsedCues.find((c) => adjusted >= c.start && adjusted <= c.end);
    setActiveCueText(hit ? hit.text : '');
  }, [currentTime, parsedCues, subTimeOffset]);

  // 4. Fetch TV Season Episodes for active playing season, drawer season, and next season (for season finales)
  useEffect(() => {
    if (!metadata || metadata.mediaType !== 'tv') return;
    const nextSeasonObj = metadata.seasons?.find((s) => s.season_number === currentSeason + 1);
    const seasonsToFetch = Array.from(
      new Set(
        [
          currentSeason,
          selectedSeasonForDrawer,
          nextSeasonObj ? nextSeasonObj.season_number : null,
        ].filter((n): n is number => typeof n === 'number' && n > 0)
      )
    );
    let cancelled = false;

    for (const sNum of seasonsToFetch) {
      if (episodesBySeason[sNum] && episodesBySeason[sNum].length > 0) continue;
      if (sNum === selectedSeasonForDrawer) {
        setLoadingEpisodes(true);
      }
      fetch(`/api/tmdb/season/${metadata.id}/season/${sNum}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json) return;
          const eps: EpisodeItem[] = Array.isArray(json?.data?.episodes)
            ? json.data.episodes
            : Array.isArray(json?.episodes)
            ? json.episodes
            : [];
          if (eps.length > 0) {
            setEpisodesBySeason((prev) => ({ ...prev, [sNum]: eps }));
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled && sNum === selectedSeasonForDrawer) {
            setLoadingEpisodes(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [metadata, currentSeason, selectedSeasonForDrawer, episodesBySeason]);

  // 4b. Fetch deterministic timing metadata from TheIntroDB v4 /api/intro when media or episode changes
  const durationCluster = duration > 0 ? Math.round(duration / 30) * 30 : 0;
  useEffect(() => {
    const resolvedMediaType = metadata?.mediaType ?? activeMediaType;
    const resolvedId = String(metadata?.id ?? tmdbId).trim();
    if (!resolvedId) {
      setApiEpisodeTiming(null);
      return;
    }
    const requestEpisodeKey =
      resolvedMediaType === 'tv'
        ? `${resolvedId}:${currentSeason}:${currentEpisode}`
        : `movie:${resolvedId}`;
    let cancelled = false;

    const qs = new URLSearchParams({
      tmdbId: resolvedId,
      mediaType: resolvedMediaType,
    });
    if (resolvedMediaType === 'tv') {
      qs.set('season', String(currentSeason));
      qs.set('episode', String(currentEpisode));
    }
    if (metadata?.imdbId) qs.set('imdbId', metadata.imdbId);
    if (duration > 0) {
      qs.set('durationMs', String(Math.round(duration * 1000)));
      qs.set('durationSec', String(Math.round(duration)));
    }

    fetch(`/api/intro?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          const matchesRequestedEpisode =
            resolvedMediaType === 'movie' ||
            ((data.season === undefined || Number(data.season) === currentSeason) &&
              (data.episode === undefined || Number(data.episode) === currentEpisode));
          if (matchesRequestedEpisode) {
            setApiEpisodeTiming({
              ...data,
              episodeKey: requestEpisodeKey,
              tmdbId: resolvedId,
              season: resolvedMediaType === 'tv' ? currentSeason : undefined,
              episode: resolvedMediaType === 'tv' ? currentEpisode : undefined,
            });
          } else {
            setApiEpisodeTiming(null);
          }
        } else {
          setApiEpisodeTiming(null);
        }
      })
      .catch(() => {
        if (!cancelled) setApiEpisodeTiming(null);
      });

    return () => {
      cancelled = true;
    };
  }, [
    tmdbId,
    activeMediaType,
    metadata?.id,
    metadata?.mediaType,
    metadata?.imdbId,
    currentSeason,
    currentEpisode,
    durationCluster,
  ]);

  // 5. Sequential Server Probing & Playback Engine (exact match to zxcstream.cc u2 + dashjs/hlsjs failover)
  const updateServerStatus = useCallback((idx: number, status: ServerProbeStatus) => {
    setServers((prev) =>
      prev.map((srv, i) => (i === idx ? { ...srv, status } : srv))
    );
  }, []);

  const probeServerAtIndex = useCallback(
    async (serverIdx: number, runId: number, meta: TmdbMetadata, dubCodeToUse: string) => {
      if (probeRunIdRef.current !== runId) return;
      if (serverIdx >= PLAYER_SERVERS.length) return;

      const serverDef = PLAYER_SERVERS[serverIdx];
      setCurrentServerIndex(serverIdx);
      updateServerStatus(serverIdx, 'checking');
      cleanupMediaEngines();
      setCanPlay(false);
      setPlaying(false);

      const allowHevc = canPlayHevcInBrowser();

      const advanceToNextServer = () => {
        if (probeRunIdRef.current !== runId) return;
        updateServerStatus(serverIdx, 'failed');
        cleanupMediaEngines();
        // Find next server in queue
        const nextIdx = (serverIdx + 1) % PLAYER_SERVERS.length;
        setServers((prev) => {
          const nextServer = prev[nextIdx];
          if (nextServer && nextServer.status === 'queue') {
            window.setTimeout(() => {
              probeServerAtIndex(nextIdx, runId, meta, dubCodeToUse);
            }, 350);
          }
          return prev;
        });
      };

      try {
        const res = await fetch('/api/stream/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId: String(meta.id),
            mediaType: meta.mediaType,
            season: meta.mediaType === 'tv' ? currentSeason : 1,
            episode: meta.mediaType === 'tv' ? currentEpisode : 1,
            title: meta.title,
            year: meta.year,
            date: meta.releaseDate,
            lastAirDate: meta.lastAirDate,
            imdbId: meta.imdbId,
            dubCode: serverIdx === 0 ? dubCodeToUse : '',
            dubType: serverIdx === 0 && dubCodeToUse ? selectedDubTypeRef.current : '',
            preferredServer: serverDef.id,
            strictSingleServer: true,
            allowHevc,
          }),
        });

        if (probeRunIdRef.current !== runId) return;
        const data = await res.json();
        if (Array.isArray(data?.dubs) && data.dubs.length > 0) {
          setAvailableDubs(data.dubs);
        }
        if (!res.ok || !data?.success || !data?.link) {
          advanceToNextServer();
          return;
        }

        // Server found a candidate stream -> transition to 'connecting' (backdrop turns color!)
        updateServerStatus(serverIdx, 'connecting');
        loadedStreamDubRef.current = serverIdx === 0 ? dubCodeToUse.toLowerCase() : '';

        const videoEl = videoRef.current;
        if (!videoEl) return;

        const streamUrl: string = data.link;
        const streamType: string = data.type || 'hls';

        if (streamType === 'dash' || streamType === 'andromeda') {
          const player = dashjs.MediaPlayer().create();
          dashRef.current = player;
          player.updateSettings({
            streaming: {
              buffer: { fastSwitchEnabled: true },
              abr: { autoSwitchBitrate: { video: true, audio: true } },
            },
          });
          player.initialize(videoEl, streamUrl, autoplay);

          player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            if (probeRunIdRef.current !== runId) return;
            const videoReps = player.getRepresentationsByType('video') || [];
            if (!videoReps.length) {
              // Browser MSE cannot decode this codec (e.g., HEVC on Chromium) -> fail over to next server!
              advanceToNextServer();
              return;
            }
            const qList = videoReps
              .map((rep: { height?: number }, idx: number) => ({
                index: idx,
                height: rep.height || 0,
              }))
              .filter((q: { height: number }) => q.height > 0);
            setQualities(qList);

            const aTracks = (player.getTracksFor('audio') || []) as any[];
            setAudioTracks(
              aTracks.map((t: any, i: number) => ({
                id: i,
                label: t.labels?.[0]?.text || t.lang || `Audio ${i + 1}`,
                lang: t.lang || undefined,
              }))
            );
          });

          player.on(dashjs.MediaPlayer.events.ERROR, () => {
            if (probeRunIdRef.current !== runId) return;
            advanceToNextServer();
          });
        } else if (streamType === 'hls' || streamUrl.includes('.m3u8') || streamUrl.includes('/api/stream/proxy')) {
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              maxBufferLength: 30,
            });
            hlsRef.current = hls;
            hls.loadSource(streamUrl);
            hls.attachMedia(videoEl);

            hls.on(Hls.Events.MANIFEST_PARSED, (_e, manifestData) => {
              if (probeRunIdRef.current !== runId) return;
              const qList = manifestData.levels
                .map((lvl, idx) => ({ index: idx, height: lvl.height || 0 }))
                .filter((q) => q.height > 0);
              setQualities(qList);
              if (autoplay) {
                videoEl.play().catch(() => {
                  // Autoplay muted fallback if browser policy blocks unmuted autoplay
                  videoEl.muted = true;
                  setMuted(true);
                  videoEl.play().catch(() => {});
                });
              }
            });

            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, audioData) => {
              setAudioTracks(
                audioData.audioTracks.map((t, idx) => ({
                  id: idx,
                  label: t.name || t.lang || `Track ${idx + 1}`,
                  lang: t.lang,
                }))
              );
            });

            hls.on(Hls.Events.ERROR, (_e, errData) => {
              if (probeRunIdRef.current !== runId) return;
              if (errData.fatal) {
                advanceToNextServer();
              }
            });
          } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = streamUrl;
            if (autoplay) {
              videoEl.play().catch(() => {});
            }
          } else {
            advanceToNextServer();
          }
        } else {
          videoEl.src = streamUrl;
          if (autoplay) {
            videoEl.play().catch(() => {});
          }
        }
      } catch {
        advanceToNextServer();
      }
    },
    [autoplay, cleanupMediaEngines, currentEpisode, currentSeason, updateServerStatus]
  );

  // Trigger server probing when metadata, season, or episode changes
  const initialDubRef = useRef<string>(selectedDub);
  initialDubRef.current = selectedDub;

  useEffect(() => {
    if (!metadata) return;
    setAvailableDubs([]);
    const runId = ++probeRunIdRef.current;
    const startIdx = Math.max(0, Math.min(PLAYER_SERVERS.length - 1, initialServer));
    setServers(
      PLAYER_SERVERS.map((s) => ({
        index: s.index,
        code: s.id,
        name: s.label,
        status: 'queue',
      }))
    );
    probeServerAtIndex(startIdx, runId, metadata, initialDubRef.current);

    // If starting on a server other than Orion (0), still fetch Orion's available dubs list in background
    if (startIdx !== 0) {
      fetch('/api/stream/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: String(metadata.id),
          mediaType: metadata.mediaType,
          season: metadata.mediaType === 'tv' ? currentSeason : 1,
          episode: metadata.mediaType === 'tv' ? currentEpisode : 1,
          title: metadata.title,
          year: metadata.year,
          date: metadata.releaseDate,
          lastAirDate: metadata.lastAirDate,
          imdbId: metadata.imdbId,
          preferredServer: 'orion',
          strictSingleServer: true,
          allowHevc: true,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (Array.isArray(d?.dubs) && d.dubs.length > 0) {
            setAvailableDubs(d.dubs);
          }
        })
        .catch(() => {});
    }

    return () => {
      probeRunIdRef.current++;
    };
  }, [metadata, currentSeason, currentEpisode, initialServer, probeServerAtIndex]);

  // Synchronize external Dub Audio stream (from Orion /api/stream/mpd-audio) whenever selectedDub differs from the loaded video's audio
  useEffect(() => {
    if (!canPlay || !metadata) return;
    const effective = resolveEffectiveDubSelection(selectedDub, availableDubsRef.current);
    const normalizedLoaded = loadedStreamDubRef.current.trim().toLowerCase();

    // If the user selected Original Audio (and loaded video is Original) or the loaded video already has this exact dub baked in
    if (
      (effective.isOriginal && normalizedLoaded === '') ||
      (!effective.isOriginal && effective.dubCode === normalizedLoaded)
    ) {
      cleanupDubAudioEngine();
      if (videoRef.current) {
        videoRef.current.muted = mutedRef.current;
        videoRef.current.volume = volumeRef.current;
      }
      return;
    }

    let cancelled = false;
    const reqId = ++dubRequestIdRef.current;
    let readyTimeoutId: number | null = null;
    setLoadingDub(true);

    const fallbackToNativeAudio = (noticeMsg: string) => {
      if (cancelled || dubRequestIdRef.current !== reqId) return;
      if (readyTimeoutId) {
        window.clearTimeout(readyTimeoutId);
        readyTimeoutId = null;
      }
      cleanupDubAudioEngine();
      if (videoRef.current) {
        videoRef.current.muted = mutedRef.current;
        videoRef.current.volume = volumeRef.current;
      }
      setSelectedDub(loadedStreamDubRef.current || '');
      setSelectedDubType('0');
      showDubFallbackBanner(noticeMsg);
    };

    fetch('/api/stream/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId: String(metadata.id),
        mediaType: metadata.mediaType,
        season: metadata.mediaType === 'tv' ? currentSeason : 1,
        episode: metadata.mediaType === 'tv' ? currentEpisode : 1,
        title: metadata.title,
        year: metadata.year,
        date: metadata.releaseDate,
        lastAirDate: metadata.lastAirDate,
        imdbId: metadata.imdbId,
        dubCode: effective.dubCode,
        dubType: effective.dubType,
        preferredServer: 'orion',
        strictSingleServer: true,
        allowHevc: true,
      }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, data };
      })
      .then(({ ok, data }) => {
        if (cancelled || dubRequestIdRef.current !== reqId) return;
        if (
          Array.isArray(data?.dubs) &&
          data.dubs.length > 0 &&
          availableDubsRef.current.length === 0
        ) {
          setAvailableDubs(data.dubs);
        }
        const dubMpdUrl: string | null = data?.dubAudioUrl || data?.link || null;
        const audioEl = dubAudioRef.current;
        const videoEl = videoRef.current;
        if (!ok || !data?.success || !dubMpdUrl || !audioEl || !videoEl) {
          fallbackToNativeAudio(
            `${effective.displayLabel} audio is unavailable — playing Original Audio`
          );
          return;
        }

        if (dubDashRef.current) {
          try {
            dubDashRef.current.reset();
          } catch {
            // ignore
          }
          dubDashRef.current = null;
        }

        const audioOnlyManifestUrl = `/api/stream/mpd-audio?url=${encodeURIComponent(dubMpdUrl)}`;
        const audioPlayer = dashjs.MediaPlayer().create();
        dubDashRef.current = audioPlayer;
        audioPlayer.updateSettings({
          streaming: {
            buffer: { fastSwitchEnabled: true },
            abr: { autoSwitchBitrate: { audio: true } },
          },
        });

        let activated = false;
        const activateExternalDub = () => {
          if (cancelled || dubRequestIdRef.current !== reqId || activated) return;
          activated = true;
          if (readyTimeoutId) {
            window.clearTimeout(readyTimeoutId);
            readyTimeoutId = null;
          }
          audioEl.removeEventListener('loadeddata', onAudioCanPlay);
          audioEl.removeEventListener('canplay', onAudioCanPlay);
          audioEl.removeEventListener('playing', onAudioCanPlay);
          audioEl.removeEventListener('timeupdate', onAudioCanPlay);

          usingExternalDubRef.current = true;
          setUsingExternalDub(true);
          setLoadingDub(false);
          lastDriftSyncTimeRef.current = performance.now();

          audioEl.playbackRate = videoEl.playbackRate || 1;
          audioEl.volume = volumeRef.current;
          audioEl.muted = mutedRef.current;
          videoEl.muted = true;

          if (Math.abs(audioEl.currentTime - videoEl.currentTime) > 0.35) {
            try {
              audioEl.currentTime = videoEl.currentTime;
            } catch {
              // ignore
            }
          }
          if (!videoEl.paused) {
            audioEl.play().catch(() => {});
          } else {
            audioEl.pause();
          }
        };

        const onAudioCanPlay = () => {
          if (audioEl.readyState >= 2) {
            activateExternalDub();
          }
        };

        audioEl.addEventListener('loadeddata', onAudioCanPlay);
        audioEl.addEventListener('canplay', onAudioCanPlay);
        audioEl.addEventListener('playing', onAudioCanPlay);
        audioEl.addEventListener('timeupdate', onAudioCanPlay);

        const startTime = Math.max(0, videoEl.currentTime || 0);
        // Keep auxiliary audio muted while initial segment buffers so there is no blip before sync
        audioEl.muted = true;
        audioPlayer.initialize(audioEl, audioOnlyManifestUrl, true, startTime);

        readyTimeoutId = window.setTimeout(() => {
          if (!activated) {
            audioEl.removeEventListener('loadeddata', onAudioCanPlay);
            audioEl.removeEventListener('canplay', onAudioCanPlay);
            audioEl.removeEventListener('playing', onAudioCanPlay);
            audioEl.removeEventListener('timeupdate', onAudioCanPlay);
            fallbackToNativeAudio(
              `${effective.displayLabel} audio timed out — playing Original Audio`
            );
          }
        }, 12000);

        audioPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          if (cancelled || dubRequestIdRef.current !== reqId) return;
          const targetTime = videoEl.currentTime || startTime;
          if (Math.abs(audioEl.currentTime - targetTime) > 0.5) {
            try {
              audioEl.currentTime = targetTime;
            } catch {
              // ignore
            }
          }
          if (audioEl.readyState >= 2) {
            activateExternalDub();
          }
        });

        audioPlayer.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
          if (cancelled || dubRequestIdRef.current !== reqId) return;
          activateExternalDub();
        });

        audioPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: { error?: { code?: number; message?: string } }) => {
          if (cancelled || dubRequestIdRef.current !== reqId) return;
          audioEl.removeEventListener('loadeddata', onAudioCanPlay);
          audioEl.removeEventListener('canplay', onAudioCanPlay);
          audioEl.removeEventListener('playing', onAudioCanPlay);
          audioEl.removeEventListener('timeupdate', onAudioCanPlay);
          if (e?.error) {
            fallbackToNativeAudio(
              `${effective.displayLabel} audio failed to load — playing Original Audio`
            );
          }
        });
      })
      .catch(() => {
        if (!cancelled && dubRequestIdRef.current === reqId) {
          fallbackToNativeAudio(
            `${effective.displayLabel} audio is unavailable — playing Original Audio`
          );
        }
      });

    return () => {
      cancelled = true;
      if (readyTimeoutId) {
        window.clearTimeout(readyTimeoutId);
      }
    };
  }, [
    canPlay,
    metadata,
    currentSeason,
    currentEpisode,
    selectedDub,
    selectedDubType,
    cleanupDubAudioEngine,
    showDubFallbackBanner,
  ]);

  // Manual server switch from user clicking a server in the right-side carousel
  const handleManualServerSelect = (idx: number) => {
    if (!metadata) return;
    const runId = ++probeRunIdRef.current;
    setServers((prev) =>
      prev.map((s, i) => ({
        ...s,
        status: i === idx ? 'checking' : s.status === 'available' ? 'queue' : s.status,
      }))
    );
    probeServerAtIndex(idx, runId, metadata, selectedDub);
  };

  // Auto-hide controls after 3s of mouse inactivity during playback
  useEffect(() => {
    if (!canPlay || !playing || settingsOpen || showServersOverlay || showEpisodeDrawer) {
      setControlsVisible(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [canPlay, playing, controlsVisible, settingsOpen, showServersOverlay, showEpisodeDrawer]);

  // Show paused cinematic overlay (u7) after 4s of being paused while canPlay is true
  useEffect(() => {
    if (!canPlay || playing || settingsOpen || showServersOverlay || showEpisodeDrawer) {
      setPausedIdleOverlay(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setPausedIdleOverlay(true);
      setControlsVisible(false);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [canPlay, playing, settingsOpen, showServersOverlay, showEpisodeDrawer]);

  const wakeControls = () => {
    setControlsVisible(true);
    setPausedIdleOverlay(false);
  };

  // Skip -10s / +10s handler with visual overlay
  const handleSkip = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const nextTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + seconds));
    v.currentTime = nextTime;
    if (dubAudioRef.current) {
      dubAudioRef.current.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
    if (v.duration && nextTime < v.duration - 1) {
      setVideoEnded(false);
    }
    lastReportedTimeRef.current = nextTime;
    if (seconds < 0) {
      setSkippedIntro(false);
      setSkippedOutro(false);
    }
    const dir = seconds < 0 ? 'left' : 'right';
    setSkipFeedback((prev) => ({
      dir,
      amount: prev && prev.dir === dir ? prev.amount + Math.abs(seconds) : Math.abs(seconds),
    }));
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current);
    skipTimerRef.current = window.setTimeout(() => {
      setSkipFeedback(null);
    }, 650);
  }, []);

  // Keyboard shortcuts matching zxcstream.cc player
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!canPlay) return;
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play().catch(() => {});
          else videoRef.current.pause();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canPlay, handleSkip]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !canPlay) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !muted;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (usingExternalDubRef.current && dubAudioRef.current) {
      dubAudioRef.current.muted = nextMuted;
      v.muted = true;
    } else {
      v.muted = nextMuted;
    }
  };

  const handleVolumeChange = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, val));
    volumeRef.current = clamped;
    mutedRef.current = clamped === 0;
    setVolume(clamped);
    setMuted(clamped === 0);
    if (usingExternalDubRef.current && dubAudioRef.current) {
      dubAudioRef.current.volume = clamped;
      dubAudioRef.current.muted = clamped === 0;
      v.muted = true;
    } else {
      v.volume = clamped;
      v.muted = clamped === 0;
    }
  };

  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleOrientationOrResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleOrientationOrResize);
    window.addEventListener('orientationchange', handleOrientationOrResize);
    return () => {
      window.removeEventListener('resize', handleOrientationOrResize);
      window.removeEventListener('orientationchange', handleOrientationOrResize);
    };
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    const isIos =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;

    if (isIos && videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
      try {
        (videoRef.current as any).webkitEnterFullscreen();
        return;
      } catch {
        // fallback to standard fullscreen
      }
    }

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        } else if ((el as any).webkitEnterFullscreen) {
          await (el as any).webkitEnterFullscreen();
        } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } catch {
        if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          try {
            (videoRef.current as any).webkitEnterFullscreen();
          } catch {
            // ignore
          }
        }
      }

      // Automatically lock orientation to landscape
      try {
        const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        } else if ((screen as any).lockOrientation) {
          (screen as any).lockOrientation('landscape');
        } else if ((screen as any).webkitLockOrientation) {
          (screen as any).webkitLockOrientation('landscape');
        }
      } catch {
        // Fallback handled via CSS .player-fullscreen-landscape-force
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch {
        // ignore
      }

      // Unlock orientation
      try {
        const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        } else if ((screen as any).unlockOrientation) {
          (screen as any).unlockOrientation();
        } else if ((screen as any).webkitUnlockOrientation) {
          (screen as any).webkitUnlockOrientation();
        }
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (isFs) {
        try {
          const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
          if (orientation && typeof orientation.lock === 'function') {
            orientation.lock('landscape').catch(() => {});
          }
        } catch {
          // ignore
        }
      } else {
        try {
          const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
          if (orientation && typeof orientation.unlock === 'function') {
            orientation.unlock();
          }
        } catch {
          // ignore
        }
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Seekbar interaction (oX component)
  const handleSeekBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current || !duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPercent(pct * 100);
    setHoverTime(pct * duration);
  };

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current || !videoRef.current || !duration) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pct * duration;
    videoRef.current.currentTime = target;
    if (dubAudioRef.current) {
      dubAudioRef.current.currentTime = target;
    }
    setCurrentTime(target);
    lastReportedTimeRef.current = target;
    if (target < duration - 1) {
      setVideoEnded(false);
    }
    setSkippedIntro(false);
    setSkippedRecap(false);
    setSkippedOutro(false);
  };

  // Quality change handler
  const handleSelectQuality = (qIdx: number) => {
    setSelectedQuality(qIdx);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qIdx;
    } else if (dashRef.current) {
      if (qIdx === -1) {
        dashRef.current.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: true } } },
        });
      } else {
        dashRef.current.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: false } } },
        });
        dashRef.current.setRepresentationForTypeByIndex('video', qIdx);
      }
    }
    setSettingsTab('main');
  };

  // Embedded Audio Track change handler (for multi-audio HLS/DASH streams)
  const handleSelectAudioTrack = (trackId: number) => {
    setSelectedAudioTrack(trackId);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    } else if (dashRef.current) {
      const tracks = dashRef.current.getTracksFor('audio') || [];
      if (tracks[trackId]) {
        dashRef.current.setCurrentTrack(tracks[trackId]);
      }
    }
    setSettingsTab('main');
  };

  // Dub language selection handler
  const handleSelectDub = (langCode: string, dubTypeVal: number | string = 0) => {
    const cleanCode = langCode.trim().toLowerCase();
    setDubFallbackNotice(null);
    // Selecting a dub is a direct user interaction: if autoplay policy muted initial load, unmute so audio is heard
    if (mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
    }
    if (volumeRef.current <= 0) {
      volumeRef.current = 1;
      setVolume(1);
    }
    if (dubAudioRef.current) {
      dubAudioRef.current.muted = false;
      dubAudioRef.current.volume = volumeRef.current;
    }
    setSelectedDub(cleanCode);
    setSelectedDubType(String(dubTypeVal ?? 0));
    setSettingsTab('main');
  };

  // Playback speed change handler
  const handleSelectSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    if (dubAudioRef.current) {
      dubAudioRef.current.playbackRate = rate;
    }
    setSettingsTab('main');
  };

  // Active server status for loading backdrop grayscale vs color transition
  const activeServerObj = servers[currentServerIndex] || servers[0];
  const activeServerStatus = activeServerObj?.status || 'checking';
  const backdropPath = metadata?.backdropPaths?.[0] || null;
  const logoPath = metadata?.logoPaths?.[0] || null;
  const genreLabel = metadata?.genres?.[0] || (activeMediaType === 'tv' ? 'Drama' : 'Feature');
  const statusLabel = metadata?.status || 'Released';

  // Active season episodes & drawer episodes
  const currentSeasonEpisodes: EpisodeItem[] = episodesBySeason[currentSeason] || [];
  const nextSeasonEpisodes: EpisodeItem[] = episodesBySeason[currentSeason + 1] || [];
  const seasonEpisodes: EpisodeItem[] = episodesBySeason[selectedSeasonForDrawer] || [];

  const resolvedSeriesId = String(metadata?.id ?? tmdbId).trim();
  const activeEpisodeKey = `${resolvedSeriesId}:${currentSeason}:${currentEpisode}`;
  activeEpisodeKeyRef.current = activeEpisodeKey;

  // Deterministic Next Episode resolution (strictly TV series with a valid next episode)
  const nextEpisodeInfo = resolveNextEpisode({
    mediaType: activeMediaType,
    tmdbId: resolvedSeriesId,
    currentSeason,
    currentEpisode,
    currentSeasonEpisodes,
    nextSeasonEpisodes,
    seasons: metadata?.seasons,
  });

  // Strictly match /api/intro response to the exact currently loaded episodeKey
  const matchedApiTiming =
    apiEpisodeTiming && apiEpisodeTiming.episodeKey === activeEpisodeKey
      ? apiEpisodeTiming
      : null;

  const currentEpisodeRecord =
    currentSeasonEpisodes.find((ep) => ep.episode_number === currentEpisode) || null;
  const catalogTiming = getEpisodeTimingMetadata(
    resolvedSeriesId,
    currentSeason,
    currentEpisode,
    activeMediaType
  );
  const urlQueryTiming =
    typeof window !== 'undefined' ? parsePlayerQueryParams(window.location.search) : null;

  const hasApiTimingResponse = matchedApiTiming !== null;

  const rawMergedTiming: EpisodeTimingMetadata | null =
    activeMediaType === 'tv' ||
    activeMediaType === 'movie' ||
    urlQueryTiming?.introStart !== undefined ||
    urlQueryTiming?.outroStart !== undefined
      ? {
          episodeKey: activeEpisodeKey,
          tmdbId: resolvedSeriesId,
          season: currentSeason,
          episode: currentEpisode,
          introStart:
            urlQueryTiming?.introStart ??
            matchedApiTiming?.introStart ??
            matchedApiTiming?.intro?.start_sec ??
            currentEpisodeRecord?.introStart ??
            catalogTiming?.introStart ??
            null,
          introEnd:
            urlQueryTiming?.introEnd ??
            matchedApiTiming?.introEnd ??
            matchedApiTiming?.intro?.end_sec ??
            currentEpisodeRecord?.introEnd ??
            catalogTiming?.introEnd ??
            null,
          recapStart:
            matchedApiTiming?.recapStart ??
            matchedApiTiming?.recap?.start_sec ??
            (currentEpisodeRecord as any)?.recapStart ??
            null,
          recapEnd:
            matchedApiTiming?.recapEnd ??
            matchedApiTiming?.recap?.end_sec ??
            (currentEpisodeRecord as any)?.recapEnd ??
            null,
          outroStart:
            urlQueryTiming?.outroStart ??
            matchedApiTiming?.outroStart ??
            matchedApiTiming?.outro?.start_sec ??
            matchedApiTiming?.credits?.start_sec ??
            currentEpisodeRecord?.outroStart ??
            catalogTiming?.outroStart ??
            null,
          outroEnd:
            urlQueryTiming?.outroEnd ??
            matchedApiTiming?.outroEnd ??
            matchedApiTiming?.outro?.end_sec ??
            matchedApiTiming?.credits?.end_sec ??
            currentEpisodeRecord?.outroEnd ??
            catalogTiming?.outroEnd ??
            null,
          intro: matchedApiTiming?.intro ?? null,
          recap: matchedApiTiming?.recap ?? null,
          outro: matchedApiTiming?.outro ?? null,
          credits: matchedApiTiming?.credits ?? null,
          source: matchedApiTiming?.source ?? (catalogTiming ? 'catalog' : null),
          nextEpisodeTriggerTime:
            urlQueryTiming?.nextEpisodeTriggerTime ??
            matchedApiTiming?.nextEpisodeTriggerTime ??
            currentEpisodeRecord?.nextEpisodeTriggerTime ??
            catalogTiming?.nextEpisodeTriggerTime ??
            null,
          nextEpisodeId:
            matchedApiTiming?.nextEpisodeId ??
            currentEpisodeRecord?.nextEpisodeId ??
            catalogTiming?.nextEpisodeId ??
            nextEpisodeInfo?.episodeId ??
            null,
        }
      : null;

  const resolvedTiming = resolveEpisodeTiming({
    raw: rawMergedTiming,
    duration,
    mediaType: activeMediaType,
    nextEpisode: nextEpisodeInfo,
  });

  const skipState = evaluatePlaybackSkipState({
    canPlay,
    mediaType: activeMediaType,
    currentTime,
    duration,
    videoEnded,
    timing: resolvedTiming,
    nextEpisode: nextEpisodeInfo,
    skippedIntro,
    skippedRecap,
    skippedOutro,
  });

  // Reset Next Episode countdown if user seeks back out of the Next Episode window
  useEffect(() => {
    if (!skipState.inNextEpisodeWindow) {
      if (countdownCancelled) {
        setCountdownCancelled(false);
      }
      if (nextCountdown !== null) {
        setNextCountdown(null);
      }
    }
  }, [skipState.inNextEpisodeWindow, countdownCancelled, nextCountdown]);

  const handleTriggerNextEpisode = useCallback(() => {
    if (!nextEpisodeInfo || hasTriggeredNextRef.current) return;
    hasTriggeredNextRef.current = true;
    if (seekCleanupRef.current) {
      seekCleanupRef.current();
      seekCleanupRef.current = null;
    }
    pendingSkipSeekRef.current = false;
    isProgrammaticSkipRef.current = false;
    setNextCountdown(null);
    setSkippedIntro(false);
    setSkippedOutro(false);
    setVideoEnded(false);
    setCurrentSeason(nextEpisodeInfo.season);
    setSelectedSeasonForDrawer(nextEpisodeInfo.season);
    setCurrentEpisode(nextEpisodeInfo.episode);
    onEpisodeChange?.(nextEpisodeInfo.season, nextEpisodeInfo.episode);
  }, [nextEpisodeInfo, onEpisodeChange]);

  // Start countdown when entering Next Episode window with autoplay enabled
  useEffect(() => {
    if (!skipState.showNextEpisode || !nextEpisodeInfo || !autoPlayNext || countdownCancelled) {
      setNextCountdown(null);
      return;
    }
    setNextCountdown((prev) => (prev === null ? 5 : prev));
  }, [skipState.showNextEpisode, nextEpisodeInfo, autoPlayNext, countdownCancelled]);

  // Tick down the Next Episode autoplay countdown every 1s while playing or when video has ended
  useEffect(() => {
    if (
      !skipState.showNextEpisode ||
      !nextEpisodeInfo ||
      !autoPlayNext ||
      countdownCancelled ||
      nextCountdown === null
    ) {
      return;
    }
    if (!playing && !videoEnded) {
      return;
    }
    if (nextCountdown <= 0) {
      handleTriggerNextEpisode();
      return;
    }
    const timerId = window.setTimeout(() => {
      setNextCountdown((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [
    skipState.showNextEpisode,
    nextEpisodeInfo,
    autoPlayNext,
    countdownCancelled,
    nextCountdown,
    playing,
    videoEnded,
    handleTriggerNextEpisode,
  ]);

  // Exact, async-safe seek execution for Skip Intro, Skip Recap & Skip Outro
  const executePlayerSeek = useCallback(
    (targetTime: number | null, kind: 'intro' | 'recap' | 'outro') => {
      const v = videoRef.current;
      if (!v || targetTime === null || !Number.isFinite(targetTime) || targetTime < 0) {
        return;
      }
      if (pendingSkipSeekRef.current) {
        return;
      }

      const liveDuration =
        Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration;
      if (liveDuration > 0 && targetTime > liveDuration) {
        return;
      }

      const seekEpisodeKey = activeEpisodeKeyRef.current;
      const seekRunId = probeRunIdRef.current;
      const shouldResume = !v.paused || playing;

      if (seekCleanupRef.current) {
        seekCleanupRef.current();
        seekCleanupRef.current = null;
      }

      pendingSkipSeekRef.current = true;
      isProgrammaticSkipRef.current = true;

      if (kind === 'intro') {
        setSkippedIntro(true);
      } else if (kind === 'recap') {
        setSkippedRecap(true);
      } else {
        setSkippedOutro(true);
      }

      lastReportedTimeRef.current = targetTime;
      lastDriftSyncTimeRef.current = performance.now();
      setCurrentTime(targetTime);

      let finished = false;
      const finalizeSeek = () => {
        if (finished) return;
        finished = true;
        v.removeEventListener('seeked', onSeekedComplete);
        window.clearTimeout(fallbackTimer);
        seekCleanupRef.current = null;

        // Guard against stale async callbacks if the episode or stream changed during seek
        if (
          activeEpisodeKeyRef.current !== seekEpisodeKey ||
          probeRunIdRef.current !== seekRunId
        ) {
          return;
        }

        pendingSkipSeekRef.current = false;
        isProgrammaticSkipRef.current = false;

        const settledTime =
          Number.isFinite(v.currentTime) && Math.abs(v.currentTime - targetTime) <= 2
            ? v.currentTime
            : targetTime;
        lastReportedTimeRef.current = settledTime;
        setCurrentTime(settledTime);

        if (usingExternalDubRef.current && dubAudioRef.current) {
          lastDriftSyncTimeRef.current = performance.now();
          dubAudioRef.current.currentTime = settledTime;
        }

        if (shouldResume && v.paused && !v.ended) {
          v.play().catch(() => {});
        }
      };

      const onSeekedComplete = () => {
        finalizeSeek();
      };

      const fallbackTimer = window.setTimeout(finalizeSeek, 300);
      v.addEventListener('seeked', onSeekedComplete, { once: true });
      seekCleanupRef.current = () => {
        finished = true;
        v.removeEventListener('seeked', onSeekedComplete);
        window.clearTimeout(fallbackTimer);
      };

      try {
        v.currentTime = targetTime;
      } catch {
        finalizeSeek();
        return;
      }

      if (dubAudioRef.current) {
        try {
          dubAudioRef.current.currentTime = targetTime;
        } catch {
          // ignore
        }
      }

      if (v.paused && !v.ended) {
        v.play().catch(() => {});
      }
    },
    [duration, playing]
  );

  const handleSkipRecap = () => {
    if (resolvedTiming.recapEnd === null) return;
    const target = Math.min((duration || Infinity) - 0.5, resolvedTiming.recapEnd + 0.4);
    executePlayerSeek(target, 'recap');
  };

  const handleSkipIntro = () => {
    if (resolvedTiming.introEnd === null) return;
    const target = Math.min((duration || Infinity) - 0.5, resolvedTiming.introEnd + 0.4);
    executePlayerSeek(target, 'intro');
  };

  const handleSkipOutro = () => {
    if (resolvedTiming.outroEnd !== null) {
      const target = Math.min((duration || Infinity) - 0.5, resolvedTiming.outroEnd + 0.4);
      executePlayerSeek(target, 'outro');
    } else if (nextEpisodeInfo) {
      handleTriggerNextEpisode();
    }
  };

  const handleCancelNextCountdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCountdownCancelled(true);
    setNextCountdown(null);
  };

  const handleSelectEpisodeFromDrawer = (epNum: number) => {
    if (
      selectedSeasonForDrawer === currentSeason &&
      epNum === currentEpisode
    ) {
      setShowEpisodeDrawer(false);
      return;
    }
    hasTriggeredNextRef.current = true;
    setCurrentSeason(selectedSeasonForDrawer);
    setCurrentEpisode(epNum);
    setShowEpisodeDrawer(false);
    onEpisodeChange?.(selectedSeasonForDrawer, epNum);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const validAudioDubTracks = filterAudioDubTracks(availableDubs);
  const effectiveDubDisplay = resolveEffectiveDubSelection(selectedDub, availableDubs);

  return (
    <div
      ref={containerRef}
      data-testid="custom-player-viewport"
      data-player-state={canPlay ? (playing ? 'playing' : 'paused') : 'loading'}
      data-is-fullscreen={isFullscreen}
      data-orientation={isFullscreen ? (isPortrait ? 'forced-landscape' : 'landscape') : 'auto'}
      data-episode-key={activeEpisodeKey}
      data-intro-start={resolvedTiming.introStart ?? ''}
      data-intro-end={resolvedTiming.introEnd ?? ''}
      data-recap-start={resolvedTiming.recapStart ?? ''}
      data-recap-end={resolvedTiming.recapEnd ?? ''}
      data-outro-start={resolvedTiming.outroStart ?? ''}
      data-outro-end={resolvedTiming.outroEnd ?? ''}
      data-next-trigger-time={resolvedTiming.nextEpisodeTriggerTime ?? ''}
      data-next-episode-id={resolvedTiming.nextEpisodeId ?? ''}
      data-timing-source={resolvedTiming.source ?? ''}
      onMouseMove={wakeControls}
      onClick={wakeControls}
      className={`relative bg-black overflow-hidden select-none font-sans text-white ${
        isFullscreen && isPortrait ? 'player-fullscreen-landscape-force' : ''
      } ${isStandalonePage ? 'w-screen h-screen' : 'w-full h-full'}`}
    >
      {/* Underlying HTML5 Video Element */}
      <video
        ref={videoRef}
        data-testid="zxc-video-element"
        playsInline
        crossOrigin="anonymous"
        onClick={(e) => {
          e.stopPropagation();
          if (settingsOpen) {
            setSettingsOpen(false);
            return;
          }
          if (showServersOverlay) {
            setShowServersOverlay(false);
            return;
          }
          if (showEpisodeDrawer) {
            setShowEpisodeDrawer(false);
            return;
          }
          togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width * 0.35) {
            handleSkip(-10);
          } else if (clickX > rect.width * 0.65) {
            handleSkip(10);
          } else {
            toggleFullscreen();
          }
        }}
        onCanPlay={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
            setDuration(v.duration);
          }
          setCanPlay(true);
          setWaiting(false);
          updateServerStatus(currentServerIndex, 'available');
        }}
        onPlaying={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
            setDuration(v.duration);
          }
          setCanPlay(true);
          setPlaying(true);
          setWaiting(false);
          updateServerStatus(currentServerIndex, 'available');
          if (usingExternalDubRef.current && dubAudioRef.current && videoRef.current) {
            videoRef.current.muted = true;
            dubAudioRef.current.muted = mutedRef.current;
            dubAudioRef.current.volume = volumeRef.current;
            if (
              !dubAudioRef.current.seeking &&
              dubAudioRef.current.readyState >= 2 &&
              Math.abs(dubAudioRef.current.currentTime - videoRef.current.currentTime) > 0.65
            ) {
              lastDriftSyncTimeRef.current = performance.now();
              dubAudioRef.current.currentTime = videoRef.current.currentTime;
            }
            dubAudioRef.current.play().catch(() => {});
          }
        }}
        onPlay={() => {
          setPlaying(true);
          if (usingExternalDubRef.current && dubAudioRef.current && videoRef.current) {
            videoRef.current.muted = true;
            dubAudioRef.current.muted = mutedRef.current;
            dubAudioRef.current.play().catch(() => {});
          }
        }}
        onPause={() => {
          setPlaying(false);
          if (dubAudioRef.current) {
            dubAudioRef.current.pause();
          }
        }}
        onWaiting={() => {
          setWaiting(true);
          if (dubAudioRef.current) {
            dubAudioRef.current.pause();
          }
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
            setDuration(v.duration);
            setCanPlay(true);
          }
          const t = v.currentTime || 0;
          lastReportedTimeRef.current = t;
          setCurrentTime(t);
        }}
        onDurationChange={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
            setDuration(v.duration);
            setCanPlay(true);
          }
        }}
        onSeeking={(e) => {
          const v = e.currentTarget;
          const t = v.currentTime;
          if (!isProgrammaticSkipRef.current) {
            if (
              resolvedTiming.recapStart !== null &&
              t < resolvedTiming.recapStart - 2
            ) {
              setSkippedRecap(false);
            }
            if (
              resolvedTiming.introStart !== null &&
              t < resolvedTiming.introStart - 2
            ) {
              setSkippedIntro(false);
            }
            if (
              resolvedTiming.outroStart !== null &&
              t < resolvedTiming.outroStart - 2
            ) {
              setSkippedOutro(false);
            }
          }
          lastReportedTimeRef.current = t;
          setCurrentTime(t);
          if (v.duration && t < v.duration - 1) {
            setVideoEnded(false);
          }
        }}
        onSeeked={(e) => {
          const v = e.currentTarget;
          const t = v.currentTime;
          if (!isProgrammaticSkipRef.current) {
            if (
              resolvedTiming.recapStart !== null &&
              t < resolvedTiming.recapStart - 2
            ) {
              setSkippedRecap(false);
            }
            if (
              resolvedTiming.introStart !== null &&
              t < resolvedTiming.introStart - 2
            ) {
              setSkippedIntro(false);
            }
            if (
              resolvedTiming.outroStart !== null &&
              t < resolvedTiming.outroStart - 2
            ) {
              setSkippedOutro(false);
            }
          }
          lastReportedTimeRef.current = t;
          setCurrentTime(t);
          if (v.duration && t < v.duration - 1) {
            setVideoEnded(false);
          }
          if (usingExternalDubRef.current && dubAudioRef.current) {
            lastDriftSyncTimeRef.current = performance.now();
            dubAudioRef.current.currentTime = t;
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration) && v.duration > 0 && duration <= 0) {
            setDuration(v.duration);
          }
          if (!canPlay && v.duration && Number.isFinite(v.duration) && v.duration > 0) {
            setCanPlay(true);
          }
          if (isProgrammaticSkipRef.current || pendingSkipSeekRef.current) {
            return;
          }
          const t = v.currentTime;
          const prevT = lastReportedTimeRef.current;

          // Detect manual backward scrub > 3s to reset skip state
          if (t < prevT - 3) {
            if (
              resolvedTiming.introStart !== null &&
              t < resolvedTiming.introStart - 2
            ) {
              setSkippedIntro(false);
            }
            if (
              resolvedTiming.outroStart !== null &&
              t < resolvedTiming.outroStart - 2
            ) {
              setSkippedOutro(false);
            }
          }

          // Avoid unnecessary React state updates on every fractional timeupdate unless crossing a boundary or >=0.2s elapsed
          const crossedBoundary = [
            resolvedTiming.introStart,
            resolvedTiming.introEnd,
            resolvedTiming.outroStart,
            resolvedTiming.outroEnd,
            resolvedTiming.nextEpisodeTriggerTime,
          ].some(
            (b) =>
              b !== null &&
              ((prevT < b && t >= b) || (prevT >= b && t < b))
          );

          if (
            crossedBoundary ||
            Math.abs(t - prevT) >= 0.2 ||
            Math.floor(t) !== Math.floor(prevT)
          ) {
            lastReportedTimeRef.current = t;
            setCurrentTime(t);
          }

          if (v.duration && t < v.duration - 1 && videoEnded) {
            setVideoEnded(false);
          }
          if (v.buffered.length > 0) {
            const newBuf = v.buffered.end(v.buffered.length - 1);
            if (Math.abs(newBuf - bufferedEnd) >= 0.5) {
              setBufferedEnd(newBuf);
            }
          }
          const audioEl = dubAudioRef.current;
          if (usingExternalDubRef.current && audioEl) {
            if (!v.muted) v.muted = true;
            if (audioEl.muted !== mutedRef.current) {
              audioEl.muted = mutedRef.current;
            }
            if (Math.abs(audioEl.volume - volumeRef.current) > 0.01) {
              audioEl.volume = volumeRef.current;
            }
            if (
              !v.paused &&
              !waiting &&
              audioEl.paused &&
              !audioEl.seeking &&
              audioEl.readyState >= 2
            ) {
              audioEl.play().catch(() => {});
            }
            const now = performance.now();
            if (
              shouldSyncDubAudioTime({
                videoTime: t,
                audioTime: audioEl.currentTime,
                isAudioSeeking: audioEl.seeking,
                audioReadyState: audioEl.readyState,
                lastSyncTimestampMs: lastDriftSyncTimeRef.current,
                nowMs: now,
              })
            ) {
              lastDriftSyncTimeRef.current = now;
              audioEl.currentTime = t;
            }
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setVideoEnded(true);
          if (dubAudioRef.current) {
            dubAudioRef.current.pause();
          }
        }}
        onError={() => {
          // If native video error happens before playback, mark server failed and advance
          if (!canPlay && metadata) {
            const runId = ++probeRunIdRef.current;
            updateServerStatus(currentServerIndex, 'failed');
            const nextIdx = (currentServerIndex + 1) % PLAYER_SERVERS.length;
            if (servers[nextIdx]?.status === 'queue') {
              probeServerAtIndex(nextIdx, runId, metadata, selectedDub);
            }
          }
        }}
        style={{
          filter: `brightness(${brightness}%)`,
          transform: `rotate(${rotation}deg) scaleX(${mirrored ? -1 : 1})`,
          objectFit: aspectMode,
        }}
        className={`w-full h-full transition-opacity duration-500 ${
          canPlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Auxiliary Synchronized Audio Element for Orion Multi-Language Dubs */}
      <audio ref={dubAudioRef} crossOrigin="anonymous" className="hidden" />

      {/* Dub Audio Status / Fallback Toast Banner */}
      {(dubFallbackNotice || loadingDub) && canPlay && (
        <div
          data-testid="dub-status-banner"
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-4 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/15 text-xs font-medium text-zinc-100 shadow-lg flex items-center gap-2 transition-opacity duration-300"
        >
          {loadingDub ? (
            <>
              <Loader className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Switching audio dub...</span>
            </>
          ) : (
            <span>{dubFallbackNotice}</span>
          )}
        </div>
      )}

      {/* Custom Subtitle Overlay — automatically lifts above seekbar when bottom controls are visible */}
      {canPlay && activeCueText && (
        <div
          style={{
            top: `${
              controlsVisible || !playing ? Math.min(subPosition, 75) : subPosition
            }%`,
          }}
          className="absolute inset-x-0 z-20 flex justify-center pointer-events-none px-6 -translate-y-1/2 transition-all duration-200"
        >
          <div
            style={{
              fontSize: `${subFontSize}px`,
              color: subTextColor,
              backgroundColor: `rgba(0, 0, 0, ${subBgOpacity / 100})`,
            }}
            className="px-3 py-1 rounded text-center whitespace-pre-line leading-snug drop-shadow-md max-w-2xl"
          >
            {activeCueText}
          </div>
        </div>
      )}

      {/* Double-Tap / Button Skip Visual Feedback Overlay */}
      {skipFeedback && (
        <div
          className={`absolute inset-y-0 z-20 flex items-center justify-center pointer-events-none w-1/3 ${
            skipFeedback.dir === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs rounded-full w-20 h-20 animate-pulse">
            {skipFeedback.dir === 'left' ? (
              <RotateCcw className="w-7 h-7 text-white" />
            ) : (
              <RotateCw className="w-7 h-7 text-white" />
            )}
            <span className="text-xs font-bold mt-1">
              {skipFeedback.dir === 'left' ? `-${skipFeedback.amount}s` : `+${skipFeedback.amount}s`}
            </span>
          </div>
        </div>
      )}

      {/* Center Buffering Tailspin Loader when mid-stream buffering (waiting && canPlay) */}
      {waiting && canPlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <TailspinLoader size={60} stroke={8} color="white" />
        </div>
      )}

      {/* =====================================================================
          UNIFIED SMART PLAYBACK OVERLAY (TheIntroDB Integration)
          Renders Skip Recap, Skip Intro, Skip Outro/Credits & Next Episode
          in a single, non-overlapping vertically stacked container.
         ===================================================================== */}
      {canPlay &&
        !settingsOpen &&
        !showServersOverlay &&
        !showEpisodeDrawer &&
        (skipState.showSkipRecap ||
          skipState.showSkipIntro ||
          skipState.showSkipOutro ||
          (skipState.showNextEpisode && nextEpisodeInfo)) && (
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
            {/* Skip Recap Button */}
            {skipState.showSkipRecap && (
              <button
                type="button"
                data-testid="skip-recap-button"
                aria-label="Skip Recap"
                onClick={handleSkipRecap}
                className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-zinc-900/90 hover:bg-white text-white hover:text-zinc-950 font-semibold text-xs sm:text-sm tracking-wide backdrop-blur-md border border-white/25 hover:border-white shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current transition-transform group-hover:translate-x-0.5" />
                <span>Skip Recap</span>
              </button>
            )}

            {/* Skip Intro Button */}
            {skipState.showSkipIntro && (
              <button
                type="button"
                data-testid="skip-intro-button"
                aria-label="Skip Intro"
                onClick={handleSkipIntro}
                className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-zinc-900/90 hover:bg-white text-white hover:text-zinc-950 font-semibold text-xs sm:text-sm tracking-wide backdrop-blur-md border border-white/25 hover:border-white shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current transition-transform group-hover:translate-x-0.5" />
                <span>Skip Intro</span>
              </button>
            )}

            {/* Skip Outro / Credits Button */}
            {skipState.showSkipOutro && (
              <button
                type="button"
                data-testid="skip-outro-button"
                aria-label="Skip Outro"
                onClick={handleSkipOutro}
                className="group flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg bg-zinc-900/90 hover:bg-white text-white hover:text-zinc-950 font-semibold text-xs sm:text-sm tracking-wide backdrop-blur-md border border-white/25 hover:border-white shadow-[0_8px_28px_rgba(0,0,0,0.75)] transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current transition-transform group-hover:translate-x-0.5" />
                <span>Skip Outro</span>
              </button>
            )}

            {/* Next Episode Card */}
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
                    onClick={handleTriggerNextEpisode}
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
                      onClick={handleCancelNextCountdown}
                      className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white font-semibold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      {/* =====================================================================
          EXACT ZXCSTREAM.CC SERVER LOADING SCREEN (!canPlay)
          Matches chunk 00uxoksvhj._d.js: Backdrop grayscale->color + dn + dr + u2
         ===================================================================== */}
      {!canPlay && (
        <div
          data-testid="zxc-loading-screen"
          className="absolute inset-0 z-20 overflow-hidden bg-black"
        >
          {/* Fullscreen TMDB Backdrop with grayscale(1) contrast(1.3) brightness(0.75) when checking/queue, transitioning to color when connecting */}
          {backdropPath && (
            <img
              src={`https://image.tmdb.org/t/p/w1280${backdropPath}`}
              alt={metadata?.title || 'Backdrop'}
              style={{
                filter:
                  activeServerStatus === 'checking' || activeServerStatus === 'queue'
                    ? 'grayscale(1) contrast(1.3) brightness(0.75)'
                    : 'grayscale(0)',
              }}
              className="w-full h-full object-cover object-center transition-all duration-700"
            />
          )}

          {/* dn component: Dark radial/linear vignette + Bottom-Left Pulsing Official Movie/Show Logo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.85)_100%)]">
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            {logoPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w780${logoPath}`}
                alt={metadata?.title || 'Logo'}
                className="absolute bottom-12 left-12 max-h-14 max-w-xs lg:max-h-40 lg:max-w-md w-auto h-auto object-contain animate-pulse drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
              />
            ) : (
              metadata?.title && (
                <div className="absolute bottom-12 left-12 max-w-md animate-pulse drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
                  <h2 className="text-2xl lg:text-5xl font-black tracking-tight text-white uppercase">
                    {metadata.title}
                  </h2>
                </div>
              )
            )}
          </div>

          {/* Metadata Error Display if invalid TMDB ID */}
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

          {/* dr component: Plain text rotating hint at bottom center */}
          <div className="text-center text-white text-xs lg:text-sm absolute bottom-4 left-1/2 -translate-x-1/2 transition-opacity duration-500 whitespace-nowrap z-20">
            {PLAYER_HINTS[hintIndex]}
          </div>
        </div>
      )}

      {/* =====================================================================
          u2 COMPONENT: Right-Side Vertically Centered Server Carousel
          Visible during loading (!canPlay) OR when user clicks top-right Inbox icon (showServersOverlay)
         ===================================================================== */}
      {(!canPlay || showServersOverlay) && (
        <div
          data-testid="zxc-server-carousel"
          onClick={() => {
            if (canPlay) setShowServersOverlay(false);
          }}
          className={`absolute inset-0 flex justify-end overflow-hidden z-30 ${
            canPlay ? 'bg-black/75' : 'pointer-events-none'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative h-full w-full pointer-events-auto"
          >
            {servers.map((srv, idx) => {
              const offset = idx - currentServerIndex;
              const isCurrent = offset === 0;
              const isAdjacent = Math.abs(offset) === 1;
              return (
                <div
                  key={srv.code}
                  data-testid={`server-carousel-item-${srv.index}`}
                  onClick={() => handleManualServerSelect(idx)}
                  style={{
                    top: `calc(50% + ${offset * 65}px)`,
                  }}
                  className={`absolute right-0 -translate-y-1/2 transition-all duration-500 flex items-center gap-3 cursor-pointer ${
                    isCurrent
                      ? 'lg:-translate-x-18 -translate-x-8 scale-115 opacity-100 font-semibold text-white'
                      : isAdjacent
                      ? 'lg:-translate-x-10 -translate-x-4 scale-95 opacity-80 text-white'
                      : 'scale-90 lg:opacity-30 opacity-10 text-white'
                  } ${srv.status === 'connecting' ? 'animate-pulse' : ''}`}
                >
                  {/* Server Status Icon */}
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

                  {/* Server Name & Status Subtitle */}
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
      )}

      {/* =====================================================================
          u7 COMPONENT: Paused Cinematic Info Screen (when paused & idle)
         ===================================================================== */}
      {canPlay && !playing && pausedIdleOverlay && metadata && (
        <div
          onClick={wakeControls}
          className="absolute inset-0 bg-black/70 z-20 flex items-center pl-8 lg:pl-24 pointer-events-auto transition-opacity duration-500"
        >
          <div className="space-y-4 max-w-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: normalizedColor }}
                  className="w-1.5 h-6 rounded-full"
                />
                <span className="text-sm lg:text-base text-zinc-300 font-medium">
                  You&apos;re Watching
                </span>
              </div>
              <h2 className="text-3xl lg:text-6xl font-extrabold tracking-tight text-white">
                {metadata.title}{' '}
                {activeMediaType === 'tv' ? `S${currentSeason}E${currentEpisode}` : ''}{' '}
                {metadata.year ? `(${metadata.year})` : ''}
              </h2>
              <p className="text-xs lg:text-sm text-zinc-300 font-medium">
                {activeMediaType === 'tv' ? 'TV Show' : 'Movie'} / {genreLabel} / {statusLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          uq COMPONENT: Right-Side TV Episode Cards Drawer
         ===================================================================== */}
      {canPlay && activeMediaType === 'tv' && showEpisodeDrawer && (
        <div
          data-testid="zxc-episode-drawer"
          onClick={() => setShowEpisodeDrawer(false)}
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
                const isActiveEp =
                  selectedSeasonForDrawer === currentSeason &&
                  ep.episode_number === currentEpisode;
                return (
                  <button
                    key={ep.id || ep.episode_number}
                    type="button"
                    onClick={() => handleSelectEpisodeFromDrawer(ep.episode_number)}
                    className={`w-full text-left rounded-lg overflow-hidden border transition cursor-pointer flex gap-3 p-2 ${
                      isActiveEp
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
      )}

      {/* =====================================================================
          uQ COMPONENT: Top Bar & Bottom Controls Overlay
         ===================================================================== */}
      <div
        className={`absolute inset-0 z-25 flex flex-col justify-between p-4 lg:p-6 pointer-events-none transition-opacity duration-300 ${
          canPlay && (controlsVisible || !playing) ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Controls Row: Back Button (left) + Season selector / Server Inbox Toggle (right) */}
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
            {/* Season Selector Dropdown when Episode Drawer is open */}
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

            {/* Server Switcher Toggle Button (uY Inbox SVG) */}
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

        {/* Bottom Controls Stack: Metadata Header + Seekbar (oX) + Control Buttons Row */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="space-y-3 pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent -mx-4 -mb-4 p-4 lg:-mx-6 lg:-mb-6 lg:p-6 pt-12"
        >
          {/* Above-Seekbar "You're Watching" Metadata Block (shown on desktop/tablet Custom Player, hidden on compact mobile to prevent overlap) */}
          {playerMode === 'custom' && metadata && (
            <div className="hidden md:block space-y-0.5 mb-2 max-w-[55%] pointer-events-none">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: normalizedColor }}
                  className="w-1 h-4 rounded-full"
                />
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

          {/* Seekbar (oX component) */}
          <div
            ref={seekBarRef}
            onMouseMove={handleSeekBarMouseMove}
            onMouseLeave={() => setHoverTime(null)}
            onClick={handleSeekBarClick}
            className="relative h-4 flex items-center cursor-pointer group"
          >
            {/* Hover Time Tooltip */}
            {hoverTime !== null && (
              <div
                style={{ left: `${hoverPercent}%` }}
                className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs font-mono px-2 py-0.5 rounded border border-white/10 pointer-events-none"
              >
                {formatPlayerTime(hoverTime)}
              </div>
            )}

            {/* Track Background */}
            <div className="w-full h-1.5 group-hover:h-2 bg-white/25 rounded-full overflow-hidden relative transition-all">
              {/* Buffered Bar */}
              <div
                style={{ width: `${bufferPercent}%` }}
                className="absolute inset-y-0 left-0 bg-white/40 rounded-full"
              />
              {/* Intro Segment Marker on Seekbar */}
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
              {/* Outro Segment Marker on Seekbar */}
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
              {/* Active Progress Bar */}
              <div
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: normalizedColor,
                }}
                className="absolute inset-y-0 left-0 rounded-full"
              />
            </div>

            {/* White Vertical Pill Thumb matching oX */}
            <div
              style={{ left: `${progressPercent}%` }}
              className="absolute -translate-x-1/2 h-4 w-1.5 lg:h-5 lg:w-2 bg-white rounded-full shadow-md transition-transform group-hover:scale-110 z-20"
            />
          </div>

          {/* Bottom Control Buttons Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left Cluster: Play/Pause, -10s/+10s, Volume, Time, Next Episode */}
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Play / Pause */}
              <button
                type="button"
                aria-label={playing ? 'Pause' : 'Play'}
                data-testid="player-play-pause"
                onClick={togglePlay}
                className="cursor-pointer hover:scale-110 transition-transform"
              >
                {playing ? <PauseSvg /> : <PlaySvg />}
              </button>

              {/* -10s Rewind Button */}
              <button
                type="button"
                aria-label="Rewind 10 seconds"
                data-testid="player-rewind-10"
                onClick={() => handleSkip(-10)}
                className="cursor-pointer hover:scale-110 transition-transform flex items-center gap-0.5 text-white/90 hover:text-white"
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-5 h-5 lg:w-6 lg:h-6" />
                <span className="text-[10px] lg:text-xs font-bold">10</span>
              </button>

              {/* +10s Forward Button */}
              <button
                type="button"
                aria-label="Forward 10 seconds"
                data-testid="player-forward-10"
                onClick={() => handleSkip(10)}
                className="cursor-pointer hover:scale-110 transition-transform flex items-center gap-0.5 text-white/90 hover:text-white"
                title="Forward 10 seconds"
              >
                <span className="text-[10px] lg:text-xs font-bold">10</span>
                <RotateCw className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>

              {/* Volume Button + Expanding Slider */}
              <div className="flex items-center gap-2 group/vol">
                <button
                  type="button"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  onClick={toggleMute}
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
                  onChange={(e) => handleVolumeChange(Number.parseFloat(e.target.value))}
                  className="w-0 group-hover/vol:w-20 focus:w-20 transition-all duration-300 accent-white cursor-pointer h-1 bg-white/30 rounded-lg overflow-hidden"
                />
              </div>

              {/* Formatted Time Display (H:MM:SS / H:MM:SS) */}
              <div
                data-testid="player-time-display"
                className="text-xs lg:text-sm font-medium text-zinc-200 tabular-nums whitespace-nowrap"
              >
                {formatPlayerTime(currentTime)} / {formatPlayerTime(duration)}
              </div>
            </div>

            {/* Right Cluster: [ ⚙ Settings > ] Pill Button (lK), TV Episode Selector (uX), Fullscreen (os/oo) */}
            <div className="flex items-center gap-3 lg:gap-4 relative">
              {/* Settings Popover Menu (lK) - Viewport-Aware Positioning, No Visible Scrollbar, Premium Glassmorphism */}
              {settingsOpen && (
                <div
                  data-testid="player-settings-menu"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full mb-2.5 right-0 w-72 sm:w-80 max-w-[calc(100vw-2rem)] max-h-[min(320px,calc(100vh-6rem))] landscape:max-h-[min(250px,calc(100vh-4.5rem))] overflow-y-auto no-scrollbar rounded-2xl bg-zinc-950/75 backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.12)] p-3 text-xs lg:text-sm space-y-1 z-40"
                >
                  {settingsTab === 'main' && (
                    <>
                      {/* Audio Dub (Server 0) */}
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
                            : effectiveDubDisplay.isOriginal
                            ? 'Original'
                            : (effectiveDubDisplay.displayLabel || 'Original').replace(/\s+dub$/i, '')}
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </span>
                      </button>

                      {/* Audio Track */}
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

                      {/* Subtitles */}
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

                      {/* Dual Subtitles */}
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

                      {/* Subtitle Settings Modal Trigger */}
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

                      {/* Quality */}
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

                      {/* Playback Speed */}
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

                      {/* Brightness */}
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

                      {/* Aspect Ratio */}
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

                      {/* Rotate / Mirror */}
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-zinc-300 font-medium">Transform</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer transition-colors"
                          >
                            Rotate {rotation}°
                          </button>
                          <button
                            type="button"
                            onClick={() => setMirrored((m) => !m)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer transition-colors"
                          >
                            {mirrored ? 'Mirrored' : 'Mirror'}
                          </button>
                        </div>
                      </div>

                      {/* Autoplay Next Episode Toggle (for TV Series) */}
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

                      {/* Sleep Timer */}
                      <button
                        type="button"
                        onClick={() =>
                          setSleepTimer((s) => (s === 0 ? 15 : s === 15 ? 30 : s === 30 ? 60 : 0))
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

                  {/* Dub Language Submenu */}
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
                        onClick={() => handleSelectDub('', 0)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span>Original Audio</span>
                        {effectiveDubDisplay.isOriginal && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                      {validAudioDubTracks.filter((d) => !d.original).length > 0
                        ? validAudioDubTracks
                            .filter((d) => !d.original)
                            .map((dub, idx) => {
                              const code = (dub.lang || '').toLowerCase();
                              const isSelected =
                                !effectiveDubDisplay.isOriginal &&
                                effectiveDubDisplay.dubCode === code &&
                                String(selectedDubType) === String(dub.type ?? 0);
                              return (
                                <button
                                  key={`${code}-${dub.type ?? 0}-${idx}`}
                                  type="button"
                                  data-testid={`dub-option-${code}`}
                                  onClick={() => handleSelectDub(code, dub.type ?? 0)}
                                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                                >
                                  <span>
                                    {dub.name || code.toUpperCase()} ({code.toUpperCase()})
                                  </span>
                                  {isSelected && <Check className="w-4 h-4 text-green-400" />}
                                </button>
                              );
                            })
                        : DUB_LANGUAGES.map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              data-testid={`dub-option-${lang.code}`}
                              onClick={() => handleSelectDub(lang.code, 0)}
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                            >
                              <span>
                                {lang.label} ({lang.code.toUpperCase()})
                              </span>
                              {selectedDub === lang.code && (
                                <Check className="w-4 h-4 text-green-400" />
                              )}
                            </button>
                          ))}
                    </div>
                  )}

                  {/* Embedded Audio Track Submenu */}
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
                      {audioTracks.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectAudioTrack(track.id)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                        >
                          <span>{track.label}</span>
                          {selectedAudioTrack === track.id && (
                            <Check className="w-4 h-4 text-green-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subtitles Submenu */}
                  {(settingsTab === 'subtitles' || settingsTab === 'dualsubtitles') && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSettingsTab('main')}
                        className="flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 text-xs font-semibold rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>
                          {settingsTab === 'subtitles' ? 'Subtitles' : 'Dual Subtitles'}
                        </span>
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
                        .filter((s) =>
                          s.language.toLowerCase().includes(subtitleSearch.toLowerCase())
                        )
                        .map((sub, i) => (
                          <button
                            key={`${sub.language}-${i}`}
                            type="button"
                            onClick={() => {
                              if (settingsTab === 'subtitles') setSelectedSubtitle(sub.language);
                              else setDualSubtitle(sub.language);
                              setSettingsTab('main');
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                          >
                            <span>{sub.language}</span>
                            {(settingsTab === 'subtitles'
                              ? selectedSubtitle === sub.language
                              : dualSubtitle === sub.language) && (
                              <Check className="w-4 h-4 text-green-400" />
                            )}
                          </button>
                        ))}
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
                        onClick={() => handleSelectQuality(-1)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                      >
                        <span>Auto</span>
                        {selectedQuality === -1 && <Check className="w-4 h-4 text-green-400" />}
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q.index}
                          type="button"
                          onClick={() => handleSelectQuality(q.index)}
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
                          onClick={() => handleSelectSpeed(rate)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer"
                        >
                          <span>{rate === 1 ? 'Normal (1x)' : `${rate}x`}</span>
                          {playbackRate === rate && <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Brightness Submenu */}
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

              {/* Exact [ ⚙ Settings > ] Pill Button from lK component */}
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

              {/* TV Series Episode Selector Button (uX SVG) */}
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

              {/* Fullscreen Toggle Button (os / oo SVG) */}
              <button
                type="button"
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                data-testid="player-fullscreen-button"
                onClick={toggleFullscreen}
                className="cursor-pointer hover:scale-110 transition-transform"
              >
                {isFullscreen ? <FullscreenExitSvg /> : <FullscreenEnterSvg />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          lz COMPONENT: Subtitle Appearance & Time Offset Settings Modal
         ===================================================================== */}
      {subtitleModalOpen && (
        <div
          onClick={() => setSubtitleModalOpen(false)}
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
                onClick={() => setSubtitleModalOpen(false)}
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
                    onClick={() => setSubTimeOffset((t) => Math.max(-10, t - 0.5))}
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
                    onClick={() => setSubTimeOffset((t) => Math.min(10, t + 0.5))}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
