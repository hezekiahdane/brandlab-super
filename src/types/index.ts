// Brandlab Super — shared TypeScript types
// This file re-exports all types used across the application.

export type UserRole = 'manager' | 'copy_assignee' | 'creatives_assignee';

export type ContentStatus =
  | 'idea'
  | 'copy_for_review'
  | 'copy_revision'
  | 'for_creatives'
  | 'creatives_for_review'
  | 'creatives_revision'
  | 'for_scheduling'
  | 'scheduled';

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'threads'
  | 'x'
  | 'youtube';

export type NotificationType =
  | 'status_change'
  | 'external_comment'
  | 'mention'
  | 'token_expiry'
  | 'publish_failure';

export type AssetFileType = 'image' | 'video' | 'thumbnail';

export type AssetSource = 'upload' | 'google_drive' | 'canva';

export type CommentType = 'internal' | 'external';
