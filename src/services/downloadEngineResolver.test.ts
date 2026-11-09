import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDownloadableMedia,
} from './downloadEngineResolver.js';
import {
  buildDownloadProxyUrl,
  estimateMediaSize,
  extractDashSegmentUrls,
  extractDirectCdnUrlFromProxy,
  extractHlsSegmentUrls,
  LANGUAGE_NAME_MAP,
  validateMp4BinaryChunk,
} from './downloadEngineTypes.js';

describe('Download Resolution & MP4 Delivery Engine', () => {
  it('builds authentic MP4 streaming URL with required query parameters', () => {
    const url = buildDownloadProxyUrl({
      mediaType: 'movie',
      tmdbId: '128',
      lang: 'hi',
      quality: '1080p',
      title: 'Princess Mononoke',
    });

    assert.ok(url.startsWith('/api/download/file?'), 'Must route to /api/download/file');
    const params = new URLSearchParams(url.replace('/api/download/file?', ''));
    assert.equal(params.get('mediaType'), 'movie');
    assert.equal(params.get('tmdbId'), '128');
    assert.equal(params.get('lang'), 'hi');
    assert.equal(params.get('quality'), '1080p');
    assert.equal(params.get('title'), 'Princess Mononoke');
  });

  it('builds series download proxy URL with season and episode numbers', () => {
    const url = buildDownloadProxyUrl({
      mediaType: 'tv',
      tmdbId: '1399',
      season: 2,
      episode: 5,
      lang: 'en',
      quality: '720p',
      title: 'Game of Thrones',
    });

    const params = new URLSearchParams(url.replace('/api/download/file?', ''));
    assert.equal(params.get('mediaType'), 'tv');
    assert.equal(params.get('tmdbId'), '1399');
    assert.equal(params.get('season'), '2');
    assert.equal(params.get('episode'), '5');
    assert.equal(params.get('quality'), '720p');
    assert.equal(params.get('lang'), 'en');
  });

  it('resolves downloadable media structure for Princess Mononoke with Hindi and English', async () => {
    const mockFetchDetails = async () => ({
      title: 'Princess Mononoke',
      release_date: '1997-07-12',
      runtime: 134,
    });

    const result = await resolveDownloadableMedia(
      {
        mediaType: 'movie',
        tmdbId: '128',
        availableDubs: [
          { code: 'hi', name: 'Hindi' },
          { code: 'en', name: 'English' },
          { code: 'ja', name: 'Japanese' },
        ],
      },
      mockFetchDetails
    );

    assert.equal(result.success, true);
    assert.equal(result.title, 'Princess Mononoke');
    assert.equal(result.hasDirectDownload, true);
    assert.ok(result.languages.length >= 2, 'Should detect multiple languages');

    // Check Hindi group
    const hiGroup = result.languages.find((l) => l.langCode === 'hi');
    assert.ok(hiGroup, 'Hindi language group should be present');
    assert.equal(hiGroup?.langName, 'Hindi');
    assert.ok(hiGroup?.qualities.length >= 4, 'Should offer multiple quality tiers');

    const q1080 = hiGroup?.qualities.find((q) => q.quality === '1080p');
    assert.ok(q1080, '1080p quality option must exist');
    assert.equal(q1080?.format, 'mp4');
    assert.ok(q1080?.downloadUrl.includes('lang=hi'), 'Download URL must specify Hindi language');
    assert.ok(q1080?.downloadUrl.includes('quality=1080p'), 'Download URL must specify 1080p quality');
  });

  it('estimates file size accurately across durations and quality levels', () => {
    const twoHours = 120 * 60;
    const size1080 = estimateMediaSize(twoHours, '1080p');
    const size720 = estimateMediaSize(twoHours, '720p');
    const size480 = estimateMediaSize(twoHours, '480p');

    assert.ok(size1080.includes('GB'), '1080p should be formatted in GB');
    assert.ok(size720.includes('MB'), '720p should be formatted in MB');
    assert.ok(size480.includes('MB'), 'MB should be formatted in MB');
  });

  it('ignores browser MediaSource blob: URLs in buildDownloadProxyUrl so server resolves real stream', () => {
    const urlWithBlob = buildDownloadProxyUrl({
      mediaType: 'movie',
      tmdbId: '128',
      lang: 'hi',
      quality: '1080p',
      title: 'Princess Mononoke',
      rawUrl: 'blob:http://localhost:3000/98765432-1234-1234-1234-123456789abc',
    });

    const params = new URLSearchParams(urlWithBlob.replace('/api/download/file?', ''));
    assert.equal(params.get('sourceUrl'), null, 'blob: URL must never be forwarded as sourceUrl');
  });

  it('rejects Cookie check HTML payloads and accepts valid ISO-BMFF ftyp MP4 headers', () => {
    const cookieCheckHtml = new TextEncoder().encode(
      '<!doctype html>\n<html><head><title>Cookie check</title></head><body></body></html>'
    );
    const htmlCheck = validateMp4BinaryChunk(cookieCheckHtml, 'text/html');
    assert.equal(htmlCheck.valid, false, 'Cookie check HTML must be rejected');

    const htmlDisguisedAsMp4 = validateMp4BinaryChunk(cookieCheckHtml, 'video/mp4');
    assert.equal(
      htmlDisguisedAsMp4.valid,
      false,
      'Cookie check HTML must be rejected even if Content-Type header claims video/mp4'
    );

    // Valid MP4 ftyp box: [0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', '5']
    const validMp4Header = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x35,
    ]);
    const mp4Check = validateMp4BinaryChunk(validMp4Header, 'video/mp4');
    assert.equal(mp4Check.valid, true, 'Valid ftyp MP4 binary header must be accepted');
  });

  it('extracts all full-length 2h13m movie segments from DASH MPD and HLS playlists without truncation', () => {
    const sampleMpd = `<?xml version="1.0" encoding="utf-8"?>
<MPD mediaPresentationDuration="PT2H13M22.9S">
  <Period id="0">
    <AdaptationSet id="1" contentType="audio" lang="hin">
      <Representation id="3" mimeType="audio/mp4" codecs="mp4a.40.2">
        <SegmentTemplate timescale="48000" initialization="https://cdn.example.com/init-stream$RepresentationID$.m4s?a=1&amp;b=2" media="https://cdn.example.com/chunk-stream$RepresentationID$-$Number%05d$.m4s?a=1&amp;b=2" startNumber="1">
          <SegmentTimeline>
            <S t="0" d="239616" />
            <S d="240640" r="1602" />
            <S d="93184" />
          </SegmentTimeline>
        </SegmentTemplate>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

    const audioUrls = extractDashSegmentUrls(sampleMpd, 'audio');
    // 1 init segment + (1 + 1603 + 1) = 1606 total segments for the full 2h 13m movie
    assert.equal(audioUrls.length, 1606);
    assert.equal(audioUrls[0], 'https://cdn.example.com/init-stream3.m4s?a=1&b=2');
    assert.equal(audioUrls[1], 'https://cdn.example.com/chunk-stream3-00001.m4s?a=1&b=2');
    assert.equal(audioUrls[1605], 'https://cdn.example.com/chunk-stream3-01605.m4s?a=1&b=2');

    const sampleM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:5.0,
0.jpg?t=1
#EXTINF:5.0,
1.jpg?t=1
#EXTINF:5.0,
https://cdn.example.com/hls/2.jpg?t=1`;
    const hlsUrls = extractHlsSegmentUrls(sampleM3u8, 'https://cdn.example.com/hls/index.m3u8');
    assert.equal(hlsUrls.length, 3);
    assert.equal(hlsUrls[0], 'https://cdn.example.com/hls/0.jpg?t=1');
    assert.equal(hlsUrls[2], 'https://cdn.example.com/hls/2.jpg?t=1');
  });

  it('unwraps nested proxy URLs and binds per-resolution direct GoogleCDN attachment links', async () => {
    const rawCdn1080 = 'https://video-downloads.googleusercontent.com/ADGPM2_1080p_token';
    const rawCdn720 = 'https://video-downloads.googleusercontent.com/ADGPM2_720p_token';
    const rawCdn480 = 'https://video-downloads.googleusercontent.com/ADGPM2_480p_token';

    const proxied = `/api/stream/proxy?url=${encodeURIComponent(rawCdn1080)}`;
    assert.equal(extractDirectCdnUrlFromProxy(proxied), rawCdn1080);

    const resolved = await resolveDownloadableMedia(
      {
        mediaType: 'movie',
        tmdbId: '1393907',
        title: 'Nayi Naveli',
        year: '2026',
        resolvedDirectSources: [
          {
            quality: '1080p',
            url: rawCdn1080,
            directUrl: rawCdn1080,
            sizeFormatted: '2.2 GB',
            lang: 'hi',
            multiLangs: ['hi', 'en'],
          },
          {
            quality: '720p',
            url: rawCdn720,
            directUrl: rawCdn720,
            sizeFormatted: '1.1 GB',
            lang: 'hi',
            multiLangs: ['hi', 'en'],
          },
          {
            quality: '480p',
            url: rawCdn480,
            directUrl: rawCdn480,
            sizeFormatted: '450 MB',
            lang: 'hi',
            multiLangs: ['hi', 'en'],
          },
        ],
      },
      async () => ({ title: 'Nayi Naveli', release_date: '2026-04-10', runtime: 130 })
    );

    assert.equal(resolved.success, true);
    assert.equal(resolved.title, 'Nayi Naveli');
    const hiGroup = resolved.languages.find((l) => l.langCode === 'hi');
    assert.ok(hiGroup);
    const q1080 = hiGroup!.qualities.find((q) => q.quality === '1080p');
    const q720 = hiGroup!.qualities.find((q) => q.quality === '720p');
    const q480 = hiGroup!.qualities.find((q) => q.quality === '480p');

    assert.equal(q1080?.directUrl, rawCdn1080);
    assert.equal(q1080?.sizeFormatted, '2.2 GB');
    assert.equal(q720?.directUrl, rawCdn720);
    assert.equal(q720?.sizeFormatted, '1.1 GB');
    assert.equal(q480?.directUrl, rawCdn480);
    assert.equal(q480?.sizeFormatted, '450 MB');
  });
});
