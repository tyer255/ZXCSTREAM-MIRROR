import React, { useEffect, useState } from 'react';
import { Star, Download, ArrowLeft, Check, Film, Tv, Play, Loader2 } from 'lucide-react';
import {
  DUB_LANGUAGES,
  MediaType,
  calculateStarRating,
  formatRuntime,
} from '../utils/urlBuilder';
import {
  QUICK_SAMPLE_ITEMS,
  createActorAvatarDataUri,
  createArtworkDataUri,
  getMediaByTmdbId,
} from '../data/tmdbCatalog';
import { CustomPlayerView } from './CustomPlayerView';

export interface DownloadPageProps {
  mediaType: MediaType;
  tmdbId: string;
  onNavigateHome: () => void;
  onSelectMedia: (mediaType: MediaType, tmdbId: string) => void;
}

type DownloadTab = 'Overview' | 'Trailer' | 'Download' | 'Stream';

export const DownloadPage: React.FC<DownloadPageProps> = ({
  mediaType,
  tmdbId,
  onNavigateHome,
  onSelectMedia,
}) => {
  const [tmdbData, setTmdbData] = useState<any>(null);
  const mediaFallback = getMediaByTmdbId(mediaType, tmdbId);

  const media = tmdbData
    ? {
        tmdbId,
        mediaType,
        title: tmdbData.title || tmdbData.name || mediaFallback.title,
        tagline: tmdbData.tagline || mediaFallback.tagline,
        overview: tmdbData.overview || mediaFallback.overview,
        voteAverage: tmdbData.vote_average || tmdbData.rating || mediaFallback.voteAverage,
        runtimeMinutes: tmdbData.runtime || mediaFallback.runtimeMinutes,
        releaseYear: tmdbData.release_date
          ? String(new Date(tmdbData.release_date).getFullYear())
          : mediaFallback.releaseYear,
        status: tmdbData.status || mediaFallback.status,
        originalLanguage: tmdbData.original_language || mediaFallback.originalLanguage,
        country: tmdbData.country || mediaFallback.country,
        genres: tmdbData.genres?.map((g: any) => g.name) || mediaFallback.genres,
        accentHue: mediaFallback.accentHue,
        secondaryHue: mediaFallback.secondaryHue,
        posterUrl: tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
          : mediaFallback.posterUrl,
        backdropUrl: tmdbData.backdrop_path
          ? `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`
          : mediaFallback.backdropUrl,
        cast: mediaFallback.cast,
        downloads: mediaFallback.downloads,
        subtitles: mediaFallback.subtitles,
        seasons: mediaFallback.seasons,
      }
    : mediaFallback;

  const [activeTab, setActiveTab] = useState<DownloadTab>('Overview');
  const [selectedDub, setSelectedDub] = useState<string>('en');
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState<boolean>(false);
  const [liveStreamData, setLiveStreamData] = useState<any>(null);
  const [isResolvingStream, setIsResolvingStream] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/tmdb/details/${mediaType}/${tmdbId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) setTmdbData(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [mediaType, tmdbId]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'Download') {
      setIsResolvingStream(true);
      fetch('/api/stream/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType,
          tmdbId,
          serverPath: 'resshin_',
          season: selectedSeason,
          episode: selectedEpisode,
          title: media.title,
          releaseYear: media.releaseYear,
          dubCode: selectedDub,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted) {
            if (data && data.links) setLiveStreamData(data);
            setIsResolvingStream(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsResolvingStream(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, mediaType, tmdbId, selectedSeason, selectedEpisode, selectedDub, media.title, media.releaseYear]);

  const filledStars = calculateStarRating(media.voteAverage);
  const runtimeDisplay = formatRuntime(media.runtimeMinutes);
  const fallbackPosterUri = createArtworkDataUri(media, 'poster');
  const fallbackBackdropUri = createArtworkDataUri(media, 'backdrop');
  const posterUri = media.posterUrl ?? fallbackPosterUri;
  const backdropUri = media.backdropUrl ?? fallbackBackdropUri;

  const activeSeasonInfo =
    media.seasons?.find((s) => s.seasonNumber === selectedSeason) ??
    media.seasons?.[0] ?? { seasonNumber: 1, episodeCount: 8, name: 'Season 1' };

  const handleTriggerDownload = (id: string, filename: string, urlToDownload?: string) => {
    setDownloadedId(id);
    try {
      const a = document.createElement('a');
      a.href = urlToDownload || `#download-${id}`;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Ignore
    }
    window.setTimeout(() => {
      setDownloadedId((prev) => (prev === id ? null : prev));
    }, 2500);
  };

  const activeDownloads = liveStreamData?.links?.length
    ? liveStreamData.links.map((item: any, idx: number) => ({
        id: `live-dl-${idx}`,
        resolution: item.resolution || 1080,
        sizeFormatted: item.size ? `${(Number(item.size) / (1024 * 1024 * 1024)).toFixed(2)} GB` : '1.85 GB',
        format: item.type || 'mp4',
        codec: 'H.264 AAC',
        url: item.link,
      }))
    : media.downloads;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur-md px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            data-testid="download-back-home"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-blue-400" />
            <span>ZXC[STREAM] Home</span>
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-mono text-zinc-400 mr-1 hidden sm:inline">
              ENDPOINT: /download/{mediaType}/{media.tmdbId}
            </span>
            {QUICK_SAMPLE_ITEMS.slice(0, 4).map((item) => {
              const isCurrent = item.mediaType === mediaType && item.tmdbId === media.tmdbId;
              return (
                <button
                  key={`${item.mediaType}:${item.tmdbId}`}
                  type="button"
                  onClick={() => onSelectMedia(item.mediaType, item.tmdbId)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-900 text-white border border-blue-500/40'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/5'
                  }`}
                >
                  {item.mediaType === 'movie' ? <Film className="h-3 w-3" /> : <Tv className="h-3 w-3" />}
                  <span>{item.label.split(' (')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Backdrop + Poster + Metadata */}
      <div className="relative w-full h-[56vh] min-h-[360px] max-h-[540px] overflow-hidden">
        <img
          src={backdropUri}
          alt={media.title}
          onError={(e) => {
            if (e.currentTarget.src !== fallbackBackdropUri) {
              e.currentTarget.src = fallbackBackdropUri;
            }
          }}
          className="absolute inset-0 w-full h-full object-cover object-center grayscale-50 contrast-125 brightness-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/20 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto h-full flex items-end px-4 sm:px-6 pb-6 sm:pb-10 gap-4 sm:gap-8">
          <div className="relative aspect-[11/16] w-32 sm:w-40 md:w-52 rounded-md overflow-hidden shadow-2xl shrink-0 border border-white/10">
            <img
              src={posterUri}
              alt={media.title}
              onError={(e) => {
                if (e.currentTarget.src !== fallbackPosterUri) {
                  e.currentTarget.src = fallbackPosterUri;
                }
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-2 sm:space-y-3 max-w-2xl">
            <h1
              data-testid="download-media-title"
              className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight text-zinc-50"
            >
              {media.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-400">
              <div className="flex items-center gap-1" aria-label={`Rated ${media.voteAverage.toFixed(1)} out of 10`}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                      idx < filledStars ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'
                    }`}
                  />
                ))}
              </div>
              <span>
                {media.voteAverage.toFixed(1)}/10 | {runtimeDisplay} | {media.releaseYear}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
              {media.genres.map((genre: string) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-200"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Section */}
      <section className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12">
        <aside className="md:sticky md:top-20 h-fit space-y-6 text-sm">
          <h3 className="font-semibold uppercase tracking-wide text-zinc-400">Details</h3>
          <div className="space-y-3">
            <div>
              <p className="text-zinc-400">Status</p>
              <p className="font-medium text-zinc-100">{media.status}</p>
            </div>
            <div>
              <p className="text-zinc-400">Original language</p>
              <p className="font-medium text-zinc-100 uppercase">{media.originalLanguage}</p>
            </div>
            <div>
              <p className="text-zinc-400">Country</p>
              <p className="font-medium text-zinc-100">{media.country}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-12">
          <div className="border-b border-white/10 flex gap-8 text-sm font-medium overflow-x-auto">
            {(['Overview', 'Trailer', 'Download', 'Stream'] as DownloadTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                data-testid={`download-tab-${tab.toLowerCase()}`}
                className={`pb-3 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-red-600 text-zinc-50'
                    : 'border-transparent text-zinc-400 hover:text-zinc-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <div data-testid="tab-panel-overview" className="space-y-10">
              <p className="text-zinc-400 leading-relaxed max-w-3xl text-base">{media.overview}</p>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100">Casts</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {media.cast.map((actor: any) => (
                    <div key={actor.id} className="flex flex-col items-center text-sm space-y-2 text-center">
                      <div className="relative aspect-square w-28 rounded-full overflow-hidden bg-zinc-900 border-2 border-white/10 shadow-md">
                        <img
                          src={actor.profileUrl || createActorAvatarDataUri(actor)}
                          alt={actor.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-medium leading-tight text-zinc-200">
                        {actor.name} as <span className="text-zinc-400 font-normal">{actor.character}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Trailer' && (
            <div data-testid="tab-panel-trailer" className="max-w-3xl">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
                <img
                  src={backdropUri}
                  alt={`${media.title} Official Trailer`}
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />

                <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
                  {!isTrailerPlaying ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsTrailerPlaying(true)}
                        data-testid="play-trailer-btn"
                        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl transition transform hover:scale-105 cursor-pointer"
                        aria-label="Play Official Trailer"
                      >
                        <Play className="h-7 w-7 fill-current ml-0.5" />
                      </button>
                      <h3 className="text-lg sm:text-xl font-bold text-white">
                        {media.title} ({media.releaseYear}) — Official HD Trailer
                      </h3>
                      <p className="mt-1 text-xs text-zinc-300 max-w-md">{media.tagline}</p>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between text-xs text-zinc-300">
                        <span className="rounded bg-red-600/20 border border-red-500/40 px-2.5 py-1 font-mono text-red-300">
                          ● PLAYING OFFICIAL TRAILER
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsTrailerPlaying(false)}
                          className="rounded bg-zinc-800/80 px-2.5 py-1 text-zinc-200 hover:bg-zinc-700 cursor-pointer"
                        >
                          Reset Preview
                        </button>
                      </div>
                      <div className="my-auto space-y-2">
                        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white animate-pulse">
                          {media.title}
                        </p>
                        <p className="text-sm text-zinc-200 italic">&ldquo;{media.tagline}&rdquo;</p>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                        <div className="h-full w-2/3 bg-red-600 animate-pulse" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Download' && (
            <div data-testid="tab-panel-download" className="max-w-3xl space-y-6">
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="Audio Language"
                  value={selectedDub}
                  onChange={(e) => setSelectedDub(e.target.value)}
                  data-testid="download-lang-select"
                  className="bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-100 cursor-pointer"
                >
                  {DUB_LANGUAGES.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label} [{d.code.toUpperCase()}]
                    </option>
                  ))}
                </select>

                {mediaType === 'tv' && (
                  <>
                    <select
                      aria-label="Season"
                      value={selectedSeason}
                      onChange={(e) => {
                        setSelectedSeason(Number(e.target.value));
                        setSelectedEpisode(1);
                      }}
                      data-testid="download-season-select"
                      className="bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-100 cursor-pointer"
                    >
                      {(media.seasons ?? [{ seasonNumber: 1, episodeCount: 8, name: 'Season 1' }]).map(
                        (s: any) => (
                          <option key={s.seasonNumber} value={s.seasonNumber}>
                            Season {s.seasonNumber}
                          </option>
                        )
                      )}
                    </select>

                    <select
                      aria-label="Episode"
                      value={selectedEpisode}
                      onChange={(e) => setSelectedEpisode(Number(e.target.value))}
                      data-testid="download-episode-select"
                      className="bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-100 cursor-pointer"
                    >
                      {Array.from({ length: activeSeasonInfo.episodeCount }).map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          Episode {idx + 1}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Download Links</h3>
                    {isResolvingStream && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                  </div>

                  <div className="space-y-2">
                    {activeDownloads.map((dl: any) => {
                      const isDone = downloadedId === dl.id;
                      const fileLabel = `${media.title.replace(/\s+/g, '_')}_${
                        mediaType === 'tv' ? `S${selectedSeason}E${selectedEpisode}_` : ''
                      }${dl.resolution}p_${selectedDub.toUpperCase()}.${dl.format}`;

                      return (
                        <div
                          key={dl.id}
                          className="flex items-center justify-between rounded border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm hover:border-white/20 transition"
                        >
                          <div>
                            <p className="font-medium text-zinc-100">
                              {dl.resolution}p
                              <span className="ml-2 text-xs font-normal text-zinc-400">
                                ({DUB_LANGUAGES.find((d) => d.code === selectedDub)?.label ?? 'Original'})
                              </span>
                            </p>
                            <p className="text-xs text-zinc-400">
                              {dl.sizeFormatted} | {dl.format} • {dl.codec}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTriggerDownload(dl.id, fileLabel, dl.url)}
                            data-testid={`download-btn-${dl.resolution}`}
                            className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition cursor-pointer"
                          >
                            {isDone ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Started</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Subtitles</h3>
                  <div className="space-y-2">
                    {media.subtitles.map((sub: any) => {
                      const isDone = downloadedId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm hover:border-white/20 transition"
                        >
                          <p className="font-medium text-zinc-200">
                            {sub.lanName} <span className="text-xs text-zinc-400">[{sub.lan}]</span>
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleTriggerDownload(
                                sub.id,
                                `${media.title.replace(/\s+/g, '_')}.${sub.lan}.srt`,
                                sub.url
                              )
                            }
                            className="inline-flex items-center gap-2 rounded bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700 text-zinc-100 transition cursor-pointer"
                          >
                            {isDone ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Saved .srt</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Stream' && (
            <div data-testid="tab-panel-stream" className="max-w-3xl">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                <CustomPlayerView
                  playerMode="custom"
                  mediaType={mediaType}
                  tmdbId={media.tmdbId}
                  season={selectedSeason}
                  episode={selectedEpisode}
                  dubLang={selectedDub}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
