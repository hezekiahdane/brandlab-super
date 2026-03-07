import type { UserRole } from './index';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  created_by: string;
  created_at: string;
  archived_at: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  invited_at: string;
  accepted_at: string | null;
}

export interface WorkspaceMemberWithEmail extends WorkspaceMember {
  email: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  logo_url?: string;
  brand_color?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  logo_url?: string | null;
  brand_color?: string | null;
  archived_at?: string | null;
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

export interface UpdateMemberRequest {
  role: UserRole;
}
