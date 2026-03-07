import type { AssetFileType, AssetSource } from './index';

export interface DraftAsset {
  id: string;
  draft_id: string;
  workspace_id: string;
  storage_path: string;
  cdn_url: string;
  file_type: AssetFileType;
  source: AssetSource;
  tags: string[] | null;
  platform_target: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface UpdateAssetRequest {
  tags?: string[];
}
