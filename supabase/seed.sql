-- =============================================================================
-- Brandlab Super — Seed Data for Development
-- Run after the initial migration to populate test data.
--
-- NOTE: This seed creates workspace data but does NOT create auth users.
-- Create test users via the Supabase dashboard or sign-up flow first,
-- then update the UUIDs below to match your test user IDs.
-- =============================================================================

-- Placeholder user IDs — replace with actual auth.users UUIDs after sign-up
-- User 1: Manager (e.g., kim@brandlab.com)
-- User 2: Copy Assignee (e.g., writer@brandlab.com)
-- User 3: Creatives Assignee (e.g., designer@brandlab.com)

-- We'll use a DO block so we can reference variables
DO $$
DECLARE
  -- Replace these with real user UUIDs after creating test accounts
  manager_id uuid := '00000000-0000-0000-0000-000000000001';
  copy_id uuid := '00000000-0000-0000-0000-000000000002';
  creative_id uuid := '00000000-0000-0000-0000-000000000003';
  ws1_id uuid;
  ws2_id uuid;
  draft1_id uuid;
  draft2_id uuid;
  draft3_id uuid;
BEGIN
  -- =========================================================================
  -- Workspaces
  -- =========================================================================
  INSERT INTO public.workspaces (name, slug, brand_color, created_by)
  VALUES ('Acme Corp', 'acme-corp', '#3B82F6', manager_id)
  RETURNING id INTO ws1_id;

  INSERT INTO public.workspaces (name, slug, brand_color, created_by)
  VALUES ('Sunrise Cafe', 'sunrise-cafe', '#F59E0B', manager_id)
  RETURNING id INTO ws2_id;

  -- =========================================================================
  -- Workspace Members
  -- =========================================================================
  INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_at, accepted_at) VALUES
    (ws1_id, manager_id, 'manager', now(), now()),
    (ws1_id, copy_id, 'copy_assignee', now(), now()),
    (ws1_id, creative_id, 'creatives_assignee', now(), now()),
    (ws2_id, manager_id, 'manager', now(), now());

  -- =========================================================================
  -- Content Drafts (Acme Corp workspace)
  -- =========================================================================
  INSERT INTO public.content_drafts (workspace_id, title, status, master_caption, target_platforms, copy_assignee_id, creatives_assignee_id, manager_id, publish_at)
  VALUES (ws1_id, 'Summer Product Launch', 'idea', 'Introducing our latest summer collection!', ARRAY['instagram','facebook'], copy_id, creative_id, manager_id, now() + interval '7 days')
  RETURNING id INTO draft1_id;

  INSERT INTO public.content_drafts (workspace_id, title, status, master_caption, target_platforms, copy_assignee_id, creatives_assignee_id, manager_id, publish_at)
  VALUES (ws1_id, 'Behind the Scenes', 'copy_for_review', 'Take a peek behind the curtain...', ARRAY['instagram','tiktok'], copy_id, creative_id, manager_id, now() + interval '10 days')
  RETURNING id INTO draft2_id;

  INSERT INTO public.content_drafts (workspace_id, title, status, master_caption, target_platforms, copy_assignee_id, creatives_assignee_id, manager_id, publish_at)
  VALUES (ws1_id, 'Customer Spotlight', 'for_scheduling', 'Meet our amazing customer @spotlight', ARRAY['linkedin','x'], copy_id, creative_id, manager_id, now() + interval '3 days')
  RETURNING id INTO draft3_id;

  -- =========================================================================
  -- Comments
  -- =========================================================================
  INSERT INTO public.comments (draft_id, workspace_id, type, author_user_id, body) VALUES
    (draft2_id, ws1_id, 'internal', copy_id, 'Caption is ready for review. Let me know if the tone works.'),
    (draft2_id, ws1_id, 'internal', manager_id, 'Looks great! Approved for creatives.');

  -- =========================================================================
  -- Hashtag Bank (Acme Corp workspace)
  -- =========================================================================
  INSERT INTO public.hashtag_bank (workspace_id, hashtag, concept, platforms, created_by) VALUES
    (ws1_id, 'AcmeCorp', 'Brand', ARRAY['instagram','facebook','linkedin'], manager_id),
    (ws1_id, 'SummerVibes', 'Summer Campaign', ARRAY['instagram','tiktok'], copy_id),
    (ws1_id, 'BehindTheScenes', 'Engagement', ARRAY['instagram','tiktok'], copy_id),
    (ws1_id, 'NewProduct', 'Product Launch', ARRAY['instagram','facebook','x'], manager_id);

  -- =========================================================================
  -- Heatmap Cache (industry averages for Acme Corp)
  -- =========================================================================
  -- Instagram best times (simplified: weekdays 11am-1pm, 7pm-9pm)
  INSERT INTO public.heatmap_cache (workspace_id, platform, day_of_week, hour_utc, score, refreshed_at)
  SELECT ws1_id, 'instagram', d, h,
    CASE
      WHEN d BETWEEN 1 AND 5 AND h BETWEEN 11 AND 13 THEN 0.8 + random() * 0.2
      WHEN d BETWEEN 1 AND 5 AND h BETWEEN 19 AND 21 THEN 0.7 + random() * 0.2
      WHEN d IN (0, 6) AND h BETWEEN 10 AND 14 THEN 0.6 + random() * 0.2
      ELSE 0.1 + random() * 0.3
    END,
    now()
  FROM generate_series(0, 6) AS d, generate_series(0, 23) AS h;

  -- Facebook best times
  INSERT INTO public.heatmap_cache (workspace_id, platform, day_of_week, hour_utc, score, refreshed_at)
  SELECT ws1_id, 'facebook', d, h,
    CASE
      WHEN d BETWEEN 1 AND 5 AND h BETWEEN 9 AND 11 THEN 0.75 + random() * 0.2
      WHEN d BETWEEN 1 AND 5 AND h BETWEEN 13 AND 15 THEN 0.7 + random() * 0.2
      ELSE 0.1 + random() * 0.3
    END,
    now()
  FROM generate_series(0, 6) AS d, generate_series(0, 23) AS h;

END $$;
