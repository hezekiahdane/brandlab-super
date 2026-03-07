export interface Hashtag {
  id: string;
  workspace_id: string;
  hashtag: string;
  concept: string | null;
  platforms: string[];
  cached_usage_count: number | null;
  cached_at: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateHashtagRequest {
  hashtag: string;
  concept?: string;
  platforms?: string[];
}
