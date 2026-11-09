/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  AppRoute,
  MediaType,
  PlayerMode,
  parseAppRoute,
  parsePlayerQueryParams,
} from './utils/urlBuilder';
import { HomePage } from './components/HomePage';
import { DownloadPage } from './components/DownloadPage';
import { CustomPlayerView } from './components/CustomPlayerView';
import { AnimePlayer } from './anime/AnimePlayer';
import { DeveloperDashboardPage } from './components/DeveloperDashboardPage';

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute(window.location.pathname));
  const [search, setSearch] = useState<string>(() => window.location.search);
  const queryParams = parsePlayerQueryParams(search);
  const [announcementOpen, setAnnouncementOpen] = useState<boolean>(() => !queryParams.autostart);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseAppRoute(window.location.pathname));
      setSearch(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newPath: string, newSearch = '', scrollToTop = true) => {
    const fullUrl = newSearch ? `${newPath}?${newSearch.replace(/^\?/, '')}` : newPath;
    window.history.pushState({}, '', fullUrl);
    setRoute(parseAppRoute(newPath));
    setSearch(newSearch);
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (route.page === 'developers') {
    return (
      <DeveloperDashboardPage
        onNavigateHome={() => navigateTo('/')}
        onNavigateDownload={(
          mediaType: MediaType,
          tmdbId: string,
          season?: number,
          episode?: number
        ) => {
          if (mediaType === 'tv' && season && episode) {
            navigateTo(`/download/tv/${tmdbId}/${season}/${episode}`);
          } else {
            navigateTo(`/download/${mediaType}/${tmdbId}`);
          }
        }}
      />
    );
  }

  if (route.page === 'download') {
    return (
      <DownloadPage
        mediaType={route.mediaType}
        tmdbId={route.tmdbId}
        initialSeason={route.season}
        initialEpisode={route.episode}
        onNavigateHome={() => navigateTo('/')}
        onNavigateDevelopers={() => navigateTo('/developers')}
        onSelectMedia={(newMediaType: MediaType, newTmdbId: string) =>
          navigateTo(
            newMediaType === 'tv'
              ? `/download/tv/${newTmdbId}/1/1`
              : `/download/movie/${newTmdbId}`
          )
        }
      />
    );
  }

  if (route.page === 'anime') {
    return (
      <AnimePlayer
        tmdbId={route.tmdbId}
        season={route.season}
        episode={route.episode}
        mediaType={route.mediaType}
        audioPreference={queryParams.dubLang || 'ja'}
        autoplay={queryParams.autoplay !== false}
        accentColor={queryParams.color || '#e11d48'}
        showBackButton={true}
        onBack={() => navigateTo('/')}
        onEpisodeChange={(newSeason, newEpisode) => {
          if (route.mediaType === 'movie') {
            navigateTo(`/anime/movie/${route.tmdbId}`, search, false);
          } else {
            navigateTo(`/anime/tv/${route.tmdbId}/${newSeason}/${newEpisode}`, search, false);
          }
        }}
      />
    );
  }

  if (route.page === 'player') {
    return (
      <CustomPlayerView
        playerMode={route.playerMode}
        mediaType={route.mediaType}
        tmdbId={route.tmdbId}
        season={route.season}
        episode={route.episode}
        dubLang={queryParams.dubLang}
        initialServer={queryParams.server ?? 0}
        accentColor={queryParams.color}
        autoplay={queryParams.autoplay !== false}
        showBackButton={true}
        isStandalonePage={true}
        onBack={() => navigateTo('/')}
        onEpisodeChange={(newSeason, newEpisode) => {
          const endpoint =
            route.playerMode === 'overpower'
              ? 'overpower'
              : route.playerMode === 'nxsha'
              ? 'nxsha'
              : route.playerMode === 'custom'
              ? 'player'
              : 'embed';
          navigateTo(`/${endpoint}/tv/${route.tmdbId}/${newSeason}/${newEpisode}`, search, false);
        }}
      />
    );
  }

  return (
    <HomePage
      announcementOpen={announcementOpen}
      onDismissAnnouncement={() => setAnnouncementOpen(false)}
      onNavigateDevelopers={() => navigateTo('/developers')}
      onNavigateDownload={(mediaType: MediaType, tmdbId: string) =>
        navigateTo(`/download/${mediaType}/${tmdbId}`)
      }
      onOpenStandalonePlayer={(
        playerMode: PlayerMode,
        mediaType: MediaType,
        tmdbId: string,
        season: string,
        episode: string
      ) => {
        if (playerMode === 'anime') {
          const path =
            mediaType === 'tv'
              ? `/anime/tv/${tmdbId}/${season || '1'}/${episode || '1'}`
              : `/anime/movie/${tmdbId}`;
          navigateTo(path);
          return;
        }
        const endpoint =
          playerMode === 'nxsha'
            ? 'nxsha'
            : playerMode === 'custom'
            ? 'player'
            : 'embed';
        const path =
          mediaType === 'tv'
            ? `/${endpoint}/tv/${tmdbId}/${season || '1'}/${episode || '1'}`
            : `/${endpoint}/movie/${tmdbId}`;
        navigateTo(path);
      }}
    />
  );
}
