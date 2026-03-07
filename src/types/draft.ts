import type { ContentStatus, SocialPlatform } from './index';

export interface ContentDraft {
  id: string;
  workspace_id: string;
  title: string;
  status: ContentStatus;
  master_caption: string | null;
  platform_overrides: Record<string, string> | null;
  target_platforms: SocialPlatform[];
  publish_at: string | null;
  published_at: string | null;
  copy_assignee_id: string | null;
  creatives_assignee_id: string | null;
  manager_id: string;
  public_share_token: string | null;
  share_token_expires_at: string | null;
  ayrshare_post_id: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDraftRequest {
  title: string;
  target_platforms?: SocialPlatform[];
  publish_at?: string;
  copy_assignee_id?: string;
  creatives_assignee_id?: string;
}

export interface UpdateDraftRequest {
  title?: string;
  master_caption?: string | null;
  platform_overrides?: Record<string, string> | null;
  target_platforms?: SocialPlatform[];
  publish_at?: string | null;
  copy_assignee_id?: string | null;
  creatives_assignee_id?: string | null;
}

export interface StatusTransitionRequest {
  new_status: ContentStatus;
}
