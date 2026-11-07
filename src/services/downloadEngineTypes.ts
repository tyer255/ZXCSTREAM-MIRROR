import path from 'node:path';
import fs from 'node:fs';

export interface DownloadQualityOption {
  quality: string; // '360p' | '480p' | '720p' | '1080p' | '2160p'
  resolution: number;
  label: string;
  sizeFormatted: string;
  format: 'mp4';
  codec: string;
  downloadUrl: string;
  sourceProvider: string;
  isAuthorized: boolean;
}

export interface DownloadLanguageGroup {
  langCode: string;
  langName: string;
  flag?: string;
  qualities: DownloadQualityOption[];
}

export interface DownloadResolutionResult {
  success: boolean;
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  title: string;
  year?: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  languages: DownloadLanguageGroup[];
  hasDirectDownload: boolean;
  unsupportedReason?: string;
}

export const LANGUAGE_NAME_MAP: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  ml: 'Malayalam',
  kn: 'Kannada',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  id: 'Indonesian',
  tl: 'Tagalog',
  zh: 'Chinese',
  ar: 'Arabic',
  tr: 'Turkish',
  th: 'Thai',
  vi: 'Vietnamese',
};

/**
 * Maps standard quality height to appropriate file sizes and metadata
 */
export function estimateMediaSize(durationSeconds: number, quality: string): string {
  const mins = Math.max(1, durationSeconds / 60);
  switch (quality) {
    case '2160p':
      return `${(mins * 0.08).toFixed(2)} GB`;
    case '1080p':
      return `${(mins * 0.022).toFixed(2)} GB`;
    case '720p':
      return `${Math.round(mins * 11.5)} MB`;
    case '480p':
      return `${Math.round(mins * 6.2)} MB`;
    case '360p':
      return `${Math.round(mins * 3.8)} MB`;
    default:
      return `${(mins * 0.02).toFixed(2)} GB`;
  }
}

/**
 * Builds the secure, authenticated download URL for our streaming proxy backend
 */
export function buildDownloadProxyUrl(params: {
  mediaType: 'movie' | 'tv';
  tmdbId: string;
  season?: number;
  episode?: number;
  lang: string;
  quality: string;
  title: string;
  rawUrl?: string;
}): string {
  const qs = new URLSearchParams({
    mediaType: params.mediaType,
    tmdbId: params.tmdbId,
    lang: params.lang,
    quality: params.quality,
    title: params.title,
  });
  if (params.mediaType === 'tv') {
    qs.set('season', String(params.season || 1));
    qs.set('episode', String(params.episode || 1));
  }
  if (params.rawUrl) {
    qs.set('sourceUrl', params.rawUrl);
  }
  return `/api/download/file?${qs.toString()}`;
}
