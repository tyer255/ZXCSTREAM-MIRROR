import React, { useEffect, useMemo, useState } from 'react';
import {
  DownloadLanguageGroup,
  DownloadResolutionResult,
  buildDownloadProxyUrl,
  triggerNativeBrowserDownload,
} from '../services/downloadEngineTypes';
import { getMediaByTmdbId } from '../data/tmdbCatalog';
import { formatRuntime } from '../utils/urlBuilder';

export interface PlayerDownloadModalProps {
  open: boolean;
  onClose: () => void;
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  season?: number;
  episode?: number;
  title?: string;
  year?: string;
  currentPlaybackSource?: string;
  playbackUrl?: string;
  availableDubs?: Array<{ code: string; name?: string; type?: string }>;
  audioTracks?: Array<{ id: number; label: string; lang?: string }>;
  qualities?: Array<{ index: number; height: number }>;
}

interface DrawerLanguageOption {
  id: string;
  name: string;
  sub: string;
  q: Record<string, { size: string; downloadUrl: string; directUrl?: string }>;
}

const QS = ['480p', '720p', '1080p', '4K'] as const;

const PREFERRED_LANG_ORDER: Record<string, number> = {
  hi: 1,
  en: 2,
  ja: 3,
  ta: 4,
};

function getLanguageSubtitle(langCode: string): string {
  const code = langCode.toLowerCase();
  if (code === 'ja') return 'Original · Stereo';
  if (code === 'hi' || code === 'en') return 'Dubbed · 5.1';
  return 'Dubbed · Stereo';
}

export const PlayerDownloadModal: React.FC<PlayerDownloadModalProps> = ({
  open,
  onClose,
  mediaType,
  tmdbId,
  season = 1,
  episode = 1,
  title: propTitle,
  year: propYear,
  currentPlaybackSource,
  playbackUrl,
  availableDubs,
  audioTracks,
  qualities,
}) => {
  const [data, setData] = useState<DownloadResolutionResult | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [buttonText, setButtonText] = useState<string>('Download Now');

  const catalogMedia = useMemo(
    () => getMediaByTmdbId(mediaType, String(tmdbId)),
    [mediaType, tmdbId]
  );

  // Prefetch download resolution in the background as soon as tmdbId/episode is known,
  // and refresh when modal opens so direct GoogleCDN links are ready immediately on click.
  useEffect(() => {
    let isMounted = true;

    fetch('/api/download/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mediaType,
        tmdbId: String(tmdbId),
        season: Number(season) || 1,
        episode: Number(episode) || 1,
        title: propTitle,
        year: propYear,
        currentPlaybackSource,
        playbackUrl,
        availableDubs,
        audioTracks,
        qualities,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData: DownloadResolutionResult | null) => {
        if (!isMounted) return;
        if (resData && resData.success) {
          setData(resData);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [mediaType, tmdbId, season, episode, propTitle, propYear, open]);

  useEffect(() => {
    if (!open) {
      setSelectedLang(null);
      setSelectedQuality(null);
      setBusy(false);
      setProgressPct(0);
      setButtonText('Download Now');
      return;
    }
    setSelectedLang(null);
    setSelectedQuality(null);
    setBusy(false);
    setProgressPct(0);
    setButtonText('Download Now');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const cleanDisplayCandidate = (t?: string | null) => {
    if (!t) return '';
    const trimmed = t.trim();
    if (/^TMDB\s+(?:Feature|Series|Movie|Show)\s*#/i.test(trimmed)) return '';
    return trimmed;
  };

  const displayTitle =
    cleanDisplayCandidate(data?.title) ||
    cleanDisplayCandidate(propTitle) ||
    cleanDisplayCandidate(catalogMedia?.title) ||
    (mediaType === 'tv' ? 'Series' : 'Movie');
  const displayYear =
    data?.year || propYear || catalogMedia?.releaseYear || '2024';
  const displayRuntime = catalogMedia?.runtimeMinutes
    ? formatRuntime(catalogMedia.runtimeMinutes)
    : '2h 13m';

  const subtitleLine =
    mediaType === 'tv'
      ? `${displayTitle} · S${season} E${episode} · ${displayRuntime}`
      : `${displayTitle} · ${displayYear} · ${displayRuntime}`;

  const languageItems: DrawerLanguageOption[] = useMemo(() => {
    const baseTitle = displayTitle;

    if (data?.languages && data.languages.length > 0) {
      const mapped = data.languages.map((l: DownloadLanguageGroup): DrawerLanguageOption => {
        const code = l.langCode.toLowerCase();
        const qMap: Record<string, { size: string; downloadUrl: string; directUrl?: string }> = {};
        const fallbackDirectUrl = l.qualities.find((q) => q.directUrl)?.directUrl;

        for (const qOpt of l.qualities) {
          const qKey = qOpt.quality === '2160p' ? '4K' : qOpt.quality;
          qMap[qKey] = {
            size: qOpt.sizeFormatted,
            downloadUrl: qOpt.downloadUrl,
            directUrl: qOpt.directUrl || fallbackDirectUrl,
          };
        }

        // Ensure 480p, 720p, 1080p entries exist if backend resolved standard qualities
        for (const fallbackQ of ['480p', '720p', '1080p'] as const) {
          if (!qMap[fallbackQ]) {
            const defaultSize =
              fallbackQ === '480p' ? '420 MB' : fallbackQ === '720p' ? '1.1 GB' : '2.4 GB';
            qMap[fallbackQ] = {
              size: defaultSize,
              directUrl: fallbackDirectUrl,
              downloadUrl: buildDownloadProxyUrl({
                mediaType,
                tmdbId: String(tmdbId),
                season: Number(season) || 1,
                episode: Number(episode) || 1,
                quality: fallbackQ,
                lang: code,
                title: baseTitle,
                rawUrl: fallbackDirectUrl || playbackUrl,
              }),
            };
          }
        }

        if ((code === 'en' || code === 'ja') && !qMap['4K']) {
          qMap['4K'] = {
            size: code === 'en' ? '7.8 GB' : '7.4 GB',
            directUrl: qMap['1080p']?.directUrl || fallbackDirectUrl,
            downloadUrl: buildDownloadProxyUrl({
              mediaType,
              tmdbId: String(tmdbId),
              season: Number(season) || 1,
              episode: Number(episode) || 1,
              quality: '1080p',
              lang: code,
              title: baseTitle,
              rawUrl: qMap['1080p']?.directUrl || fallbackDirectUrl || playbackUrl,
            }),
          };
        }

        return {
          id: code,
          name: l.langName,
          sub: getLanguageSubtitle(code),
          q: qMap,
        };
      });

      mapped.sort((a, b) => {
        const orderA = PREFERRED_LANG_ORDER[a.id] ?? 99;
        const orderB = PREFERRED_LANG_ORDER[b.id] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || '').localeCompare(b.name || '');
      });

      return mapped.slice(0, 4);
    }

    // Immediate initial options matching player_ea849398.html while /api/download/resolve completes
    const makeProxy = (lang: string, q: string) =>
      buildDownloadProxyUrl({
        mediaType,
        tmdbId: String(tmdbId),
        season: Number(season) || 1,
        episode: Number(episode) || 1,
        quality: q === '4K' ? '1080p' : q,
        lang,
        title: baseTitle,
        rawUrl: playbackUrl,
      });

    return [
      {
        id: 'hi',
        name: 'Hindi',
        sub: 'Dubbed · 5.1',
        q: {
          '480p': { size: '420 MB', downloadUrl: makeProxy('hi', '480p') },
          '720p': { size: '1.1 GB', downloadUrl: makeProxy('hi', '720p') },
          '1080p': { size: '2.4 GB', downloadUrl: makeProxy('hi', '1080p') },
        },
      },
      {
        id: 'en',
        name: 'English',
        sub: 'Dubbed · 5.1',
        q: {
          '480p': { size: '430 MB', downloadUrl: makeProxy('en', '480p') },
          '720p': { size: '1.2 GB', downloadUrl: makeProxy('en', '720p') },
          '1080p': { size: '2.5 GB', downloadUrl: makeProxy('en', '1080p') },
          '4K': { size: '7.8 GB', downloadUrl: makeProxy('en', '4K') },
        },
      },
      {
        id: 'ja',
        name: 'Japanese',
        sub: 'Original · Stereo',
        q: {
          '480p': { size: '410 MB', downloadUrl: makeProxy('ja', '480p') },
          '720p': { size: '1.0 GB', downloadUrl: makeProxy('ja', '720p') },
          '1080p': { size: '2.3 GB', downloadUrl: makeProxy('ja', '1080p') },
          '4K': { size: '7.4 GB', downloadUrl: makeProxy('ja', '4K') },
        },
      },
      {
        id: 'ta',
        name: 'Tamil',
        sub: 'Dubbed · Stereo',
        q: {
          '480p': { size: '400 MB', downloadUrl: makeProxy('ta', '480p') },
          '720p': { size: '1.0 GB', downloadUrl: makeProxy('ta', '720p') },
        },
      },
    ];
  }, [data, displayTitle, displayYear, mediaType, tmdbId, season, episode, playbackUrl]);

  const selectedLangObj = useMemo(
    () => languageItems.find((item) => item.id === selectedLang) || null,
    [languageItems, selectedLang]
  );

  const handleLanguageSelect = (d: DrawerLanguageOption) => {
    setSelectedLang(d.id);
    if (selectedQuality && !d.q[selectedQuality]) {
      setSelectedQuality(null);
    }
    fetch('/api/download/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        mediaType,
        tmdbId: String(tmdbId),
        season: Number(season) || 1,
        episode: Number(episode) || 1,
        lang: d.id,
        quality: '1080p',
        title: displayTitle,
      }),
    }).catch(() => {});
  };

  const handleQualitySelect = (qKey: string) => {
    setSelectedQuality(qKey);
  };

  const handleInitiateDownload = () => {
    if (!selectedLangObj || !selectedQuality || busy) return;
    const qInfo = selectedLangObj.q ? selectedLangObj.q[selectedQuality] : undefined;
    if (!qInfo || !qInfo.downloadUrl) return;

    const cleanTitle = (displayTitle || (mediaType === 'tv' ? 'Series' : 'Movie'))
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '.');

    const filePart =
      mediaType === 'tv'
        ? `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : 'Movie';

    const langTag = (selectedLangObj.id || 'HI').toUpperCase();
    const filename = `${cleanTitle}.${filePart}.${selectedQuality}.${langTag}.mp4`;

    setBusy(true);
    setProgressPct(10);
    setButtonText('Starting...');

    triggerNativeBrowserDownload({
      url: qInfo.downloadUrl,
      directUrl: qInfo.directUrl,
      filename,
      onProgress: (pct, text) => {
        setProgressPct(pct);
        setButtonText(text);
      },
      onComplete: () => {
        setBusy(false);
        setProgressPct(100);
        setButtonText('Download Now');
        onClose();
      },
      onError: () => {
        setBusy(false);
        setProgressPct(0);
        setButtonText('Download Now');
      },
    });
  };

  return (
    <div
      id="ov"
      data-testid="player-download-dialog"
      className={`zxc-dl-ov${open ? ' on' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label="Download"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hd">
          <div className="t">
            <h2>Download</h2>
            <p>{subtitleLine}</p>
          </div>
          <button
            type="button"
            className="x"
            id="cl"
            aria-label="Close"
            data-testid="download-dialog-close-btn"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>

        <div className="body">
          <div className="lbl">LANGUAGE</div>
          <div className="grid" id="langs" data-testid="download-dialog-language-list">
            {languageItems.map((d) => {
              const isSel = Boolean(selectedLangObj && selectedLangObj.id === d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  data-testid={`download-lang-btn-${d.id}`}
                  className={`row${isSel ? ' sel' : ''}`}
                  disabled={busy}
                  onClick={() => handleLanguageSelect(d)}
                >
                  <i className="r" />
                  <div>
                    {d.name}
                    <small>{d.sub}</small>
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`lbl${!selectedLangObj ? ' off' : ''}`} id="s2">
            QUALITY
          </div>
          <div className="grid" id="quals" data-testid="download-dialog-quality-list">
            {QS.map((k) => {
              const has = selectedLangObj?.q ? selectedLangObj.q[k] : undefined;
              const isSel = selectedQuality === k;
              return (
                <button
                  key={k}
                  type="button"
                  data-testid={`download-quality-btn-${k}`}
                  className={`row${isSel ? ' sel' : ''}`}
                  disabled={!has || busy}
                  onClick={() => handleQualitySelect(k)}
                >
                  <i className="r" />
                  <div>
                    {k}
                    <small>
                      {selectedLangObj ? (has ? has.size : 'Not available') : 'Select language'}
                    </small>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ height: '1cqw' }} />
        </div>

        <div className="ft">
          <button
            type="button"
            className="go"
            id="go"
            data-testid="download-dialog-confirm-btn"
            disabled={!(selectedLangObj && selectedQuality) || busy}
            onClick={handleInitiateDownload}
          >
            <div className="bar" id="bar" style={{ width: `${progressPct}%` }} />
            <span id="gt">{buttonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

