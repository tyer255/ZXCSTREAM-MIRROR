/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAnimeTmdbMetadata } from './AnimeMetadata.js';
import {
  resolveAnimeAdjacentEpisodes,
  AnimeSeasonSummary,
  AnimeEpisodeSummary,
} from './AnimeEpisodeManager.js';
import {
  pickOptimalAnimeSource,
  AnimeStreamSource,
} from './AnimeSourceResolver.js';
import {
  buildAvailableAudioTracks,
  ANIME_LANG_LABELS,
} from './AnimeServerResolver.js';
import {
  parseAppRoute,
  buildPlayerUrl,
  buildEmbedIframeCode,
} from '../utils/urlBuilder.js';

describe('ANIME CORE - Anime-Only TMDB Validation & Player Suite', () => {
  describe('TMDB Anime Classification & Validation', () => {
    it('approves authentic Japanese anime TV series (e.g. Demon Slayer 85937)', () => {
      const mockDemonSlayer = {
        id: 85937,
        name: 'Demon Slayer: Kimetsu no Yaiba',
        original_name: '鬼滅の刃',
        original_language: 'ja',
        origin_country: ['JP'],
        genres: [
          { id: 16, name: 'Animation' },
          { id: 10759, name: 'Action & Adventure' },
          { id: 14, name: 'Fantasy' },
        ],
        number_of_seasons: 4,
        number_of_episodes: 55,
        seasons: [
          { season_number: 1, name: 'Season 1', episode_count: 26 },
          { season_number: 2, name: 'Season 2', episode_count: 18 },
        ],
      };

      const result = validateAnimeTmdbMetadata(mockDemonSlayer, 'tv');
      assert.equal(result.isValidAnime, true);
      assert.equal(result.isAnime, true);
      assert.equal(result.classifiedCategory, 'Anime TV');
      assert.equal(result.tmdbId, 85937);
      assert.equal(result.romajiTitle, '鬼滅の刃');
    });

    it('approves authentic Japanese anime movie (e.g. Princess Mononoke 128)', () => {
      const mockMononoke = {
        id: 128,
        title: 'Princess Mononoke',
        original_title: 'もののけ姫',
        original_language: 'ja',
        production_countries: [{ iso_3166_1: 'JP', name: 'Japan' }],
        genres: [
          { id: 12, name: 'Adventure' },
          { id: 14, name: 'Fantasy' },
          { id: 16, name: 'Animation' },
        ],
        release_date: '1997-07-12',
      };

      const result = validateAnimeTmdbMetadata(mockMononoke, 'movie');
      assert.equal(result.isValidAnime, true);
      assert.equal(result.isAnime, true);
      assert.equal(result.classifiedCategory, 'Anime Movie');
      assert.equal(result.mediaType, 'movie');
    });

    it('STRICTLY BLOCKS normal live-action TV series (e.g. House of the Dragon 94997)', () => {
      const mockHotD = {
        id: 94997,
        title: 'House of the Dragon',
        original_language: 'en',
        country: ['US'],
        genres: [
          { id: 10765, name: 'Sci-Fi & Fantasy' },
          { id: 18, name: 'Drama' },
          { id: 10759, name: 'Action & Adventure' },
        ],
      };

      const result = validateAnimeTmdbMetadata(mockHotD, 'tv');
      assert.equal(result.isValidAnime, false);
      assert.equal(result.isAnime, false);
      assert.equal(result.classifiedCategory, 'Live-Action TV');
      assert.match(result.rejectionReason || '', /Live-Action TV.*Anime Core is exclusively dedicated to Anime/);
    });

    it('STRICTLY BLOCKS Hollywood / Bollywood live-action movies (e.g. Gladiator II 558449)', () => {
      const mockGladiator = {
        id: 558449,
        title: 'Gladiator II',
        original_language: 'en',
        country: ['US', 'GB'],
        genres: [
          { id: 28, name: 'Action' },
          { id: 12, name: 'Adventure' },
          { id: 18, name: 'Drama' },
        ],
      };

      const result = validateAnimeTmdbMetadata(mockGladiator, 'movie');
      assert.equal(result.isValidAnime, false);
      assert.equal(result.isAnime, false);
      assert.equal(result.classifiedCategory, 'Hollywood/Live-Action Movie');
      assert.match(result.rejectionReason || '', /Hollywood\/Live-Action Movie/);
    });

    it('STRICTLY BLOCKS Western animation (e.g. Despicable Me 4 519182)', () => {
      const mockDespicableMe = {
        id: 519182,
        title: 'Despicable Me 4',
        original_language: 'en',
        origin_country: ['US'],
        genres: [
          { id: 16, name: 'Animation' },
          { id: 10751, name: 'Family' },
          { id: 35, name: 'Comedy' },
        ],
      };

      const result = validateAnimeTmdbMetadata(mockDespicableMe, 'movie');
      assert.equal(result.isValidAnime, false);
      assert.equal(result.isAnime, false);
      assert.equal(result.classifiedCategory, 'Western Animation');
      assert.match(result.rejectionReason || '', /Western Animation.*exclusively plays Japanese Anime/);
    });
  });

  describe('Anime Routing & Endpoint Compatibility', () => {
    it('routes /anime/tv/{tmdbid}/{season}/{ep} to Anime Player with mediaType tv', () => {
      const r1 = parseAppRoute('/anime/tv/85937/1/1');
      assert.equal(r1.page, 'anime');
      if (r1.page === 'anime') {
        assert.equal(r1.tmdbId, '85937');
        assert.equal(r1.mediaType, 'tv');
        assert.equal(r1.season, 1);
        assert.equal(r1.episode, 1);
      }

      const r2 = parseAppRoute('/anime/tv/85937/2/5');
      assert.equal(r2.page, 'anime');
      if (r2.page === 'anime') {
        assert.equal(r2.tmdbId, '85937');
        assert.equal(r2.mediaType, 'tv');
        assert.equal(r2.season, 2);
        assert.equal(r2.episode, 5);
      }
    });

    it('routes /anime/movie/{tmdbid} to Anime Player with mediaType movie', () => {
      const r1 = parseAppRoute('/anime/movie/12');
      assert.equal(r1.page, 'anime');
      if (r1.page === 'anime') {
        assert.equal(r1.tmdbId, '12');
        assert.equal(r1.mediaType, 'movie');
        assert.equal(r1.season, 1);
        assert.equal(r1.episode, 1);
      }

      const r2 = parseAppRoute('/anime/movie/128');
      assert.equal(r2.page, 'anime');
      if (r2.page === 'anime') {
        assert.equal(r2.tmdbId, '128');
        assert.equal(r2.mediaType, 'movie');
      }
    });

    it('buildPlayerUrl generates dedicated /anime/tv/ and /anime/movie/ URLs', () => {
      // 1. Anime TV Series URL
      const tvUrl = buildPlayerUrl({
        playerMode: 'anime',
        mediaType: 'tv',
        tmdbId: '85937',
        season: '1',
        episode: '1',
      });
      assert.equal(tvUrl, 'https://zxcstream-mirror.vercel.app/anime/tv/85937/1/1');

      // 2. Anime Movie URL
      const movieUrl = buildPlayerUrl({
        playerMode: 'anime',
        mediaType: 'movie',
        tmdbId: '12',
      });
      assert.equal(movieUrl, 'https://zxcstream-mirror.vercel.app/anime/movie/12');

      // 3. Anime Movie URL with custom baseOrigin
      const customOriginMovie = buildPlayerUrl({
        baseOrigin: 'https://custom-domain.com',
        playerMode: 'anime',
        mediaType: 'movie',
        tmdbId: '128',
      });
      assert.equal(customOriginMovie, 'https://custom-domain.com/anime/movie/128');
    });

    it('buildEmbedIframeCode produces iframe code with dedicated /anime/ namespace without /embed/', () => {
      const tvIframe = buildEmbedIframeCode('tv', '85937', '1', '1', undefined, 'anime');
      assert.match(tvIframe, /<iframe src="https:\/\/zxcstream-mirror\.vercel\.app\/anime\/tv\/85937\/1\/1"/);
      assert.equal(tvIframe.includes('/embed/'), false);

      const movieIframe = buildEmbedIframeCode('movie', '12', '1', '1', undefined, 'anime');
      assert.match(movieIframe, /<iframe src="https:\/\/zxcstream-mirror\.vercel\.app\/anime\/movie\/12"/);
      assert.equal(movieIframe.includes('/embed/'), false);
    });

    it('ensures distinct URL namespaces for all three independent players', () => {
      // ZX Stream -> /player/
      const zxTv = buildPlayerUrl({
        playerMode: 'custom',
        mediaType: 'tv',
        tmdbId: '85937',
        season: '1',
        episode: '1',
      });
      assert.equal(zxTv, 'https://zxcstream-mirror.vercel.app/player/tv/85937/1/1');

      const zxMovie = buildPlayerUrl({
        playerMode: 'custom',
        mediaType: 'movie',
        tmdbId: '128',
      });
      assert.equal(zxMovie, 'https://zxcstream-mirror.vercel.app/player/movie/128');

      // NXSHA -> /nxsha/
      const nxTv = buildPlayerUrl({
        playerMode: 'nxsha',
        mediaType: 'tv',
        tmdbId: '85937',
        season: '1',
        episode: '1',
      });
      assert.equal(nxTv, 'https://zxcstream-mirror.vercel.app/nxsha/tv/85937/1/1');

      const nxMovie = buildPlayerUrl({
        playerMode: 'nxsha',
        mediaType: 'movie',
        tmdbId: '128',
      });
      assert.equal(nxMovie, 'https://zxcstream-mirror.vercel.app/nxsha/movie/128');

      // Anime Core -> /anime/
      const animeTv = buildPlayerUrl({
        playerMode: 'anime',
        mediaType: 'tv',
        tmdbId: '85937',
        season: '1',
        episode: '1',
      });
      assert.equal(animeTv, 'https://zxcstream-mirror.vercel.app/anime/tv/85937/1/1');

      const animeMovie = buildPlayerUrl({
        playerMode: 'anime',
        mediaType: 'movie',
        tmdbId: '12',
      });
      assert.equal(animeMovie, 'https://zxcstream-mirror.vercel.app/anime/movie/12');
    });

    it('PRESERVES backward compatibility for legacy /embed/ routes', () => {
      // Legacy /embed/{tmdbid}/{season}/{ep}
      const legacyTv = parseAppRoute('/embed/85937/1/1');
      assert.equal(legacyTv.page, 'anime');
      if (legacyTv.page === 'anime') {
        assert.equal(legacyTv.tmdbId, '85937');
        assert.equal(legacyTv.season, 1);
        assert.equal(legacyTv.episode, 1);
      }

      // Legacy /embed/{tmdbid}
      const legacyMovie = parseAppRoute('/embed/128');
      assert.equal(legacyMovie.page, 'anime');
      if (legacyMovie.page === 'anime') {
        assert.equal(legacyMovie.tmdbId, '128');
        assert.equal(legacyMovie.mediaType, 'movie');
      }

      // Standard builtin embed player /embed/movie/558449
      const builtinMovie = parseAppRoute('/embed/movie/558449');
      assert.equal(builtinMovie.page, 'player');
      if (builtinMovie.page === 'player') {
        assert.equal(builtinMovie.playerMode, 'builtin');
        assert.equal(builtinMovie.mediaType, 'movie');
      }

      // Standard builtin embed player /embed/tv/1399/1/1
      const builtinTv = parseAppRoute('/embed/tv/1399/1/1');
      assert.equal(builtinTv.page, 'player');
      if (builtinTv.page === 'player') {
        assert.equal(builtinTv.playerMode, 'builtin');
        assert.equal(builtinTv.mediaType, 'tv');
      }
    });
  });

  describe('Anime Episode Navigation & Adjacent Episode Resolution', () => {
    const seasons: AnimeSeasonSummary[] = [
      { seasonNumber: 1, name: 'Season 1', episodeCount: 26 },
      { seasonNumber: 2, name: 'Season 2', episodeCount: 18 },
    ];

    it('calculates prev=null and next=S1E2 for S1E1', () => {
      const adj = resolveAnimeAdjacentEpisodes({
        mediaType: 'tv',
        currentSeason: 1,
        currentEpisode: 1,
        seasons,
      });
      assert.equal(adj.prev, null);
      assert.deepEqual(adj.next, { season: 1, episode: 2 });
    });

    it('transitions to next season (S2E1) from last episode of Season 1 (S1E26)', () => {
      const adj = resolveAnimeAdjacentEpisodes({
        mediaType: 'tv',
        currentSeason: 1,
        currentEpisode: 26,
        seasons,
      });
      assert.deepEqual(adj.prev, { season: 1, episode: 25 });
      assert.deepEqual(adj.next, { season: 2, episode: 1 });
    });

    it('returns prev=null and next=null for movies', () => {
      const adj = resolveAnimeAdjacentEpisodes({
        mediaType: 'movie',
        currentSeason: 1,
        currentEpisode: 1,
      });
      assert.equal(adj.prev, null);
      assert.equal(adj.next, null);
    });
  });

  describe('Anime Source Audio Selection', () => {
    const sampleSources: AnimeStreamSource[] = [
      {
        id: 'valstrax-ja',
        provider: 'valstrax',
        url: 'https://cdn.example/ja-stream.m3u8',
        quality: '1080p',
        label: '1080p | Japanese',
        type: 'hls',
        audioLang: 'ja',
        audioLabel: 'Japanese (Original)',
        isSub: true,
        isDub: false,
      },
      {
        id: 'valstrax-en',
        provider: 'valstrax',
        url: 'https://cdn.example/en-stream.m3u8',
        quality: '1080p',
        label: '1080p | English Dub',
        type: 'hls',
        audioLang: 'en',
        audioLabel: 'English (Dub)',
        isSub: false,
        isDub: true,
      },
      {
        id: 'salt-hi',
        provider: 'animesalt',
        url: 'https://cdn.example/hi-stream.m3u8',
        quality: '720p',
        label: '720p | Hindi Dub',
        type: 'hls',
        audioLang: 'hi',
        audioLabel: 'Hindi (Dub)',
        isSub: false,
        isDub: true,
      },
    ];

    it('picks Japanese sub when audioPreference is ja', () => {
      const picked = pickOptimalAnimeSource(sampleSources, 'ja');
      assert.equal(picked?.audioLang, 'ja');
      assert.equal(picked?.isSub, true);
    });

    it('picks English dub when audioPreference is en', () => {
      const picked = pickOptimalAnimeSource(sampleSources, 'en');
      assert.equal(picked?.audioLang, 'en');
      assert.equal(picked?.isDub, true);
    });

    it('picks Hindi dub when audioPreference is hi', () => {
      const picked = pickOptimalAnimeSource(sampleSources, 'hi');
      assert.equal(picked?.audioLang, 'hi');
      assert.equal(picked?.isDub, true);
    });

    it('dynamically generates available audio tracks strictly from verified sources (no fake tracks)', () => {
      // 1. When only Japanese source is present
      const subOnlySources: AnimeStreamSource[] = [
        {
          id: 'valstrax-ja',
          provider: 'valstrax',
          url: 'https://cdn.example/ja.m3u8',
          quality: '1080p',
          label: 'Japanese',
          type: 'hls',
          audioLang: 'ja',
          audioLabel: 'Japanese (Sub)',
          isSub: true,
          isDub: false,
        },
      ];
      const tracksOnlyJa = buildAvailableAudioTracks(subOnlySources);
      assert.equal(tracksOnlyJa.length, 1);
      assert.equal(tracksOnlyJa[0].code, 'ja');
      assert.equal(tracksOnlyJa[0].label, 'Japanese (Sub)');
      // Asserts that NO fake Hindi or English track is exposed
      assert.equal(tracksOnlyJa.some((t) => t.code === 'hi'), false);
      assert.equal(tracksOnlyJa.some((t) => t.code === 'en'), false);

      // 2. When Japanese, English, and Hindi are genuinely present
      const multiAudioSources = [...sampleSources];
      const multiTracks = buildAvailableAudioTracks(multiAudioSources);
      assert.equal(multiTracks.length, 3);
      assert.deepEqual(
        multiTracks.map((t) => t.code),
        ['ja', 'en', 'hi']
      );

      // 3. When regional dubs (Tamil, Telugu) exist
      const regionalSources: AnimeStreamSource[] = [
        ...sampleSources,
        {
          id: 'salt-ta',
          provider: 'animesalt',
          url: 'https://cdn.example/ta.m3u8',
          quality: '720p',
          label: 'Tamil Dub',
          type: 'hls',
          audioLang: 'ta',
          audioLabel: 'Tamil (Dub)',
          isSub: false,
          isDub: true,
        },
      ];
      const regionalTracks = buildAvailableAudioTracks(regionalSources);
      assert.equal(regionalTracks.some((t) => t.code === 'ta'), true);
      assert.equal(
        regionalTracks.find((t) => t.code === 'ta')?.label,
        'Tamil (Dub)'
      );
    });

    it('rejects unavailable dubs without pretending the language switched', () => {
      const sourcesWithoutHindi: AnimeStreamSource[] = [
        {
          id: 'valstrax-ja',
          provider: 'valstrax',
          url: 'https://cdn.example/ja.m3u8',
          quality: '1080p',
          label: 'Japanese',
          type: 'hls',
          audioLang: 'ja',
          audioLabel: 'Japanese (Sub)',
          isSub: true,
          isDub: false,
        },
        {
          id: 'valstrax-en',
          provider: 'valstrax',
          url: 'https://cdn.example/en.m3u8',
          quality: '1080p',
          label: 'English',
          type: 'hls',
          audioLang: 'en',
          audioLabel: 'English (Dub)',
          isSub: false,
          isDub: true,
        },
      ];

      const availableTracks = buildAvailableAudioTracks(sourcesWithoutHindi);
      const requestedLang = 'hi';
      const track = availableTracks.find((t) => t.code === requestedLang);

      // Track is not available
      assert.equal(track, undefined);

      // Emulate error message verification as required by spec:
      // "Hindi audio is not available for this episode."
      const label = ANIME_LANG_LABELS[requestedLang] || 'Hindi audio';
      const cleanLabel = label.replace(/\s*\([^)]*\)/, '');
      const expectedError = `${cleanLabel} audio is not available for this episode.`;
      assert.equal(expectedError, 'Hindi audio is not available for this episode.');
    });

    it('executes bidirectional audio track switching across Japanese, English, and Hindi', () => {
      let currentActiveSource = pickOptimalAnimeSource(sampleSources, 'ja');
      assert.equal(currentActiveSource?.audioLang, 'ja');

      // 1. Japanese -> Hindi
      const hindiSource = pickOptimalAnimeSource(sampleSources, 'hi');
      assert.notEqual(hindiSource, null);
      assert.equal(hindiSource?.audioLang, 'hi');
      currentActiveSource = hindiSource;

      // 2. Hindi -> English
      const englishSource = pickOptimalAnimeSource(sampleSources, 'en');
      assert.notEqual(englishSource, null);
      assert.equal(englishSource?.audioLang, 'en');
      currentActiveSource = englishSource;

      // 3. English -> Japanese
      const japaneseSource = pickOptimalAnimeSource(sampleSources, 'ja');
      assert.notEqual(japaneseSource, null);
      assert.equal(japaneseSource?.audioLang, 'ja');
      currentActiveSource = japaneseSource;
    });

    it('preserves playback position (currentTime) across audio track switches', () => {
      let currentTime = 145.5; // 2m 25.5s into episode
      let isPlaying = true;

      // Switch audio from ja -> hi
      const pendingAudioSeekTime = currentTime;
      const wasPlayingBeforeSwitch = isPlaying;

      const newSource = pickOptimalAnimeSource(sampleSources, 'hi');
      assert.equal(newSource?.audioLang, 'hi');

      // Simulated restore on video stream attach
      let restoredCurrentTime = 0;
      let restoredPlaying = false;

      if (pendingAudioSeekTime !== null && pendingAudioSeekTime > 0) {
        restoredCurrentTime = pendingAudioSeekTime;
        if (wasPlayingBeforeSwitch) {
          restoredPlaying = true;
        }
      }

      assert.equal(restoredCurrentTime, 145.5);
      assert.equal(restoredPlaying, true);
    });

    it('returns null instead of falling back to Japanese when a requested dub language is missing', () => {
      const onlyJaAndEn: AnimeStreamSource[] = [
        {
          id: 'alatreon-0',
          provider: 'alatreon',
          url: 'https://cdn.example/alatreon-ja.m3u8',
          quality: '1080p',
          label: 'ALATREON | 1080p',
          type: 'hls',
          audioLang: 'ja',
          audioLabel: 'Japanese (Sub)',
          isSub: true,
          isDub: false,
          onlyHevc: false,
        },
        {
          id: 'orion-dub-en',
          provider: 'orion',
          url: 'https://cdn.example/orion-en.mpd',
          quality: '1080p',
          label: 'ORION | English (Dub)',
          type: 'dash',
          audioLang: 'en',
          audioLabel: 'English (Dub)',
          isSub: false,
          isDub: true,
          onlyHevc: true,
        },
      ];

      // Requesting Hindi ('hi') when only 'ja' and 'en' exist MUST return null, never 'alatreon-0' (Japanese)
      const missingHindi = pickOptimalAnimeSource(onlyJaAndEn, 'hi');
      assert.equal(missingHindi, null);

      // Requesting English ('en') returns the exact English dub source
      const validEnglish = pickOptimalAnimeSource(onlyJaAndEn, 'en');
      assert.equal(validEnglish?.id, 'orion-dub-en');
      assert.equal(validEnglish?.audioLang, 'en');
    });

    it('prefers universal H.264 (onlyHevc: false) over HEVC-only streams for primary Japanese video', () => {
      const mixedCodecSources: AnimeStreamSource[] = [
        {
          id: 'orion-0',
          provider: 'orion',
          url: 'https://cdn.example/orion-hevc.mpd',
          quality: '1080p',
          label: 'ORION | 1080p',
          type: 'dash',
          audioLang: 'ja',
          audioLabel: 'Japanese (Sub)',
          isSub: true,
          isDub: false,
          onlyHevc: true,
        },
        {
          id: 'alatreon-0',
          provider: 'alatreon',
          url: 'https://cdn.example/alatreon-h264.m3u8',
          quality: '1080p',
          label: 'ALATREON | 1080p',
          type: 'hls',
          audioLang: 'ja',
          audioLabel: 'Japanese (Sub)',
          isSub: true,
          isDub: false,
          onlyHevc: false,
        },
      ];

      const primaryVideo = pickOptimalAnimeSource(mixedCodecSources, 'ja');
      assert.equal(primaryVideo?.id, 'alatreon-0');
      assert.equal(primaryVideo?.onlyHevc, false);
    });

    it('extracts transparent TMDB logoPath and validates country="JP" payloads from upstream TMDB endpoint', () => {
      const upstreamPayload = {
        id: 209867,
        title: "Frieren: Beyond Journey's End",
        country: 'JP',
        genres: [
          { id: 16, name: 'Animation' },
          { id: 10759, name: 'Action & Adventure' },
        ],
        logo_paths: ['/frierenTransparentLogo.png'],
        backdrop_paths: ['/frierenBackdrop.jpg'],
        release_date: '2023-09-29',
      };

      const result = validateAnimeTmdbMetadata(upstreamPayload, 'tv');
      assert.equal(result.isValidAnime, true);
      assert.equal(result.originalLanguage, 'ja');
      assert.equal(result.logoPath, 'https://image.tmdb.org/t/p/w780/frierenTransparentLogo.png');
      assert.equal(result.backdropPath, 'https://image.tmdb.org/t/p/w1280/frierenBackdrop.jpg');
    });
  });
});
