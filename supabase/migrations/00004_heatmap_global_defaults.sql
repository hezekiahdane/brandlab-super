-- Allow NULL workspace_id for global default heatmap data
ALTER TABLE public.heatmap_cache ALTER COLUMN workspace_id DROP NOT NULL;

-- Add RLS policy for reading global defaults (workspace_id IS NULL)
CREATE POLICY "heatmap_cache_select_global"
  ON public.heatmap_cache
  FOR SELECT
  USING (workspace_id IS NULL);

-- Seed global default engagement heatmap data
-- 7 platforms × 7 days × 24 hours = 1,176 rows
-- Score 0.0 – 1.0 representing relative engagement level
-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
-- hour_utc: 0–23

-- Helper function to batch-insert heatmap rows
DO $$
DECLARE
  p_platform text;
  p_day integer;
  p_hour integer;
  p_score float;
  -- Peak hours per platform (approximate industry averages)
  -- We'll calculate score based on day+hour patterns
BEGIN
  FOR p_platform IN SELECT unnest(ARRAY['instagram','facebook','x','tiktok','linkedin','threads','youtube'])
  LOOP
    FOR p_day IN 0..6 LOOP
      FOR p_hour IN 0..23 LOOP
        -- Base score: low
        p_score := 0.10;

        -- ---- INSTAGRAM ----
        IF p_platform = 'instagram' THEN
          -- Weekdays slightly better than weekends
          IF p_day BETWEEN 1 AND 5 THEN p_score := 0.15; END IF;
          -- Morning bump 7-9am
          IF p_hour BETWEEN 7 AND 9 THEN p_score := p_score + 0.15; END IF;
          -- Lunch peak 11am-1pm
          IF p_hour BETWEEN 11 AND 13 THEN p_score := p_score + 0.35; END IF;
          -- Evening peak 7-9pm
          IF p_hour BETWEEN 19 AND 21 THEN p_score := p_score + 0.35; END IF;
          -- Wednesday & Thursday are best days
          IF p_day IN (3, 4) THEN p_score := p_score + 0.10; END IF;

        -- ---- FACEBOOK ----
        ELSIF p_platform = 'facebook' THEN
          IF p_day BETWEEN 1 AND 5 THEN p_score := 0.15; END IF;
          -- Afternoon peak 1-4pm
          IF p_hour BETWEEN 13 AND 16 THEN p_score := p_score + 0.40; END IF;
          -- Late morning 10am-12pm
          IF p_hour BETWEEN 10 AND 12 THEN p_score := p_score + 0.20; END IF;
          -- Wednesday is peak day
          IF p_day = 3 THEN p_score := p_score + 0.10; END IF;
          -- Weekend dip
          IF p_day IN (0, 6) THEN p_score := p_score * 0.80; END IF;

        -- ---- X (TWITTER) ----
        ELSIF p_platform = 'x' THEN
          IF p_day BETWEEN 1 AND 5 THEN p_score := 0.15; END IF;
          -- Morning peak 8-10am
          IF p_hour BETWEEN 8 AND 10 THEN p_score := p_score + 0.35; END IF;
          -- Afternoon 12-1pm
          IF p_hour BETWEEN 12 AND 13 THEN p_score := p_score + 0.25; END IF;
          -- Evening 5-6pm
          IF p_hour BETWEEN 17 AND 18 THEN p_score := p_score + 0.30; END IF;
          -- Tuesday-Thursday best
          IF p_day BETWEEN 2 AND 4 THEN p_score := p_score + 0.10; END IF;

        -- ---- TIKTOK ----
        ELSIF p_platform = 'tiktok' THEN
          -- TikTok has strong evening/night usage
          IF p_hour BETWEEN 19 AND 21 THEN p_score := p_score + 0.40; END IF;
          -- Late night 10-11pm
          IF p_hour BETWEEN 22 AND 23 THEN p_score := p_score + 0.30; END IF;
          -- Lunch 12-1pm
          IF p_hour BETWEEN 12 AND 13 THEN p_score := p_score + 0.20; END IF;
          -- Tuesday-Thursday
          IF p_day BETWEEN 2 AND 4 THEN p_score := p_score + 0.10; END IF;
          -- Weekends also good
          IF p_day IN (0, 6) THEN p_score := p_score + 0.05; END IF;

        -- ---- LINKEDIN ----
        ELSIF p_platform = 'linkedin' THEN
          -- Strictly weekday platform
          IF p_day BETWEEN 1 AND 5 THEN
            p_score := 0.20;
            -- Early morning 7-8am
            IF p_hour BETWEEN 7 AND 8 THEN p_score := p_score + 0.35; END IF;
            -- Lunch 12pm
            IF p_hour = 12 THEN p_score := p_score + 0.25; END IF;
            -- End of workday 5-6pm
            IF p_hour BETWEEN 17 AND 18 THEN p_score := p_score + 0.30; END IF;
            -- Tuesday-Thursday best
            IF p_day BETWEEN 2 AND 4 THEN p_score := p_score + 0.10; END IF;
          ELSE
            -- Weekends very low
            p_score := 0.05;
          END IF;

        -- ---- THREADS ----
        ELSIF p_platform = 'threads' THEN
          -- Similar to Instagram patterns
          IF p_day BETWEEN 1 AND 5 THEN p_score := 0.15; END IF;
          IF p_hour BETWEEN 7 AND 9 THEN p_score := p_score + 0.15; END IF;
          IF p_hour BETWEEN 11 AND 13 THEN p_score := p_score + 0.30; END IF;
          IF p_hour BETWEEN 19 AND 21 THEN p_score := p_score + 0.30; END IF;
          IF p_day IN (3, 4) THEN p_score := p_score + 0.10; END IF;

        -- ---- YOUTUBE ----
        ELSIF p_platform = 'youtube' THEN
          -- Afternoon 2-4pm
          IF p_hour BETWEEN 14 AND 16 THEN p_score := p_score + 0.30; END IF;
          -- Evening 7-9pm
          IF p_hour BETWEEN 19 AND 21 THEN p_score := p_score + 0.35; END IF;
          -- Friday-Saturday evenings
          IF p_day IN (5, 6) AND p_hour BETWEEN 19 AND 23 THEN p_score := p_score + 0.10; END IF;
          -- Weekday afternoons
          IF p_day BETWEEN 1 AND 5 THEN p_score := p_score + 0.05; END IF;
        END IF;

        -- Clamp to 0.0–1.0
        IF p_score > 1.0 THEN p_score := 1.0; END IF;
        IF p_score < 0.0 THEN p_score := 0.0; END IF;

        INSERT INTO public.heatmap_cache (workspace_id, platform, day_of_week, hour_utc, score)
        VALUES (NULL, p_platform, p_day, p_hour, ROUND(p_score::numeric, 2));
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
