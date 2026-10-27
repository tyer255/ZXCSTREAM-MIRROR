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

  const navigateTo = (newPath: string, newSearch = '') => {
    const fullUrl = newSearch ? `${newPath}?${newSearch.replace(/^\?/, '')}` : newPath;
    window.history.pushState({}, '', fullUrl);
    setRoute(parseAppRoute(newPath));
    setSearch(newSearch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (route.page === 'download') {
    return (
      <DownloadPage
        mediaType={route.mediaType}
        tmdbId={route.tmdbId}
        onNavigateHome={() => navigateTo('/')}
        onSelectMedia={(newMediaType: MediaType, newTmdbId: string) =>
          navigateTo(`/download/${newMediaType}/${newTmdbId}`)
        }
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
          const endpoint = route.playerMode === 'custom' ? 'player' : 'embed';
          navigateTo(`/${endpoint}/tv/${route.tmdbId}/${newSeason}/${newEpisode}`, search);
        }}
      />
    );
  }

  return (
    <HomePage
      announcementOpen={announcementOpen}
      onDismissAnnouncement={() => setAnnouncementOpen(false)}
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
        const endpoint = playerMode === 'custom' ? 'player' : 'embed';
        const path =
          mediaType === 'tv'
            ? `/${endpoint}/tv/${tmdbId}/${season || '1'}/${episode || '1'}`
            : `/${endpoint}/movie/${tmdbId}`;
        navigateTo(path);
      }}
    />
  );
}
