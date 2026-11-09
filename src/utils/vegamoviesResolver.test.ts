import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVegaSearchQuery,
  tokenizeVegaTitle,
  parseVegaSearchHtml,
  scoreVegaCandidatePost,
  extractVegaDetailMetadata,
  extractFastDlFromNexDriveHtml,
  parseFastDlButtonHref,
} from './vegamoviesResolver.ts';

describe('Vegamovies (vegamovies1.co.in) Discovery & Fast-DL Stream Resolver', () => {
  it('normalizes search queries and tokenizes movie/series titles accurately', () => {
    assert.equal(normalizeVegaSearchQuery('Deadpool & Wolverine (2024)'), 'Deadpool Wolverine 2024');
    assert.equal(normalizeVegaSearchQuery('Dexter: Resurrection!'), 'Dexter Resurrection');
    assert.deepEqual(tokenizeVegaTitle('The Wild Robot (2024) Dual Audio {Hindi-English}'), [
      'wild',
      'robot',
      '2024',
      'dual',
      'audio',
      'hindi',
      'english',
    ]);
  });

  it('parses vegamovies1.co.in homepage and search result HTML into structured movie/series cards', () => {
    const sampleHtml = `
      <div class="post-grid">
        <article class="post-item site__col">
          <a href="https://vegamovies1.co.in/36762-deadpool-wolverine-2024-english-movie.html">
            <img data-src="/uploads/posts/2026-02/deadpool.webp" alt="Download Deadpool &amp; Wolverine (2024) Dual Audio (Hindi-English) Movie 1080p" />
          </a>
        </article>
        <article class="post-item site__col">
          <a href="https://vegamovies1.co.in/46416-stranger-things-2025-season-5-hindi-english-series.html">
            <img src="https://vegamovies1.co.in/uploads/posts/2026-01/stranger-things.webp" alt="Download Stranger Things (2025) Season 5 Complete {Hindi-English} 1080p WEB-DL" />
          </a>
        </article>
      </div>
    `;

    const cards = parseVegaSearchHtml(sampleHtml);
    assert.equal(cards.length, 2);

    assert.equal(cards[0].id, '36762');
    assert.equal(cards[0].year, '2024');
    assert.equal(cards[0].isSeries, false);
    assert.equal(cards[0].posterUrl, 'https://vegamovies1.co.in/uploads/posts/2026-02/deadpool.webp');
    assert.equal(cards[0].qualityBadge, '1080P');

    assert.equal(cards[1].id, '46416');
    assert.equal(cards[1].year, '2025');
    assert.equal(cards[1].isSeries, true);
  });

  it('scores candidate posts accurately for movies vs TV series seasons', () => {
    const movieScore = scoreVegaCandidatePost(
      'https://vegamovies1.co.in/36762-deadpool-wolverine-2024-english-movie.html',
      'Download Deadpool & Wolverine (2024) Dual Audio (Hindi-English) Movie 1080p BluRay',
      {
        title: 'Deadpool & Wolverine',
        year: '2024',
        mediaType: 'movie',
      }
    );
    assert.ok(movieScore >= 100);

    const s1ScoreForS1 = scoreVegaCandidatePost(
      'https://vegamovies1.co.in/18850-stranger-things-season-1.html',
      'Download Stranger Things (2016) Season 1 {Hindi-English} 1080p BluRay',
      {
        title: 'Stranger Things',
        year: '2016',
        mediaType: 'tv',
        season: 1,
      }
    );
    const s5ScoreForS1 = scoreVegaCandidatePost(
      'https://vegamovies1.co.in/46416-stranger-things-2025-season-5.html',
      'Download Stranger Things (2025) Season 5 {Hindi-English} 1080p WEB-DL',
      {
        title: 'Stranger Things',
        year: '2016',
        mediaType: 'tv',
        season: 1,
      }
    );
    assert.ok(s1ScoreForS1 > s5ScoreForS1);
    assert.equal(s5ScoreForS1, 0);
  });

  it('extracts IndStreamPlayerConfigs IMDb ID and NexDrive / Fast-DL links from detail HTML', () => {
    const detailHtml = `
      <script>
        let IndStreamPlayerConfigs = {
          width: 797,
          height: 453,
          id: 'IndStreamPlayer',
          src: 'tt6263850',
          tr: false
        };
      </script>
      <h3>Deadpool & Wolverine (2024) 720p x264 [1.2GB]</h3>
      <p><a href="https://nexdrive.you/genxfm784776367652/"><button class="dwd-button">Download Now</button></a></p>
      <h3>Deadpool & Wolverine (2024) 1080p 10bit HEVC [1.5GB]</h3>
      <p><a href="https://nexdrive.you/genxfm784776367655/"><button class="dwd-button">Download Now</button></a></p>
      <h3>Deadpool & Wolverine (2024) 1080p x264 [2.7GB]</h3>
      <p><a href="https://nexdrive.you/genxfm784776367658/"><button class="dwd-button">Download Now</button></a></p>
    `;

    const meta = extractVegaDetailMetadata(detailHtml);
    assert.equal(meta.imdbId, 'tt6263850');
    assert.equal(meta.nexDriveLinks.length, 3);
    assert.equal(meta.nexDriveLinks[0].url, 'https://nexdrive.you/genxfm784776367652/');
    assert.equal(meta.nexDriveLinks[0].quality, '720p');
    assert.equal(meta.nexDriveLinks[0].isHevc, false);
    assert.equal(meta.nexDriveLinks[1].isHevc, true);
    assert.equal(meta.nexDriveLinks[2].quality, '1080p');
    assert.equal(meta.nexDriveLinks[2].isHevc, false);
  });

  it('extracts Fast-DL codes and episode-specific links from NexDrive HTML', () => {
    const nexDriveSeriesHtml = `
      <h4>-: Episode: 1 :-</h4>
      <p><a href="https://fast-dl.one/dl/66f111aaa" class="btn"><button>G-Direct [Instant]</button></a></p>
      <hr>
      <h4>-: Episode: 2 :-</h4>
      <p><a href="https://fast-dl.one/dl/66f222bbb" class="btn"><button>G-Direct [Instant]</button></a></p>
    `;

    const ep1FastDl = extractFastDlFromNexDriveHtml(nexDriveSeriesHtml, 'tv', 1);
    assert.deepEqual(ep1FastDl, ['https://fast-dl.one/dl/66f111aaa']);

    const ep2FastDl = extractFastDlFromNexDriveHtml(nexDriveSeriesHtml, 'tv', 2);
    assert.deepEqual(ep2FastDl, ['https://fast-dl.one/dl/66f222bbb']);

    const dlBtnHtml = `<a id="download-button" href="dl.php?code=66ac333f0d319&secret=b83a4dc87da4cf53" class="button">Download Now</a>`;
    const prepUrl = parseFastDlButtonHref(dlBtnHtml, 'https://fast-dl.one/dl/66ac333f0d319');
    assert.ok(prepUrl);
    assert.ok(prepUrl.startsWith('https://fast-dl.one/dl/dl.php?code=66ac333f0d319&secret=b83a4dc87da4cf53&prepare=1'));
  });

  it('matches romanized Hindi spelling variations (Nai Naveli vs Nayi Naveli) and nested h3 headings', () => {
    const score = scoreVegaCandidatePost(
      'https://vegamovies6.co.in/59682-nayi-naveli-2026-hindi-audio-hdtc-720p-480p-1080p.html',
      'Download Nayi Naveli (2026) Hindi Audio HDTC 480p [500MB] || 720p [1.2GB] || 1080p [2.5GB]',
      {
        title: 'Nai Naveli',
        originalTitle: 'Nayi Naveli',
        year: '',
        mediaType: 'movie',
      }
    );
    assert.ok(score >= 95, `Expected high score for Nayi Naveli, got ${score}`);

    const nestedH3Html = `
      <h3 style="text-align: center;"><span style="color: #eef425;">Nayi Naveli (2026) <span style="color: #ff5733;">Single Audio</span> {Hindi} 480p x264 [550MB]</span></h3>
      <h3 style="text-align: center;"><div><a href="https://nexdrive.you/genxfm784776479893/" target="_blank"><button class="dwd-button">Download Now</button></a></div></h3>
      <h3 style="text-align: center;"><span style="color: #eef425;">Nayi Naveli (2026) <span style="color: #ff5733;">Single Audio</span> {Hindi} 1080p 10Bit HEVC [1.5GB]</span></h3>
      <h3 style="text-align: center;"><div><a href="https://nexdrive.you/genxfm784776479901/" target="_blank"><button class="dwd-button">Download Now</button></a></div></h3>
      <h3 style="text-align: center;"><span style="color: #eef425;">Nayi Naveli (2026) <span style="color: #ff5733;">Single Audio</span> {Hindi} 1080p x264 [2.6GB]</span></h3>
      <h3 style="text-align: center;"><div><a href="https://nexdrive.you/genxfm784776479906/" target="_blank"><button class="dwd-button">Download Now</button></a></div></h3>
    `;
    const meta = extractVegaDetailMetadata(nestedH3Html);
    assert.equal(meta.nexDriveLinks.length, 3);
    assert.equal(meta.nexDriveLinks[0].quality, '480p');
    assert.equal(meta.nexDriveLinks[0].isHevc, false);
    assert.equal(meta.nexDriveLinks[1].quality, '1080p');
    assert.equal(meta.nexDriveLinks[1].isHevc, true);
    assert.equal(meta.nexDriveLinks[2].quality, '1080p');
    assert.equal(meta.nexDriveLinks[2].isHevc, false);
  });
});
