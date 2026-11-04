/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { AlertCircle, Play, RotateCcw, RotateCw, Undo2, Volume2 } from 'lucide-react';
import {
  AnimeValidationResult,
  fetchAnimeValidation,
} from './AnimeMetadata.js';
import {
  AnimeEpisodeSummary,
  clearAnimeProgress,
  fetchAnimeEpisodeTiming,
  fetchAnimeSeasonEpisodes,
  getSavedAnimeProgress,
  resolveAnimeAdjacentEpisodes,
  saveAnimeProgress,
} from './AnimeEpisodeManager.js';
import {
  AnimeResolveResponse,
  AnimeStreamSource,
  pickOptimalAnimeSource,
  resolveAnimeSources,
} from './AnimeSourceResolver.js';
import { AnimePlayerControls } from './AnimePlayerControls.js';
import {
  EpisodeItem,
  PlayerEpisodeDrawer,
  PlayerLoadingScreen,
  PlayerSubtitleSettingsModal,
  TailspinLoader,
} from '../components/PlayerIconsAndTypes.js';
import { SmartPlaybackControls } from '../components/PlayerControlsOverlay.js';

export interface AnimePlayerProps {
  tmdbId: string;
  season?: number;
  episode?: number;
  mediaType?: 'movie' | 'tv';
  audioPreference?: string;
  autoplay?: boolean;
  accentColor?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onEpisodeChange?: (season: number, episode: number) => void;
  onMediaTypeResolved?: (resolvedType: 'movie' | 'tv') => void;
}

const LANG_CODE_TO_LABEL: Record<string, string> = {
  ja: 'Japanese (Sub)',
  en: 'English (Dub)',
  hi: 'Hindi (Dub)',
  ta: 'Tamil (Dub)',
  te: 'Telugu (Dub)',
  kn: 'Kannada (Dub)',
  ml: 'Malayalam (Dub)',
  es: 'Spanish (Dub)',
  fr: 'French (Dub)',
  de: 'German (Dub)',
  pt: 'Portuguese (Dub)',
  ru: 'Russian (Dub)',
};

export const AnimePlayer: React.FC<AnimePlayerProps> = ({
  tmdbId,
  season: initialSeason = 1,
  episode: initialEpisode = 1,
  mediaType: initialMediaType,
  audioPreference: initialAudio = 'ja',
  autoplay = true,
  accentColor = '#e11d48',
  showBackButton = true,
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
  const seekBarRef = useRef<HTMLDivElement>(null);

  const usingExternalDubRef = useRef<boolean>(false);
  const mutedRef = useRef<boolean>(false);
  const volumeRef = useRef<number>(1);
  const lastDriftSyncRef = useRef<number>(0);
  const dubRequestIdRef = useRef<number>(0);
  const failedSourceIdsRef = useRef<Set<string>>(new Set());

  const [currentSeason, setCurrentSeason] = useState<number>(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode || 1);
  const [audioPref, setAudioPref] = useState<string>(initialAudio);
  const [usingExternalDub, setUsingExternalDub] = useState<boolean>(false);
  const [activeDubUrl, setActiveDubUrl] = useState<string>('');

  // Verification & Metadata State
  const [validating, setValidating] = useState<boolean>(true);
  const [validationResult, setValidationResult] = useState<AnimeValidationResult | null>(null);
  const [pauseLogoError, setPauseLogoError] = useState<boolean>(false);

  // Playback & Source State
  const [sources, setSources] = useState<AnimeStreamSource[]>([]);
  const [activeSource, setActiveSource] = useState<AnimeStreamSource | null>(null);
  const [loadingSource, setLoadingSource] = useState<boolean>(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  // Genuine Real Audio Tracks
  const [availableAudioTracks, setAvailableAudioTracks] = useState<
    Array<{ code: string; label: string; isSub: boolean; isDub: boolean }>
  >([]);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const pendingAudioSeekTimeRef = useRef<number | null>(null);
  const wasPlayingBeforeAudioSwitchRef = useRef<boolean>(false);

  // Player Engine State
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
  const [hintIndex, setHintIndex] = useState<number>(0);

  // Hover Seekbar
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  // Double-tap Skip Animation (-10s / +10s)
  const [skipFeedback, setSkipFeedback] = useState<{ dir: 'left' | 'right'; amount: number } | null>(null);
  const skipTimerRef = useRef<number | null>(null);

  // Settings & Qualities
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [qualities, setQualities] = useState<{ index: number; height: number }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1);
  const [subtitles, setSubtitles] = useState<Array<{ id: string; language: string; url: string }>>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(autoplay);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover' | 'fill'>('contain');

  // Subtitle styling modal state
  const [subtitleModalOpen, setSubtitleModalOpen] = useState<boolean>(false);
  const [subFontSize, setSubFontSize] = useState<number>(100);
  const [subBgOpacity, setSubBgOpacity] = useState<number>(50);
  const [subPosition, setSubPosition] = useState<number>(85);
  const [subTextColor, setSubTextColor] = useState<string>('#ffffff');
  const [subTimeOffset, setSubTimeOffset] = useState<number>(0);

  // Resume notification state
  const [resumedNotice, setResumedNotice] = useState<string | null>(null);

  // Episodes & Drawer State
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState<boolean>(false);
  const [selectedSeasonForDrawer, setSelectedSeasonForDrawer] = useState<number>(initialSeason || 1);
  const [seasonEpisodes, setSeasonEpisodes] = useState<AnimeEpisodeSummary[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);

  // OP / ED Timing State
  const [introStart, setIntroStart] = useState<number | null>(null);
  const [introEnd, setIntroEnd] = useState<number | null>(null);
  const [outroStart, setOutroStart] = useState<number | null>(null);
  const [outroEnd, setOutroEnd] = useState<number | null>(null);
  const [skippedIntro, setSkippedIntro] = useState<boolean>(false);
  const [skippedOutro, setSkippedOutro] = useState<boolean>(false);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [countdownCancelled, setCountdownCancelled] = useState<boolean>(false);

  // Controls auto-hide timer
  const hideControlsTimeoutRef = useRef<number | null>(null);

  const cleanupExternalDubAudio = useCallback((keepVideoMuted = false) => {
    dubRequestIdRef.current += 1;
    if (dubDashRef.current) {
      try {
        dubDashRef.current.reset();
      } catch {
        // ignore
      }
      dubDashRef.current = null;
    }
    if (dubAudioRef.current) {
      try {
        dubAudioRef.current.pause();
        dubAudioRef.current.removeAttribute('src');
        dubAudioRef.current.load();
      } catch {
        // ignore
      }
    }
    usingExternalDubRef.current = false;
    setUsingExternalDub(false);
    setActiveDubUrl('');
    if (videoRef.current && !keepVideoMuted) {
      videoRef.current.muted = mutedRef.current;
      videoRef.current.volume = volumeRef.current;
    }
  }, []);

  const attachExternalDubAudio = useCallback(
    (dubUrl: string, langCode: string, langLabel: string, silentToast = false) => {
      const dubAudio = dubAudioRef.current;
      const video = videoRef.current;
      if (!dubAudio || !video) return;

      const reqId = ++dubRequestIdRef.current;

      if (dubDashRef.current) {
        try {
          dubDashRef.current.reset();
        } catch {
          // ignore
        }
        dubDashRef.current = null;
      }

      // Immediately mute the primary video element so Japanese audio never bleeds through
      usingExternalDubRef.current = true;
      setUsingExternalDub(true);
      video.muted = true;

      const proxyAudioMpdUrl = `/api/stream/mpd-audio?url=${encodeURIComponent(dubUrl)}`;
      setActiveDubUrl(proxyAudioMpdUrl);

      const dubDash = dashjs.MediaPlayer().create();
      dubDashRef.current = dubDash;

      dubAudio.volume = volumeRef.current;
      dubAudio.muted = mutedRef.current;
      dubAudio.playbackRate = video.playbackRate || 1;

      const syncAndPlayDub = () => {
        if (dubRequestIdRef.current !== reqId) return;
        const v = videoRef.current;
        const a = dubAudioRef.current;
        if (!v || !a) return;

        v.muted = true;
        a.volume = volumeRef.current;
        a.muted = mutedRef.current;
        a.playbackRate = v.playbackRate || 1;

        if (Number.isFinite(v.currentTime) && v.currentTime > 0 && Math.abs(a.currentTime - v.currentTime) > 0.25) {
          try {
            a.currentTime = v.currentTime;
          } catch {
            // ignore
          }
        }

        if (!v.paused) {
          a.play().catch(() => {});
        }
      };

      dubDash.initialize(dubAudio, proxyAudioMpdUrl, !video.paused);
      dubDash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, syncAndPlayDub);
      dubDash.on(dashjs.MediaPlayer.events.CAN_PLAY, syncAndPlayDub);

      setAudioPref(langCode);
      if (!silentToast) {
        setAudioNotice(`Audio switched to ${langLabel}`);
        setTimeout(() => setAudioNotice(null), 3000);
      }
    },
    []
  );

  // Cleanup external dub audio on unmount
  useEffect(() => {
    return () => {
      cleanupExternalDubAudio(true);
    };
  }, [cleanupExternalDubAudio]);

  const resetControlsTimeout = useCallback(() => {
    setControlsVisible(true);
    setPausedIdleOverlay(false);
    if (hideControlsTimeoutRef.current) {
      window.clearTimeout(hideControlsTimeoutRef.current);
    }
    if (playing) {
      hideControlsTimeoutRef.current = window.setTimeout(() => {
        if (!settingsOpen && !episodeDrawerOpen) {
          setControlsVisible(false);
        }
      }, 3500);
    }
  }, [playing, settingsOpen, episodeDrawerOpen]);

  // Hint cycle for loading screen
  useEffect(() => {
    const hintTimer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(hintTimer);
  }, []);

  // Show paused idle overlay after 4 seconds of paused state
  useEffect(() => {
    if (!playing && canPlay) {
      const idleTimer = window.setTimeout(() => {
        if (!playing && !settingsOpen && !episodeDrawerOpen) {
          setPausedIdleOverlay(true);
        }
      }, 4000);
      return () => clearTimeout(idleTimer);
    } else {
      setPausedIdleOverlay(false);
    }
  }, [playing, canPlay, settingsOpen, episodeDrawerOpen]);

  // 1. Strict Anime-Only Validation
  useEffect(() => {
    let cancelled = false;
    setValidating(true);
    setValidationResult(null);
    setPauseLogoError(false);
    setSourceError(null);
    setCanPlay(false);
    cleanupExternalDubAudio();

    fetchAnimeValidation(tmdbId, initialMediaType)
      .then((res) => {
        if (cancelled) return;
        setValidationResult(res);
        setValidating(false);
        if (res.isValidAnime && res.mediaType && res.mediaType !== initialMediaType) {
          onMediaTypeResolved?.(res.mediaType);
        }
      })
      .catch((_err) => {
        if (cancelled) return;
        setValidationResult({
          isValidAnime: false,
          isAnime: false,
          mediaType: initialMediaType || 'tv',
          tmdbId: Number(tmdbId) || 0,
          title: `TMDB #${tmdbId}`,
          genres: [],
          genreIds: [],
          originalLanguage: '',
          originCountry: [],
          rejectionReason: 'Failed to verify anime content with TMDB service.',
        });
        setValidating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tmdbId, initialMediaType, cleanupExternalDubAudio]);

  // 2. Fetch Season Episodes list when anime TV series is verified
  useEffect(() => {
    if (!validationResult?.isValidAnime || validationResult.mediaType !== 'tv') {
      return;
    }

    let cancelled = false;
    setLoadingEpisodes(true);

    fetchAnimeSeasonEpisodes(validationResult.tmdbId, selectedSeasonForDrawer)
      .then((episodes) => {
        if (cancelled) return;
        setSeasonEpisodes(episodes);
        setLoadingEpisodes(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSeasonEpisodes([]);
        setLoadingEpisodes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [validationResult?.isValidAnime, validationResult?.tmdbId, validationResult?.mediaType, selectedSeasonForDrawer]);

  // 3. Fetch OP / ED intro & outro timings
  useEffect(() => {
    if (!validationResult?.isValidAnime || validationResult.mediaType !== 'tv') {
      setIntroStart(null);
      setIntroEnd(null);
      setOutroStart(null);
      setOutroEnd(null);
      return;
    }

    let cancelled = false;
    setSkippedIntro(false);
    setSkippedOutro(false);
    setCountdownCancelled(false);

    fetchAnimeEpisodeTiming({
      tmdbId: validationResult.tmdbId,
      mediaType: validationResult.mediaType,
      season: currentSeason,
      episode: currentEpisode,
      duration,
    })
      .then((timing) => {
        if (cancelled) return;
        setIntroStart(timing.introStart);
        setIntroEnd(timing.introEnd);
        setOutroStart(timing.outroStart);
        setOutroEnd(timing.outroEnd);
      })
      .catch(() => {
        if (cancelled) return;
        setIntroStart(null);
        setIntroEnd(null);
        setOutroStart(null);
        setOutroEnd(null);
      });

    return () => {
      cancelled = true;
    };
  }, [validationResult?.isValidAnime, validationResult?.tmdbId, validationResult?.mediaType, currentSeason, currentEpisode, duration]);

  // 4. Resolve playback sources for verified anime (runs on episode change or initial load)
  useEffect(() => {
    if (!validationResult || !validationResult.isValidAnime) {
      setSources([]);
      setActiveSource(null);
      setAvailableAudioTracks([]);
      cleanupExternalDubAudio();
      return;
    }

    let cancelled = false;
    setLoadingSource(true);
    setSourceError(null);
    setCanPlay(false);
    failedSourceIdsRef.current.clear();
    cleanupExternalDubAudio();

    resolveAnimeSources({
      tmdbId: validationResult.tmdbId,
      mediaType: validationResult.mediaType,
      season: currentSeason,
      episode: currentEpisode,
      preferredAudio: audioPref,
    })
      .then((res: AnimeResolveResponse) => {
        if (cancelled) return;
        setLoadingSource(false);
        if (!res.sources || res.sources.length === 0) {
          setSourceError(res.error || 'No authorized playback source available for this anime title/episode.');
          return;
        }

        setSources(res.sources);
        const resolvedAudioTracks = res.availableAudioTracks || [];
        setAvailableAudioTracks(resolvedAudioTracks);

        if (res.subtitles && res.subtitles.length > 0) {
          setSubtitles(res.subtitles);
        }

        // Verify if user's requested audioPref is truly available
        let activeLang = audioPref.toLowerCase().trim();
        const isPrefAvailable = resolvedAudioTracks.some((t) => t.code === activeLang);
        if (!isPrefAvailable && resolvedAudioTracks.length > 0) {
          if (activeLang !== 'ja') {
            const label = LANG_CODE_TO_LABEL[activeLang] || activeLang.toUpperCase();
            const cleanLabel = label.replace(/\s*\([^)]*\)/, '');
            setAudioNotice(`${cleanLabel} audio is not available for this episode.`);
            setTimeout(() => setAudioNotice(null), 3500);
          }
          activeLang = resolvedAudioTracks[0].code;
          setAudioPref(activeLang);
        }

        // Primary video stream should always prefer universal non-HEVC H.264 video (e.g. alatreon HLS)
        const primaryVideoSource =
          pickOptimalAnimeSource(res.sources, 'ja') ||
          res.sources.find((s) => !s.onlyHevc) ||
          res.sources[0];

        if (activeLang !== 'ja') {
          const dubSource = pickOptimalAnimeSource(res.sources, activeLang);
          if (dubSource) {
            if (dubSource.type === 'dash' || dubSource.url.includes('.mpd') || dubSource.onlyHevc) {
              // Play universal video on <video> (muted) and attach DASH dub audio on <audio>
              setActiveSource(primaryVideoSource);
              const trackObj = resolvedAudioTracks.find((t) => t.code === activeLang);
              setTimeout(() => {
                if (!cancelled) {
                  attachExternalDubAudio(
                    dubSource.url,
                    activeLang,
                    trackObj?.label || LANG_CODE_TO_LABEL[activeLang] || activeLang.toUpperCase(),
                    true
                  );
                }
              }, 50);
              return;
            } else {
              setActiveSource(dubSource);
              return;
            }
          }
        }

        setActiveSource(primaryVideoSource);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadingSource(false);
        setSourceError(err instanceof Error ? err.message : 'Error resolving anime stream source.');
      });

    return () => {
      cancelled = true;
    };
  }, [validationResult, currentSeason, currentEpisode]);

  // Helper to fallback to next working video source if current video source fails
  const tryFallbackVideoSource = useCallback(
    (failedSource: AnimeStreamSource) => {
      failedSourceIdsRef.current.add(failedSource.id);
      const nextCandidate = sources.find(
        (s) =>
          !failedSourceIdsRef.current.has(s.id) &&
          (!s.isDub || s.audioLang === 'ja') &&
          !s.onlyHevc
      ) || sources.find((s) => !failedSourceIdsRef.current.has(s.id) && (!s.isDub || s.audioLang === 'ja'));

      if (nextCandidate) {
        setActiveSource(nextCandidate);
        return true;
      }
      return false;
    },
    [sources]
  );

  // 5. Attach Video Stream (HLS, DASH, MP4) & Restore Position on Source Swap
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSource) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }

    const { url, type } = activeSource;

    // Ensure video mute state respects external dub audio
    video.muted = usingExternalDubRef.current ? true : mutedRef.current;
    video.volume = volumeRef.current;

    const startVideoPlayback = () => {
      video.muted = usingExternalDubRef.current ? true : mutedRef.current;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (usingExternalDubRef.current && dubAudioRef.current) {
              dubAudioRef.current.currentTime = video.currentTime;
              dubAudioRef.current.play().catch(() => {});
            }
          })
          .catch(() => {
            // Browser blocked unmuted autoplay; fallback to muted autoplay so video still plays
            if (!usingExternalDubRef.current) {
              mutedRef.current = true;
              setMuted(true);
            }
            video.muted = true;
            video.play().catch(() => {});
          });
      }
    };

    const restorePlaybackState = () => {
      if (
        pendingAudioSeekTimeRef.current !== null &&
        Number.isFinite(pendingAudioSeekTimeRef.current) &&
        pendingAudioSeekTimeRef.current > 0
      ) {
        const seekTarget = pendingAudioSeekTimeRef.current;
        pendingAudioSeekTimeRef.current = null;
        try {
          video.currentTime = seekTarget;
          setCurrentTime(seekTarget);
        } catch {
          // ignore
        }
        if (wasPlayingBeforeAudioSwitchRef.current) {
          startVideoPlayback();
          wasPlayingBeforeAudioSwitchRef.current = false;
        }
      } else {
        applySavedProgress(video);
        if (autoplay) {
          startVideoPlayback();
        }
      }
    };

    const connectWatchdog = window.setTimeout(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        tryFallbackVideoSource(activeSource);
      }
    }, 9000);

    const attachStream = () => {
      if (type === 'hls' || url.includes('.m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
            fragLoadingMaxRetry: 2,
            levelLoadingMaxRetry: 2,
            manifestLoadingMaxRetry: 2,
          });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
            // Only merge embedded HLS audio tracks if there are genuinely > 1 distinct tracks
            if (data.audioTracks && data.audioTracks.length > 1) {
              setAvailableAudioTracks((prev) => {
                const merged = [...prev];
                for (const t of data.audioTracks) {
                  const lang = (t.lang || '').toLowerCase().trim();
                  if (lang && !merged.some((m) => m.code === lang)) {
                    merged.push({
                      code: lang,
                      label: t.name || LANG_CODE_TO_LABEL[lang] || `${lang.toUpperCase()} Audio`,
                      isSub: lang === 'ja',
                      isDub: lang !== 'ja',
                    });
                  }
                }
                return merged;
              });
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            if (data.levels && data.levels.length > 0) {
              setQualities(
                data.levels.map((lvl, idx) => ({
                  index: idx,
                  height: lvl.height || 720,
                }))
              );
            }
            if (!usingExternalDubRef.current && hls.audioTracks && hls.audioTracks.length > 1) {
              const matchIdx = hls.audioTracks.findIndex(
                (t) =>
                  (t.lang || '').toLowerCase() === audioPref.toLowerCase() ||
                  (t.name || '').toLowerCase().includes(audioPref.toLowerCase())
              );
              if (matchIdx !== -1) {
                hls.audioTrack = matchIdx;
              }
            }
            restorePlaybackState();
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            const isPrePlayNetworkError =
              video.readyState < 3 &&
              (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
                data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT ||
                data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR ||
                data.details === Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT ||
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT);

            if (isPrePlayNetworkError) {
              if (tryFallbackVideoSource(activeSource)) {
                return;
              }
            }

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  if (!tryFallbackVideoSource(activeSource)) {
                    hls.startLoad();
                  }
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  if (!tryFallbackVideoSource(activeSource)) {
                    setSourceError('Playback encountered an unrecoverable stream error.');
                  }
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          restorePlaybackState();
        } else {
          setSourceError('Your browser does not support HLS video playback.');
        }
      } else if (type === 'dash' || url.includes('.mpd')) {
        const dash = dashjs.MediaPlayer().create();
        dashRef.current = dash;
        dash.initialize(video, url, autoplay);
        dash.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          const dashAudioTracks = dash.getTracksFor('audio');
          if (dashAudioTracks && dashAudioTracks.length > 1) {
            setAvailableAudioTracks((prev) => {
              const merged = [...prev];
              for (const dt of dashAudioTracks) {
                const lang = (dt.lang || '').toLowerCase().trim();
                if (lang && !merged.some((m) => m.code === lang)) {
                  merged.push({
                    code: lang,
                    label: LANG_CODE_TO_LABEL[lang] || `${lang.toUpperCase()} Audio`,
                    isSub: lang === 'ja',
                    isDub: lang !== 'ja',
                  });
                }
              }
              return merged;
            });
            if (!usingExternalDubRef.current) {
              const matchTrack = dashAudioTracks.find(
                (t) => (t.lang || '').toLowerCase() === audioPref.toLowerCase()
              );
              if (matchTrack) {
                dash.setCurrentTrack(matchTrack);
              }
            }
          }
          restorePlaybackState();
        });
        dash.on(dashjs.MediaPlayer.events.ERROR, () => {
          tryFallbackVideoSource(activeSource);
        });
      } else {
        video.src = url;
        restorePlaybackState();
      }
    };

    attachStream();

    return () => {
      window.clearTimeout(connectWatchdog);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        dashRef.current.reset();
        dashRef.current = null;
      }
    };
  }, [activeSource, autoplay, tryFallbackVideoSource]);

  // Apply saved progress on start
  const applySavedProgress = (video: HTMLVideoElement) => {
    if (!validationResult) return;
    const saved = getSavedAnimeProgress(validationResult.tmdbId, currentSeason, currentEpisode);
    if (saved && saved.currentTime > 15 && (!saved.duration || saved.currentTime < saved.duration - 30)) {
      video.currentTime = saved.currentTime;
      if (usingExternalDubRef.current && dubAudioRef.current) {
        dubAudioRef.current.currentTime = saved.currentTime;
      }
      setResumedNotice(`Resumed from ${Math.floor(saved.currentTime / 60)}:${String(Math.floor(saved.currentTime % 60)).padStart(2, '0')}`);
      setTimeout(() => setResumedNotice(null), 3500);
    }
  };

  // Periodic Progress Saving
  useEffect(() => {
    if (!validationResult || duration <= 0 || currentTime <= 5) return;
    saveAnimeProgress(validationResult.tmdbId, currentSeason, currentEpisode, currentTime, duration);
  }, [currentTime, duration, validationResult, currentSeason, currentEpisode]);

  // Handle Audio Track Switch seamlessly
  const handleSelectAudio = useCallback(
    (targetCode: string) => {
      const cleanCode = targetCode.toLowerCase().trim();
      const track = availableAudioTracks.find((t) => t.code === cleanCode);

      if (!track) {
        const label = LANG_CODE_TO_LABEL[cleanCode] || `${cleanCode.toUpperCase()} audio`;
        const cleanLabel = label.replace(/\s*\([^)]*\)/, '');
        setAudioNotice(`${cleanLabel} audio is not available for this episode.`);
        setTimeout(() => setAudioNotice(null), 3500);
        return;
      }

      // Clicking a language option is an explicit user gesture: ensure player is unmuted so user hears the selected language
      if (mutedRef.current) {
        mutedRef.current = false;
        setMuted(false);
        if (volumeRef.current === 0) {
          volumeRef.current = 1;
          setVolume(1);
        }
      }

      if (cleanCode === audioPref) {
        // Even if already selected, ensure audio is audible if user clicked it again
        if (usingExternalDubRef.current && dubAudioRef.current) {
          if (videoRef.current) videoRef.current.muted = true;
          dubAudioRef.current.muted = false;
          dubAudioRef.current.volume = volumeRef.current;
          if (videoRef.current && !videoRef.current.paused) {
            dubAudioRef.current.play().catch(() => {});
          }
        } else if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = volumeRef.current;
        }
        return;
      }

      const video = videoRef.current;
      const currentPos = video ? video.currentTime : currentTime;
      const wasPlaying = video ? !video.paused : playing;

      // Case A: Switching back to Japanese (Sub)
      if (cleanCode === 'ja') {
        cleanupExternalDubAudio(false);

        // 1. Check in-place Hls.js audioTracks
        if (hlsRef.current && hlsRef.current.audioTracks && hlsRef.current.audioTracks.length > 1) {
          const hlsTrackIndex = hlsRef.current.audioTracks.findIndex(
            (t) =>
              (t.lang || '').toLowerCase() === 'ja' ||
              (t.name || '').toLowerCase().includes('ja') ||
              (t.name || '').toLowerCase().includes('jpn')
          );
          if (hlsTrackIndex !== -1) {
            hlsRef.current.audioTrack = hlsTrackIndex;
          }
        }

        // 2. If activeSource on <video> is already a Japanese/original stream, no video reload needed!
        if (activeSource && (!activeSource.isDub || activeSource.audioLang === 'ja')) {
          if (video) {
            video.muted = mutedRef.current;
            video.volume = volumeRef.current;
          }
          setAudioPref('ja');
          setAudioNotice(`Audio switched to ${track.label}`);
          setTimeout(() => setAudioNotice(null), 3000);
          return;
        }

        // Otherwise switch activeSource back to optimal Japanese video source
        const jaSource = pickOptimalAnimeSource(sources, 'ja') || sources[0];
        if (jaSource) {
          pendingAudioSeekTimeRef.current = currentPos;
          wasPlayingBeforeAudioSwitchRef.current = wasPlaying;
          setAudioPref('ja');
          setActiveSource(jaSource);
          setAudioNotice(`Audio switched to ${track.label}`);
          setTimeout(() => setAudioNotice(null), 3000);
        }
        return;
      }

      // Case B: Switching to a Dub Language (e.g. 'hi' Hindi, 'en' English, etc.)
      // 1. Check in-place Hls.js multi-audio tracks first
      if (hlsRef.current && hlsRef.current.audioTracks && hlsRef.current.audioTracks.length > 1) {
        const hlsTrackIndex = hlsRef.current.audioTracks.findIndex(
          (t) =>
            (t.lang || '').toLowerCase() === cleanCode ||
            (t.name || '').toLowerCase().includes(cleanCode)
        );
        if (hlsTrackIndex !== -1) {
          cleanupExternalDubAudio(false);
          hlsRef.current.audioTrack = hlsTrackIndex;
          setAudioPref(cleanCode);
          setAudioNotice(`Audio switched to ${track.label}`);
          setTimeout(() => setAudioNotice(null), 3000);
          return;
        }
      }

      // 2. Check in-place Dash.js multi-audio tracks if not using external dub
      if (!usingExternalDubRef.current && dashRef.current) {
        const dashAudioTracks = dashRef.current.getTracksFor('audio');
        if (dashAudioTracks && dashAudioTracks.length > 1) {
          const dashTrack = dashAudioTracks.find(
            (t) => (t.lang || '').toLowerCase() === cleanCode
          );
          if (dashTrack) {
            dashRef.current.setCurrentTrack(dashTrack);
            setAudioPref(cleanCode);
            setAudioNotice(`Audio switched to ${track.label}`);
            setTimeout(() => setAudioNotice(null), 3000);
            return;
          }
        }
      }

      // 3. Find matching dub stream source (e.g. Orion DASH dub or direct HLS dub)
      const applyResolvedDubSource = (matchingSource: AnimeStreamSource) => {
        if (
          matchingSource.type === 'dash' ||
          matchingSource.url.includes('.mpd') ||
          matchingSource.onlyHevc
        ) {
          // Attach synchronized external DASH audio via /api/stream/mpd-audio while keeping <video> on H.264 stream!
          attachExternalDubAudio(matchingSource.url, cleanCode, track.label);
        } else {
          // Direct non-HEVC HLS/MP4 dub stream
          cleanupExternalDubAudio(false);
          pendingAudioSeekTimeRef.current = currentPos;
          wasPlayingBeforeAudioSwitchRef.current = wasPlaying;
          setAudioPref(cleanCode);
          setActiveSource(matchingSource);
          setAudioNotice(`Audio switched to ${track.label}`);
          setTimeout(() => setAudioNotice(null), 3000);
        }
      };

      const matchingSource = pickOptimalAnimeSource(sources, cleanCode);
      if (matchingSource) {
        applyResolvedDubSource(matchingSource);
      } else {
        // Query backend specifically for this language stream
        resolveAnimeSources({
          tmdbId: validationResult!.tmdbId,
          mediaType: validationResult!.mediaType,
          season: currentSeason,
          episode: currentEpisode,
          preferredAudio: cleanCode,
        })
          .then((res) => {
            if (res.sources && res.sources.length > 0) {
              setSources(res.sources);
              const foundSource = pickOptimalAnimeSource(res.sources, cleanCode);
              if (foundSource && foundSource.audioLang?.toLowerCase() === cleanCode) {
                applyResolvedDubSource(foundSource);
                return;
              }
            }
            const label = LANG_CODE_TO_LABEL[cleanCode] || cleanCode.toUpperCase();
            const cleanLabel = label.replace(/\s*\([^)]*\)/, '');
            setAudioNotice(`${cleanLabel} audio is not available for this episode.`);
            setTimeout(() => setAudioNotice(null), 3500);
          })
          .catch(() => {
            const label = LANG_CODE_TO_LABEL[cleanCode] || cleanCode.toUpperCase();
            const cleanLabel = label.replace(/\s*\([^)]*\)/, '');
            setAudioNotice(`${cleanLabel} audio is not available for this episode.`);
            setTimeout(() => setAudioNotice(null), 3500);
          });
      }
    },
    [
      availableAudioTracks,
      audioPref,
      currentTime,
      playing,
      sources,
      activeSource,
      validationResult,
      currentSeason,
      currentEpisode,
      cleanupExternalDubAudio,
      attachExternalDubAudio,
    ]
  );

  // Handle Skip with visual double-tap ripple
  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + seconds));
    video.currentTime = target;
    if (usingExternalDubRef.current && dubAudioRef.current) {
      dubAudioRef.current.currentTime = target;
    }
    setCurrentTime(target);

    setSkipFeedback({
      dir: seconds > 0 ? 'right' : 'left',
      amount: Math.abs(seconds),
    });
    if (skipTimerRef.current) window.clearTimeout(skipTimerRef.current);
    skipTimerRef.current = window.setTimeout(() => setSkipFeedback(null), 650);
  };

  // Episode Transition Helpers
  const adjacent = resolveAnimeAdjacentEpisodes({
    mediaType: validationResult?.mediaType || 'tv',
    currentSeason,
    currentEpisode,
    currentSeasonEpisodes: seasonEpisodes,
  });

  const handleNextEpisode = useCallback(() => {
    if (!adjacent.next) return;
    setCurrentSeason(adjacent.next.season);
    setSelectedSeasonForDrawer(adjacent.next.season);
    setCurrentEpisode(adjacent.next.episode);
    onEpisodeChange?.(adjacent.next.season, adjacent.next.episode);
  }, [adjacent.next, onEpisodeChange]);

  const handlePrevEpisode = useCallback(() => {
    if (!adjacent.prev) return;
    setCurrentSeason(adjacent.prev.season);
    setSelectedSeasonForDrawer(adjacent.prev.season);
    setCurrentEpisode(adjacent.prev.episode);
    onEpisodeChange?.(adjacent.prev.season, adjacent.prev.episode);
  }, [adjacent.prev, onEpisodeChange]);

  // Skip Intro (OP)
  const handleSkipIntro = () => {
    if (introEnd !== null && videoRef.current) {
      const target = Math.min((duration || Infinity) - 1, introEnd + 0.5);
      videoRef.current.currentTime = target;
      if (usingExternalDubRef.current && dubAudioRef.current) {
        dubAudioRef.current.currentTime = target;
      }
      setSkippedIntro(true);
    }
  };

  // Skip Outro (ED)
  const handleSkipOutro = () => {
    if (outroEnd !== null && videoRef.current) {
      const target = Math.min((duration || Infinity) - 1, outroEnd + 0.5);
      videoRef.current.currentTime = target;
      if (usingExternalDubRef.current && dubAudioRef.current) {
        dubAudioRef.current.currentTime = target;
      }
      setSkippedOutro(true);
    } else if (adjacent.next) {
      handleNextEpisode();
    }
  };

  // Auto-next countdown timer during outro
  const inOutroInterval =
    outroStart !== null &&
    currentTime >= outroStart &&
    (!duration || currentTime <= duration);

  const showNextEpisodeCountdown =
    validationResult?.mediaType === 'tv' &&
    adjacent.next !== null &&
    autoPlayNext &&
    !countdownCancelled &&
    inOutroInterval;

  useEffect(() => {
    if (!showNextEpisodeCountdown) {
      setNextCountdown(null);
      return;
    }
    if (nextCountdown === null) {
      setNextCountdown(5);
      return;
    }
    if (nextCountdown <= 0) {
      handleNextEpisode();
      return;
    }
    const timer = setTimeout(() => {
      setNextCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [showNextEpisodeCountdown, nextCountdown, handleNextEpisode]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: Loading Screen matching ZX Stream / NXSHA
  // --------------------------------------------------------------------------
  if (validating) {
    return (
      <div data-testid="anime-loading-screen" className="relative w-full h-full bg-black">
        <PlayerLoadingScreen
          backdropPath={null}
          logoPath={null}
          title={`Anime TMDB #${tmdbId}`}
          activeServerStatus="connecting"
          metadataError={null}
          hintIndex={hintIndex}
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Blocked Non-Anime Error State
  // --------------------------------------------------------------------------
  if (!validationResult || !validationResult.isValidAnime) {
    return (
      <div
        data-testid="anime-blocked-screen"
        className="w-full h-full bg-gradient-to-b from-zinc-950 via-black to-zinc-950 flex flex-col items-center justify-center text-white font-sans p-6 select-none relative overflow-hidden"
      >
        <div className="max-w-md w-full bg-zinc-900/80 border border-rose-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl text-center shadow-2xl relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-500 mb-4 shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
              ANIME CORE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-400">
              Content Filter
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
            Non-Anime Content Blocked
          </h2>

          <p className="text-sm text-zinc-300 leading-relaxed mb-6">
            {validationResult?.rejectionReason ||
              'Only authentic Japanese anime movies and series are permitted on Anime Core.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <a
              href={`/player/${validationResult?.mediaType || 'tv'}/${tmdbId}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all text-xs font-semibold text-white shadow-lg cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Open in Standard Player</span>
            </a>

            <button
              type="button"
              onClick={onBack || (() => window.history.back())}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-semibold text-zinc-300 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Valid Anime Player Viewport
  // --------------------------------------------------------------------------
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  const episodeDrawerItems: EpisodeItem[] = seasonEpisodes.map((ep) => ({
    id: ep.episodeNumber,
    episode_number: ep.episodeNumber,
    season_number: ep.seasonNumber,
    name: ep.name || `Episode ${ep.episodeNumber}`,
    overview: ep.overview || '',
    still_path: ep.stillPath || null,
    air_date: ep.airDate || null,
    vote_average: 0,
  }));

  // Genuine audio tracks to display in menu
  const genuineAudioTracks =
    availableAudioTracks.length > 0
      ? availableAudioTracks
      : [{ code: 'ja', label: 'Japanese (Sub)', isSub: true, isDub: false }];

  return (
    <div
      ref={containerRef}
      data-testid="anime-player-viewport"
      data-anime-verified="true"
      data-tmdb-id={validationResult.tmdbId}
      data-season={currentSeason}
      data-episode={currentEpisode}
      data-audio-pref={audioPref}
      data-using-external-dub={usingExternalDub ? 'true' : 'false'}
      data-active-dub-url={activeDubUrl}
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      className="relative w-full h-full bg-black overflow-hidden select-none font-sans text-white group"
    >
      {/* Synchronized External Dub Audio Element (for DASH/MPD dub tracks) */}
      <audio
        ref={dubAudioRef}
        data-testid="anime-dub-audio-element"
        crossOrigin="anonymous"
        className="hidden"
      />

      {/* Video Element */}
      <video
        ref={videoRef}
        data-testid="anime-video-element"
        playsInline
        crossOrigin="anonymous"
        style={{ objectFit: aspectMode }}
        onClick={(e) => {
          e.stopPropagation();
          resetControlsTimeout();
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width * 0.4) handleSkip(-10);
          else if (x > rect.width * 0.6) handleSkip(10);
          else toggleFullscreen();
        }}
        onCanPlay={() => {
          setCanPlay(true);
          setWaiting(false);
        }}
        onPlaying={() => {
          setCanPlay(true);
          setPlaying(true);
          setWaiting(false);
          if (usingExternalDubRef.current && dubAudioRef.current && videoRef.current) {
            videoRef.current.muted = true;
            if (Math.abs(dubAudioRef.current.currentTime - videoRef.current.currentTime) > 0.3) {
              dubAudioRef.current.currentTime = videoRef.current.currentTime;
            }
            dubAudioRef.current.play().catch(() => {});
          }
        }}
        onPlay={() => {
          setPlaying(true);
          setPausedIdleOverlay(false);
          if (usingExternalDubRef.current && dubAudioRef.current && videoRef.current) {
            videoRef.current.muted = true;
            dubAudioRef.current.currentTime = videoRef.current.currentTime;
            dubAudioRef.current.play().catch(() => {});
          }
        }}
        onPause={() => {
          setPlaying(false);
          if (usingExternalDubRef.current && dubAudioRef.current) {
            dubAudioRef.current.pause();
          }
        }}
        onWaiting={() => {
          setWaiting(true);
          if (usingExternalDubRef.current && dubAudioRef.current) {
            dubAudioRef.current.pause();
          }
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.duration && Number.isFinite(v.duration)) {
            setDuration(v.duration);
            setCanPlay(true);
          }
          if (pendingAudioSeekTimeRef.current !== null && Number.isFinite(pendingAudioSeekTimeRef.current) && pendingAudioSeekTimeRef.current > 0) {
            const seekTarget = pendingAudioSeekTimeRef.current;
            pendingAudioSeekTimeRef.current = null;
            try {
              v.currentTime = seekTarget;
              if (usingExternalDubRef.current && dubAudioRef.current) {
                dubAudioRef.current.currentTime = seekTarget;
              }
              setCurrentTime(seekTarget);
            } catch {
              // ignore
            }
            if (wasPlayingBeforeAudioSwitchRef.current) {
              v.play().catch(() => {});
              wasPlayingBeforeAudioSwitchRef.current = false;
            }
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          const t = v.currentTime;
          setCurrentTime(t);
          if (v.duration && Number.isFinite(v.duration)) setDuration(v.duration);
          if (v.buffered.length > 0) {
            setBufferedEnd(v.buffered.end(v.buffered.length - 1));
          }

          if (usingExternalDubRef.current && dubAudioRef.current) {
            if (!v.muted) v.muted = true;
            if (!v.paused && dubAudioRef.current.paused) {
              dubAudioRef.current.play().catch(() => {});
            }
            const now = Date.now();
            const drift = Math.abs(dubAudioRef.current.currentTime - t);
            if (drift > 0.35 && now - lastDriftSyncRef.current > 1500) {
              lastDriftSyncRef.current = now;
              dubAudioRef.current.currentTime = t;
            }
          }
        }}
        onEnded={() => {
          setPlaying(false);
          if (usingExternalDubRef.current && dubAudioRef.current) {
            dubAudioRef.current.pause();
          }
          clearAnimeProgress(validationResult.tmdbId, currentSeason, currentEpisode);
          if (autoPlayNext && adjacent.next) {
            handleNextEpisode();
          }
        }}
        className={`w-full h-full transition-opacity duration-300 ${
          canPlay ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Full-bleed Loading Screen when stream is preparing */}
      {!canPlay && (
        <PlayerLoadingScreen
          backdropPath={validationResult.backdropPath || null}
          logoPath={validationResult.logoPath || null}
          title={validationResult.title}
          activeServerStatus={loadingSource ? 'connecting' : 'checking'}
          metadataError={sourceError}
          hintIndex={hintIndex}
        />
      )}

      {/* Buffering Indicator matching ZX Stream / NXSHA */}
      {waiting && canPlay && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <TailspinLoader size={60} stroke={8} color="white" />
        </div>
      )}

      {/* Source Error Overlay */}
      {sourceError && (
        <div
          data-testid="anime-source-error"
          className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white"
        >
          <div className="max-w-sm flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Stream Unavailable</h3>
            <p className="text-xs text-zinc-400 mb-4">{sourceError}</p>
            <button
              type="button"
              onClick={() => {
                setSourceError(null);
                const alt = genuineAudioTracks.find((t) => t.code !== audioPref);
                if (alt) handleSelectAudio(alt.code);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Try Alternate Audio (Sub / Dub)
            </button>
          </div>
        </div>
      )}

      {/* Resumed Notification Toast */}
      {resumedNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-35 px-4 py-1.5 rounded-full bg-zinc-950/90 border border-white/20 text-xs font-semibold text-rose-400 backdrop-blur-md shadow-xl pointer-events-none transition-all">
          {resumedNotice}
        </div>
      )}

      {/* Audio Language Switch / Error Notification Toast */}
      {audioNotice && (
        <div
          data-testid="anime-audio-notice"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-35 px-4 py-2 rounded-xl bg-zinc-950/95 border border-white/20 text-xs font-semibold text-white backdrop-blur-md shadow-2xl flex items-center gap-2 pointer-events-none transition-all"
        >
          <Volume2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{audioNotice}</span>
        </div>
      )}

      {/* Double Tap Skip Feedback - 1:1 match with ZX Stream & NXSHA */}
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
            <span className="text-xs font-bold mt-1 text-white">
              {skipFeedback.dir === 'left' ? `-${skipFeedback.amount}s` : `+${skipFeedback.amount}s`}
            </span>
          </div>
        </div>
      )}

      {/* Transparent TMDB Logo on Video Pause */}
      {canPlay &&
        !playing &&
        !settingsOpen &&
        !episodeDrawerOpen &&
        validationResult.logoPath &&
        !pauseLogoError && (
          <img
            data-testid="player-pause-tmdb-logo"
            src={validationResult.logoPath}
            alt=""
            onError={() => setPauseLogoError(true)}
            className={`absolute left-6 sm:left-10 lg:left-12 z-20 max-h-12 sm:max-h-16 lg:max-h-24 max-w-[180px] sm:max-w-[260px] lg:max-w-[360px] w-auto h-auto object-contain pointer-events-none select-none transition-all duration-300 ${
              controlsVisible && !pausedIdleOverlay
                ? 'bottom-24 sm:bottom-28 lg:bottom-32'
                : 'bottom-8 sm:bottom-10 lg:bottom-12'
            }`}
          />
        )}

      {/* Floating Smart Playback Controls (Skip Intro, Skip Outro, Next Episode card) */}
      <SmartPlaybackControls
        canPlay={canPlay}
        settingsOpen={settingsOpen}
        showServersOverlay={false}
        showEpisodeDrawer={episodeDrawerOpen}
        controlsVisible={controlsVisible}
        playing={playing}
        activeCueText=""
        skipState={{
          showSkipRecap: false,
          showSkipIntro:
            introStart !== null &&
            introEnd !== null &&
            currentTime >= introStart &&
            currentTime < introEnd &&
            !skippedIntro,
          showSkipOutro:
            outroStart !== null &&
            outroEnd !== null &&
            currentTime >= outroStart &&
            currentTime < outroEnd &&
            !skippedOutro,
          showNextEpisode: showNextEpisodeCountdown && adjacent.next !== null,
        }}
        nextEpisodeInfo={
          adjacent.next
            ? {
                season: adjacent.next.season,
                episode: adjacent.next.episode,
                title: `Episode ${adjacent.next.episode}`,
                episodeId: `anime-s${adjacent.next.season}e${adjacent.next.episode}`,
                stillPath: null,
                isNextSeason: adjacent.next.season > currentSeason,
              }
            : null
        }
        autoPlayNext={autoPlayNext}
        countdownCancelled={countdownCancelled}
        nextCountdown={nextCountdown}
        onSkipRecap={() => {}}
        onSkipIntro={handleSkipIntro}
        onSkipOutro={handleSkipOutro}
        onNextEpisode={handleNextEpisode}
        onCancelCountdown={(e) => {
          e.stopPropagation();
          setCountdownCancelled(true);
          setNextCountdown(null);
        }}
      />

      {/* Episode Drawer - Exact shared component from ZX Stream & NXSHA */}
      {canPlay && validationResult.mediaType === 'tv' && episodeDrawerOpen && (
        <PlayerEpisodeDrawer
          loadingEpisodes={loadingEpisodes}
          seasonEpisodes={episodeDrawerItems}
          selectedSeasonForDrawer={selectedSeasonForDrawer}
          currentSeason={currentSeason}
          currentEpisode={currentEpisode}
          onClose={() => setEpisodeDrawerOpen(false)}
          onSelectEpisode={(epNum) => {
            setCurrentSeason(selectedSeasonForDrawer);
            setCurrentEpisode(epNum);
            setEpisodeDrawerOpen(false);
            onEpisodeChange?.(selectedSeasonForDrawer, epNum);
          }}
        />
      )}

      {/* Subtitle Settings Modal */}
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

      {/* Main Controls Overlay */}
      <AnimePlayerControls
        canPlay={canPlay}
        playing={playing}
        controlsVisible={controlsVisible}
        title={validationResult.title}
        year={validationResult.releaseDate ? validationResult.releaseDate.slice(0, 4) : undefined}
        genreLabel={validationResult.genres?.join(', ') || 'Anime'}
        mediaType={validationResult.mediaType}
        currentSeason={currentSeason}
        currentEpisode={currentEpisode}
        totalSeasons={validationResult.totalSeasons}
        currentTime={currentTime}
        duration={duration}
        bufferedPercent={bufferedPercent}
        progressPercent={progressPercent}
        volume={volume}
        muted={muted}
        isFullscreen={isFullscreen}
        audioPreference={audioPref}
        availableAudioTracks={genuineAudioTracks}
        qualities={qualities}
        selectedQuality={selectedQuality}
        subtitles={subtitles}
        selectedSubtitle={selectedSubtitle}
        playbackRate={playbackRate}
        autoPlayNext={autoPlayNext}
        hasPrevEpisode={adjacent.prev !== null}
        hasNextEpisode={adjacent.next !== null}
        introStart={introStart}
        introEnd={introEnd}
        outroStart={outroStart}
        outroEnd={outroEnd}
        episodeDrawerOpen={episodeDrawerOpen}
        selectedSeasonForDrawer={selectedSeasonForDrawer}
        accentColor={accentColor}
        showBackButton={showBackButton}
        aspectMode={aspectMode}
        onBack={onBack}
        onTogglePlay={() => {
          resetControlsTimeout();
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }}
        onSkip={handleSkip}
        onPrevEpisode={handlePrevEpisode}
        onNextEpisode={handleNextEpisode}
        onToggleMute={() => {
          const v = videoRef.current;
          if (!v) return;
          const nextMuted = !muted;
          mutedRef.current = nextMuted;
          setMuted(nextMuted);
          if (usingExternalDubRef.current && dubAudioRef.current) {
            v.muted = true;
            dubAudioRef.current.muted = nextMuted;
          } else {
            v.muted = nextMuted;
          }
        }}
        onVolumeChange={(val) => {
          const v = videoRef.current;
          if (!v) return;
          const nextMuted = val === 0;
          volumeRef.current = val;
          mutedRef.current = nextMuted;
          setVolume(val);
          setMuted(nextMuted);
          if (usingExternalDubRef.current && dubAudioRef.current) {
            v.muted = true;
            dubAudioRef.current.volume = val;
            dubAudioRef.current.muted = nextMuted;
          } else {
            v.volume = val;
            v.muted = nextMuted;
          }
        }}
        onToggleFullscreen={toggleFullscreen}
        onSelectAudio={handleSelectAudio}
        onSelectQuality={(qIdx) => {
          setSelectedQuality(qIdx);
          if (hlsRef.current) {
            hlsRef.current.currentLevel = qIdx;
          }
        }}
        onSelectSubtitle={(id) => setSelectedSubtitle(id)}
        onSelectSpeed={(rate) => {
          setPlaybackRate(rate);
          if (videoRef.current) videoRef.current.playbackRate = rate;
          if (dubAudioRef.current) dubAudioRef.current.playbackRate = rate;
        }}
        onToggleAutoNext={() => setAutoPlayNext((prev) => !prev)}
        onToggleAspectRatio={() => {
          setAspectMode((prev) =>
            prev === 'contain' ? 'cover' : prev === 'cover' ? 'fill' : 'contain'
          );
        }}
        onOpenSubtitleModal={() => setSubtitleModalOpen(true)}
        onToggleEpisodeDrawer={() => setEpisodeDrawerOpen((prev) => !prev)}
        onSelectSeasonForDrawer={(sNum) => setSelectedSeasonForDrawer(sNum)}
        seekBarRef={seekBarRef}
        onSeekBarMouseMove={(e) => {
          const bar = seekBarRef.current;
          if (!bar || duration <= 0) return;
          const rect = bar.getBoundingClientRect();
          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setHoverTime(percent * duration);
          setHoverPercent(percent * 100);
        }}
        onSeekBarLeave={() => setHoverTime(null)}
        onSeekBarClick={(e) => {
          const bar = seekBarRef.current;
          const v = videoRef.current;
          if (!bar || !v || duration <= 0) return;
          const rect = bar.getBoundingClientRect();
          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const target = percent * duration;
          v.currentTime = target;
          if (usingExternalDubRef.current && dubAudioRef.current) {
            dubAudioRef.current.currentTime = target;
          }
          setCurrentTime(target);
        }}
        hoverTime={hoverTime}
        hoverPercent={hoverPercent}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
      />
    </div>
  );
};

export default AnimePlayer;
