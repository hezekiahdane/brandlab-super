import type { CommentType } from './index';

export interface Comment {
  id: string;
  draft_id: string;
  workspace_id: string;
  type: CommentType;
  author_user_id: string | null;
  external_name: string | null;
  body: string;
  created_at: string;
  /** Denormalized from workspace_members join — not stored in DB */
  author_email?: string;
}

export interface CreateCommentRequest {
  body: string;
}
