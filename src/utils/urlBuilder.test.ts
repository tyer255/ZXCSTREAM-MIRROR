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
} from './urlBuilder.ts';

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
        playerMode: 'custom',
        mediaType: 'tv',
        tmdbId: '66732',
        season: '1',
        episode: '2',
        queryParams: { dubLang: 'tl' },
      }),
      'https://zxcstream.cc/player/tv/66732/1/2?dubLang=tl'
    );
  });

  it('builds Download endpoint URLs accurately', () => {
    assert.equal(
      buildDownloadUrl('movie', '128'),
      'https://zxcstream.cc/download/movie/128'
    );
    assert.equal(
      buildDownloadUrl('tv', '66732'),
      'https://zxcstream.cc/download/tv/66732'
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
  });
});
