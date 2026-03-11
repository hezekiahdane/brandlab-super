import type { NotificationType } from './index';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string;
  draft_id: string;
  type: NotificationType;
  message: string;
  read_at: string | null;
  created_at: string;
}
