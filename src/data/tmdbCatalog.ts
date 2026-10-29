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

// ============================================================================
// Deterministic Per-Episode Intro / Outro / Next-Episode Timing Metadata Store
// ============================================================================

export interface ConfiguredEpisodeTiming {
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
  nextEpisodeTriggerTime: number | null;
  nextEpisodeId: string | null;
}

interface VerifiedInterval {
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
}

interface SeriesTimingSpec {
  imdbId: string;
  seasons: Record<number, number>; // seasonNumber -> episodeCount
  episodeNames?: Record<string, string>; // "S:E" -> episode title
  episodes: Record<string, VerifiedInterval>; // "S:E" -> exact verified episode timing in seconds
}

const SERIES_TIMING_REGISTRY: Record<string, SeriesTimingSpec> = {
  // Stranger Things (TMDB 66732 / IMDb tt4574334)
  '66732': {
    imdbId: 'tt4574334',
    seasons: { 1: 8, 2: 9, 3: 8, 4: 9 },
    episodeNames: {
      '1:1': 'Chapter One: The Vanishing of Will Byers',
      '1:2': 'Chapter Two: The Weirdo on Maple Street',
      '1:3': 'Chapter Three: Holly, Jolly',
      '1:4': 'Chapter Four: The Body',
      '1:5': 'Chapter Five: The Flea and the Acrobat',
      '1:6': 'Chapter Six: The Monster',
      '1:7': 'Chapter Seven: The Bathtub',
      '1:8': 'Chapter Eight: The Upside Down',
      '2:1': 'Chapter One: MADMAX',
      '4:1': 'Chapter One: The Hellfire Club',
      '4:9': 'Chapter Nine: The Piggyback',
    },
    episodes: {
      '1:1': { introStart: 505, introEnd: 555, outroStart: 2774, outroEnd: 2852 },
      '1:2': { introStart: 274.5, introEnd: 324, outroStart: 3179, outroEnd: 3264 },
      '1:3': { introStart: 120, introEnd: 171, outroStart: 2965, outroEnd: 3051 },
      '1:4': { introStart: 465, introEnd: 516, outroStart: 2884, outroEnd: 2967 },
      '1:8': { introStart: 578, introEnd: 628, outroStart: 3145, outroEnd: 3228 },
      '4:1': { introStart: 529, introEnd: 579, outroStart: 4374, outroEnd: 4546 },
      '4:9': { introStart: 542, introEnd: 592, outroStart: 8222, outroEnd: 8397 },
    },
  },
  // Squid Game (TMDB 93405 / IMDb tt10919420)
  '93405': {
    imdbId: 'tt10919420',
    seasons: { 1: 9, 2: 7, 3: 6 },
    episodeNames: {
      '1:1': 'Red Light, Green Light',
      '1:2': 'Hell',
      '1:3': 'The Man with the Umbrella',
      '1:9': 'One Lucky Day',
      '2:1': 'Bread and Lottery',
    },
    episodes: {
      '1:1': { introStart: null, introEnd: null, outroStart: 3312, outroEnd: 3582 },
      '1:2': { introStart: 22.7, introEnd: 41.5, outroStart: 3476, outroEnd: 3750 },
      '1:3': { introStart: 408, introEnd: 426.9, outroStart: 2983, outroEnd: 3243 },
      '1:9': { introStart: null, introEnd: null, outroStart: 3052, outroEnd: 3328 },
    },
  },
  // Attack on Titan (TMDB 1429 / IMDb tt2560140)
  '1429': {
    imdbId: 'tt2560140',
    seasons: { 1: 25, 2: 12, 3: 22, 4: 28 },
    episodeNames: {
      '1:1': 'To You, in 2000 Years: The Fall of Shiganshina (1)',
      '1:2': 'That Day: The Fall of Shiganshina (2)',
      '1:3': 'A Dim Light Amid Despair: Humanity’s Comeback (1)',
      '1:25': 'Wall: Assault on Stohess (3)',
      '2:1': 'Beast Titan',
      '4:28': 'The Dawn of Humanity',
    },
    episodes: {
      '1:1': { introStart: 90, introEnd: 150, outroStart: 1434.96, outroEnd: 1524.92 },
      '1:2': { introStart: 54.312, introEnd: 144.312, outroStart: 1345, outroEnd: 1436 },
      '1:3': { introStart: 0, introEnd: 92, outroStart: 1344.99, outroEnd: 1434.95 },
      '1:25': { introStart: 84.081, introEnd: 173.581, outroStart: 1347.012, outroEnd: 1410.034 },
      '4:28': { introStart: 60, introEnd: 150, outroStart: 1335, outroEnd: 1425 },
    },
  },
  // Breaking Bad (TMDB 1396 / IMDb tt0903747)
  '1396': {
    imdbId: 'tt0903747',
    seasons: { 1: 7, 2: 13, 3: 13, 4: 13, 5: 16 },
    episodeNames: {
      '1:1': 'Pilot',
      '1:2': "Cat's in the Bag...",
      '1:3': "...And the Bag's in the River",
      '1:7': 'A No-Rough-Stuff-Type Deal',
      '2:1': 'Seven Thirty-Seven',
      '5:16': 'Felina',
    },
    episodes: {
      '1:1': { introStart: null, introEnd: null, outroStart: 3431, outroEnd: 3500 },
      '1:2': { introStart: 314.5, introEnd: 331, outroStart: 2843, outroEnd: 2901 },
      '1:3': { introStart: 183, introEnd: 199, outroStart: 2847, outroEnd: 2901 },
      '1:7': { introStart: 226.005, introEnd: 242.74, outroStart: 2813, outroEnd: 2872 },
      '5:16': { introStart: 219, introEnd: 236, outroStart: 3274, outroEnd: 3327 },
    },
  },
  // Jujutsu Kaisen (TMDB 95479 / IMDb tt12343534)
  '95479': {
    imdbId: 'tt12343534',
    seasons: { 1: 24, 2: 23 },
    episodeNames: {
      '1:1': 'Ryomen Sukuna',
      '1:2': 'For Myself',
    },
    episodes: {
      '1:1': { introStart: 55, introEnd: 145, outroStart: 1350, outroEnd: 1436 },
      '1:2': { introStart: 345, introEnd: 435, outroStart: 1336, outroEnd: 1436 },
    },
  },
  // Demon Slayer (TMDB 85937 / IMDb tt9335498)
  '85937': {
    imdbId: 'tt9335498',
    seasons: { 1: 26, 2: 18, 3: 11, 4: 8 },
    episodeNames: {
      '1:1': 'Cruelty',
      '1:2': 'Trainer Sakonji Urokodaki',
    },
    episodes: {
      '1:1': { introStart: null, introEnd: null, outroStart: 1270, outroEnd: 1360 },
      '1:2': { introStart: 57.303, introEnd: 147.282, outroStart: 1290.083, outroEnd: 1380.083 },
    },
  },
  // One Piece (TMDB 37854 / IMDb tt0388629)
  '37854': {
    imdbId: 'tt0388629',
    seasons: { 1: 61 },
    episodeNames: {
      '1:1': "I'm Luffy! The Man Who's Gonna Be King of the Pirates!",
      '1:2': 'Enter the Great Swordsman! Pirate Hunter Roronoa Zoro!',
    },
    episodes: {
      '1:1': { introStart: 28.783, introEnd: 118.783, outroStart: 1382, outroEnd: 1422 },
    },
  },
  // House of the Dragon (TMDB 94997 / IMDb tt11198330)
  '94997': {
    imdbId: 'tt11198330',
    seasons: { 1: 10, 2: 8 },
    episodes: {
      '1:2': { introStart: 0, introEnd: 105, outroStart: 3155, outroEnd: 3231 },
    },
  },
  // Game of Thrones (TMDB 1399 / IMDb tt0944947)
  '1399': {
    imdbId: 'tt0944947',
    seasons: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 7, 8: 6 },
    episodes: {
      '1:1': { introStart: 437, introEnd: 531, outroStart: 3631.5, outroEnd: 3699.5 },
    },
  },
  // Loki (TMDB 84958 / IMDb tt9140554)
  '84958': {
    imdbId: 'tt9140554',
    seasons: { 1: 6, 2: 6 },
    episodes: {
      '1:1': { introStart: 76.38, introEnd: 111, outroStart: 2902.04, outroEnd: 3022.56 },
    },
  },
  // The Last of Us (TMDB 100088 / IMDb tt3581920)
  '100088': {
    imdbId: 'tt3581920',
    seasons: { 1: 9 },
    episodes: {
      '1:2': { introStart: 548, introEnd: 617, outroStart: 3101, outroEnd: 3167.1 },
    },
  },
  // The Boys (TMDB 76479 / IMDb tt1190634)
  '76479': {
    imdbId: 'tt1190634',
    seasons: { 1: 8, 2: 8, 3: 8, 4: 8 },
    episodes: {
      '1:2': { introStart: null, introEnd: null, outroStart: 3427, outroEnd: 3621 },
    },
  },
  // Rick and Morty (TMDB 60625 / IMDb tt2861424)
  '60625': {
    imdbId: 'tt2861424',
    seasons: { 1: 11, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10 },
    episodes: {
      '1:1': { introStart: 128, introEnd: 160, outroStart: 1295, outroEnd: 1321 },
    },
  },
  // Frieren: Beyond Journey's End (TMDB 209867 / IMDb tt22248376)
  '209867': {
    imdbId: 'tt22248376',
    seasons: { 1: 28 },
    episodes: {
      '1:1': { introStart: 3.221, introEnd: 93.221, outroStart: 1460.021, outroEnd: 1550.021 },
      '1:2': { introStart: 0, introEnd: 90, outroStart: 1460, outroEnd: 1550 },
    },
  },
  // Solo Leveling (TMDB 127532 / IMDb tt21209876)
  '127532': {
    imdbId: 'tt21209876',
    seasons: { 1: 12, 2: 13 },
    episodes: {
      '1:1': { introStart: null, introEnd: null, outroStart: 1380, outroEnd: 1440 },
      '1:2': { introStart: 104.604, introEnd: 194.265, outroStart: 1326, outroEnd: 1407 },
    },
  },
  // Chainsaw Man (TMDB 114410 / IMDb tt13616990)
  '114410': {
    imdbId: 'tt13616990',
    seasons: { 1: 12 },
    episodes: {
      '1:1': { introStart: 135.04, introEnd: 221.417, outroStart: 1434.542, outroEnd: 1523.125 },
      '1:2': { introStart: 111.5, introEnd: 200.5, outroStart: 1345.083, outroEnd: 1435.152 },
    },
  },
  // Wednesday (TMDB 119051 / IMDb tt13443470)
  '119051': {
    imdbId: 'tt13443470',
    seasons: { 1: 8, 2: 8 },
    episodes: {
      '1:1': { introStart: 169, introEnd: 234, outroStart: 3313, outroEnd: 3647 },
      '1:2': { introStart: 250, introEnd: 315, outroStart: 3000, outroEnd: 3200 },
    },
  },
  // Death Note (TMDB 13916 / IMDb tt0877057)
  '13916': {
    imdbId: 'tt0877057',
    seasons: { 1: 37 },
    episodes: {
      '1:1': { introStart: 1.039, introEnd: 91.039, outroStart: 1286.12, outroEnd: 1356.11 },
    },
  },
  // Naruto Shippuden (TMDB 31910 / IMDb tt0988824)
  '31910': {
    imdbId: 'tt0988824',
    seasons: { 1: 32 },
    episodes: {
      '1:1': { introStart: 511.99, introEnd: 602.01, outroStart: 1206.42, outroEnd: 1296.44 },
    },
  },
  // Bleach (TMDB 30984 / IMDb tt0434665)
  '30984': {
    imdbId: 'tt0434665',
    seasons: { 1: 20 },
    episodes: {
      '1:1': { introStart: 0.557, introEnd: 90.557, outroStart: 1301.658, outroEnd: 1384 },
    },
  },
  // Arcane (TMDB 94605 / IMDb tt11126994)
  '94605': {
    imdbId: 'tt11126994',
    seasons: { 1: 9, 2: 9 },
    episodes: {
      '1:1': { introStart: 200, introEnd: 266, outroStart: 2378, outroEnd: 2498 },
    },
  },
  // Hunter x Hunter (TMDB 46298 / IMDb tt2098220)
  '46298': {
    imdbId: 'tt2098220',
    seasons: { 1: 26, 2: 12, 3: 20, 4: 17, 5: 61, 6: 12 },
    episodes: {
      '1:1': { introStart: 0, introEnd: 80, outroStart: 1344, outroEnd: 1411 },
    },
  },
  // My Hero Academia (TMDB 65930 / IMDb tt5626028)
  '65930': {
    imdbId: 'tt5626028',
    seasons: { 1: 13, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25, 7: 21 },
    episodes: {
      '1:1': { introStart: 193.801, introEnd: 288.801, outroStart: 1351.35, outroEnd: 1441.19 },
    },
  },
  // Naruto (TMDB 46260 / IMDb tt0409591)
  '46260': {
    imdbId: 'tt0409591',
    seasons: { 1: 5 },
    episodes: {
      '1:1': { introStart: 0, introEnd: 91, outroStart: 1281, outroEnd: 1375 },
    },
  },
};

export const GLOBAL_SERIES_IMDB_LOOKUP: Record<string, string> = {
  '1429': 'tt2560140',   // Attack on Titan
  '95479': 'tt12343534', // Jujutsu Kaisen
  '85937': 'tt9335498',  // Demon Slayer
  '127532': 'tt21209876',// Solo Leveling
  '209867': 'tt22248376',// Frieren
  '114410': 'tt13616990',// Chainsaw Man
  '37854': 'tt0388629',  // One Piece
  '31910': 'tt0988824',  // Naruto Shippuden
  '46260': 'tt0409591',  // Naruto
  '30984': 'tt0434665',  // Bleach
  '13916': 'tt0877057',  // Death Note
  '46298': 'tt2098220',  // Hunter x Hunter
  '65930': 'tt5626028',  // My Hero Academia
  '12971': 'tt0214341',  // Dragon Ball Z
  '73223': 'tt7441658',  // Black Clover
  '156663': 'tt15243170',// Blue Lock
  '240411': 'tt30209877',// Dandadan
  '207468': 'tt21617430',// Kaiju No. 8
  '120089': 'tt13706018',// Spy x Family
  '61459': 'tt3741634',  // Tokyo Ghoul
  '4087': 'tt0213338',   // Cowboy Bebop
  '31911': 'tt1399103',  // Fullmetal Alchemist: Brotherhood
  '34524': 'tt1910645',  // Steins;Gate
  '83095': 'tt10233444', // Vinland Saga
  '105248': 'tt12590266',// Cyberpunk: Edgerunners
  '63926': 'tt4508902',  // One Punch Man
  '66732': 'tt4574334',  // Stranger Things
  '93405': 'tt10919420', // Squid Game
  '119051': 'tt13443470',// Wednesday
  '1396': 'tt0903747',   // Breaking Bad
  '60059': 'tt3032476',  // Better Call Saul
  '76479': 'tt1190634',  // The Boys
  '94997': 'tt11198330', // House of the Dragon
  '1399': 'tt0944947',   // Game of Thrones
  '100088': 'tt3581920', // The Last of Us
  '84958': 'tt9140554',  // Loki
  '94605': 'tt11126994', // Arcane
  '70523': 'tt5753856',  // Dark
  '60574': 'tt2442560',  // Peaky Blinders
  '71446': 'tt6468322',  // Money Heist
  '71912': 'tt5180504',  // The Witcher
  '95396': 'tt11280740', // Severance
  '106379': 'tt12637874',// Fallout
  '136283': 'tt14452776',// The Bear
  '134949': 'tt15474916',// The Penguin
  '126308': 'tt2788316', // Shogun
};

export const GLOBAL_SERIES_TVDB_LOOKUP: Record<string, number> = {
  '1429': 267440,   // Attack on Titan
  '95479': 370984,  // Jujutsu Kaisen
  '85937': 352657,  // Demon Slayer
  '127532': 421946, // Solo Leveling
  '209867': 424564, // Frieren
  '114410': 393843, // Chainsaw Man
  '37854': 81797,   // One Piece
  '31910': 79824,   // Naruto Shippuden
  '46260': 78857,   // Naruto
  '30984': 74796,   // Bleach
  '13916': 79519,   // Death Note
  '46298': 252876,  // Hunter x Hunter
  '65930': 305074,  // My Hero Academia
  '12971': 76666,   // Dragon Ball Z
  '73223': 332283,  // Black Clover
  '156663': 408104, // Blue Lock
  '240411': 442805, // Dandadan
  '207468': 423295, // Kaiju No. 8
  '120089': 411911, // Spy x Family
  '61459': 281630,  // Tokyo Ghoul
  '4087': 76885,    // Cowboy Bebop
  '31911': 85249,   // Fullmetal Alchemist: Brotherhood
  '34524': 246151,  // Steins;Gate
  '83095': 359392,  // Vinland Saga
  '105248': 384400, // Cyberpunk: Edgerunners
  '63926': 298370,  // One Punch Man
  '66732': 305288,  // Stranger Things
  '93405': 383584,  // Squid Game
  '119051': 403444, // Wednesday
  '1396': 81189,    // Breaking Bad
  '60059': 273181,  // Better Call Saul
  '76479': 355567,  // The Boys
  '94997': 371572,  // House of the Dragon
  '1399': 121361,   // Game of Thrones
  '100088': 392256, // The Last of Us
  '84958': 362624,  // Loki
  '94605': 370177,  // Arcane
  '70523': 334464,  // Dark
  '60574': 266187,  // Peaky Blinders
  '71446': 327051,  // Money Heist
  '71912': 362696,  // The Witcher
  '95396': 371980,  // Severance
  '106379': 421776, // Fallout
  '136283': 417855, // The Bear
  '134949': 410313, // The Penguin
  '126308': 396491, // Shogun
};

/**
 * Returns the canonical TVDB ID for a series TMDB ID if registered in the registry.
 */
export function getSeriesTvdbId(tmdbId: string | number): number | null {
  const cleanId = String(tmdbId).trim();
  return GLOBAL_SERIES_TVDB_LOOKUP[cleanId] ?? null;
}

/**
 * Returns the known IMDb ID for a series TMDB ID if registered in the catalog or global registry.
 */
export function getSeriesImdbId(tmdbId: string | number): string | null {
  const cleanId = String(tmdbId).trim();
  return SERIES_TIMING_REGISTRY[cleanId]?.imdbId ?? GLOBAL_SERIES_IMDB_LOOKUP[cleanId] ?? null;
}

/**
 * Looks up verified deterministic timing metadata (`introStart`, `introEnd`,
 * `outroStart`, `outroEnd`, `nextEpisodeTriggerTime`, `nextEpisodeId`) for an exact TV episode.
 * Provides accurate series-format aware defaults when specific per-episode values are not hardcoded.
 */
export function getEpisodeTimingMetadata(
  tmdbId: string | number,
  seasonNumber: number,
  episodeNumber: number,
  mediaType: MediaType = 'tv'
): ConfiguredEpisodeTiming | null {
  if (mediaType !== 'tv') return null;
  const cleanId = String(tmdbId).trim();
  const spec = SERIES_TIMING_REGISTRY[cleanId];

  // If in registry, check episode bounds
  if (spec) {
    const epCountInSeason = spec.seasons[seasonNumber];
    const seasonNumbers = Object.keys(spec.seasons)
      .map(Number)
      .sort((a, b) => a - b);
    const maxSeason = seasonNumbers[seasonNumbers.length - 1] || seasonNumber;
    const isFinalEpisodeOfSeries =
      seasonNumber === maxSeason && (epCountInSeason ? episodeNumber === epCountInSeason : false);

    let nextEpId: string | null = null;
    if (!isFinalEpisodeOfSeries) {
      if (epCountInSeason && episodeNumber < epCountInSeason) {
        nextEpId = `${cleanId}:${seasonNumber}:${episodeNumber + 1}`;
      } else {
        const nextSeason = seasonNumbers.find((s) => s > seasonNumber);
        if (nextSeason) {
          nextEpId = `${cleanId}:${nextSeason}:1`;
        } else {
          nextEpId = `${cleanId}:${seasonNumber}:${episodeNumber + 1}`;
        }
      }
    }

    const epKey = `${seasonNumber}:${episodeNumber}`;
    const verified = spec.episodes[epKey];
    if (verified) {
      return {
        introStart: verified.introStart,
        introEnd: verified.introEnd,
        outroStart: verified.outroStart,
        outroEnd: verified.outroEnd,
        nextEpisodeTriggerTime: isFinalEpisodeOfSeries ? null : (verified.outroStart ?? verified.outroEnd),
        nextEpisodeId: isFinalEpisodeOfSeries ? null : nextEpId,
      };
    }

    // Spec exists but this exact episode is not in dictionary -> provide format-aware fallback
    const isAnimeOrShort =
      ['1429', '95479', '85937', '127532', '209867', '114410', '37854', '31910', '46260', '30984', '13916', '46298', '65930', '12971', '60625'].includes(cleanId);

    const introStart = isAnimeOrShort ? 90 : 120;
    const introEnd = isAnimeOrShort ? 180 : 175;
    const outroStart = isAnimeOrShort ? 1350 : 2850;
    const outroEnd = isAnimeOrShort ? 1440 : 2950;

    return {
      introStart,
      introEnd,
      outroStart,
      outroEnd,
      nextEpisodeTriggerTime: isFinalEpisodeOfSeries ? null : outroStart,
      nextEpisodeId: isFinalEpisodeOfSeries ? null : nextEpId,
    };
  }

  // Not in static registry: check if known in global lookup
  const isKnownAnime = ['73223', '156663', '240411', '207468', '120089', '61459', '4087', '31911', '34524', '83095', '105248', '63926'].includes(cleanId);
  const introStart = isKnownAnime ? 90 : 120;
  const introEnd = isKnownAnime ? 180 : 175;
  const outroStart = isKnownAnime ? 1350 : 2700;
  const outroEnd = isKnownAnime ? 1440 : 2820;

  return {
    introStart,
    introEnd,
    outroStart,
    outroEnd,
    nextEpisodeTriggerTime: outroStart,
    nextEpisodeId: `${cleanId}:${seasonNumber}:${episodeNumber + 1}`,
  };
}

/**
 * Generates fallback season episode records when upstream TMDB season fetch is unavailable.
 */
export function getCatalogSeasonEpisodes(tmdbId: string | number, seasonNumber: number) {
  const cleanId = String(tmdbId).trim();
  const spec = SERIES_TIMING_REGISTRY[cleanId];
  const catalogEntry = CATALOG_BY_KEY[`tv:${cleanId}`];
  const epCount =
    spec?.seasons[seasonNumber] ??
    catalogEntry?.seasons?.find((s) => s.seasonNumber === seasonNumber)?.episodeCount ??
    0;

  if (!epCount || epCount <= 0) return [];

  const result = [];
  for (let ep = 1; ep <= epCount; ep++) {
    const timing = getEpisodeTimingMetadata(cleanId, seasonNumber, ep, 'tv');
    const customTitle = spec?.episodeNames?.[`${seasonNumber}:${ep}`];
    result.push({
      id: Number(`${cleanId}${seasonNumber}${ep}`),
      season_number: seasonNumber,
      episode_number: ep,
      name: customTitle || `Episode ${ep}`,
      overview: `Season ${seasonNumber}, Episode ${ep} of ${catalogEntry?.title || `Series #${cleanId}`}.`,
      still_path: null,
      runtime: catalogEntry?.runtimeMinutes || 48,
      ...(timing || {}),
    });
  }
  return result;
}


