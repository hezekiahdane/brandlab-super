-- Milestone 8.5: Add soft-delete (archive) support to content_drafts
-- Adds archived_at and archived_by columns for soft-delete functionality.

ALTER TABLE public.content_drafts
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN archived_by uuid REFERENCES auth.users(id);

-- Partial index for efficiently filtering active (non-archived) drafts
CREATE INDEX idx_content_drafts_active
  ON public.content_drafts(workspace_id)
  WHERE archived_at IS NULL;
