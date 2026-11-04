import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlayerUrl,
  buildDownloadUrl,
  formatRuntime,
  calculateStarRating,
  formatVideoTime,
  normalizeHexColor,
  parsePlayerQueryParams,
  parseAppRoute,
  filterAudioDubTracks,
  mergeAvailableDubs,
  resolveEffectiveDubSelection,
  shouldSyncDubAudioTime,
  resolveNextEpisode,
  resolveEpisodeTiming,
  evaluatePlaybackSkipState,
  normalizeIntervalSeconds,
  detectSingleStreamLanguage,
  detectAllStreamLanguages,
  matchNxshaSourceForDub,
  extractNxshaQualitiesForDub,
  normalizeSubtitleTracks,
  inspectAndSelectMpegTsAudioTrack,
  mpeg2Crc32,
} from './urlBuilder.ts';
import { getEpisodeTimingMetadata, getCatalogSeasonEpisodes, getSeriesImdbId } from '../data/tmdbCatalog.ts';

describe('ZXC[STREAM] URL Builder & Route Utilities', () => {
  it('builds Custom Player and Built-in Player URLs for movies and series', () => {
    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream.cc',
        playerMode: 'custom',
        mediaType: 'movie',
        tmdbId: '',
      }),
      'https://zxcstream.cc/player/movie/'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream.cc',
        playerMode: 'custom',
        mediaType: 'movie',
        tmdbId: '128',
      }),
      'https://zxcstream.cc/player/movie/128'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream.cc',
        playerMode: 'builtin',
        mediaType: 'movie',
        tmdbId: '1184918',
      }),
      'https://zxcstream.cc/embed/movie/1184918'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream.cc',
        playerMode: 'nxsha',
        mediaType: 'movie',
        tmdbId: '128',
      }),
      'https://zxcstream.cc/nxsha/movie/128'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream.cc',
        playerMode: 'nxsha',
        mediaType: 'tv',
        tmdbId: '66732',
        season: '1',
        episode: '1',
      }),
      'https://zxcstream.cc/nxsha/tv/66732/1/1'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream.cc',
        playerMode: 'custom',
        mediaType: 'tv',
        tmdbId: '66732',
        season: '1',
        episode: '2',
        queryParams: { dubLang: 'tl' },
      }),
      'https://zxcstream.cc/player/tv/66732/1/2?dubLang=tl'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream-mirror.vercel.app',
        playerMode: 'anime',
        mediaType: 'tv',
        tmdbId: '85937',
        season: '1',
        episode: '1',
      }),
      'https://zxcstream-mirror.vercel.app/anime/tv/85937/1/1'
    );

    assert.equal(
      buildPlayerUrl({
        baseOrigin: 'https://zxcstream-mirror.vercel.app',
        playerMode: 'anime',
        mediaType: 'movie',
        tmdbId: '12',
      }),
      'https://zxcstream-mirror.vercel.app/anime/movie/12'
    );
  });

  it('builds Download endpoint URLs accurately', () => {
    assert.equal(
      buildDownloadUrl('movie', '128'),
      'https://zxcstream-mirror.vercel.app/download/movie/128'
    );
    assert.equal(
      buildDownloadUrl('tv', '66732'),
      'https://zxcstream-mirror.vercel.app/download/tv/66732'
    );
    assert.equal(
      buildDownloadUrl('movie', '128', 'https://custom-domain.com'),
      'https://custom-domain.com/download/movie/128'
    );
  });

  it('formats movie runtimes and video player timestamps', () => {
    assert.equal(formatRuntime(134), '2h 14m');
    assert.equal(formatRuntime(102), '1h 42m');
    assert.equal(formatRuntime(45), '45m');
    assert.equal(formatRuntime(0), 'N/A');

    assert.equal(formatVideoTime(0), '0:00');
    assert.equal(formatVideoTime(65), '1:05');
    assert.equal(formatVideoTime(3665), '1:01:05');
  });

  it('calculates 5-star ratings and normalizes hex colors', () => {
    assert.equal(calculateStarRating(8.338), 4);
    assert.equal(calculateStarRating(9.6), 5);
    assert.equal(calculateStarRating(0), 0);

    assert.equal(normalizeHexColor('fafafa'), '#fafafa');
    assert.equal(normalizeHexColor('#FF5500'), '#ff5500');
    assert.equal(normalizeHexColor('invalid-color', '#3b82f6'), '#3b82f6');
  });

  it('parses player query parameters and routes accurately', () => {
    const q = parsePlayerQueryParams('?dubLang=hi&server=1&color=fafafa&autoplay=true&back=true');
    assert.equal(q.dubLang, 'hi');
    assert.equal(q.server, 1);
    assert.equal(q.color, '#fafafa');
    assert.equal(q.autoplay, true);
    assert.equal(q.back, true);

    const qDefault = parsePlayerQueryParams('?server=4');
    assert.equal(qDefault.dubLang, '');
    assert.equal(qDefault.server, 4);
    assert.equal(qDefault.autoplay, true);

    const qAutoplayOff = parsePlayerQueryParams('?autoplay=false&introStart=10&introEnd=60');
    assert.equal(qAutoplayOff.autoplay, false);
    assert.equal(qAutoplayOff.introStart, 10);
    assert.equal(qAutoplayOff.introEnd, 60);

    assert.deepEqual(parseAppRoute('/'), { page: 'home' });
    assert.deepEqual(parseAppRoute('/download/movie/128'), {
      page: 'download',
      mediaType: 'movie',
      tmdbId: '128',
    });
    assert.deepEqual(parseAppRoute('/player/tv/66732/1/2'), {
      page: 'player',
      playerMode: 'custom',
      mediaType: 'tv',
      tmdbId: '66732',
      season: 1,
      episode: 2,
    });
    assert.deepEqual(parseAppRoute('/nxsha/movie/128'), {
      page: 'player',
      playerMode: 'nxsha',
      mediaType: 'movie',
      tmdbId: '128',
      season: 1,
      episode: 1,
    });
    assert.deepEqual(parseAppRoute('/nxsha/tv/66732/2/3'), {
      page: 'player',
      playerMode: 'nxsha',
      mediaType: 'tv',
      tmdbId: '66732',
      season: 2,
      episode: 3,
    });
  });

  it('filters out type=1 subtitle tracks and resolves effective audio dub selection', () => {
    const rawDubs = [
      { type: 0, lang: 'en', name: 'Original Audio', original: true },
      { type: 1, lang: 'ar', name: 'Arabic sub', original: false },
      { type: 0, lang: 'hi', name: 'Hindi dub', original: false },
      { type: 1, lang: 'es', name: 'Spanish sub', original: false },
      { type: 0, lang: 'ta', name: 'Tamil dub', original: false },
    ];

    const filtered = filterAudioDubTracks(rawDubs);
    assert.equal(filtered.length, 3);
    assert.deepEqual(
      filtered.map((d) => d.lang),
      ['en', 'hi', 'ta']
    );

    const resOrig = resolveEffectiveDubSelection('en', rawDubs);
    assert.equal(resOrig.isOriginal, true);
    assert.equal(resOrig.dubCode, '');
    assert.equal(resOrig.displayLabel, 'Original');

    const resHi = resolveEffectiveDubSelection('hi', rawDubs);
    assert.equal(resHi.isOriginal, false);
    assert.equal(resHi.dubCode, 'hi');
    assert.equal(resHi.dubType, '0');
    assert.equal(resHi.displayLabel, 'Hindi');
    assert.equal(resHi.unavailableInList, false);

    const resAr = resolveEffectiveDubSelection('ar', rawDubs);
    assert.equal(resAr.unavailableInList, true);
  });

  it('prevents infinite seek loops during dub audio drift synchronization', () => {
    assert.equal(
      shouldSyncDubAudioTime({
        videoTime: 120,
        audioTime: 115,
        isAudioSeeking: true,
        audioReadyState: 4,
        lastSyncTimestampMs: 1000,
        nowMs: 5000,
      }),
      false
    );

    assert.equal(
      shouldSyncDubAudioTime({
        videoTime: 120,
        audioTime: 115,
        isAudioSeeking: false,
        audioReadyState: 1,
        lastSyncTimestampMs: 1000,
        nowMs: 5000,
      }),
      false
    );

    assert.equal(
      shouldSyncDubAudioTime({
        videoTime: 120,
        audioTime: 115,
        isAudioSeeking: false,
        audioReadyState: 4,
        lastSyncTimestampMs: 4000,
        nowMs: 5000,
      }),
      false
    );

    assert.equal(
      shouldSyncDubAudioTime({
        videoTime: 120,
        audioTime: 118.5,
        isAudioSeeking: false,
        audioReadyState: 4,
        lastSyncTimestampMs: 1000,
        nowMs: 5000,
      }),
      true
    );
  });

  it('normalizes second and millisecond intro/outro intervals accurately', () => {
    assert.deepEqual(
      normalizeIntervalSeconds({ startSec: 505, endSec: 555, startMs: 505000, endMs: 555000 }),
      { start: 505, end: 555 }
    );

    assert.deepEqual(
      normalizeIntervalSeconds({ startMs: 54312, endMs: 144312 }),
      { start: 54.312, end: 144.312 }
    );

    assert.deepEqual(
      normalizeIntervalSeconds({ startSec: 90000, endSec: 150000 }),
      { start: 90, end: 150 }
    );

    assert.deepEqual(
      normalizeIntervalSeconds({ startSec: 150, endSec: 90 }),
      { start: null, end: null }
    );
  });

  it('resolves next episode accurately across mid-season, season finale, series finale, and movies', () => {
    const s1Eps = getCatalogSeasonEpisodes('66732', 1);
    const s2Eps = getCatalogSeasonEpisodes('66732', 2);
    const seasons = [
      { season_number: 1, episode_count: 8, name: 'Season 1' },
      { season_number: 2, episode_count: 9, name: 'Season 2' },
      { season_number: 3, episode_count: 8, name: 'Season 3' },
      { season_number: 4, episode_count: 9, name: 'Season 4' },
    ];

    // 1. Mid-season episode (S1E1 -> S1E2)
    const nextMid = resolveNextEpisode({
      mediaType: 'tv',
      tmdbId: '66732',
      currentSeason: 1,
      currentEpisode: 1,
      currentSeasonEpisodes: s1Eps,
      seasons,
    });
    assert.ok(nextMid);
    assert.equal(nextMid.season, 1);
    assert.equal(nextMid.episode, 2);
    assert.equal(nextMid.title, 'Chapter Two: The Weirdo on Maple Street');
    assert.equal(nextMid.isNextSeason, false);

    // 2. Season finale when next season exists (S1E8 -> S2E1) with nextSeasonEpisodes
    const nextSeasonEp = resolveNextEpisode({
      mediaType: 'tv',
      tmdbId: '66732',
      currentSeason: 1,
      currentEpisode: 8,
      currentSeasonEpisodes: s1Eps,
      nextSeasonEpisodes: s2Eps,
      seasons,
    });
    assert.ok(nextSeasonEp);
    assert.equal(nextSeasonEp.season, 2);
    assert.equal(nextSeasonEp.episode, 1);
    assert.equal(nextSeasonEp.title, 'Chapter One: MADMAX');
    assert.equal(nextSeasonEp.isNextSeason, true);

    // 3. Final episode of the final season (S4E9 -> null)
    const s4Eps = getCatalogSeasonEpisodes('66732', 4);
    const finaleNext = resolveNextEpisode({
      mediaType: 'tv',
      tmdbId: '66732',
      currentSeason: 4,
      currentEpisode: 9,
      currentSeasonEpisodes: s4Eps,
      seasons,
    });
    assert.equal(finaleNext, null);

    // 4. Standalone movie -> never has next episode
    const movieNext = resolveNextEpisode({
      mediaType: 'movie',
      tmdbId: '128',
      currentSeason: 1,
      currentEpisode: 1,
      currentSeasonEpisodes: s1Eps,
      seasons,
    });
    assert.equal(movieNext, null);

    // 5. Empty episode list (e.g. initial load or network pending) -> gracefully falls back to season metadata
    const fallbackNext = resolveNextEpisode({
      mediaType: 'tv',
      tmdbId: '66732',
      currentSeason: 1,
      currentEpisode: 1,
      currentSeasonEpisodes: [],
      seasons,
    });
    assert.ok(fallbackNext);
    assert.equal(fallbackNext.season, 1);
    assert.equal(fallbackNext.episode, 2);
  });

  it('retrieves episode-specific verified timings for Stranger Things, Squid Game, and Attack on Titan without formulaic reuse', () => {
    assert.equal(getSeriesImdbId('66732'), 'tt4574334');
    assert.equal(getSeriesImdbId('93405'), 'tt10919420');
    assert.equal(getSeriesImdbId('1429'), 'tt2560140');

    // Stranger Things S1E1 (8m25s cold open -> intro 505..555) vs S1E2 (intro 274.5..324)
    const stS1E1 = getEpisodeTimingMetadata('66732', 1, 1, 'tv');
    const stS1E2 = getEpisodeTimingMetadata('66732', 1, 2, 'tv');
    assert.ok(stS1E1);
    assert.equal(stS1E1.introStart, 505);
    assert.equal(stS1E1.introEnd, 555);
    assert.equal(stS1E1.outroStart, 2774);
    assert.equal(stS1E1.outroEnd, 2852);

    assert.ok(stS1E2);
    assert.equal(stS1E2.introStart, 274.5);
    assert.equal(stS1E2.introEnd, 324);

    // Squid Game S1E1 (no separate intro) vs S1E2 (intro 22.7..41.5)
    const sgS1E1 = getEpisodeTimingMetadata('93405', 1, 1, 'tv');
    const sgS1E2 = getEpisodeTimingMetadata('93405', 1, 2, 'tv');
    assert.ok(sgS1E1);
    assert.equal(sgS1E1.introStart, null);
    assert.equal(sgS1E1.introEnd, null);
    assert.equal(sgS1E1.outroStart, 3312);
    assert.equal(sgS1E1.outroEnd, 3582);

    assert.ok(sgS1E2);
    assert.equal(sgS1E2.introStart, 22.7);
    assert.equal(sgS1E2.introEnd, 41.5);

    // Attack on Titan S1E1 (90..150) vs S1E2 (54.312..144.312) vs S1E3 (0..92)
    const aotS1E1 = getEpisodeTimingMetadata('1429', 1, 1, 'tv');
    const aotS1E2 = getEpisodeTimingMetadata('1429', 1, 2, 'tv');
    const aotS1E3 = getEpisodeTimingMetadata('1429', 1, 3, 'tv');
    assert.ok(aotS1E1);
    assert.equal(aotS1E1.introStart, 90);
    assert.equal(aotS1E1.introEnd, 150);

    assert.ok(aotS1E2);
    assert.equal(aotS1E2.introStart, 54.312);
    assert.equal(aotS1E2.introEnd, 144.312);

    assert.ok(aotS1E3);
    assert.equal(aotS1E3.introStart, 0);
    assert.equal(aotS1E3.introEnd, 92);
  });

  it('deterministically evaluates Skip Intro, Skip Outro, and Next Episode visibility and manual seeking', () => {
    const s1Eps = getCatalogSeasonEpisodes('66732', 1);
    const nextEp = resolveNextEpisode({
      mediaType: 'tv',
      tmdbId: '66732',
      currentSeason: 1,
      currentEpisode: 1,
      currentSeasonEpisodes: s1Eps,
      seasons: [{ season_number: 1, episode_count: 8 }],
    });

    const rawTiming = getEpisodeTimingMetadata('66732', 1, 1, 'tv');
    assert.ok(rawTiming);
    assert.equal(rawTiming.introStart, 505);
    assert.equal(rawTiming.introEnd, 555);

    const timing = resolveEpisodeTiming({
      raw: rawTiming,
      duration: 2900,
      mediaType: 'tv',
      nextEpisode: nextEp,
    });
    assert.equal(timing.introStart, 505);
    assert.equal(timing.introEnd, 555);
    assert.equal(timing.outroStart, 2774);
    assert.equal(timing.outroEnd, 2852);
    assert.equal(timing.nextEpisodeTriggerTime, 2774);

    // At t = 25s (during Stranger Things S1E1 8m25s cold open): Skip Intro MUST NOT appear
    const stateDuringColdOpen = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 25,
      duration: 2900,
      videoEnded: false,
      timing,
      nextEpisode: nextEp,
      skippedIntro: false,
      skippedOutro: false,
    });
    assert.equal(stateDuringColdOpen.showSkipIntro, false);
    assert.equal(stateDuringColdOpen.showSkipOutro, false);
    assert.equal(stateDuringColdOpen.showNextEpisode, false);

    // At t = 515s (inside intro [505, 555)): Skip Intro visible
    const stateInIntro = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 515,
      duration: 2900,
      videoEnded: false,
      timing,
      nextEpisode: nextEp,
      skippedIntro: false,
      skippedOutro: false,
    });
    assert.equal(stateInIntro.showSkipIntro, true);
    assert.equal(stateInIntro.showSkipOutro, false);
    assert.equal(stateInIntro.showNextEpisode, false);

    // If user clicked Skip Intro (skippedIntro=true) and seeked to 555s: Skip Intro hidden
    const stateAfterSkipIntro = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 555,
      duration: 2900,
      videoEnded: false,
      timing,
      nextEpisode: nextEp,
      skippedIntro: true,
      skippedOutro: false,
    });
    assert.equal(stateAfterSkipIntro.showSkipIntro, false);
    assert.equal(stateAfterSkipIntro.inIntroInterval, false);

    // At t = 2800s (inside outro / scene ended [2774, 2852)): Skip Outro and Next Episode both available
    const stateInOutro = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 2800,
      duration: 2900,
      videoEnded: false,
      timing,
      nextEpisode: nextEp,
      skippedIntro: false,
      skippedOutro: false,
    });
    assert.equal(stateInOutro.showSkipIntro, false);
    assert.equal(stateInOutro.showSkipOutro, true);
    assert.equal(stateInOutro.showNextEpisode, true);

    // At t = 2852s (outroEnd / post-credits): Skip Outro hides, Next Episode remains active
    const stateInNextWindow = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 2852,
      duration: 2900,
      videoEnded: false,
      timing,
      nextEpisode: nextEp,
      skippedIntro: false,
      skippedOutro: false,
    });
    assert.equal(stateInNextWindow.showSkipIntro, false);
    assert.equal(stateInNextWindow.showSkipOutro, false);
    assert.equal(stateInNextWindow.showNextEpisode, true);

    // Rejects out-of-range outro timestamps instead of fabricating an anchored outro during final story scenes
    const mismatchedStreamTiming = resolveEpisodeTiming({
      raw: rawTiming,
      duration: 2000, // stream is shorter than raw outroStart (2774)
      mediaType: 'tv',
      nextEpisode: nextEp,
    });
    assert.equal(mismatchedStreamTiming.introStart, 505);
    assert.equal(mismatchedStreamTiming.introEnd, 555);
    assert.equal(mismatchedStreamTiming.outroStart, null);
    assert.equal(mismatchedStreamTiming.outroEnd, null);
    assert.equal(mismatchedStreamTiming.nextEpisodeTriggerTime, 1965); // duration (2000) - 35s lead time

    // Unconfigured movie has no intro, outro, or next-episode buttons
    const movieTiming = resolveEpisodeTiming({
      raw: getEpisodeTimingMetadata('128', 1, 1, 'movie'),
      duration: 8000,
      mediaType: 'movie',
      nextEpisode: null,
    });
    assert.equal(movieTiming.introStart, null);
    assert.equal(movieTiming.outroStart, null);
    assert.equal(movieTiming.nextEpisodeTriggerTime, null);
  });

  it('correctly handles TheIntroDB open-ended null intervals, recaps, and credits', () => {
    // startMs: null becomes 0 (beginning of media)
    const mediaStartIntro = normalizeIntervalSeconds({
      startMs: null,
      endMs: 40000,
      allowStartNullAsZero: true,
    });
    assert.deepEqual(mediaStartIntro, { start: 0, end: 40 });

    // endMs: null remains null (open-ended credits)
    const openEndedCredits = normalizeIntervalSeconds({
      startMs: 7726802,
      endMs: null,
      allowStartNullAsZero: true,
    });
    assert.deepEqual(openEndedCredits, { start: 7726.802, end: null });

    // resolveEpisodeTiming resolves recap and open-ended credits using duration
    const resolvedTheIntroDb = resolveEpisodeTiming({
      raw: {
        introStart: 120,
        introEnd: 210,
        recapStart: 10,
        recapEnd: 45,
        outroStart: 1400,
        outroEnd: null,
        source: 'theintrodb',
      },
      duration: 1440,
      mediaType: 'tv',
      nextEpisode: {
        season: 1,
        episode: 2,
        title: 'Episode 2',
        episodeId: 'mock-s1-e2',
        stillPath: null,
        isNextSeason: false,
      },
    });
    assert.equal(resolvedTheIntroDb.recapStart, 10);
    assert.equal(resolvedTheIntroDb.recapEnd, 45);
    assert.equal(resolvedTheIntroDb.introStart, 120);
    assert.equal(resolvedTheIntroDb.introEnd, 210);
    assert.equal(resolvedTheIntroDb.outroStart, 1400);
    assert.equal(resolvedTheIntroDb.outroEnd, 1440); // open-ended defaulted to duration
    assert.equal(resolvedTheIntroDb.source, 'theintrodb');

    // evaluatePlaybackSkipState for Skip Recap
    const stateInRecap = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 25,
      duration: 1440,
      videoEnded: false,
      timing: resolvedTheIntroDb,
      nextEpisode: {
        season: 1,
        episode: 2,
        title: 'Episode 2',
        episodeId: 'mock-s1-e2',
        stillPath: null,
        isNextSeason: false,
      },
      skippedRecap: false,
      skippedIntro: false,
      skippedOutro: false,
    });
    assert.equal(stateInRecap.inRecapInterval, true);
    assert.equal(stateInRecap.showSkipRecap, true);
    assert.equal(stateInRecap.showSkipIntro, false);

    // After user clicks Skip Recap
    const stateAfterSkippedRecap = evaluatePlaybackSkipState({
      canPlay: true,
      mediaType: 'tv',
      currentTime: 25,
      duration: 1440,
      videoEnded: false,
      timing: resolvedTheIntroDb,
      nextEpisode: {
        season: 1,
        episode: 2,
        title: 'Episode 2',
        episodeId: 'mock-s1-e2',
        stillPath: null,
        isNextSeason: false,
      },
      skippedRecap: true,
      skippedIntro: false,
      skippedOutro: false,
    });
    assert.equal(stateAfterSkippedRecap.inRecapInterval, true);
    assert.equal(stateAfterSkippedRecap.showSkipRecap, false);
  });

  it('merges NXSHA native dubs and Orion synchronized dubs without duplicate languages or synthetic orig entries', () => {
    const nxshaDubs = [
      { type: 0, lang: 'orig', name: 'Original Audio', original: true },
      { type: 0, lang: 'en', name: 'English dub', original: false },
      { type: 0, lang: 'ta', name: 'Tamil dub', original: false },
      { type: 0, lang: 'te', name: 'Telugu dub', original: false },
    ];
    const orionDubs = [
      { type: 0, lang: 'ja', name: 'Japanese', original: true },
      { type: 0, lang: 'hi', name: 'Hindi dub', original: false },
      { type: 0, lang: 'es', name: 'Spanish dub', original: false },
      { type: 0, lang: 'ru', name: 'Russian dub', original: false },
      { type: 1, lang: 'ar', name: 'Arabic sub', original: false },
    ];

    const merged = mergeAvailableDubs(nxshaDubs, orionDubs);
    const langs = merged.map((d) => d.lang);
    assert.equal(langs.includes('orig'), false);
    assert.equal(langs.includes('ar'), false); // burned-in sub excluded
    assert.deepEqual(langs, ['en', 'ta', 'te', 'ja', 'hi', 'es', 'ru']);

    const origRes = resolveEffectiveDubSelection('orig', merged);
    assert.equal(origRes.isOriginal, true);
    assert.equal(origRes.dubCode, '');

    const hiRes = resolveEffectiveDubSelection('hi', merged);
    assert.equal(hiRes.isOriginal, false);
    assert.equal(hiRes.dubCode, 'hi');
    assert.equal(hiRes.displayLabel, 'Hindi');

    const taRes = resolveEffectiveDubSelection('ta', merged);
    assert.equal(taRes.isOriginal, false);
    assert.equal(taRes.dubCode, 'ta');
    assert.equal(taRes.displayLabel, 'Tamil');
  });

  it('accurately detects single-stream NXSHA language without false positives on comma-separated bracket labels', () => {
    // [English, Hindi, Tamil, Telugu] - 720P is a single-track English stream (first listed language)
    const multiBracketEn = detectSingleStreamLanguage('[English, Hindi, Tamil, Telugu] - 720P');
    assert.deepEqual(multiBracketEn, { code: 'en', name: 'English' });

    const multiBracketHi = detectSingleStreamLanguage('[Hindi, English, Tamil, Telugu] - 720P');
    assert.deepEqual(multiBracketHi, { code: 'hi', name: 'Hindi' });

    const citadelHi = detectSingleStreamLanguage('720p | Hindi');
    assert.deepEqual(citadelHi, { code: 'hi', name: 'Hindi' });

    const citadelEn = detectSingleStreamLanguage('720p | English');
    assert.deepEqual(citadelEn, { code: 'en', name: 'English' });

    // Ensure substring false positives do not occur
    const sources = [
      { label: '720p | English', quality: '720p | English', lang: 'en', url: 'https://cdn.example/en_720.m3u8' },
      { label: '480p | English', quality: '480p | English', lang: 'en', url: 'https://cdn.example/en_480.m3u8' },
      { label: '720p | Hindi', quality: '720p | Hindi', lang: 'hi', url: 'https://cdn.example/hi_720.m3u8' },
      { label: '480p | Hindi', quality: '480p | Hindi', lang: 'hi', url: 'https://cdn.example/hi_480.m3u8' },
    ];

    const matchedHiDefault = matchNxshaSourceForDub(sources, 'hi');
    assert.equal(matchedHiDefault?.url, 'https://cdn.example/hi_720.m3u8');

    const matchedHi480 = matchNxshaSourceForDub(sources, 'hi', 480);
    assert.equal(matchedHi480?.url, 'https://cdn.example/hi_480.m3u8');

    const matchedOrig = matchNxshaSourceForDub(sources, '');
    assert.equal(matchedOrig?.url, 'https://cdn.example/en_720.m3u8');

    const matchedMissingTa = matchNxshaSourceForDub(sources, 'ta');
    assert.equal(matchedMissingTa, null);

    const hiQuals = extractNxshaQualitiesForDub(sources, 'hi');
    assert.deepEqual(hiQuals, [
      { index: 1720, height: 720 },
      { index: 1480, height: 480 },
    ]);

    const normSubs = normalizeSubtitleTracks(
      [{ id: '1', language: 'English', url: 'https://sub.example/en.vtt' }],
      [
        { id: '550-0', title: 'English', language: 'en', uri: 'https://dl.opensubtitles.org/en' },
        { id: '550-1', title: 'Hindi', language: 'hi', uri: 'https://dl.opensubtitles.org/hi' },
        { id: '550-2', language: 'es', uri: 'https://dl.opensubtitles.org/es' },
      ]
    );
    assert.equal(normSubs.length, 3);
    assert.equal(normSubs[0].language, 'English');
    assert.equal(normSubs[1].language, 'Hindi');
    assert.equal(normSubs[1].url, 'https://dl.opensubtitles.org/hi');
    assert.equal(normSubs[2].language, 'Spanish');
  });

  it('detects all stream languages from multi-language bracket labels', () => {
    const langs = detectAllStreamLanguages('[Hindi, English, Tamil, Telugu] - 720P');
    assert.deepEqual(langs.map((l) => l.code), ['hi', 'en', 'ta', 'te']);

    const sources = [
      {
        label: '[Hindi, English, Tamil, Telugu] - 720P',
        quality: '720p',
        url: 'https://cdn.example/multi_720.m3u8',
        multiLangs: ['hi', 'en', 'ta', 'te'],
      },
    ];

    const matchHi = matchNxshaSourceForDub(sources, 'hi');
    assert.equal(matchHi?.url, 'https://cdn.example/multi_720.m3u8');

    const matchTa = matchNxshaSourceForDub(sources, 'ta');
    assert.equal(matchTa?.url, 'https://cdn.example/multi_720.m3u8');

    const matchOrig = matchNxshaSourceForDub(sources, '');
    assert.equal(matchOrig?.url, 'https://cdn.example/multi_720.m3u8');
  });

  it('inspects and selects audio track in MPEG-TS PMT packets in-place', () => {
    // Construct a synthetic 188-byte MPEG-TS packet containing PAT and PMT with eng (PID 257) and hin (PID 258)
    const patPkt = new Uint8Array(188).fill(0xff);
    patPkt[0] = 0x47;
    patPkt[1] = 0x40; // pusi=1, pid=0 (PAT)
    patPkt[2] = 0x00;
    patPkt[3] = 0x10; // no adapt, payload only
    patPkt[4] = 0x00; // pointer field
    // PAT table (table_id 0x00, section_length 13, program 1 -> PMT PID 0x1000)
    patPkt[5] = 0x00; // table_id = 0x00
    patPkt[6] = 0xb0; // section_syntax=1, 0, 11, length high
    patPkt[7] = 0x0d; // section_length = 13
    patPkt[8] = 0x00; // transport_stream_id
    patPkt[9] = 0x01;
    patPkt[10] = 0xc1; // version 0, current_next 1
    patPkt[11] = 0x00; // section_number
    patPkt[12] = 0x00; // last_section_number
    patPkt[13] = 0x00; // program_number 1
    patPkt[14] = 0x01;
    patPkt[15] = 0xf0; // PMT PID 0x1000 (4096)
    patPkt[16] = 0x00;
    // PAT CRC
    const patCrc = mpeg2Crc32(patPkt.subarray(5, 17));
    patPkt[17] = (patCrc >>> 24) & 0xff;
    patPkt[18] = (patCrc >>> 16) & 0xff;
    patPkt[19] = (patCrc >>> 8) & 0xff;
    patPkt[20] = patCrc & 0xff;

    // PMT packet: PID 0x1000, 1 video stream (PID 256, H.264), 2 audio streams (PID 257 eng, PID 258 hin)
    const pmtPkt = new Uint8Array(188).fill(0xff);
    pmtPkt[0] = 0x47;
    pmtPkt[1] = 0x50; // pusi=1, pid=0x1000
    pmtPkt[2] = 0x00;
    pmtPkt[3] = 0x10; // payload only
    pmtPkt[4] = 0x00; // pointer field

    // PMT table body
    let idx = 5;
    pmtPkt[idx++] = 0x02; // table_id = 0x02
    pmtPkt[idx++] = 0xb0; // section_syntax
    const secLenIdx = idx++; // fill section_length later
    pmtPkt[idx++] = 0x00; // program_number = 1
    pmtPkt[idx++] = 0x01;
    pmtPkt[idx++] = 0xc1; // version 0, current_next 1
    pmtPkt[idx++] = 0x00; // section_number
    pmtPkt[idx++] = 0x00; // last_section_number
    pmtPkt[idx++] = 0xe1; // PCR_PID = 256
    pmtPkt[idx++] = 0x00;
    pmtPkt[idx++] = 0xf0; // program_info_length = 0
    pmtPkt[idx++] = 0x00;

    // Stream 1: Video (0x1b H.264, PID 256)
    pmtPkt[idx++] = 0x1b;
    pmtPkt[idx++] = 0xe1;
    pmtPkt[idx++] = 0x00;
    pmtPkt[idx++] = 0xf0; // es_info_length = 0
    pmtPkt[idx++] = 0x00;

    // Stream 2: Audio 1 (0x0f AAC, PID 257, lang: 'eng')
    pmtPkt[idx++] = 0x0f;
    pmtPkt[idx++] = 0xe1;
    pmtPkt[idx++] = 0x01;
    pmtPkt[idx++] = 0xf0;
    pmtPkt[idx++] = 0x06; // es_info_length = 6
    pmtPkt[idx++] = 0x0a; // ISO_639_language_descriptor tag
    pmtPkt[idx++] = 0x04; // descriptor_length = 4
    pmtPkt[idx++] = 0x65; // 'e'
    pmtPkt[idx++] = 0x6e; // 'n'
    pmtPkt[idx++] = 0x67; // 'g'
    pmtPkt[idx++] = 0x00; // audio_type = 0

    // Stream 3: Audio 2 (0x0f AAC, PID 258, lang: 'hin')
    pmtPkt[idx++] = 0x0f;
    pmtPkt[idx++] = 0xe1;
    pmtPkt[idx++] = 0x02;
    pmtPkt[idx++] = 0xf0;
    pmtPkt[idx++] = 0x06; // es_info_length = 6
    pmtPkt[idx++] = 0x0a; // ISO_639_language_descriptor tag
    pmtPkt[idx++] = 0x04; // descriptor_length = 4
    pmtPkt[idx++] = 0x68; // 'h'
    pmtPkt[idx++] = 0x69; // 'i'
    pmtPkt[idx++] = 0x6e; // 'n'
    pmtPkt[idx++] = 0x00; // audio_type = 0

    // Compute section_length (bytes from program_number to end of CRC)
    const secLen = idx - 8 + 4;
    pmtPkt[secLenIdx] = secLen;
    const pmtCrc = mpeg2Crc32(pmtPkt.subarray(5, idx));
    pmtPkt[idx++] = (pmtCrc >>> 24) & 0xff;
    pmtPkt[idx++] = (pmtCrc >>> 16) & 0xff;
    pmtPkt[idx++] = (pmtCrc >>> 8) & 0xff;
    pmtPkt[idx++] = pmtCrc & 0xff;

    // Concat PAT + PMT into single segment buffer
    const segmentBuffer = new Uint8Array(376);
    segmentBuffer.set(patPkt, 0);
    segmentBuffer.set(pmtPkt, 188);

    // Initial inspection: discovers both English and Hindi audio tracks
    const inspection = inspectAndSelectMpegTsAudioTrack(new Uint8Array(segmentBuffer), 'orig');
    assert.equal(inspection.isMpegTs, true);
    assert.equal(inspection.audioTrackCount, 2);
    assert.deepEqual(inspection.discoveredLangs, ['en', 'hi']);
    assert.equal(inspection.selectedLang, 'en');
    assert.equal(inspection.modified, true);

    // Target Hindi: rewrites the PMT so ONLY the Hindi audio track (PID 258) remains in PMT
    const testHinBuf = new Uint8Array(segmentBuffer);
    const hinSelect = inspectAndSelectMpegTsAudioTrack(testHinBuf, 'hi');
    assert.equal(hinSelect.isMpegTs, true);
    assert.equal(hinSelect.selectedLang, 'hi');
    assert.equal(hinSelect.matchedTargetLang, true);
    assert.equal(hinSelect.modified, true);

    // Verify rewritten PMT now only contains the video stream and PID 258 (Hindi)
    const secondScan = inspectAndSelectMpegTsAudioTrack(testHinBuf, 'hi');
    assert.equal(secondScan.audioTrackCount, 1);
    assert.equal(secondScan.selectedLang, 'hi');
  });
});




