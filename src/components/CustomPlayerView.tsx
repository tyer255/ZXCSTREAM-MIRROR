import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { Loader, RotateCcw, RotateCw } from 'lucide-react';
import {
  EpisodeTimingMetadata,
  MediaType,
  PLAYER_HINTS,
  PLAYER_SERVERS,
  RawOrionDub,
  evaluatePlaybackSkipState,
  filterAudioDubTracks,
  parsePlayerQueryParams,
  resolveEffectiveDubSelection,
  resolveEpisodeTiming,
  resolveNextEpisode,
  shouldSyncDubAudioTime,
} from '../utils/urlBuilder.js';
import { getEpisodeTimingMetadata, getMediaByTmdbId, getSeriesImdbId } from '../data/tmdbCatalog.js';
import {
  CustomPlayerViewProps,
  EpisodeItem,
  PlayerEpisodeDrawer,
  PlayerLoadingScreen,
  PlayerServerCarousel,
  PlayerSubtitleSettingsModal,
  ServerItemState,
  ServerProbeStatus,
  SubtitleTrack,
  TailspinLoader,
  TmdbMetadata,
  TmdbSeasonSummary,
  canPlayHevcInBrowser,
} from './PlayerIconsAndTypes.js';
import { PlayerControlsOverlay, SmartPlaybackControls } from './PlayerControlsOverlay.js';

export type { CustomPlayerViewProps };

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
  const connectWatchdogTimerRef = useRef<number | null>(null);

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
    if (connectWatchdogTimerRef.current) {
      window.clearTimeout(connectWatchdogTimerRef.current);
      connectWatchdogTimerRef.current = null;
    }
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
      .catch((_err) => {
        if (cancelled) return;
        const fallback = getMediaByTmdbId(initialMediaType, cleanId);
        const seasons: TmdbSeasonSummary[] = (fallback.seasons || []).map((s) => ({
          season_number: s.seasonNumber,
          episode_count: s.episodeCount,
          name: s.name,
        }));
        setMetadata({
          id: Number(cleanId.replace(/\D/g, '')) || Number(fallback.tmdbId) || 128,
          mediaType: initialMediaType,
          title: fallback.title,
          year: fallback.releaseYear,
          releaseDate: `${fallback.releaseYear}-01-01`,
          lastAirDate: '',
          imdbId: getSeriesImdbId(cleanId) || '',
          backdropPaths: fallback.backdropUrl ? [fallback.backdropUrl] : [],
          logoPaths: fallback.logoUrl ? [fallback.logoUrl] : [],
          genres: fallback.genres,
          status: fallback.status,
          seasons,
        });
        setMetadataError(null);
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

        // Guard against stalled edge streams that accept manifest requests but hang on initial segments
        connectWatchdogTimerRef.current = window.setTimeout(() => {
          if (probeRunIdRef.current !== runId) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            advanceToNextServer();
          }
        }, 14000);

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
              fragLoadingMaxRetry: 2,
              levelLoadingMaxRetry: 2,
              manifestLoadingMaxRetry: 2,
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
              const isPrePlayNetworkError =
                videoEl.readyState < 3 &&
                (errData.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
                  errData.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT ||
                  errData.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR ||
                  errData.details === Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT ||
                  errData.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                  errData.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT);
              if (errData.fatal || isPrePlayNetworkError) {
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

  useEffect(() => {
    if (!skipState.inNextEpisodeWindow) {
      if (countdownCancelled) setCountdownCancelled(false);
      if (nextCountdown !== null) setNextCountdown(null);
    }
  }, [skipState.inNextEpisodeWindow, countdownCancelled, nextCountdown]);

  const handleNextEpisode = useCallback(() => {
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

  useEffect(() => {
    if (!skipState.showNextEpisode || !nextEpisodeInfo || !autoPlayNext || countdownCancelled) {
      setNextCountdown(null);
    } else {
      setNextCountdown((prev) => (prev === null ? 5 : prev));
    }
  }, [skipState.showNextEpisode, nextEpisodeInfo, autoPlayNext, countdownCancelled]);

  useEffect(() => {
    if (
      !skipState.showNextEpisode ||
      !nextEpisodeInfo ||
      !autoPlayNext ||
      countdownCancelled ||
      nextCountdown === null ||
      (!playing && !videoEnded)
    ) {
      return;
    }
    if (nextCountdown <= 0) {
      handleNextEpisode();
      return;
    }
    const timer = window.setTimeout(() => {
      setNextCountdown((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [
    skipState.showNextEpisode,
    nextEpisodeInfo,
    autoPlayNext,
    countdownCancelled,
    nextCountdown,
    playing,
    videoEnded,
    handleNextEpisode,
  ]);

  const performSkipSeek = useCallback(
    (targetTime: number | null, kind: 'intro' | 'recap' | 'outro') => {
      const v = videoRef.current;
      if (
        !v ||
        targetTime === null ||
        !Number.isFinite(targetTime) ||
        targetTime < 0 ||
        pendingSkipSeekRef.current
      ) {
        return;
      }
      const effectiveDur =
        Number.isFinite(v.duration) && v.duration > 0 ? v.duration : duration;
      if (effectiveDur > 0 && targetTime > effectiveDur) return;

      const startEpKey = activeEpisodeKeyRef.current;
      const startRunId = probeRunIdRef.current;
      const wasPlaying = !v.paused || playing;

      if (seekCleanupRef.current) {
        seekCleanupRef.current();
        seekCleanupRef.current = null;
      }

      pendingSkipSeekRef.current = true;
      isProgrammaticSkipRef.current = true;
      if (kind === 'intro') setSkippedIntro(true);
      else if (kind === 'recap') setSkippedRecap(true);
      else setSkippedOutro(true);

      lastReportedTimeRef.current = targetTime;
      lastDriftSyncTimeRef.current = performance.now();
      setCurrentTime(targetTime);

      let settled = false;
      const finishSeek = () => {
        if (settled) return;
        settled = true;
        v.removeEventListener('seeked', onSeekedOnce);
        window.clearTimeout(fallbackTimer);
        seekCleanupRef.current = null;
        if (
          activeEpisodeKeyRef.current !== startEpKey ||
          probeRunIdRef.current !== startRunId
        ) {
          return;
        }
        pendingSkipSeekRef.current = false;
        isProgrammaticSkipRef.current = false;
        const finalTime =
          Number.isFinite(v.currentTime) && Math.abs(v.currentTime - targetTime) <= 2
            ? v.currentTime
            : targetTime;
        lastReportedTimeRef.current = finalTime;
        setCurrentTime(finalTime);
        if (usingExternalDubRef.current && dubAudioRef.current) {
          lastDriftSyncTimeRef.current = performance.now();
          dubAudioRef.current.currentTime = finalTime;
        }
        if (wasPlaying && v.paused && !v.ended) {
          v.play().catch(() => {});
        }
      };

      const onSeekedOnce = () => finishSeek();
      const fallbackTimer = window.setTimeout(finishSeek, 300);
      v.addEventListener('seeked', onSeekedOnce, { once: true });
      seekCleanupRef.current = () => {
        settled = true;
        v.removeEventListener('seeked', onSeekedOnce);
        window.clearTimeout(fallbackTimer);
      };

      try {
        v.currentTime = targetTime;
      } catch {
        finishSeek();
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
    performSkipSeek(target, 'recap');
  };

  const handleSkipIntro = () => {
    if (resolvedTiming.introEnd === null) return;
    const target = Math.min((duration || Infinity) - 0.5, resolvedTiming.introEnd + 0.4);
    performSkipSeek(target, 'intro');
  };

  const handleSkipOutro = () => {
    if (resolvedTiming.outroEnd !== null) {
      const target = Math.min((duration || Infinity) - 0.5, resolvedTiming.outroEnd + 0.4);
      performSkipSeek(target, 'outro');
    } else if (nextEpisodeInfo) {
      handleNextEpisode();
    }
  };

  const handleCancelCountdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCountdownCancelled(true);
    setNextCountdown(null);
  };

  const handleSelectEpisodeFromDrawer = (epNum: number) => {
    if (selectedSeasonForDrawer === currentSeason && epNum === currentEpisode) {
      setShowEpisodeDrawer(false);
    } else {
      hasTriggeredNextRef.current = true;
      setCurrentSeason(selectedSeasonForDrawer);
      setCurrentEpisode(epNum);
      setShowEpisodeDrawer(false);
      onEpisodeChange?.(selectedSeasonForDrawer, epNum);
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const filteredDubs = filterAudioDubTracks(availableDubs);
  const effectiveDub = resolveEffectiveDubSelection(selectedDub, availableDubs);

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
      <video
        ref={videoRef}
        data-testid="zxc-video-element"
        playsInline
        crossOrigin="anonymous"
        onClick={(e) => {
          e.stopPropagation();
          if (settingsOpen) setSettingsOpen(false);
          else if (showServersOverlay) setShowServersOverlay(false);
          else if (showEpisodeDrawer) setShowEpisodeDrawer(false);
          else togglePlay();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width * 0.35) handleSkip(-10);
          else if (x > rect.width * 0.65) handleSkip(10);
          else toggleFullscreen();
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
          if (dubAudioRef.current) dubAudioRef.current.pause();
        }}
        onWaiting={() => {
          setWaiting(true);
          if (dubAudioRef.current) dubAudioRef.current.pause();
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
            if (v.readyState >= 1) setCanPlay(true);
          }
        }}
        onSeeking={(e) => {
          const v = e.currentTarget;
          const t = v.currentTime;
          if (!isProgrammaticSkipRef.current) {
            if (resolvedTiming.recapStart !== null && t < resolvedTiming.recapStart - 2) {
              setSkippedRecap(false);
            }
            if (resolvedTiming.introStart !== null && t < resolvedTiming.introStart - 2) {
              setSkippedIntro(false);
            }
            if (resolvedTiming.outroStart !== null && t < resolvedTiming.outroStart - 2) {
              setSkippedOutro(false);
            }
          }
          lastReportedTimeRef.current = t;
          setCurrentTime(t);
          if (v.duration && t < v.duration - 1) setVideoEnded(false);
        }}
        onSeeked={(e) => {
          const v = e.currentTarget;
          const t = v.currentTime;
          if (!isProgrammaticSkipRef.current) {
            if (resolvedTiming.recapStart !== null && t < resolvedTiming.recapStart - 2) {
              setSkippedRecap(false);
            }
            if (resolvedTiming.introStart !== null && t < resolvedTiming.introStart - 2) {
              setSkippedIntro(false);
            }
            if (resolvedTiming.outroStart !== null && t < resolvedTiming.outroStart - 2) {
              setSkippedOutro(false);
            }
          }
          lastReportedTimeRef.current = t;
          setCurrentTime(t);
          if (v.duration && t < v.duration - 1) setVideoEnded(false);
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
          if (!canPlay && v.duration && Number.isFinite(v.duration) && v.duration > 0 && v.readyState >= 2) {
            setCanPlay(true);
          }
          if (isProgrammaticSkipRef.current || pendingSkipSeekRef.current) return;
          const t = v.currentTime;
          const prev = lastReportedTimeRef.current;
          if (t < prev - 3) {
            if (resolvedTiming.introStart !== null && t < resolvedTiming.introStart - 2) {
              setSkippedIntro(false);
            }
            if (resolvedTiming.outroStart !== null && t < resolvedTiming.outroStart - 2) {
              setSkippedOutro(false);
            }
          }
          const crossedBoundary = [
            resolvedTiming.introStart,
            resolvedTiming.introEnd,
            resolvedTiming.outroStart,
            resolvedTiming.outroEnd,
            resolvedTiming.nextEpisodeTriggerTime,
          ].some((b) => b !== null && ((prev < b && t >= b) || (prev >= b && t < b)));
          if (crossedBoundary || Math.abs(t - prev) >= 0.2 || Math.floor(t) !== Math.floor(prev)) {
            lastReportedTimeRef.current = t;
            setCurrentTime(t);
          }
          if (v.duration && t < v.duration - 1 && videoEnded) {
            setVideoEnded(false);
          }
          if (v.buffered.length > 0) {
            const bEnd = v.buffered.end(v.buffered.length - 1);
            if (Math.abs(bEnd - bufferedEnd) >= 0.5) setBufferedEnd(bEnd);
          }
          const dubEl = dubAudioRef.current;
          if (usingExternalDubRef.current && dubEl) {
            if (!v.muted) v.muted = true;
            if (dubEl.muted !== mutedRef.current) dubEl.muted = mutedRef.current;
            if (Math.abs(dubEl.volume - volumeRef.current) > 0.01) dubEl.volume = volumeRef.current;
            if (!v.paused && !waiting && dubEl.paused && !dubEl.seeking && dubEl.readyState >= 2) {
              dubEl.play().catch(() => {});
            }
            const nowMs = performance.now();
            if (
              shouldSyncDubAudioTime({
                videoTime: t,
                audioTime: dubEl.currentTime,
                isAudioSeeking: dubEl.seeking,
                audioReadyState: dubEl.readyState,
                lastSyncTimestampMs: lastDriftSyncTimeRef.current,
                nowMs,
              })
            ) {
              lastDriftSyncTimeRef.current = nowMs;
              dubEl.currentTime = t;
            }
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setVideoEnded(true);
          if (dubAudioRef.current) dubAudioRef.current.pause();
        }}
        onError={() => {
          if (!canPlay && metadata) {
            const nextRunId = ++probeRunIdRef.current;
            updateServerStatus(currentServerIndex, 'failed');
            const nextIdx = (currentServerIndex + 1) % PLAYER_SERVERS.length;
            if (servers[nextIdx]?.status === 'queue') {
              probeServerAtIndex(nextIdx, nextRunId, metadata, selectedDub);
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
      <audio ref={dubAudioRef} crossOrigin="anonymous" className="hidden" />

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

      {canPlay && activeCueText && (
        <div
          style={{ top: `${controlsVisible || !playing ? Math.min(subPosition, 75) : subPosition}%` }}
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

      {waiting && canPlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <TailspinLoader size={60} stroke={8} color="white" />
        </div>
      )}

      <SmartPlaybackControls
        canPlay={canPlay}
        settingsOpen={settingsOpen}
        showServersOverlay={showServersOverlay}
        showEpisodeDrawer={showEpisodeDrawer}
        controlsVisible={controlsVisible}
        playing={playing}
        activeCueText={activeCueText}
        skipState={skipState}
        nextEpisodeInfo={nextEpisodeInfo}
        autoPlayNext={autoPlayNext}
        countdownCancelled={countdownCancelled}
        nextCountdown={nextCountdown}
        onSkipRecap={handleSkipRecap}
        onSkipIntro={handleSkipIntro}
        onSkipOutro={handleSkipOutro}
        onNextEpisode={handleNextEpisode}
        onCancelCountdown={handleCancelCountdown}
      />

      {!canPlay && (
        <PlayerLoadingScreen
          backdropPath={backdropPath}
          logoPath={logoPath}
          title={metadata?.title}
          activeServerStatus={activeServerStatus}
          metadataError={metadataError}
          hintIndex={hintIndex}
        />
      )}

      {(!canPlay || showServersOverlay) && (
        <PlayerServerCarousel
          canPlay={canPlay}
          servers={servers}
          currentServerIndex={currentServerIndex}
          onClose={() => setShowServersOverlay(false)}
          onSelectServer={handleManualServerSelect}
        />
      )}

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

      {canPlay && activeMediaType === 'tv' && showEpisodeDrawer && (
        <PlayerEpisodeDrawer
          loadingEpisodes={loadingEpisodes}
          seasonEpisodes={seasonEpisodes}
          selectedSeasonForDrawer={selectedSeasonForDrawer}
          currentSeason={currentSeason}
          currentEpisode={currentEpisode}
          onClose={() => setShowEpisodeDrawer(false)}
          onSelectEpisode={handleSelectEpisodeFromDrawer}
        />
      )}

      <PlayerControlsOverlay
        canPlay={canPlay}
        controlsVisible={controlsVisible}
        playing={playing}
        showBackButton={showBackButton}
        onBack={onBack}
        showEpisodeDrawer={showEpisodeDrawer}
        activeMediaType={activeMediaType}
        selectedSeasonForDrawer={selectedSeasonForDrawer}
        setSelectedSeasonForDrawer={setSelectedSeasonForDrawer}
        metadata={metadata}
        playerMode={playerMode}
        setShowServersOverlay={setShowServersOverlay}
        setShowEpisodeDrawer={setShowEpisodeDrawer}
        setSettingsOpen={setSettingsOpen}
        normalizedColor={normalizedColor}
        currentSeason={currentSeason}
        currentEpisode={currentEpisode}
        genreLabel={genreLabel}
        statusLabel={statusLabel}
        seekBarRef={seekBarRef}
        onSeekBarMouseMove={handleSeekBarMouseMove}
        onSeekBarLeave={() => setHoverTime(null)}
        onSeekBarClick={handleSeekBarClick}
        hoverTime={hoverTime}
        hoverPercent={hoverPercent}
        bufferedPercent={bufferedPercent}
        progressPercent={progressPercent}
        duration={duration}
        currentTime={currentTime}
        resolvedTiming={resolvedTiming}
        onTogglePlay={togglePlay}
        onSkip={handleSkip}
        muted={muted}
        volume={volume}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        settingsOpen={settingsOpen}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        loadingDub={loadingDub}
        effectiveDub={effectiveDub}
        audioTracks={audioTracks}
        selectedAudioTrack={selectedAudioTrack}
        onSelectAudioTrack={handleSelectAudioTrack}
        selectedSubtitle={selectedSubtitle}
        setSelectedSubtitle={setSelectedSubtitle}
        dualSubtitle={dualSubtitle}
        setDualSubtitle={setDualSubtitle}
        subtitles={subtitles}
        subtitleSearch={subtitleSearch}
        setSubtitleSearch={setSubtitleSearch}
        setSubtitleModalOpen={setSubtitleModalOpen}
        selectedQuality={selectedQuality}
        qualities={qualities}
        onSelectQuality={handleSelectQuality}
        playbackRate={playbackRate}
        onSelectSpeed={handleSelectSpeed}
        brightness={brightness}
        setBrightness={setBrightness}
        aspectMode={aspectMode}
        setAspectMode={setAspectMode}
        rotation={rotation}
        setRotation={setRotation}
        mirrored={mirrored}
        setMirrored={setMirrored}
        autoPlayNext={autoPlayNext}
        setAutoPlayNext={setAutoPlayNext}
        setCountdownCancelled={setCountdownCancelled}
        sleepTimer={sleepTimer}
        setSleepTimer={setSleepTimer}
        filteredDubs={filteredDubs}
        selectedDub={selectedDub}
        selectedDubType={selectedDubType}
        onSelectDub={handleSelectDub}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {subtitleModalOpen && (
        <PlayerSubtitleSettingsModal
          subFontSize={subFontSize}
          setSubFontSize={setSubFontSize}
          subBgOpacity={subBgOpacity}
          setSubBgOpacity={setSubBgOpacity}
          subPosition={subPosition}
          setSubPosition={setSubPosition}
          subTextColor={subTextColor}
          setSubTextColor={setSubTextColor}
          subTimeOffset={subTimeOffset}
          setSubTimeOffset={setSubTimeOffset}
          onClose={() => setSubtitleModalOpen(false)}
        />
      )}
    </div>
  );
};