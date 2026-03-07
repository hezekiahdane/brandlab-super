-- Milestone 4: Status change notification trigger
-- Fires AFTER UPDATE on content_drafts when status changes.
-- Inserts notification rows per the trigger matrix.

CREATE OR REPLACE FUNCTION handle_status_change_notification()
RETURNS TRIGGER AS $$
DECLARE
  _member record;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'copy_for_review' THEN
      -- Notify manager
      IF NEW.manager_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.manager_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" is ready for copy review.');
      END IF;

    WHEN 'copy_revision' THEN
      -- Notify copy assignee
      IF NEW.copy_assignee_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.copy_assignee_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" requires copy revision.');
      END IF;

    WHEN 'for_creatives' THEN
      -- Notify creatives assignee
      IF NEW.creatives_assignee_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.creatives_assignee_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" is ready for creatives.');
      END IF;

    WHEN 'creatives_for_review' THEN
      -- Notify manager
      IF NEW.manager_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.manager_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" creatives are ready for review.');
      END IF;

    WHEN 'creatives_revision' THEN
      -- Notify creatives assignee
      IF NEW.creatives_assignee_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.creatives_assignee_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" requires creative revision.');
      END IF;

    WHEN 'for_scheduling' THEN
      -- Notify copy assignee + creatives assignee
      IF NEW.copy_assignee_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.copy_assignee_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" is approved and ready for scheduling.');
      END IF;
      IF NEW.creatives_assignee_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (NEW.creatives_assignee_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" is approved and ready for scheduling.');
      END IF;

    WHEN 'scheduled' THEN
      -- Notify ALL workspace members
      FOR _member IN
        SELECT user_id FROM workspace_members
        WHERE workspace_id = NEW.workspace_id AND accepted_at IS NOT NULL
      LOOP
        INSERT INTO notifications (user_id, workspace_id, draft_id, type, message)
        VALUES (_member.user_id, NEW.workspace_id, NEW.id, 'status_change',
          'Draft "' || NEW.title || '" has been scheduled.');
      END LOOP;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_status_change_notification ON content_drafts;
CREATE TRIGGER trg_status_change_notification
  AFTER UPDATE ON content_drafts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION handle_status_change_notification();
