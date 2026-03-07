import type { ContentStatus } from '@/types';

/**
 * Status-to-color mapping for calendar event tiles.
 * Uses hex colors compatible with react-big-calendar inline styles.
 */
export const STATUS_EVENT_COLORS: Record<ContentStatus, { bg: string; border: string; text: string }> = {
  idea: { bg: '#f1f5f9', border: '#94a3b8', text: '#334155' },
  copy_for_review: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  copy_revision: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  for_creatives: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  creatives_for_review: { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  creatives_revision: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  for_scheduling: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  scheduled: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
};
