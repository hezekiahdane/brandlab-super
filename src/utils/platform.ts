import type { SocialPlatform } from '@/types';

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  threads: 'Threads',
  youtube: 'YouTube',
};

export const PLATFORM_CHAR_LIMITS: Record<SocialPlatform, number> = {
  instagram: 2200,
  x: 280,
  facebook: 63206,
  tiktok: 2200,
  linkedin: 3000,
  threads: 500,
  youtube: 5000,
};

export const PLATFORM_ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'x',
  'tiktok',
  'linkedin',
  'threads',
  'youtube',
];
