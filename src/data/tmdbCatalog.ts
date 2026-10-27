import { MediaType } from '../utils/urlBuilder';

export interface CastMember {
  id: number;
  name: string;
  character: string;
  avatarColor: string;
  initials: string;
  profileUrl?: string;
}

export interface DownloadStreamItem {
  id: string;
  resolution: number;
  sizeFormatted: string;
  format: string;
  fps: number;
  codec: string;
  url: string;
}

export interface SubtitleItem {
  id: string;
  lan: string;
  lanName: string;
  url: string;
}

export interface SeasonInfo {
  seasonNumber: number;
  episodeCount: number;
  name: string;
}

export interface MediaCatalogEntry {
  tmdbId: string;
  mediaType: MediaType;
  title: string;
  tagline: string;
  overview: string;
  voteAverage: number;
  runtimeMinutes?: number;
  releaseYear: string;
  status: string;
  originalLanguage: string;
  country: string;
  genres: string[];
  accentHue: number;
  secondaryHue: number;
  posterUrl?: string;
  backdropUrl?: string;
  logoUrl?: string;
  youtubeTrailerKey: string;
  seasons?: SeasonInfo[];
  cast: CastMember[];
  downloads: DownloadStreamItem[];
  subtitles: SubtitleItem[];
}

/**
 * Generates a rich, deterministic SVG data URI poster or backdrop so zero images
 * ever break even in offline/sandboxed headless browsers.
 */
export function createArtworkDataUri(
  entry: Pick<MediaCatalogEntry, 'title' | 'tagline' | 'releaseYear' | 'accentHue' | 'secondaryHue' | 'genres'>,
  variant: 'poster' | 'backdrop'
): string {
  const width = variant === 'poster' ? 550 : 1600;
  const height = variant === 'poster' ? 800 : 900;
  const h1 = entry.accentHue;
  const h2 = entry.secondaryHue;
  const safeTitle = entry.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeTagline = entry.tagline.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeGenres = entry.genres.slice(0, 3).join(' • ').toUpperCase();

  const svg =
    variant === 'poster'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="hsl(${h1}, 65%, 16%)" />
              <stop offset="50%" stop-color="hsl(${h2}, 55%, 10%)" />
              <stop offset="100%" stop-color="#09090b" />
            </linearGradient>
            <radialGradient id="glow" cx="50%" cy="32%" r="55%">
              <stop offset="0%" stop-color="hsl(${h1}, 85%, 52%)" stop-opacity="0.42" />
              <stop offset="65%" stop-color="hsl(${h2}, 75%, 35%)" stop-opacity="0.12" />
              <stop offset="100%" stop-color="#09090b" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="scrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#09090b" stop-opacity="0.2" />
              <stop offset="55%" stop-color="#09090b" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#09090b" stop-opacity="0.95" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)" />
          <rect width="100%" height="100%" fill="url(#glow)" />
          <circle cx="275" cy="260" r="140" fill="none" stroke="hsl(${h1}, 80%, 65%)" stroke-opacity="0.22" stroke-width="1.5" />
          <circle cx="275" cy="260" r="95" fill="hsl(${h1}, 75%, 45%)" fill-opacity="0.14" stroke="hsl(${h1}, 90%, 70%)" stroke-opacity="0.35" stroke-width="1" />
          <polygon points="258,225 258,295 312,260" fill="hsl(${h1}, 90%, 82%)" fill-opacity="0.75" />
          <rect width="100%" height="100%" fill="url(#scrim)" />
          <text x="40" y="610" fill="hsl(${h1}, 85%, 72%)" font-family="Figtree, sans-serif" font-size="15" font-weight="700" letter-spacing="3">${safeGenres}</text>
          <text x="40" y="665" fill="#fafafa" font-family="Figtree, sans-serif" font-size="40" font-weight="800" letter-spacing="-0.5">${safeTitle.slice(0, 22)}</text>
          <text x="40" y="705" fill="#a1a1aa" font-family="Figtree, sans-serif" font-size="18" font-weight="500">${safeTagline.slice(0, 42)}</text>
          <text x="40" y="750" fill="#71717a" font-family="Geist Mono, monospace" font-size="15" font-weight="600">ZXC[STREAM] • ${entry.releaseYear}</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="hsl(${h1}, 65%, 18%)" />
              <stop offset="45%" stop-color="hsl(${h2}, 55%, 12%)" />
              <stop offset="100%" stop-color="#09090b" />
            </linearGradient>
            <radialGradient id="spot1" cx="68%" cy="38%" r="48%">
              <stop offset="0%" stop-color="hsl(${h1}, 85%, 52%)" stop-opacity="0.45" />
              <stop offset="55%" stop-color="hsl(${h2}, 75%, 32%)" stop-opacity="0.16" />
              <stop offset="100%" stop-color="#09090b" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="spot2" cx="28%" cy="62%" r="42%">
              <stop offset="0%" stop-color="hsl(${h2}, 85%, 48%)" stop-opacity="0.28" />
              <stop offset="100%" stop-color="#09090b" stop-opacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)" />
          <rect width="100%" height="100%" fill="url(#spot1)" />
          <rect width="100%" height="100%" fill="url(#spot2)" />
          <g opacity="0.22" stroke="hsl(${h1}, 80%, 65%)" stroke-width="1.5" fill="none">
            <circle cx="1050" cy="360" r="260" />
            <circle cx="1050" cy="360" r="180" />
            <circle cx="1050" cy="360" r="105" />
            <line x1="650" y1="360" x2="1450" y2="360" stroke-opacity="0.35" />
            <line x1="1050" y1="60" x2="1050" y2="660" stroke-opacity="0.35" />
          </g>
        </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createActorAvatarDataUri(cast: CastMember): string {
  const safeInitials = cast.initials.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || 'ZS';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${cast.avatarColor}" />
        <stop offset="100%" stop-color="#18181b" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="100" fill="url(#g)" />
    <circle cx="100" cy="78" r="34" fill="rgba(255,255,255,0.22)" />
    <path d="M40 182 C40 136, 160 136, 160 182" fill="rgba(255,255,255,0.18)" />
    <text x="100" y="90" text-anchor="middle" fill="#fafafa" font-family="Figtree, sans-serif" font-size="28" font-weight="800">${safeInitials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEFAULT_SUBTITLES: SubtitleItem[] = [
  { id: 'sub-en', lan: 'en', lanName: 'English (CC)', url: '#download-sub-en' },
  { id: 'sub-es', lan: 'es', lanName: 'Spanish (Latinoamérica)', url: '#download-sub-es' },
  { id: 'sub-fr', lan: 'fr', lanName: 'French (Français)', url: '#download-sub-fr' },
  { id: 'sub-hi', lan: 'hi', lanName: 'Hindi (हिन्दी)', url: '#download-sub-hi' },
  { id: 'sub-tl', lan: 'tl', lanName: 'Tagalog (Filipino)', url: '#download-sub-tl' },
  { id: 'sub-pt', lan: 'pt', lanName: 'Portuguese (Brasil)', url: '#download-sub-pt' },
  { id: 'sub-id', lan: 'id', lanName: 'Indonesian (Bahasa)', url: '#download-sub-id' },
];

export const CATALOG_BY_KEY: Record<string, MediaCatalogEntry> = {
  'movie:128': {
    tmdbId: '128',
    mediaType: 'movie',
    title: 'Princess Mononoke',
    tagline: 'The Fate Of The World Rests On The Courage Of One Warrior.',
    overview:
      'Ashitaka, a prince of the disappearing Emishi people, is cursed by a demonized boar god and must journey to the west to find a cure. Along the way, he encounters San, a young human woman fighting to protect the forest, and Lady Eboshi, who is trying to destroy it.',
    voteAverage: 8.338,
    runtimeMinutes: 134,
    releaseYear: '1997',
    status: 'Released',
    originalLanguage: 'ja',
    country: 'Japan',
    genres: ['Adventure', 'Fantasy', 'Animation'],
    accentHue: 152,
    secondaryHue: 210,
    posterUrl: 'https://image.tmdb.org/t/p/w500/cMYCDADoLKLbB83g4WnJegaZimC.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/gl0jzn4BupSbL2qMVeqrjKkF9Js.jpg',
    logoUrl: 'https://image.tmdb.org/t/p/w500/d5XOJv332612H2dJcM2hH4hC93w.png',
    youtubeTrailerKey: '4OiMOHRDs14',
    cast: [
      {
        id: 1,
        name: 'Yōji Matsuda',
        character: 'Ashitaka (voice)',
        avatarColor: '#1d4ed8',
        initials: 'YM',
        profileUrl: 'https://image.tmdb.org/t/p/w300/q2a237879p5E6kG9N7P3rG7hV9.jpg',
      },
      {
        id: 2,
        name: 'Yuriko Ishida',
        character: 'San / Kaya (voice)',
        avatarColor: '#047857',
        initials: 'YI',
        profileUrl: 'https://image.tmdb.org/t/p/w300/h6mB4U3phfP2c24zB5mH3c7kX8a.jpg',
      },
      {
        id: 3,
        name: 'Yūko Tanaka',
        character: 'Lady Eboshi (voice)',
        avatarColor: '#7c3aed',
        initials: 'YT',
      },
      {
        id: 4,
        name: 'Kaoru Kobayashi',
        character: 'Jigo (voice)',
        avatarColor: '#b45309',
        initials: 'KK',
      },
      {
        id: 5,
        name: 'Masahiko Nishimura',
        character: 'Kohroku (voice)',
        avatarColor: '#0f766e',
        initials: 'MN',
      },
      {
        id: 6,
        name: 'Tsunehiko Kamijō',
        character: 'Gonza (voice)',
        avatarColor: '#be123c',
        initials: 'TK',
      },
      {
        id: 7,
        name: 'Akihiro Miwa',
        character: 'Moro (voice)',
        avatarColor: '#4338ca',
        initials: 'AM',
      },
      {
        id: 8,
        name: 'Mitsuko Mori',
        character: 'Hii-sama (voice)',
        avatarColor: '#6d28d9',
        initials: 'MM',
      },
      {
        id: 9,
        name: 'Hisaya Morishige',
        character: 'Okkoto-nushi (voice)',
        avatarColor: '#15803d',
        initials: 'HM',
      },
      {
        id: 10,
        name: 'Takako Fuji',
        character: 'Iron Town Woman (voice)',
        avatarColor: '#9a3412',
        initials: 'TF',
      },
      {
        id: 11,
        name: 'Ikuko Yamamoto',
        character: 'Iron Town Woman (voice)',
        avatarColor: '#1e40af',
        initials: 'IY',
      },
    ],
    downloads: [
      {
        id: 'dl-128-1080',
        resolution: 1080,
        sizeFormatted: '2.48 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC 5.1',
        url: '#dl-mononoke-1080p',
      },
      {
        id: 'dl-128-720',
        resolution: 720,
        sizeFormatted: '1.15 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC 2.0',
        url: '#dl-mononoke-720p',
      },
      {
        id: 'dl-128-480',
        resolution: 480,
        sizeFormatted: '640 MB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: '#dl-mononoke-480p',
      },
    ],
    subtitles: DEFAULT_SUBTITLES,
  },

  'movie:1184918': {
    tmdbId: '1184918',
    mediaType: 'movie',
    title: 'The Wild Robot',
    tagline: 'Discover your true nature.',
    overview:
      'After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island. To survive the harsh environment, Roz bonds with the island’s animals and cares for an orphaned baby goose.',
    voteAverage: 8.5,
    runtimeMinutes: 102,
    releaseYear: '2024',
    status: 'Released',
    originalLanguage: 'en',
    country: 'United States of America',
    genres: ['Animation', 'Science Fiction', 'Family'],
    accentHue: 198,
    secondaryHue: 145,
    posterUrl: 'https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/v9acaWVVFdZT5yAU7J2QjwfhXyD.jpg',
    youtubeTrailerKey: '67vbA5ZJdKQ',
    cast: [
      { id: 101, name: 'Lupita Nyong’o', character: 'Roz / Rummage (voice)', avatarColor: '#0284c7', initials: 'LN' },
      { id: 102, name: 'Pedro Pascal', character: 'Fink (voice)', avatarColor: '#d97706', initials: 'PP' },
      { id: 103, name: 'Kit Connor', character: 'Brightbill (voice)', avatarColor: '#059669', initials: 'KC' },
      { id: 104, name: 'Bill Nighy', character: 'Longneck (voice)', avatarColor: '#4f46e5', initials: 'BN' },
      { id: 105, name: 'Stephanie Hsu', character: 'Vontra (voice)', avatarColor: '#db2777', initials: 'SH' },
      { id: 106, name: 'Mark Hamill', character: 'Thorn (voice)', avatarColor: '#7c2d12', initials: 'MH' },
      { id: 107, name: 'Catherine O’Hara', character: 'Pinktail (voice)', avatarColor: '#9333ea', initials: 'CO' },
      { id: 108, name: 'Ving Rhames', character: 'Thunderbolt (voice)', avatarColor: '#1d4ed8', initials: 'VR' },
    ],
    downloads: [
      {
        id: 'dl-1184918-2160',
        resolution: 2160,
        sizeFormatted: '4.92 GB',
        format: 'mp4',
        fps: 24,
        codec: 'HEVC 10bit Atmos',
        url: '#dl-wildrobot-2160p',
      },
      {
        id: 'dl-1184918-1080',
        resolution: 1080,
        sizeFormatted: '1.94 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC 5.1',
        url: '#dl-wildrobot-1080p',
      },
      {
        id: 'dl-1184918-720',
        resolution: 720,
        sizeFormatted: '980 MB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: '#dl-wildrobot-720p',
      },
    ],
    subtitles: DEFAULT_SUBTITLES,
  },

  'tv:66732': {
    tmdbId: '66732',
    mediaType: 'tv',
    title: 'Stranger Things',
    tagline: 'Every ending has a beginning.',
    overview:
      'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.',
    voteAverage: 8.6,
    runtimeMinutes: 52,
    releaseYear: '2016',
    status: 'Returning Series',
    originalLanguage: 'en',
    country: 'United States of America',
    genres: ['Drama', 'Sci-Fi & Fantasy', 'Mystery'],
    accentHue: 355,
    secondaryHue: 230,
    posterUrl: 'https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    youtubeTrailerKey: 'b9EkMc79ZSU',
    seasons: [
      { seasonNumber: 1, episodeCount: 8, name: 'Season 1' },
      { seasonNumber: 2, episodeCount: 9, name: 'Season 2' },
      { seasonNumber: 3, episodeCount: 8, name: 'Season 3' },
      { seasonNumber: 4, episodeCount: 9, name: 'Season 4' },
    ],
    cast: [
      { id: 201, name: 'Millie Bobby Brown', character: 'Eleven / Jane Hopper', avatarColor: '#dc2626', initials: 'MB' },
      { id: 202, name: 'Finn Wolfhard', character: 'Mike Wheeler', avatarColor: '#2563eb', initials: 'FW' },
      { id: 203, name: 'Winona Ryder', character: 'Joyce Byers', avatarColor: '#7c3aed', initials: 'WR' },
      { id: 204, name: 'David Harbour', character: 'Jim Hopper', avatarColor: '#b45309', initials: 'DH' },
      { id: 205, name: 'Gaten Matarazzo', character: 'Dustin Henderson', avatarColor: '#059669', initials: 'GM' },
      { id: 206, name: 'Caleb McLaughlin', character: 'Lucas Sinclair', avatarColor: '#0891b2', initials: 'CM' },
      { id: 207, name: 'Sadie Sink', character: 'Max Mayfield', avatarColor: '#e11d48', initials: 'SS' },
      { id: 208, name: 'Joe Keery', character: 'Steve Harrington', avatarColor: '#4f46e5', initials: 'JK' },
    ],
    downloads: [
      {
        id: 'dl-66732-1080',
        resolution: 1080,
        sizeFormatted: '1.42 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 EAC3 5.1',
        url: '#dl-st-1080p',
      },
      {
        id: 'dl-66732-720',
        resolution: 720,
        sizeFormatted: '740 MB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: '#dl-st-720p',
      },
      {
        id: 'dl-66732-480',
        resolution: 480,
        sizeFormatted: '390 MB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: '#dl-st-480p',
      },
    ],
    subtitles: DEFAULT_SUBTITLES,
  },

  'movie:533535': {
    tmdbId: '533535',
    mediaType: 'movie',
    title: 'Deadpool & Wolverine',
    tagline: 'Come together.',
    overview:
      'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.',
    voteAverage: 7.7,
    runtimeMinutes: 128,
    releaseYear: '2024',
    status: 'Released',
    originalLanguage: 'en',
    country: 'United States of America',
    genres: ['Action', 'Comedy', 'Science Fiction'],
    accentHue: 350,
    secondaryHue: 48,
    posterUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg',
    youtubeTrailerKey: '73_1biulkYk',
    cast: [
      { id: 301, name: 'Ryan Reynolds', character: 'Wade Wilson / Deadpool', avatarColor: '#dc2626', initials: 'RR' },
      { id: 302, name: 'Hugh Jackman', character: 'Logan / Wolverine', avatarColor: '#ca8a04', initials: 'HJ' },
      { id: 303, name: 'Emma Corrin', character: 'Cassandra Nova', avatarColor: '#7c3aed', initials: 'EC' },
      { id: 304, name: 'Matthew Macfadyen', character: 'Mr. Paradox', avatarColor: '#1d4ed8', initials: 'MM' },
    ],
    downloads: [
      {
        id: 'dl-533535-1080',
        resolution: 1080,
        sizeFormatted: '2.65 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC 5.1',
        url: '#dl-dpw-1080p',
      },
      {
        id: 'dl-533535-720',
        resolution: 720,
        sizeFormatted: '1.28 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: '#dl-dpw-720p',
      },
    ],
    subtitles: DEFAULT_SUBTITLES,
  },

  'tv:1396': {
    tmdbId: '1396',
    mediaType: 'tv',
    title: 'Breaking Bad',
    tagline: 'Change the equation.',
    overview:
      'Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family’s financial future at any cost.',
    voteAverage: 8.9,
    runtimeMinutes: 47,
    releaseYear: '2008',
    status: 'Ended',
    originalLanguage: 'en',
    country: 'United States of America',
    genres: ['Drama', 'Crime'],
    accentHue: 135,
    secondaryHue: 45,
    posterUrl: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/gc8PfyTqzqltKPW3X0cIVUGmagz.jpg',
    youtubeTrailerKey: 'HhesaQXLuRY',
    seasons: [
      { seasonNumber: 1, episodeCount: 7, name: 'Season 1' },
      { seasonNumber: 2, episodeCount: 13, name: 'Season 2' },
      { seasonNumber: 3, episodeCount: 13, name: 'Season 3' },
      { seasonNumber: 4, episodeCount: 13, name: 'Season 4' },
      { seasonNumber: 5, episodeCount: 16, name: 'Season 5' },
    ],
    cast: [
      { id: 401, name: 'Bryan Cranston', character: 'Walter White', avatarColor: '#15803d', initials: 'BC' },
      { id: 402, name: 'Aaron Paul', character: 'Jesse Pinkman', avatarColor: '#ca8a04', initials: 'AP' },
      { id: 403, name: 'Anna Gunn', character: 'Skyler White', avatarColor: '#0284c7', initials: 'AG' },
      { id: 404, name: 'Bob Odenkirk', character: 'Saul Goodman', avatarColor: '#b91c1c', initials: 'BO' },
    ],
    downloads: [
      {
        id: 'dl-1396-1080',
        resolution: 1080,
        sizeFormatted: '1.35 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC 5.1',
        url: '#dl-bb-1080p',
      },
      {
        id: 'dl-1396-720',
        resolution: 720,
        sizeFormatted: '690 MB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: '#dl-bb-720p',
      },
    ],
    subtitles: DEFAULT_SUBTITLES,
  },
};

export const QUICK_SAMPLE_ITEMS: Array<{
  tmdbId: string;
  mediaType: MediaType;
  label: string;
  season?: string;
  episode?: string;
}> = [
  { tmdbId: '128', mediaType: 'movie', label: 'Princess Mononoke (128)' },
  { tmdbId: '1184918', mediaType: 'movie', label: 'The Wild Robot (1184918)' },
  { tmdbId: '533535', mediaType: 'movie', label: 'Deadpool & Wolverine (533535)' },
  { tmdbId: '66732', mediaType: 'tv', label: 'Stranger Things (66732)', season: '1', episode: '1' },
  { tmdbId: '1396', mediaType: 'tv', label: 'Breaking Bad (1396)', season: '1', episode: '1' },
];

export function getMediaByTmdbId(mediaType: MediaType, tmdbId: string): MediaCatalogEntry {
  const cleanId = tmdbId.trim() || '128';
  const directKey = `${mediaType}:${cleanId}`;
  if (CATALOG_BY_KEY[directKey]) {
    return CATALOG_BY_KEY[directKey];
  }

  const altKey = `${mediaType === 'movie' ? 'tv' : 'movie'}:${cleanId}`;
  if (CATALOG_BY_KEY[altKey]) {
    return {
      ...CATALOG_BY_KEY[altKey],
      mediaType,
      seasons:
        mediaType === 'tv'
          ? CATALOG_BY_KEY[altKey].seasons ?? [
              { seasonNumber: 1, episodeCount: 10, name: 'Season 1' },
              { seasonNumber: 2, episodeCount: 10, name: 'Season 2' },
            ]
          : undefined,
    };
  }

  const numericSeed = Number.parseInt(cleanId.replace(/\D/g, ''), 10) || 420;
  const accentHue = (numericSeed * 47) % 360;
  const secondaryHue = (accentHue + 65) % 360;

  return {
    tmdbId: cleanId,
    mediaType,
    title: mediaType === 'movie' ? `TMDB Feature #${cleanId}` : `TMDB Series #${cleanId}`,
    tagline: 'Streaming in Full HD via ZXC[STREAM] multi-audio cloud servers.',
    overview: `Stream and download TMDB ID #${cleanId} directly through ZXC[STREAM] edge servers with multi-language audio tracks (Original, Hindi, Tagalog, Spanish, French, Portuguese) and high-bitrate 1080p streams.`,
    voteAverage: 8.1,
    runtimeMinutes: mediaType === 'movie' ? 124 : 48,
    releaseYear: '2024',
    status: mediaType === 'movie' ? 'Released' : 'Returning Series',
    originalLanguage: 'en',
    country: 'United States of America',
    genres: mediaType === 'movie' ? ['Action', 'Sci-Fi', 'Adventure'] : ['Drama', 'Mystery', 'Sci-Fi'],
    accentHue,
    secondaryHue,
    youtubeTrailerKey: '4OiMOHRDs14',
    seasons:
      mediaType === 'tv'
        ? [
            { seasonNumber: 1, episodeCount: 10, name: 'Season 1' },
            { seasonNumber: 2, episodeCount: 8, name: 'Season 2' },
            { seasonNumber: 3, episodeCount: 8, name: 'Season 3' },
          ]
        : undefined,
    cast: [
      { id: 901, name: 'Alex Mercer', character: 'Lead Protagonist', avatarColor: '#2563eb', initials: 'AM' },
      { id: 902, name: 'Elena Vance', character: 'Commander Vance', avatarColor: '#7c3aed', initials: 'EV' },
      { id: 903, name: 'Marcus Wright', character: 'Specialist', avatarColor: '#059669', initials: 'MW' },
      { id: 904, name: 'Sora Takahashi', character: 'Archivist', avatarColor: '#d97706', initials: 'ST' },
    ],
    downloads: [
      {
        id: `dl-${cleanId}-1080`,
        resolution: 1080,
        sizeFormatted: '2.10 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC 5.1',
        url: `#dl-${cleanId}-1080p`,
      },
      {
        id: `dl-${cleanId}-720`,
        resolution: 720,
        sizeFormatted: '1.05 GB',
        format: 'mp4',
        fps: 24,
        codec: 'H.264 AAC',
        url: `#dl-${cleanId}-720p`,
      },
    ],
    subtitles: DEFAULT_SUBTITLES,
  };
}
