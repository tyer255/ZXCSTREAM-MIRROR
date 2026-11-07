import React, { useEffect, useState } from 'react';
import {
  Download,
  X,
  Check,
  Loader2,
  Film,
  Tv,
  Globe,
  Monitor,
  AlertCircle,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import {
  DownloadLanguageGroup,
  DownloadQualityOption,
  DownloadResolutionResult,
} from '../services/downloadEngineTypes';

export interface PlayerDownloadModalProps {
  open: boolean;
  onClose: () => void;
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  season?: number;
  episode?: number;
  currentPlaybackSource?: string;
  playbackUrl?: string;
  availableDubs?: Array<{ code: string; name?: string; type?: string }>;
  audioTracks?: Array<{ id: number; label: string; lang?: string }>;
  qualities?: Array<{ index: number; height: number }>;
}

export const PlayerDownloadModal: React.FC<PlayerDownloadModalProps> = ({
  open,
  onClose,
  mediaType,
  tmdbId,
  season = 1,
  episode = 1,
  currentPlaybackSource,
  playbackUrl,
  availableDubs,
  audioTracks,
  qualities,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DownloadResolutionResult | null>(null);

  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
  const [initiatedFileName, setInitiatedFileName] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setSelectedLang(null);
      setSelectedQuality(null);
      setDownloadStarted(false);
      setInitiatedFileName('');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSelectedLang(null);
    setSelectedQuality(null);
    setDownloadStarted(false);

    fetch('/api/download/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaType,
        tmdbId: String(tmdbId),
        season: Number(season) || 1,
        episode: Number(episode) || 1,
        currentPlaybackSource,
        playbackUrl,
        availableDubs,
        audioTracks,
        qualities,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} resolution failed`);
        return res.json();
      })
      .then((resData: DownloadResolutionResult) => {
        if (!isMounted) return;
        if (!resData || !resData.success) {
          setError(resData?.unsupportedReason || 'Unable to resolve authorized download files for this source.');
          setData(null);
        } else {
          setData(resData);
          // If only 1 language available, auto-select it for user convenience
          if (resData.languages && resData.languages.length === 1) {
            setSelectedLang(resData.languages[0].langCode);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to connect to the download resolution engine.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    open,
    mediaType,
    tmdbId,
    season,
    episode,
    currentPlaybackSource,
  ]);

  if (!open) return null;

  const currentLangGroup: DownloadLanguageGroup | undefined = data?.languages.find(
    (l) => l.langCode === selectedLang
  );

  const availableQualities: DownloadQualityOption[] = currentLangGroup?.qualities || [];

  const selectedQualityOption: DownloadQualityOption | undefined = availableQualities.find(
    (q) => q.quality === selectedQuality
  );

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLang(langCode);
    // Reset quality whenever language changes
    setSelectedQuality(null);
    setDownloadStarted(false);
  };

  const handleQualitySelect = (qKey: string) => {
    setSelectedQuality(qKey);
    setDownloadStarted(false);
  };

  const handleInitiateDownload = () => {
    if (!selectedLang || !selectedQuality || !selectedQualityOption) return;

    const url = selectedQualityOption.downloadUrl;
    const cleanTitle = (data?.title || (mediaType === 'tv' ? 'Series' : 'Movie'))
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .trim()
      .replace(/\s+/g, '.');

    const filePart =
      mediaType === 'tv'
        ? `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`
        : 'Movie';

    const filename = `${cleanTitle}.${filePart}.${selectedQuality}.${selectedLang.toUpperCase()}.mp4`;
    setInitiatedFileName(filename);
    setDownloadStarted(true);

    // Trigger standard browser native download anchor without loading large blob to memory
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
      data-testid="player-download-dialog"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 id="download-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Download Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Verified MP4
                </span>
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-1">
                {data?.title || 'Resolving media title...'}
                {mediaType === 'tv' && ` • S${season} E${episode}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close download modal"
            data-testid="download-dialog-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Scanning authentic source streams & dubs...</p>
            </div>
          )}

          {error && !loading && (
            <div
              data-testid="download-dialog-error"
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Download Unavailable</p>
                <p className="mt-1 text-xs text-red-300 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Media Context Card */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-900/70 border border-white/5 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  {mediaType === 'tv' ? (
                    <Tv className="w-4 h-4 text-purple-400 shrink-0" />
                  ) : (
                    <Film className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-white">{data.title}</span>
                    {mediaType === 'tv' && (
                      <span className="text-zinc-400 ml-1.5 font-mono text-xs">
                        [S{season} : E{episode}]
                      </span>
                    )}
                  </div>
                </div>
                {data.year && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                    {data.year}
                  </span>
                )}
              </div>

              {/* Step 1: Language Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>1. Select Audio Language</span>
                  </label>
                  {selectedLang && (
                    <span className="text-xs text-blue-400 font-medium">
                      Selected: {currentLangGroup?.langName}
                    </span>
                  )}
                </div>

                <div
                  data-testid="download-dialog-language-list"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                >
                  {data.languages.map((l) => {
                    const isSelected = selectedLang === l.langCode;
                    return (
                      <button
                        key={l.langCode}
                        type="button"
                        data-testid={`download-lang-btn-${l.langCode}`}
                        onClick={() => handleLanguageSelect(l.langCode)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                            : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{l.langName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Quality Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                    <span>2. Select Video Quality</span>
                  </label>
                  {!selectedLang && (
                    <span className="text-[11px] text-amber-400/90 font-mono">
                      (Select language first)
                    </span>
                  )}
                  {selectedQuality && (
                    <span className="text-xs text-emerald-400 font-medium">
                      Selected: {selectedQualityOption?.label}
                    </span>
                  )}
                </div>

                <div
                  data-testid="download-dialog-quality-list"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {/* If language not selected, render disabled mock placeholders */}
                  {!selectedLang
                    ? ['1080p Full HD', '720p HD', '480p SD', '360p Mobile'].map((qLabel) => (
                        <div
                          key={qLabel}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/30 border border-white/5 text-zinc-600 text-xs cursor-not-allowed select-none"
                        >
                          <span>{qLabel}</span>
                          <span className="font-mono text-[10px] text-zinc-600">Disabled</span>
                        </div>
                      ))
                    : availableQualities.map((q) => {
                        const isSelected = selectedQuality === q.quality;
                        return (
                          <button
                            key={q.quality}
                            type="button"
                            data-testid={`download-quality-btn-${q.quality}`}
                            onClick={() => handleQualitySelect(q.quality)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                                : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-medium">{q.label}</p>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                {q.sizeFormatted} • {q.format.toUpperCase()}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                </div>
              </div>

              {/* Download Summary & Status Banner */}
              {selectedLang && selectedQuality && selectedQualityOption && (
                <div
                  data-testid="download-selection-summary"
                  className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/20 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between text-blue-200">
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-blue-400" />
                      Ready for Download:
                    </span>
                    <span className="font-mono text-zinc-300">
                      {selectedQualityOption.sizeFormatted}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-[11px] truncate">
                    {data.title} • {currentLangGroup?.langName} • {selectedQualityOption.label}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct HTTP Range Support • Fast Browser Download</span>
                  </div>
                </div>
              )}

              {downloadStarted && (
                <div
                  data-testid="download-started-alert"
                  className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in"
                >
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="truncate">
                    Download initiated in browser: <span className="font-mono">{initiatedFileName}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-zinc-900/60 flex items-center justify-end gap-3">
          <button
            type="button"
            data-testid="download-dialog-cancel-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="download-dialog-confirm-btn"
            disabled={!selectedLang || !selectedQuality || loading || Boolean(error)}
            onClick={handleInitiateDownload}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              !selectedLang || !selectedQuality || loading || Boolean(error)
                ? 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white cursor-pointer shadow-blue-600/30'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {downloadStarted
                ? 'Download Again'
                : selectedLang && selectedQuality
                ? `Download ${selectedQualityOption?.quality || ''} (${currentLangGroup?.langName || ''})`
                : 'Select Language & Quality'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
