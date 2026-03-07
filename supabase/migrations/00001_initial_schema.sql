-- =============================================================================
-- Brandlab Super MVP -- Initial Database Schema
-- Milestone 2: Database Schema & RLS Policies
--
-- All tables use UUIDs as primary keys, timestamptz (UTC) for timestamps,
-- and have Row-Level Security (RLS) enabled.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Trigger function (no table dependencies)
-- ---------------------------------------------------------------------------

-- Trigger function: auto-set updated_at = now() on row update.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. workspaces
-- ---------------------------------------------------------------------------

CREATE TABLE public.workspaces (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  logo_url    text,
  brand_color text,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can create a workspace (they become its manager).
CREATE POLICY "workspaces_insert_authenticated"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- 2. workspace_members
-- ---------------------------------------------------------------------------

CREATE TABLE public.workspace_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id),
  role         text        NOT NULL CHECK (role IN ('manager', 'copy_assignee', 'creatives_assignee')),
  invited_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2a. Helper functions (depend on workspace_members)
-- ---------------------------------------------------------------------------

-- Check if the current authenticated user is a member of a given workspace.
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$;

-- Check if the current authenticated user is a manager of a given workspace.
CREATE OR REPLACE FUNCTION public.is_workspace_manager(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = 'manager'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2b. RLS policies for workspaces (depend on helper functions)
-- ---------------------------------------------------------------------------

-- Members can read workspaces they belong to.
CREATE POLICY "workspaces_select_member"
  ON public.workspaces
  FOR SELECT
  USING (public.is_workspace_member(id));

-- Only managers can update their workspace.
CREATE POLICY "workspaces_update_manager"
  ON public.workspaces
  FOR UPDATE
  USING (public.is_workspace_manager(id))
  WITH CHECK (public.is_workspace_manager(id));

-- ---------------------------------------------------------------------------
-- 2c. RLS policies for workspace_members (depend on helper functions)
-- ---------------------------------------------------------------------------

-- Members can see other members of workspaces they belong to.
CREATE POLICY "workspace_members_select_member"
  ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Only managers can insert new members (invite).
CREATE POLICY "workspace_members_insert_manager"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (public.is_workspace_manager(workspace_id));

-- Only managers can update members (e.g. change role).
CREATE POLICY "workspace_members_update_manager"
  ON public.workspace_members
  FOR UPDATE
  USING (public.is_workspace_manager(workspace_id))
  WITH CHECK (public.is_workspace_manager(workspace_id));

-- Only managers can remove members.
CREATE POLICY "workspace_members_delete_manager"
  ON public.workspace_members
  FOR DELETE
  USING (public.is_workspace_manager(workspace_id));

-- ---------------------------------------------------------------------------
-- 3. social_connections
-- ---------------------------------------------------------------------------

CREATE TABLE public.social_connections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform              text        NOT NULL CHECK (platform IN (
                                      'facebook', 'instagram', 'tiktok',
                                      'linkedin', 'threads', 'x', 'youtube'
                                    )),
  account_name          text        NOT NULL,
  account_id            text        NOT NULL,
  ayrshare_profile_key  text        NOT NULL,
  access_token_enc      text        NOT NULL,
  refresh_token_enc     text,
  token_expires_at      timestamptz,
  is_default            boolean     NOT NULL DEFAULT false,
  connected_at          timestamptz NOT NULL DEFAULT now(),
  revoked_at            timestamptz
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- All workspace members can read connections.
CREATE POLICY "social_connections_select_member"
  ON public.social_connections
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Only managers can create connections.
CREATE POLICY "social_connections_insert_manager"
  ON public.social_connections
  FOR INSERT
  WITH CHECK (public.is_workspace_manager(workspace_id));

-- Only managers can update connections.
CREATE POLICY "social_connections_update_manager"
  ON public.social_connections
  FOR UPDATE
  USING (public.is_workspace_manager(workspace_id))
  WITH CHECK (public.is_workspace_manager(workspace_id));

-- Only managers can delete connections.
CREATE POLICY "social_connections_delete_manager"
  ON public.social_connections
  FOR DELETE
  USING (public.is_workspace_manager(workspace_id));

-- ---------------------------------------------------------------------------
-- 4. content_drafts
-- ---------------------------------------------------------------------------

CREATE TABLE public.content_drafts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title                  text        NOT NULL,
  status                 text        NOT NULL CHECK (status IN (
                                       'idea', 'copy_for_review', 'copy_revision',
                                       'for_creatives', 'creatives_for_review',
                                       'creatives_revision', 'for_scheduling', 'scheduled'
                                     )),
  master_caption         text,
  platform_overrides     jsonb,
  target_platforms       text[]      NOT NULL DEFAULT '{}',
  publish_at             timestamptz,
  published_at           timestamptz,
  copy_assignee_id       uuid        REFERENCES auth.users(id),
  creatives_assignee_id  uuid        REFERENCES auth.users(id),
  manager_id             uuid        NOT NULL REFERENCES auth.users(id),
  public_share_token     uuid        UNIQUE,
  share_token_expires_at timestamptz,
  ayrshare_post_id       text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

-- Attach the updated_at trigger.
CREATE TRIGGER content_drafts_set_updated_at
  BEFORE UPDATE ON public.content_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- All workspace members can read drafts.
CREATE POLICY "content_drafts_select_member"
  ON public.content_drafts
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Any workspace member can create drafts.
CREATE POLICY "content_drafts_insert_member"
  ON public.content_drafts
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Any workspace member can update drafts (status transition logic enforced at API layer).
CREATE POLICY "content_drafts_update_member"
  ON public.content_drafts
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- 5. draft_assets
-- ---------------------------------------------------------------------------

CREATE TABLE public.draft_assets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        uuid        NOT NULL REFERENCES public.content_drafts(id) ON DELETE CASCADE,
  workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  storage_path    text        NOT NULL,
  cdn_url         text        NOT NULL,
  file_type       text        NOT NULL CHECK (file_type IN ('image', 'video', 'thumbnail')),
  source          text        NOT NULL CHECK (source IN ('upload', 'google_drive', 'canva')),
  tags            text[],
  platform_target text,
  uploaded_by     uuid        NOT NULL REFERENCES auth.users(id),
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.draft_assets ENABLE ROW LEVEL SECURITY;

-- All workspace members can read assets.
CREATE POLICY "draft_assets_select_member"
  ON public.draft_assets
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Any workspace member can insert assets.
CREATE POLICY "draft_assets_insert_member"
  ON public.draft_assets
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Any workspace member can update assets.
CREATE POLICY "draft_assets_update_member"
  ON public.draft_assets
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- 6. hashtag_bank
-- ---------------------------------------------------------------------------

CREATE TABLE public.hashtag_bank (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  hashtag            text        NOT NULL,
  concept            text,
  platforms          text[]      NOT NULL DEFAULT '{}',
  cached_usage_count integer,
  cached_at          timestamptz,
  created_by         uuid        NOT NULL REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hashtag_bank ENABLE ROW LEVEL SECURITY;

-- All workspace members can read hashtags.
CREATE POLICY "hashtag_bank_select_member"
  ON public.hashtag_bank
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- Any workspace member can insert hashtags.
CREATE POLICY "hashtag_bank_insert_member"
  ON public.hashtag_bank
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Only managers can delete hashtags.
CREATE POLICY "hashtag_bank_delete_manager"
  ON public.hashtag_bank
  FOR DELETE
  USING (public.is_workspace_manager(workspace_id));

-- ---------------------------------------------------------------------------
-- 7. comments
-- ---------------------------------------------------------------------------

CREATE TABLE public.comments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id        uuid        NOT NULL REFERENCES public.content_drafts(id) ON DELETE CASCADE,
  workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type            text        NOT NULL CHECK (type IN ('internal', 'external')),
  author_user_id  uuid        REFERENCES auth.users(id),
  external_name   text,
  body            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Workspace members can read internal comments on drafts in their workspace.
CREATE POLICY "comments_select_internal_member"
  ON public.comments
  FOR SELECT
  USING (
    type = 'internal'
    AND public.is_workspace_member(workspace_id)
  );

-- External comments are readable without auth via a valid, non-expired share token.
-- This policy allows anyone (including anon) to read external comments on drafts
-- that have an active public share token.
CREATE POLICY "comments_select_external_share"
  ON public.comments
  FOR SELECT
  USING (
    type = 'external'
    AND EXISTS (
      SELECT 1
      FROM public.content_drafts cd
      WHERE cd.id = draft_id
        AND cd.public_share_token IS NOT NULL
        AND (cd.share_token_expires_at IS NULL OR cd.share_token_expires_at > now())
    )
  );

-- Workspace members can also read external comments (they are team members after all).
CREATE POLICY "comments_select_external_member"
  ON public.comments
  FOR SELECT
  USING (
    type = 'external'
    AND public.is_workspace_member(workspace_id)
  );

-- Workspace members can insert internal comments.
CREATE POLICY "comments_insert_internal_member"
  ON public.comments
  FOR INSERT
  WITH CHECK (
    type = 'internal'
    AND public.is_workspace_member(workspace_id)
    AND author_user_id = auth.uid()
  );

-- External comments can be inserted without auth (via share token validation).
-- The API layer validates the share token and inserts via service role,
-- but this policy allows anon insertion of external comments on valid share-token drafts.
CREATE POLICY "comments_insert_external_share"
  ON public.comments
  FOR INSERT
  WITH CHECK (
    type = 'external'
    AND author_user_id IS NULL
    AND external_name IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.content_drafts cd
      WHERE cd.id = draft_id
        AND cd.public_share_token IS NOT NULL
        AND (cd.share_token_expires_at IS NULL OR cd.share_token_expires_at > now())
    )
  );

-- ---------------------------------------------------------------------------
-- 8. notifications
-- ---------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  draft_id     uuid        NOT NULL REFERENCES public.content_drafts(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN (
                              'status_change', 'external_comment',
                              'mention', 'token_expiry', 'publish_failure'
                            )),
  message      text        NOT NULL,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications.
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only update their own notifications (e.g. mark as read).
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications are inserted by server-side triggers / service role.
-- No direct user insert policy needed; the trigger function runs as SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- 9. heatmap_cache
-- ---------------------------------------------------------------------------

CREATE TABLE public.heatmap_cache (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform     text        NOT NULL,
  day_of_week  integer     NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_utc     integer     NOT NULL CHECK (hour_utc >= 0 AND hour_utc <= 23),
  score        float       NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.heatmap_cache ENABLE ROW LEVEL SECURITY;

-- All workspace members can read heatmap data.
CREATE POLICY "heatmap_cache_select_member"
  ON public.heatmap_cache
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- 10. Indexes for common query patterns
-- ---------------------------------------------------------------------------

-- workspace_members: fast lookup by user_id (list workspaces a user belongs to)
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);

-- workspace_members: fast lookup by workspace_id (list members of a workspace)
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- content_drafts: filter by workspace + status (drafts list page)
CREATE INDEX idx_content_drafts_workspace_status ON public.content_drafts(workspace_id, status);

-- content_drafts: calendar queries by workspace + publish_at date range
CREATE INDEX idx_content_drafts_workspace_publish_at ON public.content_drafts(workspace_id, publish_at);

-- content_drafts: lookup by share token (public share page)
CREATE INDEX idx_content_drafts_share_token ON public.content_drafts(public_share_token)
  WHERE public_share_token IS NOT NULL;

-- draft_assets: fetch assets for a given draft
CREATE INDEX idx_draft_assets_draft_id ON public.draft_assets(draft_id);

-- comments: fetch comments for a given draft
CREATE INDEX idx_comments_draft_id ON public.comments(draft_id);

-- notifications: fetch unread notifications for a user
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- heatmap_cache: lookup by workspace + platform
CREATE INDEX idx_heatmap_cache_workspace_platform ON public.heatmap_cache(workspace_id, platform);

-- social_connections: lookup by workspace
CREATE INDEX idx_social_connections_workspace_id ON public.social_connections(workspace_id);

-- hashtag_bank: lookup by workspace
CREATE INDEX idx_hashtag_bank_workspace_id ON public.hashtag_bank(workspace_id);
