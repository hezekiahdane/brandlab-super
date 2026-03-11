import type { SocialPlatform } from './index';

export interface SocialConnection {
  id: string;
  workspace_id: string;
  platform: SocialPlatform;
  account_name: string;
  account_id: string;
  ayrshare_profile_key: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  is_default: boolean;
  connected_at: string;
  revoked_at: string | null;
}
