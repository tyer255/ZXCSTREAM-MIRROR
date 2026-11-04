// serverApp.ts
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import CryptoJS from "crypto-js";

// src/data/tmdbCatalog.ts
var DEFAULT_SUBTITLES = [
  { id: "sub-en", lan: "en", lanName: "English (CC)", url: "#download-sub-en" },
  { id: "sub-es", lan: "es", lanName: "Spanish (Latinoam\xE9rica)", url: "#download-sub-es" },
  { id: "sub-fr", lan: "fr", lanName: "French (Fran\xE7ais)", url: "#download-sub-fr" },
  { id: "sub-hi", lan: "hi", lanName: "Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)", url: "#download-sub-hi" },
  { id: "sub-tl", lan: "tl", lanName: "Tagalog (Filipino)", url: "#download-sub-tl" },
  { id: "sub-pt", lan: "pt", lanName: "Portuguese (Brasil)", url: "#download-sub-pt" },
  { id: "sub-id", lan: "id", lanName: "Indonesian (Bahasa)", url: "#download-sub-id" }
];
var CATALOG_BY_KEY = {
  "movie:128": {
    tmdbId: "128",
    mediaType: "movie",
    title: "Princess Mononoke",
    tagline: "The Fate Of The World Rests On The Courage Of One Warrior.",
    overview: "Ashitaka, a prince of the disappearing Emishi people, is cursed by a demonized boar god and must journey to the west to find a cure. Along the way, he encounters San, a young human woman fighting to protect the forest, and Lady Eboshi, who is trying to destroy it.",
    voteAverage: 8.338,
    runtimeMinutes: 134,
    releaseYear: "1997",
    status: "Released",
    originalLanguage: "ja",
    country: "Japan",
    genres: ["Adventure", "Fantasy", "Animation"],
    accentHue: 152,
    secondaryHue: 210,
    posterUrl: "https://image.tmdb.org/t/p/w500/cMYCDADoLKLbB83g4WnJegaZimC.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/gl0jzn4BupSbL2qMVeqrjKkF9Js.jpg",
    logoUrl: "https://image.tmdb.org/t/p/w500/d5XOJv332612H2dJcM2hH4hC93w.png",
    youtubeTrailerKey: "4OiMOHRDs14",
    cast: [
      {
        id: 1,
        name: "Y\u014Dji Matsuda",
        character: "Ashitaka (voice)",
        avatarColor: "#1d4ed8",
        initials: "YM",
        profileUrl: "https://image.tmdb.org/t/p/w300/q2a237879p5E6kG9N7P3rG7hV9.jpg"
      },
      {
        id: 2,
        name: "Yuriko Ishida",
        character: "San / Kaya (voice)",
        avatarColor: "#047857",
        initials: "YI",
        profileUrl: "https://image.tmdb.org/t/p/w300/h6mB4U3phfP2c24zB5mH3c7kX8a.jpg"
      },
      {
        id: 3,
        name: "Y\u016Bko Tanaka",
        character: "Lady Eboshi (voice)",
        avatarColor: "#7c3aed",
        initials: "YT"
      },
      {
        id: 4,
        name: "Kaoru Kobayashi",
        character: "Jigo (voice)",
        avatarColor: "#b45309",
        initials: "KK"
      },
      {
        id: 5,
        name: "Masahiko Nishimura",
        character: "Kohroku (voice)",
        avatarColor: "#0f766e",
        initials: "MN"
      },
      {
        id: 6,
        name: "Tsunehiko Kamij\u014D",
        character: "Gonza (voice)",
        avatarColor: "#be123c",
        initials: "TK"
      },
      {
        id: 7,
        name: "Akihiro Miwa",
        character: "Moro (voice)",
        avatarColor: "#4338ca",
        initials: "AM"
      },
      {
        id: 8,
        name: "Mitsuko Mori",
        character: "Hii-sama (voice)",
        avatarColor: "#6d28d9",
        initials: "MM"
      },
      {
        id: 9,
        name: "Hisaya Morishige",
        character: "Okkoto-nushi (voice)",
        avatarColor: "#15803d",
        initials: "HM"
      },
      {
        id: 10,
        name: "Takako Fuji",
        character: "Iron Town Woman (voice)",
        avatarColor: "#9a3412",
        initials: "TF"
      },
      {
        id: 11,
        name: "Ikuko Yamamoto",
        character: "Iron Town Woman (voice)",
        avatarColor: "#1e40af",
        initials: "IY"
      }
    ],
    downloads: [
      {
        id: "dl-128-1080",
        resolution: 1080,
        sizeFormatted: "2.48 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC 5.1",
        url: "#dl-mononoke-1080p"
      },
      {
        id: "dl-128-720",
        resolution: 720,
        sizeFormatted: "1.15 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC 2.0",
        url: "#dl-mononoke-720p"
      },
      {
        id: "dl-128-480",
        resolution: 480,
        sizeFormatted: "640 MB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: "#dl-mononoke-480p"
      }
    ],
    subtitles: DEFAULT_SUBTITLES
  },
  "movie:1184918": {
    tmdbId: "1184918",
    mediaType: "movie",
    title: "The Wild Robot",
    tagline: "Discover your true nature.",
    overview: "After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island. To survive the harsh environment, Roz bonds with the island\u2019s animals and cares for an orphaned baby goose.",
    voteAverage: 8.5,
    runtimeMinutes: 102,
    releaseYear: "2024",
    status: "Released",
    originalLanguage: "en",
    country: "United States of America",
    genres: ["Animation", "Science Fiction", "Family"],
    accentHue: 198,
    secondaryHue: 145,
    posterUrl: "https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/v9acaWVVFdZT5yAU7J2QjwfhXyD.jpg",
    youtubeTrailerKey: "67vbA5ZJdKQ",
    cast: [
      { id: 101, name: "Lupita Nyong\u2019o", character: "Roz / Rummage (voice)", avatarColor: "#0284c7", initials: "LN" },
      { id: 102, name: "Pedro Pascal", character: "Fink (voice)", avatarColor: "#d97706", initials: "PP" },
      { id: 103, name: "Kit Connor", character: "Brightbill (voice)", avatarColor: "#059669", initials: "KC" },
      { id: 104, name: "Bill Nighy", character: "Longneck (voice)", avatarColor: "#4f46e5", initials: "BN" },
      { id: 105, name: "Stephanie Hsu", character: "Vontra (voice)", avatarColor: "#db2777", initials: "SH" },
      { id: 106, name: "Mark Hamill", character: "Thorn (voice)", avatarColor: "#7c2d12", initials: "MH" },
      { id: 107, name: "Catherine O\u2019Hara", character: "Pinktail (voice)", avatarColor: "#9333ea", initials: "CO" },
      { id: 108, name: "Ving Rhames", character: "Thunderbolt (voice)", avatarColor: "#1d4ed8", initials: "VR" }
    ],
    downloads: [
      {
        id: "dl-1184918-2160",
        resolution: 2160,
        sizeFormatted: "4.92 GB",
        format: "mp4",
        fps: 24,
        codec: "HEVC 10bit Atmos",
        url: "#dl-wildrobot-2160p"
      },
      {
        id: "dl-1184918-1080",
        resolution: 1080,
        sizeFormatted: "1.94 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC 5.1",
        url: "#dl-wildrobot-1080p"
      },
      {
        id: "dl-1184918-720",
        resolution: 720,
        sizeFormatted: "980 MB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: "#dl-wildrobot-720p"
      }
    ],
    subtitles: DEFAULT_SUBTITLES
  },
  "tv:66732": {
    tmdbId: "66732",
    mediaType: "tv",
    title: "Stranger Things",
    tagline: "Every ending has a beginning.",
    overview: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
    voteAverage: 8.6,
    runtimeMinutes: 52,
    releaseYear: "2016",
    status: "Returning Series",
    originalLanguage: "en",
    country: "United States of America",
    genres: ["Drama", "Sci-Fi & Fantasy", "Mystery"],
    accentHue: 355,
    secondaryHue: 230,
    posterUrl: "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    youtubeTrailerKey: "b9EkMc79ZSU",
    seasons: [
      { seasonNumber: 1, episodeCount: 8, name: "Season 1" },
      { seasonNumber: 2, episodeCount: 9, name: "Season 2" },
      { seasonNumber: 3, episodeCount: 8, name: "Season 3" },
      { seasonNumber: 4, episodeCount: 9, name: "Season 4" }
    ],
    cast: [
      { id: 201, name: "Millie Bobby Brown", character: "Eleven / Jane Hopper", avatarColor: "#dc2626", initials: "MB" },
      { id: 202, name: "Finn Wolfhard", character: "Mike Wheeler", avatarColor: "#2563eb", initials: "FW" },
      { id: 203, name: "Winona Ryder", character: "Joyce Byers", avatarColor: "#7c3aed", initials: "WR" },
      { id: 204, name: "David Harbour", character: "Jim Hopper", avatarColor: "#b45309", initials: "DH" },
      { id: 205, name: "Gaten Matarazzo", character: "Dustin Henderson", avatarColor: "#059669", initials: "GM" },
      { id: 206, name: "Caleb McLaughlin", character: "Lucas Sinclair", avatarColor: "#0891b2", initials: "CM" },
      { id: 207, name: "Sadie Sink", character: "Max Mayfield", avatarColor: "#e11d48", initials: "SS" },
      { id: 208, name: "Joe Keery", character: "Steve Harrington", avatarColor: "#4f46e5", initials: "JK" }
    ],
    downloads: [
      {
        id: "dl-66732-1080",
        resolution: 1080,
        sizeFormatted: "1.42 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 EAC3 5.1",
        url: "#dl-st-1080p"
      },
      {
        id: "dl-66732-720",
        resolution: 720,
        sizeFormatted: "740 MB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: "#dl-st-720p"
      },
      {
        id: "dl-66732-480",
        resolution: 480,
        sizeFormatted: "390 MB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: "#dl-st-480p"
      }
    ],
    subtitles: DEFAULT_SUBTITLES
  },
  "movie:533535": {
    tmdbId: "533535",
    mediaType: "movie",
    title: "Deadpool & Wolverine",
    tagline: "Come together.",
    overview: "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.",
    voteAverage: 7.7,
    runtimeMinutes: 128,
    releaseYear: "2024",
    status: "Released",
    originalLanguage: "en",
    country: "United States of America",
    genres: ["Action", "Comedy", "Science Fiction"],
    accentHue: 350,
    secondaryHue: 48,
    posterUrl: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
    youtubeTrailerKey: "73_1biulkYk",
    cast: [
      { id: 301, name: "Ryan Reynolds", character: "Wade Wilson / Deadpool", avatarColor: "#dc2626", initials: "RR" },
      { id: 302, name: "Hugh Jackman", character: "Logan / Wolverine", avatarColor: "#ca8a04", initials: "HJ" },
      { id: 303, name: "Emma Corrin", character: "Cassandra Nova", avatarColor: "#7c3aed", initials: "EC" },
      { id: 304, name: "Matthew Macfadyen", character: "Mr. Paradox", avatarColor: "#1d4ed8", initials: "MM" }
    ],
    downloads: [
      {
        id: "dl-533535-1080",
        resolution: 1080,
        sizeFormatted: "2.65 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC 5.1",
        url: "#dl-dpw-1080p"
      },
      {
        id: "dl-533535-720",
        resolution: 720,
        sizeFormatted: "1.28 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: "#dl-dpw-720p"
      }
    ],
    subtitles: DEFAULT_SUBTITLES
  },
  "tv:1396": {
    tmdbId: "1396",
    mediaType: "tv",
    title: "Breaking Bad",
    tagline: "Change the equation.",
    overview: "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of only two years left to live. He becomes filled with a sense of fearlessness and an unrelenting desire to secure his family\u2019s financial future at any cost.",
    voteAverage: 8.9,
    runtimeMinutes: 47,
    releaseYear: "2008",
    status: "Ended",
    originalLanguage: "en",
    country: "United States of America",
    genres: ["Drama", "Crime"],
    accentHue: 135,
    secondaryHue: 45,
    posterUrl: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/gc8PfyTqzqltKPW3X0cIVUGmagz.jpg",
    youtubeTrailerKey: "HhesaQXLuRY",
    seasons: [
      { seasonNumber: 1, episodeCount: 7, name: "Season 1" },
      { seasonNumber: 2, episodeCount: 13, name: "Season 2" },
      { seasonNumber: 3, episodeCount: 13, name: "Season 3" },
      { seasonNumber: 4, episodeCount: 13, name: "Season 4" },
      { seasonNumber: 5, episodeCount: 16, name: "Season 5" }
    ],
    cast: [
      { id: 401, name: "Bryan Cranston", character: "Walter White", avatarColor: "#15803d", initials: "BC" },
      { id: 402, name: "Aaron Paul", character: "Jesse Pinkman", avatarColor: "#ca8a04", initials: "AP" },
      { id: 403, name: "Anna Gunn", character: "Skyler White", avatarColor: "#0284c7", initials: "AG" },
      { id: 404, name: "Bob Odenkirk", character: "Saul Goodman", avatarColor: "#b91c1c", initials: "BO" }
    ],
    downloads: [
      {
        id: "dl-1396-1080",
        resolution: 1080,
        sizeFormatted: "1.35 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC 5.1",
        url: "#dl-bb-1080p"
      },
      {
        id: "dl-1396-720",
        resolution: 720,
        sizeFormatted: "690 MB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: "#dl-bb-720p"
      }
    ],
    subtitles: DEFAULT_SUBTITLES
  }
};
function getMediaByTmdbId(mediaType, tmdbId) {
  const cleanId = tmdbId.trim() || "128";
  const directKey = `${mediaType}:${cleanId}`;
  if (CATALOG_BY_KEY[directKey]) {
    return CATALOG_BY_KEY[directKey];
  }
  const altKey = `${mediaType === "movie" ? "tv" : "movie"}:${cleanId}`;
  if (CATALOG_BY_KEY[altKey]) {
    return {
      ...CATALOG_BY_KEY[altKey],
      mediaType,
      seasons: mediaType === "tv" ? CATALOG_BY_KEY[altKey].seasons ?? [
        { seasonNumber: 1, episodeCount: 10, name: "Season 1" },
        { seasonNumber: 2, episodeCount: 10, name: "Season 2" }
      ] : void 0
    };
  }
  const numericSeed = Number.parseInt(cleanId.replace(/\D/g, ""), 10) || 420;
  const accentHue = numericSeed * 47 % 360;
  const secondaryHue = (accentHue + 65) % 360;
  return {
    tmdbId: cleanId,
    mediaType,
    title: mediaType === "movie" ? `TMDB Feature #${cleanId}` : `TMDB Series #${cleanId}`,
    tagline: "Streaming in Full HD via ZXC[STREAM] multi-audio cloud servers.",
    overview: `Stream and download TMDB ID #${cleanId} directly through ZXC[STREAM] edge servers with multi-language audio tracks (Original, Hindi, Tagalog, Spanish, French, Portuguese) and high-bitrate 1080p streams.`,
    voteAverage: 8.1,
    runtimeMinutes: mediaType === "movie" ? 124 : 48,
    releaseYear: "2024",
    status: mediaType === "movie" ? "Released" : "Returning Series",
    originalLanguage: "en",
    country: "United States of America",
    genres: mediaType === "movie" ? ["Action", "Sci-Fi", "Adventure"] : ["Drama", "Mystery", "Sci-Fi"],
    accentHue,
    secondaryHue,
    youtubeTrailerKey: "4OiMOHRDs14",
    seasons: mediaType === "tv" ? [
      { seasonNumber: 1, episodeCount: 10, name: "Season 1" },
      { seasonNumber: 2, episodeCount: 8, name: "Season 2" },
      { seasonNumber: 3, episodeCount: 8, name: "Season 3" }
    ] : void 0,
    cast: [
      { id: 901, name: "Alex Mercer", character: "Lead Protagonist", avatarColor: "#2563eb", initials: "AM" },
      { id: 902, name: "Elena Vance", character: "Commander Vance", avatarColor: "#7c3aed", initials: "EV" },
      { id: 903, name: "Marcus Wright", character: "Specialist", avatarColor: "#059669", initials: "MW" },
      { id: 904, name: "Sora Takahashi", character: "Archivist", avatarColor: "#d97706", initials: "ST" }
    ],
    downloads: [
      {
        id: `dl-${cleanId}-1080`,
        resolution: 1080,
        sizeFormatted: "2.10 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC 5.1",
        url: `#dl-${cleanId}-1080p`
      },
      {
        id: `dl-${cleanId}-720`,
        resolution: 720,
        sizeFormatted: "1.05 GB",
        format: "mp4",
        fps: 24,
        codec: "H.264 AAC",
        url: `#dl-${cleanId}-720p`
      }
    ],
    subtitles: DEFAULT_SUBTITLES
  };
}
var SERIES_TIMING_REGISTRY = {
  // Stranger Things (TMDB 66732 / IMDb tt4574334)
  "66732": {
    imdbId: "tt4574334",
    seasons: { 1: 8, 2: 9, 3: 8, 4: 9 },
    episodeNames: {
      "1:1": "Chapter One: The Vanishing of Will Byers",
      "1:2": "Chapter Two: The Weirdo on Maple Street",
      "1:3": "Chapter Three: Holly, Jolly",
      "1:4": "Chapter Four: The Body",
      "1:5": "Chapter Five: The Flea and the Acrobat",
      "1:6": "Chapter Six: The Monster",
      "1:7": "Chapter Seven: The Bathtub",
      "1:8": "Chapter Eight: The Upside Down",
      "2:1": "Chapter One: MADMAX",
      "4:1": "Chapter One: The Hellfire Club",
      "4:9": "Chapter Nine: The Piggyback"
    },
    episodes: {
      "1:1": { introStart: 505, introEnd: 555, outroStart: 2774, outroEnd: 2852 },
      "1:2": { introStart: 274.5, introEnd: 324, outroStart: 3179, outroEnd: 3264 },
      "1:3": { introStart: 120, introEnd: 171, outroStart: 2965, outroEnd: 3051 },
      "1:4": { introStart: 465, introEnd: 516, outroStart: 2884, outroEnd: 2967 },
      "1:8": { introStart: 578, introEnd: 628, outroStart: 3145, outroEnd: 3228 },
      "4:1": { introStart: 529, introEnd: 579, outroStart: 4374, outroEnd: 4546 },
      "4:9": { introStart: 542, introEnd: 592, outroStart: 8222, outroEnd: 8397 }
    }
  },
  // Squid Game (TMDB 93405 / IMDb tt10919420)
  "93405": {
    imdbId: "tt10919420",
    seasons: { 1: 9, 2: 7, 3: 6 },
    episodeNames: {
      "1:1": "Red Light, Green Light",
      "1:2": "Hell",
      "1:3": "The Man with the Umbrella",
      "1:9": "One Lucky Day",
      "2:1": "Bread and Lottery"
    },
    episodes: {
      "1:1": { introStart: null, introEnd: null, outroStart: 3312, outroEnd: 3582 },
      "1:2": { introStart: 22.7, introEnd: 41.5, outroStart: 3476, outroEnd: 3750 },
      "1:3": { introStart: 408, introEnd: 426.9, outroStart: 2983, outroEnd: 3243 },
      "1:9": { introStart: null, introEnd: null, outroStart: 3052, outroEnd: 3328 }
    }
  },
  // Attack on Titan (TMDB 1429 / IMDb tt2560140)
  "1429": {
    imdbId: "tt2560140",
    seasons: { 1: 25, 2: 12, 3: 22, 4: 28 },
    episodeNames: {
      "1:1": "To You, in 2000 Years: The Fall of Shiganshina (1)",
      "1:2": "That Day: The Fall of Shiganshina (2)",
      "1:3": "A Dim Light Amid Despair: Humanity\u2019s Comeback (1)",
      "1:25": "Wall: Assault on Stohess (3)",
      "2:1": "Beast Titan",
      "4:28": "The Dawn of Humanity"
    },
    episodes: {
      "1:1": { introStart: 90, introEnd: 150, outroStart: 1434.96, outroEnd: 1524.92 },
      "1:2": { introStart: 54.312, introEnd: 144.312, outroStart: 1345, outroEnd: 1436 },
      "1:3": { introStart: 0, introEnd: 92, outroStart: 1344.99, outroEnd: 1434.95 },
      "1:25": { introStart: 84.081, introEnd: 173.581, outroStart: 1347.012, outroEnd: 1410.034 },
      "4:28": { introStart: 60, introEnd: 150, outroStart: 1335, outroEnd: 1425 }
    }
  },
  // Breaking Bad (TMDB 1396 / IMDb tt0903747)
  "1396": {
    imdbId: "tt0903747",
    seasons: { 1: 7, 2: 13, 3: 13, 4: 13, 5: 16 },
    episodeNames: {
      "1:1": "Pilot",
      "1:2": "Cat's in the Bag...",
      "1:3": "...And the Bag's in the River",
      "1:7": "A No-Rough-Stuff-Type Deal",
      "2:1": "Seven Thirty-Seven",
      "5:16": "Felina"
    },
    episodes: {
      "1:1": { introStart: null, introEnd: null, outroStart: 3431, outroEnd: 3500 },
      "1:2": { introStart: 314.5, introEnd: 331, outroStart: 2843, outroEnd: 2901 },
      "1:3": { introStart: 183, introEnd: 199, outroStart: 2847, outroEnd: 2901 },
      "1:7": { introStart: 226.005, introEnd: 242.74, outroStart: 2813, outroEnd: 2872 },
      "5:16": { introStart: 219, introEnd: 236, outroStart: 3274, outroEnd: 3327 }
    }
  },
  // Jujutsu Kaisen (TMDB 95479 / IMDb tt12343534)
  "95479": {
    imdbId: "tt12343534",
    seasons: { 1: 24, 2: 23 },
    episodeNames: {
      "1:1": "Ryomen Sukuna",
      "1:2": "For Myself"
    },
    episodes: {
      "1:1": { introStart: 55, introEnd: 145, outroStart: 1350, outroEnd: 1436 },
      "1:2": { introStart: 345, introEnd: 435, outroStart: 1336, outroEnd: 1436 }
    }
  },
  // Demon Slayer (TMDB 85937 / IMDb tt9335498)
  "85937": {
    imdbId: "tt9335498",
    seasons: { 1: 26, 2: 18, 3: 11, 4: 8 },
    episodeNames: {
      "1:1": "Cruelty",
      "1:2": "Trainer Sakonji Urokodaki"
    },
    episodes: {
      "1:1": { introStart: null, introEnd: null, outroStart: 1270, outroEnd: 1360 },
      "1:2": { introStart: 57.303, introEnd: 147.282, outroStart: 1290.083, outroEnd: 1380.083 }
    }
  },
  // One Piece (TMDB 37854 / IMDb tt0388629)
  "37854": {
    imdbId: "tt0388629",
    seasons: { 1: 61 },
    episodeNames: {
      "1:1": "I'm Luffy! The Man Who's Gonna Be King of the Pirates!",
      "1:2": "Enter the Great Swordsman! Pirate Hunter Roronoa Zoro!"
    },
    episodes: {
      "1:1": { introStart: 28.783, introEnd: 118.783, outroStart: 1382, outroEnd: 1422 }
    }
  },
  // House of the Dragon (TMDB 94997 / IMDb tt11198330)
  "94997": {
    imdbId: "tt11198330",
    seasons: { 1: 10, 2: 8 },
    episodes: {
      "1:2": { introStart: 0, introEnd: 105, outroStart: 3155, outroEnd: 3231 }
    }
  },
  // Game of Thrones (TMDB 1399 / IMDb tt0944947)
  "1399": {
    imdbId: "tt0944947",
    seasons: { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 7, 8: 6 },
    episodes: {
      "1:1": { introStart: 437, introEnd: 531, outroStart: 3631.5, outroEnd: 3699.5 }
    }
  },
  // Loki (TMDB 84958 / IMDb tt9140554)
  "84958": {
    imdbId: "tt9140554",
    seasons: { 1: 6, 2: 6 },
    episodes: {
      "1:1": { introStart: 76.38, introEnd: 111, outroStart: 2902.04, outroEnd: 3022.56 }
    }
  },
  // The Last of Us (TMDB 100088 / IMDb tt3581920)
  "100088": {
    imdbId: "tt3581920",
    seasons: { 1: 9 },
    episodes: {
      "1:2": { introStart: 548, introEnd: 617, outroStart: 3101, outroEnd: 3167.1 }
    }
  },
  // The Boys (TMDB 76479 / IMDb tt1190634)
  "76479": {
    imdbId: "tt1190634",
    seasons: { 1: 8, 2: 8, 3: 8, 4: 8 },
    episodes: {
      "1:2": { introStart: null, introEnd: null, outroStart: 3427, outroEnd: 3621 }
    }
  },
  // Rick and Morty (TMDB 60625 / IMDb tt2861424)
  "60625": {
    imdbId: "tt2861424",
    seasons: { 1: 11, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10 },
    episodes: {
      "1:1": { introStart: 128, introEnd: 160, outroStart: 1295, outroEnd: 1321 }
    }
  },
  // Frieren: Beyond Journey's End (TMDB 209867 / IMDb tt22248376)
  "209867": {
    imdbId: "tt22248376",
    seasons: { 1: 28 },
    episodes: {
      "1:1": { introStart: 3.221, introEnd: 93.221, outroStart: 1460.021, outroEnd: 1550.021 },
      "1:2": { introStart: 0, introEnd: 90, outroStart: 1460, outroEnd: 1550 }
    }
  },
  // Solo Leveling (TMDB 127532 / IMDb tt21209876)
  "127532": {
    imdbId: "tt21209876",
    seasons: { 1: 12, 2: 13 },
    episodes: {
      "1:1": { introStart: null, introEnd: null, outroStart: 1380, outroEnd: 1440 },
      "1:2": { introStart: 104.604, introEnd: 194.265, outroStart: 1326, outroEnd: 1407 }
    }
  },
  // Chainsaw Man (TMDB 114410 / IMDb tt13616990)
  "114410": {
    imdbId: "tt13616990",
    seasons: { 1: 12 },
    episodes: {
      "1:1": { introStart: 135.04, introEnd: 221.417, outroStart: 1434.542, outroEnd: 1523.125 },
      "1:2": { introStart: 111.5, introEnd: 200.5, outroStart: 1345.083, outroEnd: 1435.152 }
    }
  },
  // Wednesday (TMDB 119051 / IMDb tt13443470)
  "119051": {
    imdbId: "tt13443470",
    seasons: { 1: 8, 2: 8 },
    episodes: {
      "1:1": { introStart: 169, introEnd: 234, outroStart: 3313, outroEnd: 3647 },
      "1:2": { introStart: 250, introEnd: 315, outroStart: 3e3, outroEnd: 3200 }
    }
  },
  // Death Note (TMDB 13916 / IMDb tt0877057)
  "13916": {
    imdbId: "tt0877057",
    seasons: { 1: 37 },
    episodes: {
      "1:1": { introStart: 1.039, introEnd: 91.039, outroStart: 1286.12, outroEnd: 1356.11 }
    }
  },
  // Naruto Shippuden (TMDB 31910 / IMDb tt0988824)
  "31910": {
    imdbId: "tt0988824",
    seasons: { 1: 32 },
    episodes: {
      "1:1": { introStart: 511.99, introEnd: 602.01, outroStart: 1206.42, outroEnd: 1296.44 }
    }
  },
  // Bleach (TMDB 30984 / IMDb tt0434665)
  "30984": {
    imdbId: "tt0434665",
    seasons: { 1: 20 },
    episodes: {
      "1:1": { introStart: 0.557, introEnd: 90.557, outroStart: 1301.658, outroEnd: 1384 }
    }
  },
  // Arcane (TMDB 94605 / IMDb tt11126994)
  "94605": {
    imdbId: "tt11126994",
    seasons: { 1: 9, 2: 9 },
    episodes: {
      "1:1": { introStart: 200, introEnd: 266, outroStart: 2378, outroEnd: 2498 }
    }
  },
  // Hunter x Hunter (TMDB 46298 / IMDb tt2098220)
  "46298": {
    imdbId: "tt2098220",
    seasons: { 1: 26, 2: 12, 3: 20, 4: 17, 5: 61, 6: 12 },
    episodes: {
      "1:1": { introStart: 0, introEnd: 80, outroStart: 1344, outroEnd: 1411 }
    }
  },
  // My Hero Academia (TMDB 65930 / IMDb tt5626028)
  "65930": {
    imdbId: "tt5626028",
    seasons: { 1: 13, 2: 25, 3: 25, 4: 25, 5: 25, 6: 25, 7: 21 },
    episodes: {
      "1:1": { introStart: 193.801, introEnd: 288.801, outroStart: 1351.35, outroEnd: 1441.19 }
    }
  },
  // Naruto (TMDB 46260 / IMDb tt0409591)
  "46260": {
    imdbId: "tt0409591",
    seasons: { 1: 5 },
    episodes: {
      "1:1": { introStart: 0, introEnd: 91, outroStart: 1281, outroEnd: 1375 }
    }
  }
};
var GLOBAL_SERIES_IMDB_LOOKUP = {
  "1429": "tt2560140",
  // Attack on Titan
  "95479": "tt12343534",
  // Jujutsu Kaisen
  "85937": "tt9335498",
  // Demon Slayer
  "127532": "tt21209876",
  // Solo Leveling
  "209867": "tt22248376",
  // Frieren
  "114410": "tt13616990",
  // Chainsaw Man
  "37854": "tt0388629",
  // One Piece
  "31910": "tt0988824",
  // Naruto Shippuden
  "46260": "tt0409591",
  // Naruto
  "30984": "tt0434665",
  // Bleach
  "13916": "tt0877057",
  // Death Note
  "46298": "tt2098220",
  // Hunter x Hunter
  "65930": "tt5626028",
  // My Hero Academia
  "12971": "tt0214341",
  // Dragon Ball Z
  "73223": "tt7441658",
  // Black Clover
  "156663": "tt15243170",
  // Blue Lock
  "240411": "tt30209877",
  // Dandadan
  "207468": "tt21617430",
  // Kaiju No. 8
  "120089": "tt13706018",
  // Spy x Family
  "61459": "tt3741634",
  // Tokyo Ghoul
  "4087": "tt0213338",
  // Cowboy Bebop
  "31911": "tt1399103",
  // Fullmetal Alchemist: Brotherhood
  "34524": "tt1910645",
  // Steins;Gate
  "83095": "tt10233444",
  // Vinland Saga
  "105248": "tt12590266",
  // Cyberpunk: Edgerunners
  "63926": "tt4508902",
  // One Punch Man
  "66732": "tt4574334",
  // Stranger Things
  "93405": "tt10919420",
  // Squid Game
  "119051": "tt13443470",
  // Wednesday
  "1396": "tt0903747",
  // Breaking Bad
  "60059": "tt3032476",
  // Better Call Saul
  "76479": "tt1190634",
  // The Boys
  "94997": "tt11198330",
  // House of the Dragon
  "1399": "tt0944947",
  // Game of Thrones
  "100088": "tt3581920",
  // The Last of Us
  "84958": "tt9140554",
  // Loki
  "94605": "tt11126994",
  // Arcane
  "70523": "tt5753856",
  // Dark
  "60574": "tt2442560",
  // Peaky Blinders
  "71446": "tt6468322",
  // Money Heist
  "71912": "tt5180504",
  // The Witcher
  "95396": "tt11280740",
  // Severance
  "106379": "tt12637874",
  // Fallout
  "136283": "tt14452776",
  // The Bear
  "134949": "tt15474916",
  // The Penguin
  "126308": "tt2788316"
  // Shogun
};
var GLOBAL_SERIES_TVDB_LOOKUP = {
  "1429": 267440,
  // Attack on Titan
  "95479": 370984,
  // Jujutsu Kaisen
  "85937": 352657,
  // Demon Slayer
  "127532": 421946,
  // Solo Leveling
  "209867": 424564,
  // Frieren
  "114410": 393843,
  // Chainsaw Man
  "37854": 81797,
  // One Piece
  "31910": 79824,
  // Naruto Shippuden
  "46260": 78857,
  // Naruto
  "30984": 74796,
  // Bleach
  "13916": 79519,
  // Death Note
  "46298": 252876,
  // Hunter x Hunter
  "65930": 305074,
  // My Hero Academia
  "12971": 76666,
  // Dragon Ball Z
  "73223": 332283,
  // Black Clover
  "156663": 408104,
  // Blue Lock
  "240411": 442805,
  // Dandadan
  "207468": 423295,
  // Kaiju No. 8
  "120089": 411911,
  // Spy x Family
  "61459": 281630,
  // Tokyo Ghoul
  "4087": 76885,
  // Cowboy Bebop
  "31911": 85249,
  // Fullmetal Alchemist: Brotherhood
  "34524": 246151,
  // Steins;Gate
  "83095": 359392,
  // Vinland Saga
  "105248": 384400,
  // Cyberpunk: Edgerunners
  "63926": 298370,
  // One Punch Man
  "66732": 305288,
  // Stranger Things
  "93405": 383584,
  // Squid Game
  "119051": 403444,
  // Wednesday
  "1396": 81189,
  // Breaking Bad
  "60059": 273181,
  // Better Call Saul
  "76479": 355567,
  // The Boys
  "94997": 371572,
  // House of the Dragon
  "1399": 121361,
  // Game of Thrones
  "100088": 392256,
  // The Last of Us
  "84958": 362624,
  // Loki
  "94605": 370177,
  // Arcane
  "70523": 334464,
  // Dark
  "60574": 266187,
  // Peaky Blinders
  "71446": 327051,
  // Money Heist
  "71912": 362696,
  // The Witcher
  "95396": 371980,
  // Severance
  "106379": 421776,
  // Fallout
  "136283": 417855,
  // The Bear
  "134949": 410313,
  // The Penguin
  "126308": 396491
  // Shogun
};
function getSeriesTvdbId(tmdbId) {
  const cleanId = String(tmdbId).trim();
  return GLOBAL_SERIES_TVDB_LOOKUP[cleanId] ?? null;
}
function getSeriesImdbId(tmdbId) {
  const cleanId = String(tmdbId).trim();
  return SERIES_TIMING_REGISTRY[cleanId]?.imdbId ?? GLOBAL_SERIES_IMDB_LOOKUP[cleanId] ?? null;
}
function getEpisodeTimingMetadata(tmdbId, seasonNumber, episodeNumber, mediaType = "tv") {
  if (mediaType !== "tv") return null;
  const cleanId = String(tmdbId).trim();
  const spec = SERIES_TIMING_REGISTRY[cleanId];
  if (spec) {
    const epCountInSeason = spec.seasons[seasonNumber];
    const seasonNumbers = Object.keys(spec.seasons).map(Number).sort((a, b) => a - b);
    const maxSeason = seasonNumbers[seasonNumbers.length - 1] || seasonNumber;
    const isFinalEpisodeOfSeries = seasonNumber === maxSeason && (epCountInSeason ? episodeNumber === epCountInSeason : false);
    let nextEpId = null;
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
        nextEpisodeTriggerTime: isFinalEpisodeOfSeries ? null : verified.outroStart ?? verified.outroEnd,
        nextEpisodeId: isFinalEpisodeOfSeries ? null : nextEpId
      };
    }
    const isAnimeOrShort = ["1429", "95479", "85937", "127532", "209867", "114410", "37854", "31910", "46260", "30984", "13916", "46298", "65930", "12971", "60625"].includes(cleanId);
    const introStart2 = isAnimeOrShort ? 90 : 120;
    const introEnd2 = isAnimeOrShort ? 180 : 175;
    const outroStart2 = isAnimeOrShort ? 1350 : 2850;
    const outroEnd2 = isAnimeOrShort ? 1440 : 2950;
    return {
      introStart: introStart2,
      introEnd: introEnd2,
      outroStart: outroStart2,
      outroEnd: outroEnd2,
      nextEpisodeTriggerTime: isFinalEpisodeOfSeries ? null : outroStart2,
      nextEpisodeId: isFinalEpisodeOfSeries ? null : nextEpId
    };
  }
  const isKnownAnime = ["73223", "156663", "240411", "207468", "120089", "61459", "4087", "31911", "34524", "83095", "105248", "63926"].includes(cleanId);
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
    nextEpisodeId: `${cleanId}:${seasonNumber}:${episodeNumber + 1}`
  };
}
function getCatalogSeasonEpisodes(tmdbId, seasonNumber) {
  const cleanId = String(tmdbId).trim();
  const spec = SERIES_TIMING_REGISTRY[cleanId];
  const catalogEntry = CATALOG_BY_KEY[`tv:${cleanId}`];
  const epCount = spec?.seasons[seasonNumber] ?? catalogEntry?.seasons?.find((s) => s.seasonNumber === seasonNumber)?.episodeCount ?? 0;
  if (!epCount || epCount <= 0) return [];
  const result = [];
  for (let ep = 1; ep <= epCount; ep++) {
    const timing = getEpisodeTimingMetadata(cleanId, seasonNumber, ep, "tv");
    const customTitle = spec?.episodeNames?.[`${seasonNumber}:${ep}`];
    result.push({
      id: Number(`${cleanId}${seasonNumber}${ep}`),
      season_number: seasonNumber,
      episode_number: ep,
      name: customTitle || `Episode ${ep}`,
      overview: `Season ${seasonNumber}, Episode ${ep} of ${catalogEntry?.title || `Series #${cleanId}`}.`,
      still_path: null,
      runtime: catalogEntry?.runtimeMinutes || 48,
      ...timing || {}
    });
  }
  return result;
}

// src/utils/urlBuilder.ts
var NXSHA_SERVERS = [
  { index: 0, id: "rive-citadel", label: "Citadel (Hindi & Multi)" },
  { index: 1, id: "castle", label: "CastVid (Multi-Lang)" },
  { index: 2, id: "watchout", label: "Multi-bill (Fast HLS)" },
  { index: 3, id: "streamflix", label: "StremFx (Direct MP4)" },
  { index: 4, id: "nitro", label: "Nitro (1080p Multi-Audio)" },
  { index: 5, id: "xdownloader", label: "XDrop (Alternative)" },
  { index: 6, id: "purstream", label: "PurStream (Fast)" },
  { index: 7, id: "vixolity", label: "Vixolity (UHD)" },
  { index: 8, id: "rive-primevids", label: "PrimeVids (Backup)" }
];
function normalizeIntervalSeconds(params) {
  const { startSec, endSec, startMs, endMs, allowStartNullAsZero = true } = params;
  const effectiveStartMs = startMs === null && allowStartNullAsZero && endMs !== null && endMs !== void 0 ? 0 : startMs;
  const effectiveStartSec = startSec === null && allowStartNullAsZero && endSec !== null && endSec !== void 0 ? 0 : startSec;
  const hasValidMs = effectiveStartMs !== null && effectiveStartMs !== void 0 && endMs !== null && endMs !== void 0 && Number.isFinite(effectiveStartMs) && Number.isFinite(endMs) && effectiveStartMs >= 0 && endMs > effectiveStartMs;
  const hasValidSec = effectiveStartSec !== null && effectiveStartSec !== void 0 && endSec !== null && endSec !== void 0 && Number.isFinite(effectiveStartSec) && Number.isFinite(endSec) && effectiveStartSec >= 0 && endSec > effectiveStartSec;
  if (hasValidSec) {
    const looksLikeMilliseconds = !hasValidMs && (endSec > 18e3 || endSec >= 1e4 && endSec - effectiveStartSec >= 2e3 && effectiveStartSec >= 1e3);
    if (looksLikeMilliseconds) {
      return {
        start: Number((effectiveStartSec / 1e3).toFixed(3)),
        end: Number((endSec / 1e3).toFixed(3))
      };
    }
    return { start: effectiveStartSec, end: endSec };
  }
  if (hasValidMs) {
    return {
      start: Number((effectiveStartMs / 1e3).toFixed(3)),
      end: Number((endMs / 1e3).toFixed(3))
    };
  }
  if (effectiveStartMs !== null && effectiveStartMs !== void 0 && Number.isFinite(effectiveStartMs) && effectiveStartMs >= 0 && (endMs === null || endMs === void 0)) {
    return {
      start: Number((effectiveStartMs / 1e3).toFixed(3)),
      end: null
    };
  }
  if (effectiveStartSec !== null && effectiveStartSec !== void 0 && Number.isFinite(effectiveStartSec) && effectiveStartSec >= 0 && (endSec === null || endSec === void 0)) {
    const isMs = !hasValidMs && effectiveStartSec > 18e3;
    return {
      start: isMs ? Number((effectiveStartSec / 1e3).toFixed(3)) : effectiveStartSec,
      end: null
    };
  }
  return { start: null, end: null };
}
var NXSHA_LANG_PATTERNS = [
  { code: "hi", name: "Hindi", regex: /(?:^|\b|\s|\[|\|)(hindi|hin|hi|हिन्दी|हिंदी)(?:\b|\s|\]|\||$)/i },
  { code: "en", name: "English", regex: /(?:^|\b|\s|\[|\|)(english|eng|en)(?:\b|\s|\]|\||$)/i },
  { code: "ta", name: "Tamil", regex: /(?:^|\b|\s|\[|\|)(tamil|tam|ta|தமிழ்)(?:\b|\s|\]|\||$)/i },
  { code: "te", name: "Telugu", regex: /(?:^|\b|\s|\[|\|)(telugu|tel|te|తెలుగు)(?:\b|\s|\]|\||$)/i },
  { code: "ml", name: "Malayalam", regex: /(?:^|\b|\s|\[|\|)(malayalam|mal|ml|മലയാളം)(?:\b|\s|\]|\||$)/i },
  { code: "kn", name: "Kannada", regex: /(?:^|\b|\s|\[|\|)(kannada|kan|kn|ಕನ್ನಡ)(?:\b|\s|\]|\||$)/i },
  { code: "bn", name: "Bengali", regex: /(?:^|\b|\s|\[|\|)(bengali|bangla|ben|bn|বাংলা)(?:\b|\s|\]|\||$)/i },
  { code: "es", name: "Spanish", regex: /(?:^|\b|\s|\[|\|)(spanish|español|espanol|esla|castilian|spa|es)(?:\b|\s|\]|\||$)/i },
  { code: "fr", name: "French", regex: /(?:^|\b|\s|\[|\|)(french|français|francais|fra|fre|fr)(?:\b|\s|\]|\||$)/i },
  { code: "de", name: "German", regex: /(?:^|\b|\s|\[|\|)(german|deutsch|ger|deu|de)(?:\b|\s|\]|\||$)/i },
  { code: "ja", name: "Japanese", regex: /(?:^|\b|\s|\[|\|)(japanese|日本語|nihongo|jap|jpn|ja)(?:\b|\s|\]|\||$)/i },
  { code: "pt", name: "Portuguese", regex: /(?:^|\b|\s|\[|\|)(portuguese|ptbr|português|portugues|por|pt)(?:\b|\s|\]|\||$)/i },
  { code: "it", name: "Italian", regex: /(?:^|\b|\s|\[|\|)(italian|italiano|ita|it)(?:\b|\s|\]|\||$)/i },
  { code: "ko", name: "Korean", regex: /(?:^|\b|\s|\[|\|)(korean|한국어|kor|ko)(?:\b|\s|\]|\||$)/i },
  { code: "ar", name: "Arabic", regex: /(?:^|\b|\s|\[|\|)(arabic|العربية|ara|ar)(?:\b|\s|\]|\||$)/i },
  { code: "ru", name: "Russian", regex: /(?:^|\b|\s|\[|\|)(russian|русский|rus|ru)(?:\b|\s|\]|\||$)/i },
  { code: "tr", name: "Turkish", regex: /(?:^|\b|\s|\[|\|)(turkish|türkçe|turkce|tur|tr)(?:\b|\s|\]|\||$)/i },
  { code: "pl", name: "Polish", regex: /(?:^|\b|\s|\[|\|)(polish|polski|pol|pl)(?:\b|\s|\]|\||$)/i },
  { code: "id", name: "Indonesian", regex: /(?:^|\b|\s|\[|\|)(indonesian|bahasa|ind|id)(?:\b|\s|\]|\||$)/i },
  { code: "tl", name: "Tagalog", regex: /(?:^|\b|\s|\[|\|)(tagalog|filipino|tgl|tl)(?:\b|\s|\]|\||$)/i },
  { code: "vi", name: "Vietnamese", regex: /(?:^|\b|\s|\[|\|)(vietnamese|vietsub|thuyết minh|vie|vi)(?:\b|\s|\]|\||$)/i }
];
function detectSingleStreamLanguage(text) {
  if (!text) return null;
  let normalized = text;
  normalized = normalized.replace(/\[([^\]]*,[^\]]*)\]/g, (_full, inner) => {
    const firstPart = inner.split(",")[0]?.trim() || "";
    return `[${firstPart}]`;
  });
  let bestMatch = null;
  for (const pat of NXSHA_LANG_PATTERNS) {
    const m = pat.regex.exec(normalized);
    if (m && (bestMatch === null || m.index < bestMatch.index)) {
      bestMatch = { code: pat.code, name: pat.name, index: m.index };
    }
  }
  return bestMatch ? { code: bestMatch.code, name: bestMatch.name } : null;
}
function detectAllStreamLanguages(text) {
  if (!text) return [];
  const matches = [];
  for (const pat of NXSHA_LANG_PATTERNS) {
    const m = pat.regex.exec(text);
    if (m) {
      matches.push({ code: pat.code, name: pat.name, index: m.index });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  return matches.map(({ code, name }) => ({ code, name }));
}
function parseResolutionHeight(text) {
  if (!text) return 0;
  const m = text.match(/\b(2160|1440|1080|720|480|360)p?\b/i);
  if (m) return Number.parseInt(m[1], 10);
  if (/\b4k\b/i.test(text)) return 2160;
  return 0;
}
var ISO639_TO_DUB_CODE = {
  hin: { code: "hi", name: "Hindi" },
  hi: { code: "hi", name: "Hindi" },
  eng: { code: "en", name: "English" },
  en: { code: "en", name: "English" },
  tam: { code: "ta", name: "Tamil" },
  ta: { code: "ta", name: "Tamil" },
  tel: { code: "te", name: "Telugu" },
  te: { code: "te", name: "Telugu" },
  mal: { code: "ml", name: "Malayalam" },
  ml: { code: "ml", name: "Malayalam" },
  kan: { code: "kn", name: "Kannada" },
  kn: { code: "kn", name: "Kannada" },
  ben: { code: "bn", name: "Bengali" },
  bn: { code: "bn", name: "Bengali" },
  spa: { code: "es", name: "Spanish" },
  es: { code: "es", name: "Spanish" },
  fra: { code: "fr", name: "French" },
  fre: { code: "fr", name: "French" },
  fr: { code: "fr", name: "French" },
  deu: { code: "de", name: "German" },
  ger: { code: "de", name: "German" },
  de: { code: "de", name: "German" },
  jpn: { code: "ja", name: "Japanese" },
  ja: { code: "ja", name: "Japanese" },
  por: { code: "pt", name: "Portuguese" },
  pt: { code: "pt", name: "Portuguese" },
  ita: { code: "it", name: "Italian" },
  it: { code: "it", name: "Italian" },
  kor: { code: "ko", name: "Korean" },
  ko: { code: "ko", name: "Korean" },
  ara: { code: "ar", name: "Arabic" },
  ar: { code: "ar", name: "Arabic" },
  rus: { code: "ru", name: "Russian" },
  ru: { code: "ru", name: "Russian" },
  tur: { code: "tr", name: "Turkish" },
  tr: { code: "tr", name: "Turkish" },
  pol: { code: "pl", name: "Polish" },
  pl: { code: "pl", name: "Polish" },
  ind: { code: "id", name: "Indonesian" },
  id: { code: "id", name: "Indonesian" },
  tgl: { code: "tl", name: "Tagalog" },
  fil: { code: "tl", name: "Tagalog" },
  tl: { code: "tl", name: "Tagalog" },
  vie: { code: "vi", name: "Vietnamese" },
  vi: { code: "vi", name: "Vietnamese" }
};
function iso639ToDubInfo(isoCode) {
  if (!isoCode) return null;
  const clean = isoCode.trim().toLowerCase();
  if (!clean || clean === "und" || clean === "mul" || clean === "mis" || clean === "zxx") {
    return null;
  }
  return ISO639_TO_DUB_CODE[clean] || null;
}
function mpeg2Crc32(bytes) {
  let crc = 4294967295;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 24;
    for (let b = 0; b < 8; b++) {
      if (crc & 2147483648) {
        crc = (crc << 1 ^ 79764919) >>> 0;
      } else {
        crc = crc << 1 >>> 0;
      }
    }
  }
  return crc >>> 0;
}
function isMpegTsAudioStreamType(streamType) {
  return streamType === 3 || // MPEG-1 Audio
  streamType === 4 || // MPEG-2 Audio
  streamType === 15 || // ISO/IEC 13818-7 ADTS AAC
  streamType === 17 || // ISO/IEC 14496-3 LATM AAC
  streamType === 129 || // AC-3
  streamType === 135;
}
function inspectAndSelectMpegTsAudioTrack(data, targetDubCode) {
  const emptyResult = {
    isMpegTs: false,
    audioTrackCount: 0,
    discoveredLangs: [],
    discoveredDubs: [],
    selectedLang: "",
    matchedTargetLang: false,
    modified: false
  };
  if (!data || data.length < 188) return emptyResult;
  let startOffset = -1;
  const maxScan = Math.min(data.length - 188, 2048);
  for (let i = 0; i <= maxScan; i++) {
    if (data[i] === 71 && (i + 188 >= data.length || data[i + 188] === 71) && (i + 376 >= data.length || data[i + 376] === 71)) {
      startOffset = i;
      break;
    }
  }
  if (startOffset < 0) return emptyResult;
  const rawTarget = (targetDubCode || "").trim().toLowerCase();
  const isOriginalTarget = !rawTarget || rawTarget === "orig" || rawTarget === "original";
  const normTarget = rawTarget === "esla" ? "es" : rawTarget === "ptbr" ? "pt" : rawTarget;
  let pmtPid = 4096;
  let audioTrackCount = 0;
  const discoveredLangSet = /* @__PURE__ */ new Set();
  const discoveredDubsMap = /* @__PURE__ */ new Map();
  let selectedLang = "";
  let matchedTargetLang = false;
  let modified = false;
  for (let pkt = startOffset; pkt + 188 <= data.length; pkt += 188) {
    if (data[pkt] !== 71) continue;
    const pusi = (data[pkt + 1] & 64) !== 0;
    const pid = (data[pkt + 1] & 31) << 8 | data[pkt + 2];
    const afc = data[pkt + 3] >> 4 & 3;
    if ((afc & 1) === 0) continue;
    let payStart = pkt + 4;
    if (afc & 2) {
      const adaptLen = data[pkt + 4];
      payStart += 1 + adaptLen;
    }
    if (payStart >= pkt + 188) continue;
    if (pid === 0 && pusi) {
      const pointer = data[payStart];
      const secStart = payStart + 1 + pointer;
      if (secStart + 8 < pkt + 188 && data[secStart] === 0) {
        const secLen = (data[secStart + 1] & 15) << 8 | data[secStart + 2];
        const loopEnd = Math.min(pkt + 188, secStart + 3 + secLen - 4);
        for (let pos = secStart + 8; pos + 4 <= loopEnd; pos += 4) {
          const progNum = data[pos] << 8 | data[pos + 1];
          const progPid = (data[pos + 2] & 31) << 8 | data[pos + 3];
          if (progNum !== 0 && progPid > 0) {
            pmtPid = progPid;
            break;
          }
        }
      }
      continue;
    }
    if (pid === pmtPid && pusi) {
      const pointer = data[payStart];
      const secStart = payStart + 1 + pointer;
      if (secStart + 12 >= pkt + 188 || data[secStart] !== 2) continue;
      const secLen = (data[secStart + 1] & 15) << 8 | data[secStart + 2];
      const secEnd = secStart + 3 + secLen;
      if (secEnd > pkt + 188) continue;
      const pcrPid = (data[secStart + 8] & 31) << 8 | data[secStart + 9];
      const progInfoLen = (data[secStart + 10] & 15) << 8 | data[secStart + 11];
      const esPos = secStart + 12 + progInfoLen;
      const esEnd = secEnd - 4;
      if (esPos > esEnd) continue;
      const entries = [];
      let pos = esPos;
      while (pos + 5 <= esEnd) {
        const streamType = data[pos];
        const elemPid = (data[pos + 1] & 31) << 8 | data[pos + 2];
        const esInfoLen = (data[pos + 3] & 15) << 8 | data[pos + 4];
        const entryEnd = pos + 5 + esInfoLen;
        if (entryEnd > esEnd) break;
        let isoLang = "";
        let dPos = pos + 5;
        while (dPos + 2 <= entryEnd) {
          const dTag = data[dPos];
          const dLen = data[dPos + 1];
          if (dTag === 10 && dLen >= 3 && dPos + 5 <= entryEnd) {
            isoLang = String.fromCharCode(data[dPos + 2], data[dPos + 3], data[dPos + 4]).replace(/\0/g, "").trim().toLowerCase();
          }
          dPos += 2 + dLen;
        }
        const dubInfo = iso639ToDubInfo(isoLang);
        const isAudio = isMpegTsAudioStreamType(streamType);
        entries.push({
          streamType,
          elemPid,
          isoLang,
          dubCode: dubInfo?.code || "",
          dubName: dubInfo?.name || "",
          isAudio,
          rawBytes: data.slice(pos, entryEnd)
        });
        pos = entryEnd;
      }
      const audioEntries = entries.filter((e) => e.isAudio);
      if (audioEntries.length > audioTrackCount) {
        audioTrackCount = audioEntries.length;
      }
      for (let idx = 0; idx < audioEntries.length; idx++) {
        const a = audioEntries[idx];
        if (a.dubCode) {
          discoveredLangSet.add(a.dubCode);
          if (!discoveredDubsMap.has(a.dubCode)) {
            discoveredDubsMap.set(a.dubCode, {
              type: 0,
              lang: a.dubCode,
              name: `${a.dubName} dub`,
              label: a.dubName,
              original: false
            });
          }
        }
      }
      if (audioEntries.length === 1) {
        const onlyAudio = audioEntries[0];
        selectedLang = onlyAudio.dubCode;
        if (isOriginalTarget) {
          matchedTargetLang = !onlyAudio.dubCode || onlyAudio.dubCode === "en";
        } else {
          matchedTargetLang = onlyAudio.dubCode === normTarget || onlyAudio.dubCode === rawTarget || onlyAudio.isoLang === rawTarget;
        }
      } else if (audioEntries.length > 1) {
        let chosenAudio = audioEntries[0];
        if (isOriginalTarget) {
          chosenAudio = audioEntries.find((a) => a.dubCode === "en") || audioEntries[0];
          matchedTargetLang = true;
        } else {
          const exactMatch = audioEntries.find(
            (a) => a.dubCode === normTarget || a.dubCode === rawTarget || rawTarget.length === 3 && a.isoLang === rawTarget
          );
          if (exactMatch) {
            chosenAudio = exactMatch;
            matchedTargetLang = true;
          } else {
            chosenAudio = audioEntries.find((a) => a.dubCode === "en") || audioEntries[0];
            matchedTargetLang = false;
          }
        }
        selectedLang = chosenAudio.dubCode;
        const keptEntries = entries.filter((e) => !e.isAudio || e === chosenAudio);
        const newEsLen = keptEntries.reduce((sum, e) => sum + e.rawBytes.length, 0);
        const removedAudioPids = new Set(
          audioEntries.filter((a) => a !== chosenAudio).map((a) => a.elemPid)
        );
        if (removedAudioPids.has(pcrPid) && keptEntries.length > 0) {
          const newPcrPid = keptEntries[0].elemPid;
          data[secStart + 8] = data[secStart + 8] & 224 | newPcrPid >> 8 & 31;
          data[secStart + 9] = newPcrPid & 255;
        }
        const newSecLen = 9 + progInfoLen + newEsLen + 4;
        data[secStart + 1] = data[secStart + 1] & 240 | newSecLen >> 8 & 15;
        data[secStart + 2] = newSecLen & 255;
        let writePos = esPos;
        for (const k of keptEntries) {
          data.set(k.rawBytes, writePos);
          writePos += k.rawBytes.length;
        }
        const crc = mpeg2Crc32(data.subarray(secStart, writePos));
        data[writePos] = crc >>> 24 & 255;
        data[writePos + 1] = crc >>> 16 & 255;
        data[writePos + 2] = crc >>> 8 & 255;
        data[writePos + 3] = crc & 255;
        writePos += 4;
        while (writePos < pkt + 188) {
          data[writePos++] = 255;
        }
        modified = true;
      }
    }
  }
  return {
    isMpegTs: true,
    audioTrackCount,
    discoveredLangs: Array.from(discoveredLangSet),
    discoveredDubs: Array.from(discoveredDubsMap.values()),
    selectedLang,
    matchedTargetLang,
    modified
  };
}
var SUBTITLE_LANG_NAMES = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  pb: "Portuguese (BR)",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  tr: "Turkish",
  id: "Indonesian",
  vi: "Vietnamese",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  nl: "Dutch",
  pl: "Polish"
};
function normalizeSubtitleTracks(existing, incoming) {
  const combined = [...Array.isArray(existing) ? existing : [], ...Array.isArray(incoming) ? incoming : []];
  const seenLang = /* @__PURE__ */ new Set();
  const result = [];
  for (let i = 0; i < combined.length; i++) {
    const item = combined[i];
    if (!item) continue;
    const rawUrl = String(item.url || item.uri || item.file || "").trim();
    if (!rawUrl) continue;
    const rawTitle = String(item.title || item.label || item.language || item.lang || "").trim();
    if (!rawTitle) continue;
    const lowerCode = rawTitle.toLowerCase();
    const displayLanguage = SUBTITLE_LANG_NAMES[lowerCode] || rawTitle;
    const key = displayLanguage.toLowerCase();
    if (seenLang.has(key)) continue;
    seenLang.add(key);
    result.push({
      id: String(item.id || `sub-${i}-${key}`),
      language: displayLanguage,
      url: rawUrl
    });
  }
  return result;
}

// src/utils/nxshaDiscovery.ts
var ALLOWED_NXSHA_PROVIDERS = [
  "rive-citadel",
  "castle",
  "watchout",
  "streamflix",
  "nitro",
  "xdownloader",
  "purstream",
  "vixolity",
  "rive-primevids"
];
var ALLOWED_PROVIDER_SET = new Set(ALLOWED_NXSHA_PROVIDERS);
function isAuthorizedNxshaProvider(provider) {
  if (!provider || typeof provider !== "string") return false;
  return ALLOWED_PROVIDER_SET.has(provider.trim().toLowerCase());
}
function isDeadNxshaSourceUrl(url) {
  if (!url || typeof url !== "string") return true;
  const lower = url.trim().toLowerCase();
  if (!lower) return true;
  if (lower.includes("nxstreamhub.workers.dev") || lower.includes("worker-inosuke.workers.dev") || lower.includes("silent-math-8425.itsnitrox.tech") || lower.includes("wts.itsnitrox.tech/pitro") || lower.includes("wts.itsnitrox.tech/litro") || lower.includes("husvu445bey.com") || lower.includes("kkphimplayer") || lower.includes("gemma416okl.com/play/")) {
    return true;
  }
  return false;
}
function isPrivateOrLoopbackHost(hostname) {
  if (!hostname || typeof hostname !== "string") return true;
  const clean = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!clean) return true;
  if (clean === "localhost" || clean === "0.0.0.0" || clean === "::1" || clean === "0:0:0:0:0:0:0:1" || clean.endsWith(".localhost") || clean.endsWith(".local") || clean.endsWith(".internal") || clean.endsWith(".arpa")) {
    return true;
  }
  if (clean.includes(":")) {
    if (clean.startsWith("fc") || clean.startsWith("fd") || clean.startsWith("fe8") || clean.startsWith("fe9") || clean.startsWith("fea") || clean.startsWith("feb") || clean.startsWith("::ffff:127.") || clean.startsWith("::ffff:10.") || clean.startsWith("::ffff:192.168.") || clean.startsWith("::ffff:169.254.")) {
      return true;
    }
    return false;
  }
  const ipv4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = [
      Number.parseInt(ipv4Match[1], 10),
      Number.parseInt(ipv4Match[2], 10),
      Number.parseInt(ipv4Match[3], 10),
      Number.parseInt(ipv4Match[4], 10)
    ];
    if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }
  return false;
}
function isTrustedNxshaMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/api/nxsha/proxy") || trimmed.startsWith("/api/stream/proxy")) {
    try {
      const parsedProxy = new URL(trimmed, "https://nxsha.space");
      const innerUrl = parsedProxy.searchParams.get("url") || "";
      if (!innerUrl || innerUrl.startsWith("/")) return false;
      return isTrustedNxshaMediaUrl(innerUrl);
    } catch {
      return false;
    }
  }
  if (isDeadNxshaSourceUrl(trimmed)) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (isPrivateOrLoopbackHost(parsed.hostname)) {
      return false;
    }
    const lowerPath = parsed.pathname.toLowerCase();
    if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm") || lowerPath.endsWith(".js") || lowerPath.endsWith(".exe") || lowerPath.endsWith(".swf")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function validatePlayableNxshaSource(source) {
  if (!source || typeof source !== "object") {
    return { valid: false, reason: "Source is not an object" };
  }
  if (source.isEmbed === true) {
    return { valid: false, reason: "Source is an HTML embed iframe, not a direct media stream" };
  }
  const rawUrl = typeof source.url === "string" ? source.url.trim() : "";
  if (!rawUrl) {
    return { valid: false, reason: "Missing source URL" };
  }
  if (!isTrustedNxshaMediaUrl(rawUrl)) {
    return { valid: false, reason: "Untrusted, dead, or SSRF-blocked source URL" };
  }
  if (source.org_uri && typeof source.org_uri === "string") {
    if (!isTrustedNxshaMediaUrl(source.org_uri)) {
      return { valid: false, reason: "Untrusted original URI on proxied source" };
    }
  }
  try {
    const urlToInspect = source.org_uri && typeof source.org_uri === "string" ? source.org_uri : rawUrl;
    const parsed = new URL(urlToInspect, "https://nxsha.space");
    const expParam = parsed.searchParams.get("Expires") || parsed.searchParams.get("expires") || parsed.searchParams.get("exp");
    if (expParam && /^\d{10}$/.test(expParam.trim())) {
      const expSec = Number.parseInt(expParam.trim(), 10);
      const nowSec = Math.floor(Date.now() / 1e3);
      if (expSec <= nowSec + 30) {
        return {
          valid: false,
          reason: `Source URL signature expired (Expires=${expSec} <= now=${nowSec})`
        };
      }
    }
  } catch {
  }
  const explicitType = typeof source.type === "string" ? source.type.trim().toLowerCase() : "";
  const lowerUrl = `${source.org_uri || ""} ${rawUrl}`.toLowerCase();
  if (lowerUrl.includes(".mkv")) {
    return { valid: false, reason: "Unsupported Matroska (.mkv) container for web playback" };
  }
  let normalizedType = explicitType;
  if (!normalizedType) {
    if (lowerUrl.includes(".mpd") || explicitType === "dash" || explicitType === "andromeda") {
      normalizedType = "dash";
    } else if (lowerUrl.includes(".mp4") || lowerUrl.includes(".webm")) {
      normalizedType = "mp4";
    } else {
      normalizedType = "hls";
    }
  }
  const supportedTypes = /* @__PURE__ */ new Set(["hls", "dash", "andromeda", "mp4", "m3u8", "video/mp4"]);
  if (!supportedTypes.has(normalizedType)) {
    return { valid: false, reason: `Unsupported stream type: ${normalizedType}` };
  }
  const labelToDetect = `${source.label || ""} ${source.quality || ""}`;
  const detectedLang = detectSingleStreamLanguage(labelToDetect);
  const allLangs = detectAllStreamLanguages(labelToDetect);
  const normalizedSource = {
    ...source,
    url: rawUrl,
    type: normalizedType === "m3u8" ? "hls" : normalizedType === "video/mp4" ? "mp4" : normalizedType,
    lang: source.lang || detectedLang?.code || void 0,
    langName: source.langName || detectedLang?.name || void 0,
    multiLangs: Array.isArray(source.multiLangs) && source.multiLangs.length > 0 ? source.multiLangs : allLangs.length > 1 ? allLangs.map((l) => l.code) : void 0
  };
  return { valid: true, normalizedSource };
}
function validateNxshaProviderResponse(provider, response) {
  if (!response || typeof response !== "object") {
    return { valid: false, validSources: [], reason: "Malformed provider response" };
  }
  const rawSources = Array.isArray(response.sources) ? response.sources : [];
  if (rawSources.length === 0) {
    return { valid: false, validSources: [], reason: "Empty sources list" };
  }
  const seenUrls = /* @__PURE__ */ new Set();
  const validSources = [];
  let lastRejectionReason = "No valid playable sources";
  for (const item of rawSources) {
    const check = validatePlayableNxshaSource(item);
    if (!check.valid || !check.normalizedSource) {
      if (check.reason) lastRejectionReason = check.reason;
      continue;
    }
    const u = check.normalizedSource.url;
    if (seenUrls.has(u)) continue;
    seenUrls.add(u);
    validSources.push({
      ...check.normalizedSource,
      provider: check.normalizedSource.provider || provider
    });
  }
  if (validSources.length === 0) {
    return { valid: false, validSources: [], reason: lastRejectionReason };
  }
  validSources.sort((a, b) => {
    const aOrig = !a.lang || a.lang === "en";
    const bOrig = !b.lang || b.lang === "en";
    if (aOrig !== bOrig) return aOrig ? -1 : 1;
    const hA = parseResolutionHeight(`${a.label || ""} ${a.quality || ""} ${a.url || ""}`) || 720;
    const hB = parseResolutionHeight(`${b.label || ""} ${b.quality || ""} ${b.url || ""}`) || 720;
    return hB - hA;
  });
  return { valid: true, validSources };
}
async function raceNxshaProviders(options) {
  const getNow = options.now ?? (() => typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());
  const discoveryStartTimeMs = Number(getNow().toFixed(2));
  const concurrencyLimit = Math.max(1, Math.min(12, options.concurrencyLimit ?? 6));
  const providerTimeoutMs = Math.max(50, options.providerTimeoutMs ?? 4800);
  const overallTimeoutMs = Math.max(100, options.overallTimeoutMs ?? 8e3);
  const uniqueProviders = [];
  const seenProviders = /* @__PURE__ */ new Set();
  for (const rawP of options.providers || []) {
    const clean = String(rawP || "").trim();
    if (!clean || seenProviders.has(clean)) continue;
    seenProviders.add(clean);
    uniqueProviders.push(clean);
  }
  const diagnosticsMap = /* @__PURE__ */ new Map();
  const eligibleProviders = [];
  for (const provider of uniqueProviders) {
    if (!options.allowUnauthorizedProviders && !isAuthorizedNxshaProvider(provider)) {
      diagnosticsMap.set(provider, {
        provider,
        startTimeMs: 0,
        requestDurationMs: 0,
        validationDurationMs: 0,
        totalDurationMs: 0,
        status: "unauthorized",
        sourceCount: 0,
        reason: "Provider is not in ALLOWED_NXSHA_PROVIDERS"
      });
      continue;
    }
    eligibleProviders.push(provider);
  }
  if (eligibleProviders.length === 0) {
    const endMs = Number(getNow().toFixed(2));
    return {
      success: false,
      winner: null,
      allDiscoveredDubs: [],
      error: "No eligible NXSHA providers configured",
      diagnostics: {
        discoveryStartTimeMs,
        timeToFirstValidSourceMs: null,
        totalDiscoveryDurationMs: Number(Math.max(0, endMs - discoveryStartTimeMs).toFixed(2)),
        winningProvider: null,
        totalProvidersQueried: 0,
        totalFailedProviders: diagnosticsMap.size,
        cancelledProvidersCount: 0,
        lateIgnoredCount: 0,
        providerTimings: Array.from(diagnosticsMap.values())
      }
    };
  }
  const controllers = /* @__PURE__ */ new Map();
  const providerStartTimes = /* @__PURE__ */ new Map();
  const timeoutHandles = /* @__PURE__ */ new Map();
  const allDubsMap = /* @__PURE__ */ new Map();
  let winnerSelected = false;
  let winningResult = null;
  let bestFallbackResult = null;
  let bestFallbackTiming = null;
  let timeToFirstValidSourceMs = null;
  let cancelledProvidersCount = 0;
  let lateIgnoredCount = 0;
  let settled = false;
  const cancelAllPending = (exceptProvider) => {
    const cancelNowMs = getNow();
    for (const [prov, timer] of timeoutHandles.entries()) {
      if (prov !== exceptProvider) {
        clearTimeout(timer);
      }
    }
    for (const [prov, ctrl] of controllers.entries()) {
      if (prov !== exceptProvider && !ctrl.signal.aborted) {
        cancelledProvidersCount++;
        if (!diagnosticsMap.has(prov)) {
          const started = providerStartTimes.get(prov);
          const reqDur = started ? Number(Math.max(0, cancelNowMs - started.providerStartMs).toFixed(2)) : 0;
          diagnosticsMap.set(prov, {
            provider: prov,
            startTimeMs: started?.startOffsetMs ?? 0,
            requestDurationMs: reqDur,
            validationDurationMs: 0,
            totalDurationMs: reqDur,
            status: "aborted",
            sourceCount: 0,
            reason: "Cancelled because a valid winning source was already selected"
          });
        }
        ctrl.abort(new Error("Cancelled because a valid winning source was already selected"));
      }
    }
  };
  if (options.parentSignal) {
    if (options.parentSignal.aborted) {
      return {
        success: false,
        winner: null,
        allDiscoveredDubs: [],
        error: "Discovery aborted before start",
        diagnostics: {
          discoveryStartTimeMs,
          timeToFirstValidSourceMs: null,
          totalDiscoveryDurationMs: 0,
          winningProvider: null,
          totalProvidersQueried: 0,
          totalFailedProviders: 0,
          cancelledProvidersCount: eligibleProviders.length,
          lateIgnoredCount: 0,
          providerTimings: []
        }
      };
    }
    options.parentSignal.addEventListener(
      "abort",
      () => {
        cancelAllPending();
      },
      { once: true }
    );
  }
  const buildDiagnostics = () => {
    const nowVal = Number(getNow().toFixed(2));
    const timings = uniqueProviders.map((p) => diagnosticsMap.get(p)).filter((t) => Boolean(t));
    const totalFailedProviders = timings.filter(
      (t) => t.status === "failed" || t.status === "timeout" || t.status === "invalid_response" || t.status === "unauthorized"
    ).length;
    return {
      discoveryStartTimeMs,
      timeToFirstValidSourceMs,
      totalDiscoveryDurationMs: Number(Math.max(0, nowVal - discoveryStartTimeMs).toFixed(2)),
      winningProvider: winningResult?.provider ?? null,
      totalProvidersQueried: timings.filter((t) => t.status !== "unauthorized").length,
      totalFailedProviders,
      cancelledProvidersCount,
      lateIgnoredCount,
      providerTimings: timings
    };
  };
  return new Promise((resolve) => {
    let activeCount = 0;
    let nextIndex = 0;
    let completedCount = 0;
    const finalize = (result, errMessage) => {
      if (settled) return;
      settled = true;
      if (overallTimer) clearTimeout(overallTimer);
      for (const timer of timeoutHandles.values()) {
        clearTimeout(timer);
      }
      resolve({
        success: result !== null,
        winner: result,
        allDiscoveredDubs: Array.from(allDubsMap.values()),
        diagnostics: buildDiagnostics(),
        ...result === null ? { error: errMessage || "No active ad-free stream found across NXSHA providers for this title" } : {}
      });
    };
    const overallTimer = setTimeout(() => {
      if (settled) return;
      if (!winnerSelected && bestFallbackResult && bestFallbackTiming) {
        winnerSelected = true;
        winningResult = bestFallbackResult;
        bestFallbackTiming.status = "winner";
        if (timeToFirstValidSourceMs === null) {
          timeToFirstValidSourceMs = bestFallbackTiming.totalDurationMs;
        }
        cancelAllPending(bestFallbackResult.provider);
        finalize(winningResult);
        return;
      }
      cancelAllPending();
      finalize(null, "Discovery timed out across all NXSHA providers");
    }, overallTimeoutMs);
    const launchNext = () => {
      while (!winnerSelected && !settled && activeCount < concurrencyLimit && nextIndex < eligibleProviders.length) {
        const provider = eligibleProviders[nextIndex++];
        activeCount++;
        void runProvider(provider);
      }
    };
    const onProviderDone = () => {
      activeCount--;
      completedCount++;
      if (winnerSelected || settled) {
        return;
      }
      if (nextIndex < eligibleProviders.length) {
        launchNext();
        return;
      }
      if (completedCount >= eligibleProviders.length) {
        if (bestFallbackResult && bestFallbackTiming) {
          winnerSelected = true;
          winningResult = bestFallbackResult;
          bestFallbackTiming.status = "winner";
          if (timeToFirstValidSourceMs === null) {
            timeToFirstValidSourceMs = bestFallbackTiming.totalDurationMs;
          }
          finalize(winningResult);
        } else {
          finalize(null);
        }
      }
    };
    const runProvider = async (provider) => {
      const startOffsetMs = Number(Math.max(0, getNow() - discoveryStartTimeMs).toFixed(2));
      const providerStartMs = getNow();
      providerStartTimes.set(provider, { startOffsetMs, providerStartMs });
      const ctrl = new AbortController();
      controllers.set(provider, ctrl);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (!ctrl.signal.aborted) {
          ctrl.abort(new Error(`Provider ${provider} timed out after ${providerTimeoutMs}ms`));
        }
      }, providerTimeoutMs);
      timeoutHandles.set(provider, timer);
      try {
        const rawPayload = await options.queryProvider(provider, ctrl.signal);
        clearTimeout(timer);
        timeoutHandles.delete(provider);
        const afterRequestMs = getNow();
        const requestDurationMs = Number(Math.max(0, afterRequestMs - providerStartMs).toFixed(2));
        if (winnerSelected || settled) {
          lateIgnoredCount++;
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs: 0,
            totalDurationMs: requestDurationMs,
            status: ctrl.signal.aborted ? "aborted" : "valid_late",
            sourceCount: Array.isArray(rawPayload?.sources) ? rawPayload.sources.length : 0,
            reason: "Ignored late response after winner was already selected"
          });
          onProviderDone();
          return;
        }
        const validationStartMs = getNow();
        const baseValidation = validateNxshaProviderResponse(provider, rawPayload);
        let finalValid = baseValidation.valid;
        let finalSources = baseValidation.validSources;
        let rejectionReason = baseValidation.reason;
        if (finalValid && options.validateCandidate) {
          const customCheck = await options.validateCandidate(provider, finalSources, ctrl.signal);
          finalValid = customCheck.valid && customCheck.sources.length > 0;
          finalSources = customCheck.sources;
          if (!finalValid) {
            rejectionReason = customCheck.reason || "Rejected by custom candidate validator";
          }
        }
        const afterValidationMs = getNow();
        const validationDurationMs = Number(
          Math.max(0, afterValidationMs - validationStartMs).toFixed(2)
        );
        const totalDurationMs = Number(Math.max(0, afterValidationMs - providerStartMs).toFixed(2));
        if (winnerSelected || settled) {
          lateIgnoredCount++;
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs,
            totalDurationMs,
            status: "valid_late",
            sourceCount: finalSources.length,
            reason: "Ignored late response after winner was already selected"
          });
          onProviderDone();
          return;
        }
        if (!finalValid || finalSources.length === 0) {
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs,
            totalDurationMs,
            status: "invalid_response",
            sourceCount: 0,
            reason: rejectionReason || "No valid playable sources"
          });
          onProviderDone();
          return;
        }
        if (Array.isArray(rawPayload.dubs)) {
          for (const d of rawPayload.dubs) {
            if (d?.lang && !allDubsMap.has(d.lang)) {
              allDubsMap.set(d.lang, d);
            }
          }
        }
        const isPreferred = options.isPreferredMatch ? options.isPreferredMatch(provider, finalSources) : true;
        const candidateResult = {
          provider,
          sources: finalSources,
          subtitles: Array.isArray(rawPayload.subtitles) ? rawPayload.subtitles : [],
          dubs: Array.isArray(rawPayload.dubs) ? rawPayload.dubs : []
        };
        if (isPreferred) {
          winnerSelected = true;
          winningResult = candidateResult;
          timeToFirstValidSourceMs = Number(
            Math.max(0, afterValidationMs - discoveryStartTimeMs).toFixed(2)
          );
          diagnosticsMap.set(provider, {
            provider,
            startTimeMs: startOffsetMs,
            requestDurationMs,
            validationDurationMs,
            totalDurationMs,
            status: "winner",
            sourceCount: finalSources.length
          });
          cancelAllPending(provider);
          finalize(winningResult);
          return;
        }
        const diagEntry = {
          provider,
          startTimeMs: startOffsetMs,
          requestDurationMs,
          validationDurationMs,
          totalDurationMs,
          status: "valid_fallback",
          sourceCount: finalSources.length,
          reason: "Valid playable source held as fallback while checking for exact dub match"
        };
        diagnosticsMap.set(provider, diagEntry);
        if (!bestFallbackResult) {
          bestFallbackResult = candidateResult;
          bestFallbackTiming = diagEntry;
          if (timeToFirstValidSourceMs === null) {
            timeToFirstValidSourceMs = Number(
              Math.max(0, afterValidationMs - discoveryStartTimeMs).toFixed(2)
            );
          }
        }
        onProviderDone();
      } catch (err) {
        clearTimeout(timer);
        timeoutHandles.delete(provider);
        const afterErrMs = getNow();
        const reqDur = Number(Math.max(0, afterErrMs - providerStartMs).toFixed(2));
        const status = timedOut ? "timeout" : winnerSelected || ctrl.signal.aborted ? "aborted" : "failed";
        diagnosticsMap.set(provider, {
          provider,
          startTimeMs: startOffsetMs,
          requestDurationMs: reqDur,
          validationDurationMs: 0,
          totalDurationMs: reqDur,
          status,
          sourceCount: 0,
          reason: timedOut ? `Timed out after ${providerTimeoutMs}ms` : err?.message || "Provider request failed"
        });
        onProviderDone();
      }
    };
    launchNext();
  });
}

// src/anime/AnimeMetadata.ts
var ANIMATION_GENRE_ID = 16;
var ANIMATION_GENRE_NAME = "animation";
var ANIME_LANGUAGE_CODES = /* @__PURE__ */ new Set(["ja", "jpn"]);
var ANIME_COUNTRY_CODES = /* @__PURE__ */ new Set(["JP", "JPN", "JAPAN"]);
var ANIME_KEYWORDS = [
  "anime",
  "manga",
  "based on manga",
  "light novel",
  "based on light novel",
  "shounen",
  "seinen",
  "shoujo",
  "josei",
  "isekai",
  "mecha",
  "otaku"
];
function validateAnimeTmdbMetadata(raw, explicitType) {
  if (!raw || typeof raw !== "object") {
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: explicitType || "tv",
      tmdbId: 0,
      title: "Unknown Title",
      genres: [],
      genreIds: [],
      originalLanguage: "",
      originCountry: [],
      rejectionReason: "Invalid or missing TMDB metadata.",
      classifiedCategory: "Hollywood/Live-Action Movie"
    };
  }
  const tmdbId = Number(raw.id || raw.tmdbId || 0);
  const title = String(raw.name || raw.title || raw.original_name || raw.original_title || `TMDB #${tmdbId}`).trim();
  const originCountry = Array.isArray(raw.origin_country) ? raw.origin_country.map((c) => String(c).trim().toUpperCase()) : Array.isArray(raw.production_countries) ? raw.production_countries.map((c) => String(c?.iso_3166_1 || c?.name || "").trim().toUpperCase()) : Array.isArray(raw.country) ? raw.country.map((c) => String(c).trim().toUpperCase()) : typeof raw.country === "string" && raw.country.trim() ? raw.country.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) : [];
  const isJapanOrigin = originCountry.some((c) => ANIME_COUNTRY_CODES.has(c));
  const rawOriginalLang = String(raw.original_language || "").trim().toLowerCase();
  const originalLanguage = rawOriginalLang || (isJapanOrigin ? "ja" : "");
  const rawGenres = Array.isArray(raw.genres) ? raw.genres : [];
  const genres = rawGenres.map((g) => typeof g === "string" ? g : String(g?.name || "")).filter(Boolean);
  const genreIds = rawGenres.map((g) => typeof g?.id === "number" ? g.id : 0).filter((id) => id > 0);
  const resolvedMediaType = explicitType === "tv" || explicitType === "movie" ? explicitType : raw.resolvedMediaType === "movie" || raw.media_type === "movie" || Boolean(raw.title) && !raw.name && !raw.seasons ? "movie" : "tv";
  const hasAnimationGenre = genreIds.includes(ANIMATION_GENRE_ID) || genres.some((g) => g.toLowerCase() === ANIMATION_GENRE_NAME);
  const isJapaneseLanguage = ANIME_LANGUAGE_CODES.has(originalLanguage);
  const rawKeywords = Array.isArray(raw.keywords?.keywords) ? raw.keywords.keywords : Array.isArray(raw.keywords?.results) ? raw.keywords.results : Array.isArray(raw.keywords) ? raw.keywords : [];
  const keywordsList = rawKeywords.map((k) => String(k?.name || k || "").toLowerCase());
  const hasAnimeKeyword = keywordsList.some(
    (k) => ANIME_KEYWORDS.some((target) => k.includes(target))
  );
  const releaseDate = String(raw.release_date || raw.first_air_date || "");
  const year = releaseDate ? releaseDate.slice(0, 4) : "";
  const posterPath = raw.poster_path ? raw.poster_path.startsWith("http") ? raw.poster_path : `https://image.tmdb.org/t/p/w500${raw.poster_path.startsWith("/") ? raw.poster_path : `/${raw.poster_path}`}` : null;
  const backdropPaths = Array.isArray(raw.backdrop_paths) ? raw.backdrop_paths.filter((p) => typeof p === "string" && p.trim().length > 0).map((p) => p.startsWith("http") ? p : `https://image.tmdb.org/t/p/w1280${p.startsWith("/") ? p : `/${p}`}`) : typeof raw.backdrop_path === "string" && raw.backdrop_path.trim() ? [
    raw.backdrop_path.startsWith("http") ? raw.backdrop_path : `https://image.tmdb.org/t/p/w1280${raw.backdrop_path.startsWith("/") ? raw.backdrop_path : `/${raw.backdrop_path}`}`
  ] : [];
  const backdropPath = backdropPaths[0] || null;
  const logoPaths = Array.isArray(raw.logo_paths) ? raw.logo_paths.filter((p) => typeof p === "string" && p.trim().length > 0).map((p) => p.startsWith("http") ? p : `https://image.tmdb.org/t/p/w780${p.startsWith("/") ? p : `/${p}`}`) : typeof raw.logo_path === "string" && raw.logo_path.trim() ? [
    raw.logo_path.startsWith("http") ? raw.logo_path : `https://image.tmdb.org/t/p/w780${raw.logo_path.startsWith("/") ? raw.logo_path : `/${raw.logo_path}`}`
  ] : [];
  const logoPath = logoPaths[0] || null;
  const seasonsList = Array.isArray(raw.seasons) ? raw.seasons.filter((s) => typeof s.season_number === "number" && s.season_number > 0).map((s) => ({
    seasonNumber: s.season_number,
    name: s.name || `Season ${s.season_number}`,
    episodeCount: Number(s.episode_count || 0),
    airDate: s.air_date || null,
    posterPath: s.poster_path ? `https://image.tmdb.org/t/p/w300${s.poster_path}` : null
  })) : [];
  const isKnownAnimeId = tmdbId === 128 || // Princess Mononoke
  tmdbId === 372058 || // Your Name
  tmdbId === 85937 || // Demon Slayer
  tmdbId === 1429 || // Attack on Titan
  tmdbId === 37854 || // One Piece
  tmdbId === 30984 || // Bleach
  tmdbId === 95479 || // Jujutsu Kaisen
  tmdbId === 88040 || // Chainsaw Man
  tmdbId === 60735 || // Seven Deadly Sins
  tmdbId === 92685 || // Vinland Saga
  tmdbId === 493529 || // Dungeon Meshi
  tmdbId === 129 || // Spirited Away
  tmdbId === 4935 || // Howl's Moving Castle
  tmdbId === 317442;
  if (!hasAnimationGenre && !isKnownAnimeId) {
    const category = resolvedMediaType === "tv" ? "Live-Action TV" : "Hollywood/Live-Action Movie";
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: resolvedMediaType,
      tmdbId,
      title,
      genres,
      genreIds,
      originalLanguage,
      originCountry,
      overview: raw.overview,
      posterPath,
      backdropPath,
      backdropPaths,
      logoPath,
      logoPaths,
      rejectionReason: `"${title}" is a ${category}. Anime Core is exclusively dedicated to Anime content.`,
      classifiedCategory: category
    };
  }
  if (hasAnimationGenre && !isJapaneseLanguage && !isJapanOrigin && !hasAnimeKeyword && !isKnownAnimeId) {
    return {
      isValidAnime: false,
      isAnime: false,
      mediaType: resolvedMediaType,
      tmdbId,
      title,
      genres,
      genreIds,
      originalLanguage,
      originCountry,
      overview: raw.overview,
      posterPath,
      backdropPath,
      backdropPaths,
      logoPath,
      logoPaths,
      rejectionReason: `"${title}" is Western Animation (${originalLanguage.toUpperCase()}). Anime Core exclusively plays Japanese Anime.`,
      classifiedCategory: "Western Animation"
    };
  }
  const classifiedCategory = resolvedMediaType === "movie" ? "Anime Movie" : "Anime TV";
  return {
    isValidAnime: true,
    isAnime: true,
    mediaType: resolvedMediaType,
    tmdbId,
    title,
    romajiTitle: raw.original_name || raw.original_title || title,
    englishTitle: raw.title || raw.name || title,
    japaneseTitle: raw.original_name || raw.original_title || void 0,
    year,
    releaseDate,
    genres,
    genreIds,
    originalLanguage: originalLanguage || "ja",
    originCountry: originCountry.length > 0 ? originCountry : ["JP"],
    overview: raw.overview,
    posterPath,
    backdropPath,
    backdropPaths,
    logoPath,
    logoPaths,
    totalSeasons: seasonsList.length > 0 ? seasonsList.length : Number(raw.number_of_seasons || 1),
    totalEpisodes: Number(raw.number_of_episodes || (seasonsList.length > 0 ? seasonsList.reduce((acc, s) => acc + s.episodeCount, 0) : 1)),
    seasons: seasonsList,
    imdbId: raw.imdb_id ? String(raw.imdb_id) : void 0,
    classifiedCategory
  };
}

// src/anime/AnimeServerResolver.ts
async function findAnimeSaltSeriesSlug(title) {
  const cleanTitle = title.replace(/[^\w\s-]/g, "").trim().toLowerCase();
  const searchKeywords = [cleanTitle.split(":")[0].trim() || cleanTitle];
  for (const query of searchKeywords) {
    if (!query || query.length < 2) continue;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1e3);
      const res = await fetch(`https://animesalt.cx/?s=${encodeURIComponent(query)}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://animesalt.cx/"
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();
      const matches = Array.from(html.matchAll(/\/series\/([a-z0-9-]+)\/?/gi));
      if (matches.length > 0) {
        return matches[0][1];
      }
    } catch {
    }
  }
  return cleanTitle.replace(/\s+/g, "-");
}
async function scrapeAnimeSaltSources(slug, season, episode) {
  const candidateUrls = [
    `https://animesalt.cx/episode/${slug}-${season}x${episode}/`,
    `https://animesalt.cx/episode/${slug}-episode-${episode}/`
  ];
  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1e3);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://animesalt.cx/"
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();
      const streams = [];
      const languages = [];
      const dataParamMatch = html.match(/player\.php\?data=([A-Za-z0-9+/=%]+)/);
      if (dataParamMatch) {
        try {
          const rawB64 = decodeURIComponent(dataParamMatch[1]);
          const decodedJson = Buffer.from(rawB64, "base64").toString("utf8");
          const parsed = JSON.parse(decodedJson);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (!item || !item.link) continue;
              const langRaw = String(item.language || "").trim();
              const langLower = langRaw.toLowerCase();
              const isHindi = langLower.includes("hindi") || langLower.includes("hin");
              const isEnglish = langLower.includes("english") || langLower.includes("eng");
              const isTamil = langLower.includes("tamil") || langLower.includes("tam");
              const isTelugu = langLower.includes("telugu") || langLower.includes("tel");
              const isKannada = langLower.includes("kannada") || langLower.includes("kan");
              const isMalayalam = langLower.includes("malayalam") || langLower.includes("mal");
              const isJapanese = langLower.includes("japanese") || langLower.includes("jap") || langLower.includes("sub");
              const langCode = isHindi ? "hi" : isEnglish ? "en" : isTamil ? "ta" : isTelugu ? "te" : isKannada ? "kn" : isMalayalam ? "ml" : "ja";
              languages.push(langCode);
              streams.push({
                id: `animesalt-${langCode}-${streams.length}`,
                provider: "animesalt",
                url: item.link.replace(/\\\//g, "/"),
                quality: "1080p",
                label: `AnimeSalt | ${langRaw} (${isJapanese ? "Sub" : "Dub"})`,
                type: "hls",
                audioLang: langCode,
                audioLabel: `${langRaw} ${isJapanese ? "(Sub)" : "(Dub)"}`,
                isSub: isJapanese,
                isDub: !isJapanese
              });
            }
          }
        } catch {
        }
      }
      const iframeMatches = Array.from(html.matchAll(/<iframe[^>]+(?:src|data-src)=["']([^"']+)["']/gi));
      for (const m of iframeMatches) {
        const src = m[1];
        if (src && !src.includes("player.php") && src.startsWith("http")) {
          streams.push({
            id: `animesalt-embed-${streams.length}`,
            provider: "animesalt-embed",
            url: src,
            quality: "HD",
            label: "AnimeSalt Player Stream",
            type: "hls",
            audioLang: "ja",
            audioLabel: "Japanese (Sub)",
            isSub: true,
            isDub: false
          });
        }
      }
      if (streams.length > 0) {
        return { sources: streams, languages };
      }
    } catch {
    }
  }
  return { sources: [], languages: [] };
}
var ANIME_LANG_LABELS = {
  ja: "Japanese (Sub)",
  en: "English (Dub)",
  hi: "Hindi (Dub)",
  ta: "Tamil (Dub)",
  te: "Telugu (Dub)",
  kn: "Kannada (Dub)",
  ml: "Malayalam (Dub)",
  bn: "Bengali (Dub)",
  id: "Indonesian (Dub)",
  tl: "Tagalog (Dub)",
  es: "Spanish (Dub)",
  esla: "Spanish LA (Dub)",
  fr: "French (Dub)",
  de: "German (Dub)",
  pt: "Portuguese (Dub)",
  ptbr: "Portuguese BR (Dub)",
  ru: "Russian (Dub)"
};
function buildAvailableAudioTracks(sources) {
  const detectedLangs = /* @__PURE__ */ new Set();
  for (const s of sources) {
    if (s.audioLang) {
      detectedLangs.add(s.audioLang.toLowerCase().trim());
    }
  }
  const availableAudioTracks = [];
  if (detectedLangs.has("ja") || sources.some((s) => s.isSub || s.audioLang === "ja")) {
    availableAudioTracks.push({
      code: "ja",
      label: "Japanese (Sub)",
      isSub: true,
      isDub: false
    });
  }
  const priorityOrder = ["en", "hi", "ta", "te", "kn", "ml", "bn", "id", "tl", "es", "esla", "fr", "de", "pt", "ptbr", "ru"];
  for (const code of priorityOrder) {
    if (code !== "ja" && detectedLangs.has(code)) {
      availableAudioTracks.push({
        code,
        label: ANIME_LANG_LABELS[code] || `${code.toUpperCase()} (Dub)`,
        isSub: false,
        isDub: true
      });
    }
  }
  for (const code of detectedLangs) {
    if (code !== "ja" && !priorityOrder.includes(code)) {
      availableAudioTracks.push({
        code,
        label: ANIME_LANG_LABELS[code] || `${code.toUpperCase()} (Dub)`,
        isSub: false,
        isDub: true
      });
    }
  }
  if (availableAudioTracks.length === 0) {
    availableAudioTracks.push({
      code: "ja",
      label: "Japanese (Sub)",
      isSub: true,
      isDub: false
    });
  }
  return availableAudioTracks;
}
async function resolveAnimeContent(params, deps) {
  const { fetchTmdbDetailsWithFallback: fetchTmdbDetailsWithFallback2, resolveForServer: resolveForServer2 } = deps;
  const { tmdbId, season = 1, episode = 1, preferredAudio = "ja" } = params;
  const cleanId = String(tmdbId || "").trim();
  const explicitType = params.mediaType === "movie" ? "movie" : "tv";
  let details = await fetchTmdbDetailsWithFallback2(explicitType, cleanId);
  if (!details || !details.title && !details.name) {
    const fallbackMeta = getMediaByTmdbId(explicitType, cleanId);
    if (fallbackMeta) {
      details = {
        id: Number(cleanId),
        title: fallbackMeta.title,
        name: fallbackMeta.title,
        original_language: "ja",
        genres: fallbackMeta.genres.map((g, i) => ({ id: i === 0 ? 16 : i + 1, name: g })),
        release_date: `${fallbackMeta.releaseYear}-01-01`,
        overview: fallbackMeta.overview
      };
    }
  }
  let validation = validateAnimeTmdbMetadata(details, explicitType);
  if (!validation.isValidAnime) {
    const altType = explicitType === "movie" ? "tv" : "movie";
    const altDetails = await fetchTmdbDetailsWithFallback2(altType, cleanId);
    if (altDetails && (altDetails.title || altDetails.name)) {
      const altValidation = validateAnimeTmdbMetadata(altDetails, altType);
      if (altValidation.isValidAnime) {
        validation = altValidation;
      }
    }
  }
  if (!validation.isValidAnime) {
    return {
      success: false,
      tmdbId: Number(cleanId),
      title: validation.title || `TMDB #${cleanId}`,
      mediaType: validation.mediaType,
      season,
      episode,
      sources: [],
      subtitles: [],
      availableAudioTracks: [],
      error: validation.rejectionReason || "Content is not valid anime."
    };
  }
  const mediaType = validation.mediaType;
  const animeTitle = validation.title || validation.romajiTitle || `Anime #${cleanId}`;
  const releaseYear = validation.year || "2020";
  const date = validation.releaseDate || `${releaseYear}-01-01`;
  const imdbId = validation.imdbId || "";
  const startTime = Date.now();
  const allSources = [];
  const discoveredLangs = /* @__PURE__ */ new Set(["ja"]);
  const animeSaltPromise = Promise.race([
    (async () => {
      try {
        const slug = await findAnimeSaltSeriesSlug(animeTitle);
        if (slug) {
          const saltResult = await scrapeAnimeSaltSources(slug, season, episode);
          for (const lang of saltResult.languages) {
            discoveredLangs.add(lang);
          }
          return saltResult.sources;
        }
      } catch {
      }
      return [];
    })(),
    new Promise((resolve) => setTimeout(() => resolve([]), 1400))
  ]);
  let orionOrigResponse = null;
  const providersToRace = ["alatreon", "ursa", "atlas", "orion", "valstrax"];
  const providerPromises = providersToRace.map(async (provider) => {
    try {
      const resolved = await resolveForServer2(provider, {
        mediaType,
        tmdbId: cleanId,
        season,
        episode,
        title: animeTitle,
        releaseYear,
        date,
        imdbId,
        dubCode: "",
        dubType: "0"
      });
      if (provider === "orion" && resolved) {
        orionOrigResponse = resolved;
      }
      if (resolved && resolved.success && Array.isArray(resolved.links)) {
        const nonHevc = resolved.links.filter((l) => l?.link && !l.onlyHevc);
        const playable = nonHevc.length > 0 ? nonHevc : resolved.links.filter((l) => l?.link);
        return playable.map((l, idx) => {
          const isDash = l.type === "dash" || l.type === "andromeda";
          return {
            id: `${provider}-${idx}`,
            provider,
            url: l.link,
            quality: "1080p",
            label: `${provider.toUpperCase()} | 1080p Ultra HD`,
            type: isDash ? "dash" : "hls",
            audioLang: "ja",
            audioLabel: "Japanese (Original)",
            isSub: true,
            isDub: false,
            onlyHevc: Boolean(l.onlyHevc),
            audioStreamKey: l.audioStreamKey || resolved.audioStreamKey || ""
          };
        });
      }
    } catch {
    }
    return [];
  });
  const cleanPref = (preferredAudio || "ja").trim().toLowerCase();
  const dubLanguagesToQuery = Array.from(
    /* @__PURE__ */ new Set(["hi", "en", ...cleanPref && cleanPref !== "ja" ? [cleanPref] : []])
  );
  const rawDubPromises = dubLanguagesToQuery.map(async (dubLang) => {
    try {
      const orionDub = await resolveForServer2("orion", {
        mediaType,
        tmdbId: cleanId,
        season,
        episode,
        title: animeTitle,
        releaseYear,
        date,
        imdbId,
        dubCode: dubLang,
        dubType: "0"
      });
      if (orionDub && orionDub.success) {
        const link = orionDub.dubAudioUrl || orionDub.link || orionDub.links?.[0]?.link;
        if (link) {
          return {
            dubLang,
            link,
            audioStreamKey: orionDub.audioStreamKey || orionDub.links?.[0]?.audioStreamKey || "",
            onlyHevc: Boolean(orionDub.links?.[0]?.onlyHevc ?? true),
            dubs: orionDub.dubs
          };
        }
      }
    } catch {
    }
    return null;
  });
  const [providerResults, rawDubResults, saltSources] = await Promise.all([
    Promise.all(providerPromises),
    Promise.all(rawDubPromises),
    animeSaltPromise
  ]);
  for (const list of providerResults) {
    allSources.push(...list);
  }
  const origAudioStreamKey = orionOrigResponse?.audioStreamKey || "";
  const orionRawDubs = orionOrigResponse?.dubs || rawDubResults.find((r) => Array.isArray(r?.dubs))?.dubs || [];
  const orionVerifiedDubLangs = Array.isArray(orionRawDubs) && orionRawDubs.length > 0 ? new Set(
    orionRawDubs.filter((d) => Number(d?.type ?? 0) === 0 && !d?.original).map((d) => String(d?.lang || "").toLowerCase().trim()).filter(Boolean)
  ) : null;
  for (const dubItem of rawDubResults) {
    if (!dubItem) continue;
    const { dubLang, link, audioStreamKey, onlyHevc } = dubItem;
    if (orionVerifiedDubLangs && orionVerifiedDubLangs.size > 0 && !orionVerifiedDubLangs.has(dubLang)) {
      continue;
    }
    if (origAudioStreamKey && audioStreamKey && audioStreamKey === origAudioStreamKey) {
      continue;
    }
    const langLabel = ANIME_LANG_LABELS[dubLang] || `${dubLang.toUpperCase()} (Dub)`;
    allSources.push({
      id: `orion-dub-${dubLang}`,
      provider: "orion",
      url: link,
      quality: "1080p",
      label: `Orion | ${langLabel}`,
      type: "dash",
      audioLang: dubLang,
      audioLabel: langLabel,
      isSub: false,
      isDub: true,
      onlyHevc,
      audioStreamKey
    });
  }
  for (const s of saltSources) {
    allSources.push(s);
  }
  const availableAudioTracks = buildAvailableAudioTracks(allSources);
  const subtitles = [
    {
      id: "sub-en",
      language: "English",
      url: `https://zxcstream.cc/backend/subtitles/${mediaType}/${cleanId}?lang=en`
    }
  ];
  const durationMs = Date.now() - startTime;
  if (allSources.length === 0) {
    return {
      success: false,
      tmdbId: Number(cleanId),
      title: animeTitle,
      mediaType,
      season,
      episode,
      sources: [],
      subtitles,
      availableAudioTracks,
      error: `No authorized playback streams available for "${animeTitle}" S${season}E${episode}.`,
      diagnostics: {
        durationMs,
        sourcesCount: 0
      }
    };
  }
  return {
    success: true,
    tmdbId: Number(cleanId),
    title: animeTitle,
    mediaType,
    season,
    episode,
    sources: allSources,
    subtitles,
    availableAudioTracks,
    diagnostics: {
      resolvedProvider: allSources[0]?.provider,
      durationMs,
      sourcesCount: allSources.length
    }
  };
}

// serverApp.ts
var app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use((req, _res, next) => {
  try {
    const rawUrl = req.url || "/";
    const parsed = new URL(rawUrl, "http://localhost");
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    const isEntrypointPath = pathname === "/" || pathname === "/index" || pathname === "/api" || pathname === "/api/index" || pathname === "/api/index.js" || pathname === "/api/index.ts" || pathname === "/api/[...all]" || pathname === "/api/%5B...all%5D";
    const rewrittenPath = parsed.searchParams.get("__path");
    if (rewrittenPath) {
      parsed.searchParams.delete("__path");
      const cleanSub = rewrittenPath.replace(/^\/+/, "");
      const qs = parsed.searchParams.toString();
      if (isEntrypointPath) {
        req.url = `/api/${cleanSub}${qs ? `?${qs}` : ""}`;
      } else {
        req.url = `${parsed.pathname}${qs ? `?${qs}` : ""}`;
      }
    } else if (isEntrypointPath) {
      const originalUri = req.headers["x-forwarded-uri"] || req.headers["x-original-uri"];
      if (originalUri && originalUri.startsWith("/api")) {
        req.url = originalUri;
      }
    }
  } catch {
  }
  next();
});
var FIELD_MAP = {
  id: "a7f39c821d604e5b91e57b",
  fToken: "e83c4b719a5210579c1635a",
  ts: "61d9a5274c8e3b2f38291e6",
  token: "c492f7a183d01e36c538a716d",
  title: "5e28c9147a06de29f3674b392a1",
  year: "b731e6c94f867f8341c306e",
  season: "d8427b5c382f957c3613e85b",
  episode: "91c6ea75d1f785c92346b713d",
  imdbId: "f35a8194265e871c4933a725f",
  path: "6b491e258392e7561a9384c",
  mediaType: "c81306d28147a35632e816b",
  date: "e16493139e5814b3027",
  latestDate: "e953416ad739e5814b3027"
};
var lastFieldMapDiscoveryAt = 0;
var fieldMapDiscoveryPromise = null;
async function refreshFieldMapFromUpstream() {
  const now = Date.now();
  if (now - lastFieldMapDiscoveryAt < 6e4) return false;
  if (fieldMapDiscoveryPromise) return fieldMapDiscoveryPromise;
  fieldMapDiscoveryPromise = (async () => {
    try {
      lastFieldMapDiscoveryAt = Date.now();
      const pageRes = await fetch("https://zxcstream.cc/player/movie/128", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
      });
      if (!pageRes.ok) return false;
      const html = await pageRes.text();
      const chunkMatches = Array.from(
        new Set(html.match(/\/_next\/static\/chunks\/[a-zA-Z0-9_.~-]+\.js/g) || [])
      );
      for (const chunkPath of chunkMatches) {
        try {
          const chunkRes = await fetch(`https://zxcstream.cc${chunkPath}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
          });
          if (!chunkRes.ok) continue;
          const js = await chunkRes.text();
          if (!js.includes("generateFrontendToken") && !js.includes("latestDate:")) continue;
          const mapMatch = js.match(
            /\{id:"([a-f0-9]+)",fToken:"([a-f0-9]+)",ts:"([a-f0-9]+)",token:"([a-f0-9]+)",title:"([a-f0-9]+)",year:"([a-f0-9]+)",season:"([a-f0-9]+)",episode:"([a-f0-9]+)",imdbId:"([a-f0-9]+)",path:"([a-f0-9]+)",mediaType:"([a-f0-9]+)",date:"([a-f0-9]+)",latestDate:"([a-f0-9]+)"\}/
          );
          if (mapMatch) {
            FIELD_MAP = {
              id: mapMatch[1],
              fToken: mapMatch[2],
              ts: mapMatch[3],
              token: mapMatch[4],
              title: mapMatch[5],
              year: mapMatch[6],
              season: mapMatch[7],
              episode: mapMatch[8],
              imdbId: mapMatch[9],
              path: mapMatch[10],
              mediaType: mapMatch[11],
              date: mapMatch[12],
              latestDate: mapMatch[13]
            };
            return true;
          }
        } catch {
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      fieldMapDiscoveryPromise = null;
    }
  })();
  return fieldMapDiscoveryPromise;
}
var DECRYPTION_KEY = "7f4c9e2a81d63b05c4f7a9e8126d3b50e1a8c7f23d9465ab0c6e9f1d4a7b832c";
function decryptCryptoJS(cipherBase64, passphrase) {
  try {
    const buf = Buffer.from(cipherBase64, "base64");
    if (buf.subarray(0, 8).toString("utf8") !== "Salted__") return cipherBase64;
    const salt = buf.subarray(8, 16);
    const ciphertext = buf.subarray(16);
    let keyIv = Buffer.alloc(0);
    let prev = Buffer.alloc(0);
    while (keyIv.length < 48) {
      prev = crypto.createHash("md5").update(Buffer.concat([prev, Buffer.from(passphrase, "utf8"), salt])).digest();
      keyIv = Buffer.concat([keyIv, prev]);
    }
    const key = keyIv.subarray(0, 32);
    const iv = keyIv.subarray(32, 48);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return cipherBase64;
  }
}
var COMMON_HEADERS = {
  Referer: "https://zxcstream.cc/",
  Origin: "https://zxcstream.cc",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Content-Type": "application/json"
};
var tmdbImdbCache = /* @__PURE__ */ new Map();
async function fetchTmdbDetailsWithFallback(mediaType, tmdbId, language = "en-US") {
  const tryTypeOnHost = async (host, type) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3e3);
      const res = await fetch(
        `${host}/backend/tmdb/details/${encodeURIComponent(type)}/${encodeURIComponent(tmdbId)}?language=${encodeURIComponent(language)}`,
        {
          headers: {
            ...COMMON_HEADERS,
            Origin: host,
            Referer: `${host}/player/${type}/${tmdbId}`
          },
          signal: controller.signal
        }
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.data || data;
      if (!raw || !raw.title && !raw.name && !raw.id) return null;
      if (raw.imdb_id) {
        tmdbImdbCache.set(String(tmdbId).trim(), String(raw.imdb_id).trim());
      }
      return { ...raw, resolvedMediaType: type };
    } catch {
      return null;
    }
  };
  const tryType = async (type) => {
    return await tryTypeOnHost("https://zxcstream.cc", type);
  };
  const primary = await tryType(mediaType);
  if (primary) return primary;
  const altType = mediaType === "movie" ? "tv" : "movie";
  return await tryType(altType);
}
var mpdManifestCache = /* @__PURE__ */ new Map();
function cacheMpdXml(url, xml) {
  const now = Date.now();
  if (mpdManifestCache.size > 120) {
    for (const [k, v] of mpdManifestCache.entries()) {
      if (v.expiresAt < now) mpdManifestCache.delete(k);
    }
    if (mpdManifestCache.size > 120) {
      const oldestKey = mpdManifestCache.keys().next().value;
      if (oldestKey) mpdManifestCache.delete(oldestKey);
    }
  }
  mpdManifestCache.set(url, { xml, expiresAt: now + 5 * 60 * 1e3 });
}
function stripVideoFromMpd(mpdText) {
  return mpdText.replace(/<AdaptationSet[^>]*contentType=["']video["'][\s\S]*?<\/AdaptationSet>/gi, "").replace(/<AdaptationSet[^>]*mimeType=["']video\/[^"']*["'][\s\S]*?<\/AdaptationSet>/gi, "");
}
async function resolveForServer(targetServer, options) {
  const {
    mediaType,
    tmdbId,
    season = 1,
    episode = 1,
    title,
    releaseYear,
    date,
    imdbId,
    lastAirDate,
    dubCode = "",
    dubType = ""
  } = options;
  const queryProvider = async (baseHost, tokenEndpoint, sourcesPrefix, serverKey) => {
    const refererUrl = `${baseHost}/player/${mediaType}/${tmdbId}${mediaType === "tv" ? `/${season}/${episode}` : ""}`;
    let sourceData = null;
    let lastError = "Request failed";
    const tokenEndpoints = tokenEndpoint ? [tokenEndpoint] : ["/backend/wtfnigga"];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const tokenBody = {
          [FIELD_MAP.id]: String(tmdbId),
          [FIELD_MAP.mediaType]: mediaType,
          [FIELD_MAP.path]: serverKey
        };
        if (mediaType === "tv") {
          tokenBody[FIELD_MAP.season] = Number(season) || 1;
          tokenBody[FIELD_MAP.episode] = Number(episode) || 1;
        }
        let tokenData = null;
        let tokenStatus = 0;
        for (const ep of tokenEndpoints) {
          try {
            const tokenController = new AbortController();
            const tokenTimer = setTimeout(() => tokenController.abort(), 3500);
            const tokenRes = await fetch(`${baseHost}${ep}`, {
              method: "POST",
              headers: {
                ...COMMON_HEADERS,
                Origin: baseHost,
                Referer: refererUrl
              },
              body: JSON.stringify(tokenBody),
              signal: tokenController.signal
            });
            clearTimeout(tokenTimer);
            tokenStatus = tokenRes.status;
            if (tokenRes.ok) {
              const parsed = await tokenRes.json();
              if (parsed?.token) {
                tokenData = parsed;
                break;
              }
            }
          } catch {
          }
        }
        if (!tokenData || !tokenData.token) {
          lastError = tokenStatus ? `Token HTTP ${tokenStatus}` : "Token failed";
          if (attempt === 0 && tokenStatus === 400) {
            const refreshed = await refreshFieldMapFromUpstream();
            if (refreshed) continue;
          }
          if (attempt === 0 && (tokenStatus >= 500 || tokenStatus === 429)) {
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
          return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
        }
        const query = new URLSearchParams({
          [FIELD_MAP.id]: String(tmdbId),
          [FIELD_MAP.path]: serverKey,
          [FIELD_MAP.mediaType]: mediaType,
          [FIELD_MAP.ts]: String(tokenData.ts),
          [FIELD_MAP.token]: tokenData.token,
          [FIELD_MAP.title]: title,
          [FIELD_MAP.year]: releaseYear,
          [FIELD_MAP.date]: String(date)
        });
        if (mediaType === "tv") {
          query.set(FIELD_MAP.season, String(Number(season) || 1));
          query.set(FIELD_MAP.episode, String(Number(episode) || 1));
          if (lastAirDate) query.set(FIELD_MAP.latestDate, String(lastAirDate));
        }
        if (imdbId) query.set(FIELD_MAP.imdbId, imdbId);
        if (dubCode) {
          query.set("dubCode", dubCode);
          query.set("dubType", dubType !== "" ? String(dubType) : "0");
        }
        const srcController = new AbortController();
        const srcTimer = setTimeout(() => srcController.abort(), 4e3);
        const sourceRes = await fetch(
          `${baseHost}${sourcesPrefix}/${encodeURIComponent(serverKey)}?${query.toString()}`,
          {
            headers: {
              ...COMMON_HEADERS,
              Origin: baseHost,
              Referer: refererUrl
            },
            signal: srcController.signal
          }
        );
        clearTimeout(srcTimer);
        if (!sourceRes.ok) {
          lastError = `HTTP ${sourceRes.status}`;
          if (attempt === 0 && (sourceRes.status >= 500 || sourceRes.status === 429)) {
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
          return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
        }
        sourceData = await sourceRes.json();
        break;
      } catch (err) {
        lastError = err?.message || "Network error";
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 150));
          continue;
        }
        return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
      }
    }
    if (!sourceData) {
      return { success: false, server: targetServer, error: lastError, links: [], dubs: [] };
    }
    const rawLinks = (sourceData.links || []).map((item) => {
      let decrypted = decryptCryptoJS(item.link, DECRYPTION_KEY);
      if (typeof decrypted === "string" && decrypted.startsWith("/")) {
        decrypted = `https://vidstuck.cc${decrypted}`;
      }
      return {
        ...item,
        link: decrypted
      };
    });
    const verifiedLinks = [];
    for (const item of rawLinks) {
      if (!item.link || !item.link.startsWith("http")) continue;
      const isWorkerUrl = item.link.includes("workers.dev");
      const isDash = !isWorkerUrl && (item.type === "dash" || item.link.includes("andromeda") || item.link.includes(".mpd"));
      if (isDash) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const mpdRes = await fetch(item.link, {
            headers: {
              "User-Agent": COMMON_HEADERS["User-Agent"],
              Referer: `${baseHost}/`,
              Origin: baseHost
            },
            signal: controller.signal
          });
          clearTimeout(timer);
          if (!mpdRes.ok) continue;
          const mpdText = await mpdRes.text();
          if (!mpdText.includes("<MPD") || !mpdText.includes("video")) continue;
          const hasAudio = mpdText.includes('contentType="audio"') || mpdText.includes("contentType='audio'") || mpdText.includes("audio/mp4") || mpdText.includes("mp4a");
          cacheMpdXml(item.link, mpdText);
          const codecs = mpdText.match(/codecs="([^"]+)"/g) || [];
          const videoCodecs = codecs.filter(
            (c) => !c.includes("mp4a") && !c.includes("ac-3") && !c.includes("ec-3")
          );
          const onlyHevc = videoCodecs.length > 0 && videoCodecs.every((c) => c.includes("hev1") || c.includes("hvc1"));
          const audioAdaptationMatch = mpdText.match(
            /<AdaptationSet[^>]*contentType=["']audio["'][\s\S]*?<\/AdaptationSet>/i
          );
          const audioInitMatch = (audioAdaptationMatch ? audioAdaptationMatch[0] : mpdText).match(
            /initialization=["']([^"'?]+)/i
          );
          const audioStreamKey = audioInitMatch ? audioInitMatch[1] : "";
          verifiedLinks.push({ ...item, type: "dash", onlyHevc, hasAudio, audioStreamKey });
        } catch {
        }
      } else if (isWorkerUrl) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2e3);
          const probeRes = await fetch(item.link, {
            method: "HEAD",
            headers: {
              "User-Agent": COMMON_HEADERS["User-Agent"],
              Referer: `${baseHost}/`,
              Origin: baseHost
            },
            signal: controller.signal
          });
          clearTimeout(timer);
          if (!probeRes.ok) continue;
          verifiedLinks.push({ ...item, onlyHevc: false, hasAudio: true });
        } catch {
        }
      } else {
        verifiedLinks.push({ ...item, onlyHevc: false, hasAudio: true });
      }
    }
    const verifiedAudioItem = verifiedLinks.find((l) => l.hasAudio !== false) || verifiedLinks[0] || null;
    const verifiedAudioLink = verifiedAudioItem?.link || null;
    return {
      ...sourceData,
      success: verifiedLinks.length > 0,
      links: verifiedLinks,
      dubAudioUrl: verifiedAudioLink,
      audioStreamKey: verifiedAudioItem?.audioStreamKey || "",
      server: targetServer
    };
  };
  return await queryProvider(
    "https://zxcstream.cc",
    "/backend/wtfnigga",
    "/backend_/sources",
    targetServer
  );
}
var apiRouter = express.Router();
apiRouter.get("/status", (_req, res) => {
  res.json({ status: "ok", server: "zxcstream-mirror", time: Date.now() });
});
apiRouter.get("/stream/status", (_req, res) => {
  res.json({ status: "ok", server: "zxcstream-mirror", time: Date.now() });
});
var handleTmdbDetails = async (req, res) => {
  const { mediaType, tmdbId } = req.params;
  const language = req.query.language || "en-US";
  const cleanId = String(tmdbId || "").trim();
  const safeMediaType = mediaType === "tv" ? "tv" : "movie";
  try {
    const data = await fetchTmdbDetailsWithFallback(mediaType, cleanId, language);
    if (data && (data.title || data.name || data.id)) {
      return res.json(data);
    }
    const fallback = getMediaByTmdbId(safeMediaType, cleanId);
    return res.json({
      id: Number(cleanId.replace(/\D/g, "")) || Number(fallback.tmdbId) || 128,
      title: fallback.title,
      name: fallback.title,
      overview: fallback.overview,
      tagline: fallback.tagline,
      poster_path: fallback.posterUrl ? fallback.posterUrl.replace("https://image.tmdb.org/t/p/w500", "") : null,
      backdrop_path: fallback.backdropUrl ? fallback.backdropUrl.replace("https://image.tmdb.org/t/p/original", "") : null,
      backdrop_paths: fallback.backdropUrl ? [fallback.backdropUrl] : [],
      logo_paths: fallback.logoUrl ? [fallback.logoUrl] : [],
      genres: fallback.genres.map((g, i) => ({ id: i + 1, name: g })),
      rating: fallback.voteAverage,
      vote_average: fallback.voteAverage,
      runtime: fallback.runtimeMinutes,
      status: fallback.status,
      release_date: `${fallback.releaseYear}-01-01`,
      first_air_date: `${fallback.releaseYear}-01-01`,
      imdb_id: getSeriesImdbId(cleanId) || null,
      seasons: fallback.seasons?.map((s) => ({
        season_number: s.seasonNumber,
        episode_count: s.episodeCount,
        name: s.name
      })) || [],
      cast: fallback.cast?.map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profile_path: c.profileUrl?.replace("https://image.tmdb.org/t/p/w300", "")
      })) || [],
      resolvedMediaType: safeMediaType,
      fallback: true
    });
  } catch (err) {
    const fallback = getMediaByTmdbId(safeMediaType, cleanId);
    return res.json({
      id: Number(cleanId.replace(/\D/g, "")) || 128,
      title: fallback.title,
      name: fallback.title,
      overview: fallback.overview,
      resolvedMediaType: safeMediaType,
      fallback: true
    });
  }
};
apiRouter.get("/tmdb/details/:mediaType/:tmdbId", handleTmdbDetails);
apiRouter.get("/tmdb/:mediaType/:tmdbId", handleTmdbDetails);
apiRouter.get("/tmdb/season/:tmdbId/season/:seasonNumber", async (req, res) => {
  const { tmdbId, seasonNumber } = req.params;
  const seasonNum = Number(seasonNumber) || 1;
  try {
    const response = await fetch(
      `https://zxcstream.cc/backend/tmdb/season/${encodeURIComponent(tmdbId)}/season/${encodeURIComponent(seasonNumber)}`,
      {
        headers: {
          ...COMMON_HEADERS,
          Referer: `https://zxcstream.cc/player/tv/${tmdbId}/${seasonNumber}/1`
        }
      }
    );
    if (!response.ok) {
      const fallbackEps = getCatalogSeasonEpisodes(tmdbId, seasonNum);
      return res.json({ episodes: fallbackEps });
    }
    const data = await response.json();
    const rawEpisodes = Array.isArray(data?.data?.episodes) ? data.data.episodes : Array.isArray(data?.episodes) ? data.episodes : [];
    if (rawEpisodes.length === 0) {
      const fallbackEps = getCatalogSeasonEpisodes(tmdbId, seasonNum);
      return res.json({ ...data, episodes: fallbackEps });
    }
    const enrichedEpisodes = rawEpisodes.map((ep) => {
      const epNum = Number(ep?.episode_number) || 1;
      const timing = getEpisodeTimingMetadata(tmdbId, seasonNum, epNum, "tv");
      if (!timing) return ep;
      return {
        ...ep,
        introStart: ep.introStart ?? timing.introStart,
        introEnd: ep.introEnd ?? timing.introEnd,
        outroStart: ep.outroStart ?? timing.outroStart,
        outroEnd: ep.outroEnd ?? timing.outroEnd,
        nextEpisodeTriggerTime: ep.nextEpisodeTriggerTime !== void 0 ? ep.nextEpisodeTriggerTime : timing.nextEpisodeTriggerTime,
        nextEpisodeId: ep.nextEpisodeId !== void 0 ? ep.nextEpisodeId : timing.nextEpisodeId
      };
    });
    if (data?.data?.episodes) {
      return res.json({
        ...data,
        data: { ...data.data, episodes: enrichedEpisodes }
      });
    }
    return res.json({ ...data, episodes: enrichedEpisodes });
  } catch {
    const fallbackEps = getCatalogSeasonEpisodes(tmdbId, seasonNum);
    return res.json({ episodes: fallbackEps });
  }
});
apiRouter.post("/stream/resolve", async (req, res) => {
  const {
    mediaType: reqMediaType = "movie",
    tmdbId = "128",
    serverPath: reqServerPath,
    preferredServer,
    season = 1,
    episode = 1,
    dubCode = "",
    dubType = "",
    autoFallback = false,
    allowHevc = false
  } = req.body;
  const serverPath = reqServerPath || preferredServer || "orion";
  let mediaType = reqMediaType;
  let { title = "", releaseYear = "", year = "", date = "", imdbId = "", lastAirDate = "" } = req.body;
  if (!releaseYear && year) releaseYear = String(year);
  try {
    if (!title || !releaseYear) {
      const details = await fetchTmdbDetailsWithFallback(mediaType, String(tmdbId));
      if (details) {
        if (details.resolvedMediaType) {
          mediaType = details.resolvedMediaType;
        }
        title = details.title || details.name || title;
        date = details.release_date || details.first_air_date || date;
        releaseYear = (date ? String(new Date(date).getFullYear()) : "") || releaseYear;
        imdbId = details.imdb_id || imdbId;
        lastAirDate = details.last_air_date || lastAirDate;
      }
    }
    if (!title) title = mediaType === "tv" ? "Series" : "Movie";
    if (!date) date = "2022-01-01";
    if (!releaseYear) releaseYear = date.split("-")[0] || "2022";
    const options = {
      mediaType,
      tmdbId: String(tmdbId),
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      title,
      releaseYear,
      date,
      imdbId,
      lastAirDate,
      dubCode,
      dubType
    };
    const filterPlayable = (resObj) => {
      if (!resObj || !Array.isArray(resObj.links)) return resObj;
      if (allowHevc) return resObj;
      const filtered = resObj.links.filter((l) => !l.onlyHevc);
      return {
        ...resObj,
        links: filtered,
        success: filtered.length > 0
      };
    };
    let result = filterPlayable(await resolveForServer(serverPath, options));
    const shouldFallback = autoFallback || !req.body.strictSingleServer && (!result.links || result.links.length === 0);
    if ((!result.links || result.links.length === 0) && shouldFallback) {
      const fallbackServers = ["valstrax", "atlas", "ursa", "alatreon", "daedalus", "orion"].filter(
        (s) => s !== serverPath
      );
      for (const alt of fallbackServers) {
        const altResult = filterPlayable(await resolveForServer(alt, options));
        if (altResult.links && altResult.links.length > 0) {
          result = altResult;
          break;
        }
      }
    }
    const primaryLink = Array.isArray(result.links) && result.links.length > 0 ? result.links[0] : null;
    return res.json({
      ...result,
      success: Boolean(primaryLink?.link),
      link: primaryLink?.link || null,
      type: primaryLink?.type || "hls",
      resolvedMediaType: mediaType
    });
  } catch (err) {
    return res.json({
      links: [],
      error: err.message,
      server: serverPath
    });
  }
});
apiRouter.get("/sources/:server", async (req, res) => {
  const targetServer = req.params.server;
  const {
    mediaType = "movie",
    tmdbId = "128",
    season = 1,
    episode = 1,
    title = "",
    year = "",
    date = "",
    imdbId = "",
    dubCode = "",
    dubType = ""
  } = req.query;
  try {
    const result = await resolveForServer(targetServer, {
      mediaType,
      tmdbId,
      season: Number(season) || 1,
      episode: Number(episode) || 1,
      title: title || (mediaType === "tv" ? "Series" : "Movie"),
      releaseYear: year || date.split("-")[0] || "2022",
      date: date || "2022-01-01",
      imdbId,
      dubCode,
      dubType
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
apiRouter.post("/subtitles/resolve", async (req, res) => {
  const {
    mediaType = "movie",
    tmdbId = "128",
    season = 1,
    episode = 1,
    title = "",
    releaseYear = "",
    date = ""
  } = req.body;
  try {
    const subBody = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: "subtitle_"
    };
    if (mediaType === "tv") {
      subBody[FIELD_MAP.season] = Number(season) || 1;
      subBody[FIELD_MAP.episode] = Number(episode) || 1;
    }
    let tokenData = null;
    for (const ep of ["/backend/wtfnigga", "/backend/fucku"]) {
      try {
        const tokenRes = await fetch(`https://zxcstream.cc${ep}`, {
          method: "POST",
          headers: COMMON_HEADERS,
          body: JSON.stringify(subBody)
        });
        if (tokenRes.ok) {
          const parsed = await tokenRes.json();
          if (parsed?.token) {
            tokenData = parsed;
            break;
          }
        }
      } catch {
      }
    }
    if (!tokenData?.token) return res.json({ subtitles: [] });
    const query = new URLSearchParams({
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: "subtitle_",
      [FIELD_MAP.ts]: String(tokenData.ts),
      [FIELD_MAP.token]: tokenData.token,
      [FIELD_MAP.title]: title,
      [FIELD_MAP.year]: releaseYear,
      [FIELD_MAP.date]: String(date)
    });
    if (mediaType === "tv") {
      query.set(FIELD_MAP.season, String(Number(season) || 1));
      query.set(FIELD_MAP.episode, String(Number(episode) || 1));
    }
    try {
      const vidRes = await fetch(`https://vidstuck.cc/backend/subtitle?${query.toString()}`, {
        headers: COMMON_HEADERS
      });
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const list2 = Array.isArray(vidData) ? vidData : vidData.captions || vidData.subtitles || [];
        if (list2.length > 0) return res.json({ subtitles: list2 });
      }
    } catch {
    }
    const subRes = await fetch(`https://zxcstream.cc/backend_/subtitle_?${query.toString()}`, {
      headers: COMMON_HEADERS
    });
    if (!subRes.ok) return res.json({ subtitles: [] });
    const subData = await subRes.json();
    const list = Array.isArray(subData) ? subData : subData.subtitles || subData.captions || [];
    return res.json({ subtitles: list });
  } catch {
    return res.json({ subtitles: [] });
  }
});
apiRouter.get("/subtitles", async (req, res) => {
  const {
    mediaType = "movie",
    tmdbId = "128",
    season = 1,
    episode = 1,
    title = "",
    year = "",
    date = ""
  } = req.query;
  try {
    const subBody = {
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: "subtitle_"
    };
    if (mediaType === "tv") {
      subBody[FIELD_MAP.season] = Number(season) || 1;
      subBody[FIELD_MAP.episode] = Number(episode) || 1;
    }
    let tokenData = null;
    for (const ep of ["/backend/wtfnigga", "/backend/fucku"]) {
      try {
        const tokenRes = await fetch(`https://zxcstream.cc${ep}`, {
          method: "POST",
          headers: COMMON_HEADERS,
          body: JSON.stringify(subBody)
        });
        if (tokenRes.ok) {
          const parsed = await tokenRes.json();
          if (parsed?.token) {
            tokenData = parsed;
            break;
          }
        }
      } catch {
      }
    }
    if (!tokenData?.token) return res.json({ captions: [] });
    const query = new URLSearchParams({
      [FIELD_MAP.id]: String(tmdbId),
      [FIELD_MAP.mediaType]: mediaType,
      [FIELD_MAP.path]: "subtitle_",
      [FIELD_MAP.ts]: String(tokenData.ts),
      [FIELD_MAP.token]: tokenData.token,
      [FIELD_MAP.title]: title,
      [FIELD_MAP.year]: year,
      [FIELD_MAP.date]: String(date)
    });
    if (mediaType === "tv") {
      query.set(FIELD_MAP.season, String(Number(season) || 1));
      query.set(FIELD_MAP.episode, String(Number(episode) || 1));
    }
    try {
      const vidRes = await fetch(`https://vidstuck.cc/backend/subtitle?${query.toString()}`, {
        headers: COMMON_HEADERS
      });
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        const list2 = Array.isArray(vidData) ? vidData : vidData.captions || vidData.subtitles || [];
        if (list2.length > 0) return res.json({ captions: list2 });
      }
    } catch {
    }
    const subRes = await fetch(`https://zxcstream.cc/backend_/subtitle_?${query.toString()}`, {
      headers: COMMON_HEADERS
    });
    if (!subRes.ok) return res.json({ captions: [] });
    const subData = await subRes.json();
    const list = Array.isArray(subData) ? subData : subData.subtitles || subData.captions || [];
    return res.json({ captions: list });
  } catch {
    return res.json({ captions: [] });
  }
});
apiRouter.options("/stream/proxy", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  return res.sendStatus(200);
});
apiRouter.get("/stream/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.status(400).send("Invalid or missing target URL");
  }
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  try {
    const reqHeaders = {
      "User-Agent": COMMON_HEADERS["User-Agent"],
      Referer: "https://zxcstream.cc/",
      Origin: "https://zxcstream.cc"
    };
    if (req.headers.range) {
      reqHeaders.Range = String(req.headers.range);
    }
    const upstream = await fetch(targetUrl, {
      headers: reqHeaders
    });
    res.status(upstream.status);
    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    if (contentType) res.setHeader("Content-Type", contentType);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Accept-Ranges", "bytes");
    const isM3u8 = contentType.includes("mpegurl") || contentType.includes("x-mpegurl") || targetUrl.includes(".m3u8");
    if (isM3u8) {
      const text = await upstream.text();
      if (text.trimStart().startsWith("#EXTM3U")) {
        const resolveAgainstBase = (relOrAbs) => {
          try {
            return new URL(relOrAbs.trim(), targetUrl).toString();
          } catch {
            return relOrAbs.trim();
          }
        };
        const rewritten = text.split(/\r?\n/).map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#")) {
            return line.replace(/URI="([^"]+)"/g, (_m, uriVal) => {
              const absUri = resolveAgainstBase(uriVal);
              return `URI="/api/stream/proxy?url=${encodeURIComponent(absUri)}"`;
            });
          }
          const absUrl = resolveAgainstBase(trimmed);
          return `/api/stream/proxy?url=${encodeURIComponent(absUrl)}`;
        }).join("\n");
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        return res.status(200).send(rewritten);
      }
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    return res.status(502).send(err.message || "Upstream fetch proxy failed");
  }
});
apiRouter.get("/stream/mpd-audio", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.status(400).send("Invalid or missing target URL");
  }
  try {
    let mpdText = "";
    const cached = mpdManifestCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
      mpdText = cached.xml;
    } else {
      for (let attempt = 0; attempt < 2; attempt++) {
        const upstream = await fetch(targetUrl, {
          headers: {
            "User-Agent": COMMON_HEADERS["User-Agent"],
            Referer: "https://zxcstream.cc/",
            Origin: "https://zxcstream.cc"
          }
        });
        if (upstream.ok) {
          mpdText = await upstream.text();
          if (mpdText.includes("<MPD")) {
            cacheMpdXml(targetUrl, mpdText);
            break;
          }
        }
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }
    if (!mpdText || !mpdText.includes("<MPD")) {
      return res.status(502).send("Failed to fetch valid upstream MPD");
    }
    const audioOnlyMpd = stripVideoFromMpd(mpdText);
    res.setHeader("Content-Type", "application/dash+xml");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(audioOnlyMpd);
  } catch (err) {
    return res.status(502).send(err.message || "Upstream MPD audio proxy failed");
  }
});
apiRouter.get("/embed/sentinel", (req, res) => {
  const base = "https://zxcstream-mirror.vercel.app";
  const { mediaType = "movie", tmdbId = "128", season = "1", episode = "1" } = req.query;
  const path = mediaType === "tv" ? `${base}/embed/tv/${tmdbId}/${season}/${episode}` : `${base}/embed/movie/${tmdbId}`;
  return res.json({ embed: path });
});
var theIntroDbCache = /* @__PURE__ */ new Map();
var upstreamIntroCache = /* @__PURE__ */ new Map();
var manualEpisodeTimingOverrides = /* @__PURE__ */ new Map();
async function queryTheIntroDb(params) {
  const query = new URLSearchParams();
  if (params.tvdbId != null && params.tvdbId > 0) {
    query.set("tvdb_id", String(params.tvdbId));
  } else if (params.tmdbId != null && String(params.tmdbId).trim() !== "") {
    query.set("tmdb_id", String(params.tmdbId).trim());
  } else if (params.imdbId != null && String(params.imdbId).trim() !== "") {
    query.set("imdb_id", String(params.imdbId).trim());
  } else {
    return null;
  }
  if (params.mediaType === "tv") {
    if (params.season != null) query.set("season", String(params.season));
    if (params.episode != null) query.set("episode", String(params.episode));
  }
  const durationMs = params.durationMs && params.durationMs >= 3e5 ? params.durationMs : void 0;
  if (durationMs) {
    query.set("duration_ms", String(durationMs));
    query.set("merge_unknown", "true");
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const apiUrl = `https://api.theintrodb.org/v4/media?${query.toString()}`;
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ZXCStream-TheIntroDB-Integration/1.0"
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    let introStart = null;
    let introEnd = null;
    if (Array.isArray(data.intro) && data.intro.length > 0) {
      const seg = data.intro[0];
      const norm = normalizeIntervalSeconds({
        startMs: seg?.start_ms ?? null,
        endMs: seg?.end_ms ?? null,
        allowStartNullAsZero: true
      });
      introStart = norm.start;
      introEnd = norm.end;
    }
    let recapStart = null;
    let recapEnd = null;
    if (Array.isArray(data.recap) && data.recap.length > 0) {
      const seg = data.recap[0];
      const norm = normalizeIntervalSeconds({
        startMs: seg?.start_ms ?? null,
        endMs: seg?.end_ms ?? null,
        allowStartNullAsZero: true
      });
      recapStart = norm.start;
      recapEnd = norm.end;
    }
    let outroStart = null;
    let outroEnd = null;
    if (Array.isArray(data.credits) && data.credits.length > 0) {
      const seg = data.credits[0];
      const norm = normalizeIntervalSeconds({
        startMs: seg?.start_ms ?? null,
        endMs: seg?.end_ms ?? null,
        allowStartNullAsZero: true
      });
      outroStart = norm.start;
      outroEnd = norm.end ?? (durationMs ? Number((durationMs / 1e3).toFixed(3)) : null);
    }
    if (introStart !== null || recapStart !== null || outroStart !== null) {
      return {
        introStart,
        introEnd,
        recapStart,
        recapEnd,
        outroStart,
        outroEnd,
        tvdbId: data.tvdb_id ?? params.tvdbId ?? null,
        durationMs: durationMs ?? null,
        fetchedAt: Date.now()
      };
    }
    return null;
  } catch {
    return null;
  }
}
apiRouter.post("/intro", (req, res) => {
  const tmdbId = String(req.body?.tmdbId || "").trim();
  const season = Number(req.body?.season) || 1;
  const episode = Number(req.body?.episode) || 1;
  if (!tmdbId || season < 1 || episode < 1) {
    return res.status(400).json({ error: "Valid tmdbId, season, and episode are required" });
  }
  const episodeKey = `${tmdbId}:${season}:${episode}`;
  const introNorm = normalizeIntervalSeconds({
    startSec: req.body?.introStart ?? req.body?.intro?.start_sec ?? null,
    endSec: req.body?.introEnd ?? req.body?.intro?.end_sec ?? null,
    startMs: req.body?.intro?.start_ms ?? null,
    endMs: req.body?.intro?.end_ms ?? null
  });
  const recapNorm = normalizeIntervalSeconds({
    startSec: req.body?.recapStart ?? req.body?.recap?.start_sec ?? null,
    endSec: req.body?.recapEnd ?? req.body?.recap?.end_sec ?? null,
    startMs: req.body?.recap?.start_ms ?? null,
    endMs: req.body?.recap?.end_ms ?? null
  });
  const outroNorm = normalizeIntervalSeconds({
    startSec: req.body?.outroStart ?? req.body?.outro?.start_sec ?? null,
    endSec: req.body?.outroEnd ?? req.body?.outro?.end_sec ?? null,
    startMs: req.body?.outro?.start_ms ?? null,
    endMs: req.body?.outro?.end_ms ?? null
  });
  const triggerRaw = req.body?.nextEpisodeTriggerTime;
  const nextEpisodeTriggerTime = triggerRaw !== null && triggerRaw !== void 0 && Number.isFinite(Number(triggerRaw)) ? Number(triggerRaw) : null;
  const entry = {
    introStart: introNorm.start,
    introEnd: introNorm.end,
    recapStart: recapNorm.start,
    recapEnd: recapNorm.end,
    outroStart: outroNorm.start,
    outroEnd: outroNorm.end,
    nextEpisodeTriggerTime
  };
  manualEpisodeTimingOverrides.set(episodeKey, entry);
  return res.json({ episodeKey, tmdbId, season, episode, ...entry, source: "manual" });
});
apiRouter.get("/intro", async (req, res) => {
  const tmdbId = String(req.query.tmdbId || "").trim();
  const mediaType = String(req.query.mediaType || "tv").trim() === "movie" ? "movie" : "tv";
  const season = Number(req.query.season) || 1;
  const episode = Number(req.query.episode) || 1;
  if (!tmdbId || mediaType === "tv" && (season < 1 || episode < 1)) {
    return res.json({});
  }
  const episodeKey = mediaType === "tv" ? `${tmdbId}:${season}:${episode}` : `movie:${tmdbId}`;
  const durationMsRaw = Number(req.query.durationMs);
  const durationSecRaw = Number(req.query.durationSec);
  const durationMs = Number.isFinite(durationMsRaw) && durationMsRaw > 0 ? durationMsRaw : Number.isFinite(durationSecRaw) && durationSecRaw > 0 ? Math.round(durationSecRaw * 1e3) : 0;
  const fallbackTiming = mediaType === "tv" ? getEpisodeTimingMetadata(tmdbId, season, episode, mediaType) : null;
  const manualOverride = manualEpisodeTimingOverrides.get(episodeKey);
  if (manualOverride) {
    return res.json({
      episodeKey,
      tmdbId,
      season,
      episode,
      introStart: manualOverride.introStart,
      introEnd: manualOverride.introEnd,
      recapStart: manualOverride.recapStart ?? null,
      recapEnd: manualOverride.recapEnd ?? null,
      outroStart: manualOverride.outroStart,
      outroEnd: manualOverride.outroEnd,
      nextEpisodeTriggerTime: manualOverride.nextEpisodeTriggerTime ?? (fallbackTiming?.nextEpisodeId === null ? null : manualOverride.outroEnd),
      nextEpisodeId: fallbackTiming?.nextEpisodeId ?? null,
      intro: manualOverride.introStart !== null && manualOverride.introEnd !== null ? { start_sec: manualOverride.introStart, end_sec: manualOverride.introEnd } : null,
      recap: manualOverride.recapStart !== null && manualOverride.recapEnd !== null ? { start_sec: manualOverride.recapStart, end_sec: manualOverride.recapEnd } : null,
      credits: manualOverride.outroStart !== null && manualOverride.outroEnd !== null ? { start_sec: manualOverride.outroStart, end_sec: manualOverride.outroEnd } : null,
      outro: manualOverride.outroStart !== null && manualOverride.outroEnd !== null ? { start_sec: manualOverride.outroStart, end_sec: manualOverride.outroEnd } : null,
      source: "manual"
    });
  }
  let tvdbId = Number(req.query.tvdbId) || getSeriesTvdbId(tmdbId) || null;
  let imdbId = String(req.query.imdbId || "").trim() || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || "";
  if (!tvdbId || !imdbId) {
    try {
      const details = await fetchTmdbDetailsWithFallback(mediaType, tmdbId);
      if (details) {
        if (!imdbId && details.imdb_id) {
          imdbId = String(details.imdb_id).trim();
          tmdbImdbCache.set(tmdbId, imdbId);
        }
        if (!tvdbId && (details.tvdb_id || details.external_ids?.tvdb_id)) {
          tvdbId = Number(details.tvdb_id || details.external_ids?.tvdb_id);
        }
      }
    } catch {
    }
  }
  const durationCluster = durationMs ? Math.round(durationMs / 3e4) * 3e4 : 0;
  const cacheKey = `${episodeKey}:${durationCluster}`;
  let theIntroDbEntry = theIntroDbCache.get(cacheKey) || null;
  if (theIntroDbEntry && Date.now() - theIntroDbEntry.fetchedAt > 60 * 60 * 1e3) {
    theIntroDbEntry = null;
  }
  if (!theIntroDbEntry) {
    theIntroDbEntry = await queryTheIntroDb({
      mediaType,
      tvdbId,
      tmdbId,
      imdbId,
      season,
      episode,
      durationMs
    });
    if (theIntroDbEntry) {
      theIntroDbCache.set(cacheKey, theIntroDbEntry);
    }
  }
  let upstreamEntry = upstreamIntroCache.get(episodeKey) || null;
  if (upstreamEntry && Date.now() - upstreamEntry.fetchedAt > 30 * 60 * 1e3) {
    upstreamEntry = null;
  }
  if (!theIntroDbEntry && !upstreamEntry && mediaType === "tv" && imdbId) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const upstreamUrl = `https://zxcstream.cc/backend/intro?imdbId=${encodeURIComponent(
        imdbId
      )}&season=${encodeURIComponent(String(season))}&episode=${encodeURIComponent(
        String(episode)
      )}&tmdbId=${encodeURIComponent(tmdbId)}`;
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          ...COMMON_HEADERS,
          Referer: `https://zxcstream.cc/player/tv/${tmdbId}/${season}/${episode}`
        },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (upstreamRes.ok) {
        const rawData = await upstreamRes.json();
        const matchesEpisode = (rawData?.season === void 0 || Number(rawData.season) === season) && (rawData?.episode === void 0 || Number(rawData.episode) === episode);
        if (matchesEpisode && rawData && (rawData.intro || rawData.outro)) {
          const normIntro = normalizeIntervalSeconds({
            startSec: rawData.intro?.start_sec ?? null,
            endSec: rawData.intro?.end_sec ?? null,
            startMs: rawData.intro?.start_ms ?? null,
            endMs: rawData.intro?.end_ms ?? null
          });
          const normOutro = normalizeIntervalSeconds({
            startSec: rawData.outro?.start_sec ?? null,
            endSec: rawData.outro?.end_sec ?? null,
            startMs: rawData.outro?.start_ms ?? null,
            endMs: rawData.outro?.end_ms ?? null
          });
          let introStart = normIntro.start;
          let introEnd = normIntro.end;
          let outroStart = normOutro.start;
          let outroEnd = normOutro.end;
          if (introStart !== null && introEnd !== null && outroStart !== null && outroEnd !== null && outroEnd <= introStart && introStart >= 900) {
            outroStart = introStart;
            outroEnd = introEnd;
            introStart = null;
            introEnd = null;
          }
          upstreamEntry = {
            introStart,
            introEnd,
            outroStart,
            outroEnd,
            fetchedAt: Date.now()
          };
          upstreamIntroCache.set(episodeKey, upstreamEntry);
        }
      }
    } catch {
    }
  }
  const resolvedSource = theIntroDbEntry ? "theintrodb" : upstreamEntry ? "upstream" : fallbackTiming ? "catalog" : "none";
  const finalIntroStart = theIntroDbEntry?.introStart ?? upstreamEntry?.introStart ?? fallbackTiming?.introStart ?? null;
  const finalIntroEnd = theIntroDbEntry?.introEnd ?? upstreamEntry?.introEnd ?? fallbackTiming?.introEnd ?? null;
  const finalRecapStart = theIntroDbEntry?.recapStart ?? null;
  const finalRecapEnd = theIntroDbEntry?.recapEnd ?? null;
  const finalOutroStart = theIntroDbEntry?.outroStart ?? upstreamEntry?.outroStart ?? fallbackTiming?.outroStart ?? null;
  const finalOutroEnd = theIntroDbEntry?.outroEnd ?? upstreamEntry?.outroEnd ?? fallbackTiming?.outroEnd ?? null;
  const isSeriesFinale = fallbackTiming?.nextEpisodeId === null;
  const resolvedTrigger = isSeriesFinale || mediaType !== "tv" ? null : finalOutroStart ?? finalOutroEnd ?? fallbackTiming?.nextEpisodeTriggerTime ?? null;
  return res.json({
    episodeKey,
    mediaType,
    tmdbId,
    tvdbId: tvdbId ?? theIntroDbEntry?.tvdbId ?? null,
    season: mediaType === "tv" ? season : void 0,
    episode: mediaType === "tv" ? episode : void 0,
    durationMs: durationMs || void 0,
    introStart: finalIntroStart,
    introEnd: finalIntroEnd,
    recapStart: finalRecapStart,
    recapEnd: finalRecapEnd,
    outroStart: finalOutroStart,
    outroEnd: finalOutroEnd,
    nextEpisodeTriggerTime: resolvedTrigger,
    nextEpisodeId: fallbackTiming?.nextEpisodeId ?? null,
    intro: finalIntroStart !== null && finalIntroEnd !== null ? {
      start_sec: finalIntroStart,
      end_sec: finalIntroEnd,
      start_ms: Math.round(finalIntroStart * 1e3),
      end_ms: Math.round(finalIntroEnd * 1e3)
    } : null,
    recap: finalRecapStart !== null && finalRecapEnd !== null ? {
      start_sec: finalRecapStart,
      end_sec: finalRecapEnd,
      start_ms: Math.round(finalRecapStart * 1e3),
      end_ms: Math.round(finalRecapEnd * 1e3)
    } : null,
    credits: finalOutroStart !== null && finalOutroEnd !== null ? {
      start_sec: finalOutroStart,
      end_sec: finalOutroEnd,
      start_ms: Math.round(finalOutroStart * 1e3),
      end_ms: Math.round(finalOutroEnd * 1e3)
    } : null,
    outro: finalOutroStart !== null && finalOutroEnd !== null ? {
      start_sec: finalOutroStart,
      end_sec: finalOutroEnd,
      start_ms: Math.round(finalOutroStart * 1e3),
      end_ms: Math.round(finalOutroEnd * 1e3)
    } : null,
    source: resolvedSource
  });
});
var NXSHA_KEY = "f4488ab4da401203d23baa129fc546153898162524635d6776826d0c867ccaa3";
function nxshaEncrypt(data) {
  try {
    const payload = JSON.stringify({
      ...data,
      _req_ts: Date.now(),
      _req_salt: Math.random().toString(36).substring(2, 12)
    });
    const ciphertext = CryptoJS.AES.encrypt(payload, NXSHA_KEY).toString();
    return ciphertext.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}
function nxshaDecrypt(enc) {
  if (!enc) return null;
  try {
    let b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const bytes = CryptoJS.AES.decrypt(b64, NXSHA_KEY);
    const jsonStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    delete parsed._req_ts;
    delete parsed._req_salt;
    return parsed;
  } catch {
    return null;
  }
}
function detectNxshaLanguage(text) {
  return detectSingleStreamLanguage(text);
}
var NXSHA_COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9"
};
function extractHscowAssetKey(url) {
  if (!url) return null;
  const m = url.match(/(?:hscow\.com|fcxmb\.com)\/(?:my)?hls(?:_mps)?\/(?:(\d{4}\/\d+yue\/(?:\d+\/)?[A-Za-z0-9]+)|([A-Za-z0-9]{6,}))/i);
  if (!m) return null;
  const raw = m[1] || m[2] || "";
  return raw.split("_")[0].toLowerCase();
}
function needsNxshaProxy(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("itsnitrox.tech") || lower.includes("finepulfe.xyz");
}
function wrapInNxshaProxy(url) {
  if (!url || url.startsWith("/api/nxsha/proxy")) return url;
  return `/api/nxsha/proxy?url=${encodeURIComponent(url)}`;
}
async function fetchNxshaServers(tmdbId, mediaType, season = 1, episode = 1, imdbId = "", parentSignal) {
  try {
    const encPayload = nxshaEncrypt({
      tmdbId: String(tmdbId || ""),
      imdb_id: imdbId || "",
      type: mediaType === "tv" ? "tv" : "movie",
      season: mediaType === "tv" ? season : void 0,
      episode: mediaType === "tv" ? episode : void 0
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    if (parentSignal) {
      if (parentSignal.aborted) {
        clearTimeout(timeout);
        return [];
      }
      parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const res = await fetch(`https://nxsha.space/api/servers?q=${encodeURIComponent(encPayload)}`, {
      headers: {
        ...NXSHA_COMMON_HEADERS,
        Referer: mediaType === "tv" ? `https://nxsha.space/embed/tv/${tmdbId}/${season}/${episode}` : `https://nxsha.space/embed/movie/${tmdbId}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    const decrypted = nxshaDecrypt(json?._hash);
    const rawList = Array.isArray(decrypted?.servers) ? decrypted.servers : [];
    return rawList.filter(
      (s) => s && s.scraper && s.web_support !== false && isAuthorizedNxshaProvider(s.scraper)
    );
  } catch {
    return [];
  }
}
async function fetchNxshaSubtitles(tmdbId, mediaType, season = 1, episode = 1, imdbId = "", parentSignal) {
  try {
    const encPayload = nxshaEncrypt({
      tmdbId: String(tmdbId || ""),
      imdb_id: imdbId || "",
      type: mediaType === "tv" ? "tv" : "movie",
      season: mediaType === "tv" ? season : void 0,
      episode: mediaType === "tv" ? episode : void 0
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    if (parentSignal) {
      if (parentSignal.aborted) {
        clearTimeout(timeout);
        return [];
      }
      parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const res = await fetch(`https://nxsha.space/api/subtitles?q=${encodeURIComponent(encPayload)}`, {
      headers: {
        ...NXSHA_COMMON_HEADERS,
        Referer: mediaType === "tv" ? `https://nxsha.space/embed/tv/${tmdbId}/${season}/${episode}` : `https://nxsha.space/embed/movie/${tmdbId}`
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    const decrypted = nxshaDecrypt(json?._hash);
    return normalizeSubtitleTracks([], decrypted?.subtitles || []);
  } catch {
    return [];
  }
}
async function fetchNxshaSources(provider, tmdbId, mediaType, season = 1, episode = 1, imdbId = "", parentSignal) {
  if (!isAuthorizedNxshaProvider(provider)) {
    return { sources: [], subtitles: [], dubs: [] };
  }
  if (parentSignal?.aborted) {
    throw new Error("Aborted before fetchNxshaSources start");
  }
  try {
    const fetchWithLang = async (ex_lang) => {
      try {
        if (parentSignal?.aborted) return { sources: [], subtitles: [] };
        const encPayload = nxshaEncrypt({
          ex_lang,
          provider,
          tmdbId: String(tmdbId || ""),
          imdb_id: imdbId || "",
          type: mediaType === "tv" ? "tv" : "movie",
          season: mediaType === "tv" ? season : void 0,
          episode: mediaType === "tv" ? episode : void 0
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4800);
        if (parentSignal) {
          parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
        }
        const res = await fetch(`https://nxsha.space/api/sources?q=${encodeURIComponent(encPayload)}`, {
          headers: {
            ...NXSHA_COMMON_HEADERS,
            Referer: mediaType === "tv" ? `https://nxsha.space/embed/tv/${tmdbId}/${season}/${episode}` : `https://nxsha.space/embed/movie/${tmdbId}`
          },
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (!res.ok) return { sources: [], subtitles: [] };
        const json = await res.json();
        const decrypted = nxshaDecrypt(json?._hash);
        const sources = Array.isArray(decrypted?.sources) ? decrypted.sources.filter(
          (s) => s && s.url && !s.isEmbed && !isDeadNxshaSourceUrl(s.url)
        ) : [];
        const subtitles2 = Array.isArray(decrypted?.subtitles) ? decrypted.subtitles : [];
        return { sources, subtitles: subtitles2 };
      } catch {
        return { sources: [], subtitles: [] };
      }
    };
    const singleRes = await fetchWithLang(false);
    if (parentSignal?.aborted) {
      throw new Error("Aborted during fetchNxshaSources");
    }
    const combinedSources = singleRes.sources;
    const seenUrls = /* @__PURE__ */ new Set();
    const uniqueSources = [];
    const dubsMap = /* @__PURE__ */ new Map();
    dubsMap.set("orig", {
      type: 0,
      lang: "orig",
      name: "Original Audio",
      label: "Original Audio",
      original: true
    });
    for (const src of combinedSources) {
      if (!src?.url || seenUrls.has(src.url) || isDeadNxshaSourceUrl(src.url)) continue;
      if (!isTrustedNxshaMediaUrl(src.url)) continue;
      seenUrls.add(src.url);
      const rawUrl = src.url;
      const labelToDetect = `${src.label || ""} ${src.quality || ""}`;
      const lang = detectNxshaLanguage(labelToDetect);
      const allLangs = detectAllStreamLanguages(labelToDetect);
      if (lang) {
        src.lang = lang.code;
        src.langName = lang.name;
      }
      if (allLangs.length > 1) {
        src.multiLangs = allLangs.map((l) => l.code);
        for (const l of allLangs) {
          if (!dubsMap.has(l.code)) {
            dubsMap.set(l.code, {
              type: 0,
              lang: l.code,
              name: `${l.name} dub`,
              label: l.name,
              original: false
            });
          }
        }
      }
      if (needsNxshaProxy(rawUrl)) {
        src.org_uri = rawUrl;
        src.url = wrapInNxshaProxy(rawUrl);
        src.type = "hls";
      }
      uniqueSources.push(src);
    }
    if (provider === "nitro" && uniqueSources.length > 0 && !parentSignal?.aborted) {
      const targetRawUrl = uniqueSources[0].org_uri || uniqueSources[0].url;
      if (targetRawUrl && targetRawUrl.startsWith("http") && isTrustedNxshaMediaUrl(targetRawUrl)) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 2200);
          if (parentSignal) {
            parentSignal.addEventListener("abort", () => ctrl.abort(), { once: true });
          }
          const mRes = await fetch(targetRawUrl, {
            headers: {
              "User-Agent": NXSHA_COMMON_HEADERS["User-Agent"],
              Referer: "https://nxsha.space/"
            },
            signal: ctrl.signal
          });
          clearTimeout(t);
          if (mRes.ok) {
            const mText = await mRes.text();
            const lines = mText.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith("#EXT-X-MEDIA:") && line.includes("TYPE=AUDIO")) {
                const langMatch = line.match(/LANGUAGE="([^"]+)"/i);
                const nameMatch = line.match(/NAME="([^"]+)"/i);
                const detected = detectNxshaLanguage(langMatch?.[1] || "") || detectNxshaLanguage(nameMatch?.[1] || "");
                if (detected && !dubsMap.has(detected.code)) {
                  dubsMap.set(detected.code, {
                    type: 0,
                    lang: detected.code,
                    name: `${detected.name} dub`,
                    label: detected.name,
                    original: false
                  });
                }
              }
            }
          }
        } catch {
        }
      }
    }
    const subtitles = singleRes.subtitles;
    for (const src of uniqueSources) {
      if (src.lang && !dubsMap.has(src.lang)) {
        dubsMap.set(src.lang, {
          type: 0,
          lang: src.lang,
          name: `${src.langName || src.lang} dub`,
          label: src.langName || src.lang,
          original: false
        });
      }
    }
    return {
      sources: uniqueSources,
      subtitles,
      dubs: Array.from(dubsMap.values())
    };
  } catch (err) {
    if (parentSignal?.aborted) throw err;
    return { sources: [], subtitles: [], dubs: [] };
  }
}
apiRouter.options("/nxsha/proxy", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  return res.sendStatus(200);
});
apiRouter.get("/nxsha/proxy", async (req, res) => {
  const targetUrl = String(req.query.url || "").trim();
  const reqLang = String(req.query.lang || "").trim().toLowerCase();
  if (!targetUrl || !targetUrl.startsWith("http") || !isTrustedNxshaMediaUrl(targetUrl)) {
    return res.status(400).send("Invalid or untrusted target URL");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const reqHeaders = {
      "User-Agent": NXSHA_COMMON_HEADERS["User-Agent"],
      Referer: "https://nxsha.space/"
    };
    if (req.headers.range) {
      reqHeaders.Range = String(req.headers.range);
    }
    let currentUrl = targetUrl;
    let upstream = null;
    for (let hop = 0; hop <= 3; hop++) {
      upstream = await fetch(currentUrl, {
        headers: reqHeaders,
        redirect: "manual",
        signal: controller.signal
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get("location");
        if (!location) break;
        const resolvedRedirect = new URL(location, currentUrl).toString();
        if (!isTrustedNxshaMediaUrl(resolvedRedirect)) {
          clearTimeout(timeout);
          return res.status(403).send("Blocked untrusted redirect target");
        }
        currentUrl = resolvedRedirect;
        continue;
      }
      break;
    }
    clearTimeout(timeout);
    if (!upstream) {
      return res.status(502).send("Upstream unavailable");
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Accept-Ranges", "bytes");
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Upstream error ${upstream.status}`);
    }
    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    const finalUrl = currentUrl;
    const isM3u8 = contentType.includes("mpegurl") || contentType.includes("x-mpegurl") || finalUrl.includes(".m3u8");
    const langSuffix = reqLang ? `&lang=${encodeURIComponent(reqLang)}` : "";
    if (isM3u8) {
      const text = await upstream.text();
      if (text.trimStart().startsWith("#EXTM3U")) {
        const resolveAgainstBase = (relOrAbs) => {
          try {
            return new URL(relOrAbs.trim(), finalUrl).toString();
          } catch {
            return relOrAbs.trim();
          }
        };
        const rewritten = text.split(/\r?\n/).map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#")) {
            return line.replace(/URI="([^"]+)"/g, (_m, uriVal) => {
              const absUri = resolveAgainstBase(uriVal);
              return `URI="/api/nxsha/proxy?url=${encodeURIComponent(absUri)}${langSuffix}"`;
            });
          }
          const absUrl = resolveAgainstBase(trimmed);
          return `/api/nxsha/proxy?url=${encodeURIComponent(absUrl)}${langSuffix}`;
        }).join("\n");
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        return res.status(200).send(rewritten);
      }
    }
    res.status(upstream.status);
    if (contentType) res.setHeader("Content-Type", contentType);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (reqLang && buffer.length >= 188) {
      inspectAndSelectMpegTsAudioTrack(buffer, reqLang);
    }
    res.setHeader("Content-Length", String(buffer.length));
    return res.send(buffer);
  } catch (err) {
    clearTimeout(timeout);
    return res.status(502).send(err.message || "NXSHA proxy failed");
  }
});
apiRouter.get("/nxsha/servers", async (req, res) => {
  const tmdbId = String(req.query.id || req.query.tmdbId || "").trim();
  const mediaType = String(req.query.type || req.query.mediaType || "movie").trim().toLowerCase() === "tv" ? "tv" : "movie";
  const season = Math.max(1, Number.parseInt(String(req.query.season || "1"), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(req.query.episode || "1"), 10) || 1);
  const imdbId = String(req.query.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || "");
  if (!tmdbId) {
    return res.status(400).json({ error: "Missing tmdbId query param" });
  }
  const servers = await fetchNxshaServers(tmdbId, mediaType, season, episode, imdbId);
  return res.json({
    success: true,
    count: servers.length,
    servers: servers.map((s, idx) => ({
      index: idx,
      id: s.scraper,
      name: s.name,
      quality: s.quality || "HD",
      scraper: s.scraper
    }))
  });
});
apiRouter.get("/nxsha/subtitles", async (req, res) => {
  const tmdbId = String(req.query.id || req.query.tmdbId || "").trim();
  const mediaType = String(req.query.type || req.query.mediaType || "movie").trim().toLowerCase() === "tv" ? "tv" : "movie";
  const season = Math.max(1, Number.parseInt(String(req.query.season || "1"), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(req.query.episode || "1"), 10) || 1);
  const imdbId = String(req.query.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || "");
  if (!tmdbId) {
    return res.status(400).json({ error: "Missing tmdbId query param" });
  }
  const subtitles = await fetchNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId);
  return res.json({
    success: true,
    count: subtitles.length,
    subtitles
  });
});
apiRouter.get("/nxsha/sources", async (req, res) => {
  const tmdbId = String(req.query.id || req.query.tmdbId || "").trim();
  const provider = String(req.query.server || req.query.provider || "rive-citadel").trim();
  const mediaType = String(req.query.type || req.query.mediaType || "movie").trim().toLowerCase() === "tv" ? "tv" : "movie";
  const season = Math.max(1, Number.parseInt(String(req.query.season || "1"), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(req.query.episode || "1"), 10) || 1);
  const imdbId = String(req.query.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || "");
  if (!tmdbId) {
    return res.status(400).json({ error: "Missing tmdbId" });
  }
  if (!isAuthorizedNxshaProvider(provider)) {
    return res.status(400).json({ error: "Unauthorized or unknown NXSHA provider" });
  }
  const { sources, subtitles, dubs } = await fetchNxshaSources(
    provider,
    tmdbId,
    mediaType,
    season,
    episode,
    imdbId
  );
  return res.json({
    success: sources.length > 0,
    provider,
    sources,
    subtitles,
    dubs
  });
});
var NXSHA_CACHE_TTL_MS = 45e3;
var nxshaCitadelCache = /* @__PURE__ */ new Map();
var nxshaSubsCache = /* @__PURE__ */ new Map();
var nxshaServersCache = /* @__PURE__ */ new Map();
function getCachedNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId) {
  const key = `${mediaType}:${tmdbId}:${season}:${episode}`;
  const now = Date.now();
  const hit = nxshaSubsCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = fetchNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId);
  nxshaSubsCache.set(key, { expiresAt: now + NXSHA_CACHE_TTL_MS, promise });
  return promise;
}
function getCachedNxshaServers(tmdbId, mediaType, season, episode, imdbId) {
  const key = `${mediaType}:${tmdbId}:${season}:${episode}`;
  const now = Date.now();
  const hit = nxshaServersCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = fetchNxshaServers(tmdbId, mediaType, season, episode, imdbId);
  nxshaServersCache.set(key, { expiresAt: now + NXSHA_CACHE_TTL_MS, promise });
  return promise;
}
function getCachedCitadelSources(tmdbId, mediaType, season, episode, imdbId) {
  const key = `${mediaType}:${tmdbId}:${season}:${episode}`;
  const now = Date.now();
  const hit = nxshaCitadelCache.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = fetchNxshaSources("rive-citadel", tmdbId, mediaType, season, episode, imdbId).catch(
    () => ({ sources: [], subtitles: [], dubs: [] })
  );
  nxshaCitadelCache.set(key, { expiresAt: now + NXSHA_CACHE_TTL_MS, promise });
  return promise;
}
var handleNxshaResolve = async (req, res) => {
  const params = req.method === "POST" ? req.body || {} : req.query || {};
  const tmdbId = String(params.id || params.tmdbId || "").trim();
  const mediaType = String(params.type || params.mediaType || "movie").trim().toLowerCase() === "tv" ? "tv" : "movie";
  const season = Math.max(1, Number.parseInt(String(params.season || "1"), 10) || 1);
  const episode = Math.max(1, Number.parseInt(String(params.episode || "1"), 10) || 1);
  const preferredServer = String(params.server || params.provider || params.preferredServer || "").trim();
  const strictSingleServer = Boolean(params.strictSingleServer === true || params.strictSingleServer === "true");
  const allowFallback = Boolean(params.allowFallback === true || params.allowFallback === "true");
  const requestedDub = String(params.dubCode || params.dubLang || params.lang || "").trim().toLowerCase();
  const imdbId = String(params.imdbId || tmdbImdbCache.get(tmdbId) || getSeriesImdbId(tmdbId) || "");
  const rawExclude = params.excludeServers;
  const excludeSet = new Set(
    Array.isArray(rawExclude) ? rawExclude.map((s) => String(s).trim()) : typeof rawExclude === "string" && rawExclude.trim() ? rawExclude.split(",").map((s) => s.trim()) : []
  );
  if (!tmdbId) {
    return res.status(400).json({ success: false, error: "Missing tmdbId" });
  }
  const nxshaSubsPromise = getCachedNxshaSubtitles(tmdbId, mediaType, season, episode, imdbId);
  const nxshaServersPromise = getCachedNxshaServers(tmdbId, mediaType, season, episode, imdbId);
  const defaultServerList = NXSHA_SERVERS.map((s) => ({
    index: s.index,
    id: s.id,
    name: s.label,
    quality: "HD"
  }));
  const candidateProviders = [];
  if (strictSingleServer && preferredServer && isAuthorizedNxshaProvider(preferredServer)) {
    if (!excludeSet.has(preferredServer)) {
      candidateProviders.push(preferredServer);
    }
  } else {
    if (preferredServer && isAuthorizedNxshaProvider(preferredServer) && !excludeSet.has(preferredServer)) {
      candidateProviders.push(preferredServer);
    }
    for (const p of ALLOWED_NXSHA_PROVIDERS) {
      if (!excludeSet.has(p) && !candidateProviders.includes(p)) {
        candidateProviders.push(p);
      }
    }
  }
  const allDubsMap = /* @__PURE__ */ new Map();
  allDubsMap.set("orig", {
    type: 0,
    lang: "orig",
    name: "Original Audio",
    label: "Original Audio",
    original: true
  });
  const citadelState = {
    resolved: null
  };
  const getCitadelSources = () => getCachedCitadelSources(tmdbId, mediaType, season, episode, imdbId).then((val) => {
    citadelState.resolved = val;
    return val;
  });
  if (candidateProviders.includes("rive-citadel") || candidateProviders.includes("castle")) {
    void getCitadelSources();
  }
  const raceResult = await raceNxshaProviders({
    providers: candidateProviders,
    concurrencyLimit: 6,
    providerTimeoutMs: 4800,
    overallTimeoutMs: 7500,
    queryProvider: async (provider, signal) => {
      if (provider === "rive-citadel") {
        return getCitadelSources();
      }
      return fetchNxshaSources(provider, tmdbId, mediaType, season, episode, imdbId, signal);
    },
    validateCandidate: async (provider, sources) => {
      if (provider !== "castle") {
        return { valid: sources.length > 0, sources };
      }
      const citadelRes = await getCitadelSources().catch(() => ({ sources: [] }));
      if (citadelRes.sources.length > 0 && candidateProviders.includes("rive-citadel") && preferredServer !== "castle") {
        await new Promise((r) => setTimeout(r, 5));
      }
      const verifiedAssetKeys = new Set(
        citadelRes.sources.map((s) => extractHscowAssetKey(s.url)).filter((k) => Boolean(k))
      );
      const filtered = sources.filter((s) => {
        const key = extractHscowAssetKey(s.url);
        if (!key) return true;
        return verifiedAssetKeys.has(key);
      });
      return { valid: filtered.length > 0, sources: filtered };
    },
    isPreferredMatch: (_provider, sources) => {
      if (!requestedDub || requestedDub === "orig") return true;
      return sources.some(
        (s) => s.lang === requestedDub || Array.isArray(s.multiLangs) && s.multiLangs.includes(requestedDub)
      );
    }
  });
  for (const d of raceResult.allDiscoveredDubs) {
    if (d?.lang && !allDubsMap.has(d.lang)) {
      allDubsMap.set(d.lang, d);
    }
  }
  if (raceResult.success && raceResult.winner) {
    const winner = raceResult.winner;
    const mergedSources = [...winner.sources];
    const existingUrls = new Set(mergedSources.map((s) => s.url));
    if (citadelState.resolved && citadelState.resolved.sources.length > 0) {
      for (const citSrc of citadelState.resolved.sources) {
        if (citSrc?.url && !existingUrls.has(citSrc.url) && validatePlayableNxshaSource(citSrc).valid) {
          existingUrls.add(citSrc.url);
          mergedSources.push(citSrc);
        }
      }
      for (const d of citadelState.resolved.dubs) {
        if (d?.lang && !allDubsMap.has(d.lang) && mergedSources.some((s) => s.lang === d.lang)) {
          allDubsMap.set(d.lang, d);
        }
      }
    }
    if (requestedDub && requestedDub !== "orig") {
      mergedSources.sort((a, b) => {
        const aMatch = a.lang === requestedDub;
        const bMatch = b.lang === requestedDub;
        return aMatch && !bMatch ? -1 : !aMatch && bMatch ? 1 : 0;
      });
    }
    const [apiSubtitles, rawServers] = await Promise.all([
      Promise.race([
        nxshaSubsPromise,
        new Promise(
          (r) => setTimeout(() => r([]), 180)
        )
      ]),
      Promise.race([
        nxshaServersPromise,
        new Promise((r) => setTimeout(() => r([]), 180))
      ])
    ]);
    const mergedSubtitles = normalizeSubtitleTracks(winner.subtitles, apiSubtitles);
    const serverMeta = rawServers.find((s) => s.scraper === winner.provider) || defaultServerList.find((s) => s.id === winner.provider);
    return res.json({
      success: true,
      engine: "nxsha",
      resolvedServer: winner.provider,
      serverName: serverMeta?.name || winner.provider,
      sources: mergedSources,
      subtitles: mergedSubtitles,
      dubs: Array.from(allDubsMap.values()),
      activeDub: requestedDub || "orig",
      servers: rawServers.length > 0 ? rawServers.map((s, idx) => ({
        index: idx,
        id: s.scraper,
        name: s.name,
        quality: s.quality || "HD"
      })) : defaultServerList,
      diagnostics: raceResult.diagnostics
    });
  }
  if (strictSingleServer && !allowFallback) {
    return res.json({
      success: false,
      engine: "nxsha",
      provider: preferredServer,
      sources: [],
      error: raceResult.error || `No valid playable stream found on NXSHA provider ${preferredServer || "unknown"}`,
      servers: defaultServerList,
      dubs: Array.from(allDubsMap.values()),
      diagnostics: raceResult.diagnostics
    });
  }
  try {
    const details = await fetchTmdbDetailsWithFallback(mediaType, tmdbId);
    const fallbackMeta = getMediaByTmdbId(mediaType, tmdbId);
    const title = String(details?.title || details?.name || fallbackMeta?.title || "").trim();
    const releaseStr = String(
      details?.release_date || details?.first_air_date || `${fallbackMeta?.releaseYear || ""}-01-01`
    );
    const year = releaseStr.slice(0, 4);
    const fallbackRace = await raceNxshaProviders({
      providers: ["valstrax", "atlas", "ursa", "orion"],
      allowUnauthorizedProviders: true,
      concurrencyLimit: 4,
      providerTimeoutMs: 4500,
      overallTimeoutMs: 5500,
      queryProvider: async (fallbackSrv) => {
        const resolved = await resolveForServer(fallbackSrv, {
          mediaType,
          tmdbId,
          season,
          episode,
          title,
          releaseYear: year,
          date: releaseStr,
          lastAirDate: String(details?.last_air_date || ""),
          imdbId,
          dubCode: "",
          dubType: "0"
        });
        const playableLinks = Array.isArray(resolved?.links) ? resolved.links.filter((l) => l?.link && !l.onlyHevc) : [];
        return {
          sources: playableLinks.map((l) => ({
            id: `verified-${fallbackSrv}`,
            provider: fallbackSrv,
            url: l.link,
            quality: "1080p",
            label: "1080p | Original",
            type: l.type === "dash" || l.type === "andromeda" ? "dash" : "hls",
            lang: "en",
            langName: "Original"
          })),
          subtitles: [],
          dubs: Array.isArray(resolved?.dubs) ? resolved.dubs : []
        };
      }
    });
    for (const d of fallbackRace.allDiscoveredDubs) {
      if (d?.lang && !allDubsMap.has(d.lang)) {
        allDubsMap.set(d.lang, d);
      }
    }
    if (fallbackRace.success && fallbackRace.winner) {
      const apiSubtitles = await Promise.race([
        nxshaSubsPromise,
        new Promise(
          (r) => setTimeout(() => r([]), 250)
        )
      ]);
      const nonExcludedServer = defaultServerList.find((s) => !excludeSet.has(s.id)) || defaultServerList[0];
      return res.json({
        success: true,
        engine: "nxsha",
        isFallbackStream: true,
        resolvedServer: nonExcludedServer.id,
        serverName: `${nonExcludedServer.name} (Verified)`,
        sources: fallbackRace.winner.sources,
        subtitles: apiSubtitles,
        dubs: Array.from(allDubsMap.values()),
        activeDub: requestedDub || "orig",
        servers: defaultServerList,
        diagnostics: {
          ...raceResult.diagnostics,
          winningProvider: fallbackRace.winner.provider,
          timeToFirstValidSourceMs: raceResult.diagnostics.totalDiscoveryDurationMs + (fallbackRace.diagnostics.timeToFirstValidSourceMs || 0),
          providerTimings: [
            ...raceResult.diagnostics.providerTimings,
            ...fallbackRace.diagnostics.providerTimings
          ]
        }
      });
    }
  } catch {
  }
  return res.status(404).json({
    success: false,
    engine: "nxsha",
    error: "No active ad-free stream found across NXSHA providers for this title",
    servers: defaultServerList,
    dubs: Array.from(allDubsMap.values()),
    diagnostics: raceResult.diagnostics
  });
};
apiRouter.post("/nxsha/resolve", handleNxshaResolve);
apiRouter.get("/nxsha/resolve", handleNxshaResolve);
apiRouter.get("/anime/validate/:tmdbId", async (req, res) => {
  const { tmdbId } = req.params;
  const cleanId = String(tmdbId || "").trim();
  const explicitType = req.query.type === "movie" ? "movie" : req.query.type === "tv" ? "tv" : void 0;
  try {
    let details = await fetchTmdbDetailsWithFallback(explicitType || "tv", cleanId);
    if (!details || !details.title && !details.name) {
      const fallbackMeta = getMediaByTmdbId(explicitType || "tv", cleanId);
      if (fallbackMeta) {
        details = {
          id: Number(cleanId),
          title: fallbackMeta.title,
          name: fallbackMeta.title,
          original_language: "ja",
          genres: fallbackMeta.genres.map((g, i) => ({ id: i === 0 ? 16 : i + 1, name: g })),
          release_date: `${fallbackMeta.releaseYear}-01-01`,
          overview: fallbackMeta.overview
        };
      }
    }
    let validation = validateAnimeTmdbMetadata(details, explicitType);
    if (!validation.isValidAnime) {
      const altType = (explicitType || "tv") === "movie" ? "tv" : "movie";
      const altDetails = await fetchTmdbDetailsWithFallback(altType, cleanId);
      if (altDetails && (altDetails.title || altDetails.name)) {
        const altValidation = validateAnimeTmdbMetadata(altDetails, altType);
        if (altValidation.isValidAnime) {
          validation = altValidation;
        }
      }
    }
    if (!validation.isValidAnime) {
      return res.status(400).json({
        isValidAnime: false,
        isAnime: false,
        error: validation.rejectionReason,
        rejectionReason: validation.rejectionReason,
        classifiedCategory: validation.classifiedCategory,
        title: validation.title,
        genres: validation.genres,
        originalLanguage: validation.originalLanguage
      });
    }
    return res.json(validation);
  } catch (err) {
    return res.status(500).json({
      isValidAnime: false,
      isAnime: false,
      error: err.message || "Validation service error"
    });
  }
});
var handleAnimeResolve = async (req, res) => {
  const params = {
    ...req.query,
    ...req.body
  };
  try {
    const result = await resolveAnimeContent(params, {
      fetchTmdbDetailsWithFallback,
      resolveForServer
    });
    if (!result.success) {
      const isValidationRejection = result.error?.includes("Anime Core") || result.error?.includes("dedicated to Anime") || result.error?.includes("Western Animation") || result.error?.includes("Live-Action");
      return res.status(isValidationRejection ? 400 : 404).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Error resolving anime stream sources"
    });
  }
};
apiRouter.post("/anime/resolve", handleAnimeResolve);
apiRouter.get("/anime/resolve", handleAnimeResolve);
app.use("/api", apiRouter);
app.use("/api/index", apiRouter);
app.use(apiRouter);
var serverApp_default = app;
export {
  app,
  serverApp_default as default,
  detectNxshaLanguage,
  fetchTmdbDetailsWithFallback,
  nxshaDecrypt,
  nxshaEncrypt,
  resolveForServer
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
