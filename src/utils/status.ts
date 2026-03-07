import type { ContentStatus, UserRole } from '@/types';
import type { ContentDraft } from '@/types/draft';

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: 'Idea',
  copy_for_review: 'Copy for Review',
  copy_revision: 'Copy Revision',
  for_creatives: 'For Creatives',
  creatives_for_review: 'Creatives for Review',
  creatives_revision: 'Creatives Revision',
  for_scheduling: 'For Scheduling',
  scheduled: 'Scheduled',
};

export const STATUS_COLORS: Record<ContentStatus, { bg: string; text: string }> = {
  idea: { bg: 'bg-slate-100', text: 'text-slate-700' },
  copy_for_review: { bg: 'bg-purple-100', text: 'text-purple-700' },
  copy_revision: { bg: 'bg-red-100', text: 'text-red-700' },
  for_creatives: { bg: 'bg-blue-100', text: 'text-blue-700' },
  creatives_for_review: { bg: 'bg-pink-100', text: 'text-pink-700' },
  creatives_revision: { bg: 'bg-orange-100', text: 'text-orange-700' },
  for_scheduling: { bg: 'bg-amber-100', text: 'text-amber-700' },
  scheduled: { bg: 'bg-green-100', text: 'text-green-700' },
};

interface TransitionRule {
  to: ContentStatus;
  allowedRoles: UserRole[];
  /** If set, the user must be the assignee in this draft field */
  roleField?: 'copy_assignee_id' | 'creatives_assignee_id';
}

export const VALID_TRANSITIONS: Record<ContentStatus, TransitionRule[]> = {
  idea: [
    { to: 'copy_for_review', allowedRoles: ['manager', 'copy_assignee', 'creatives_assignee'] },
  ],
  copy_for_review: [
    { to: 'copy_revision', allowedRoles: ['manager'] },
    { to: 'for_creatives', allowedRoles: ['manager'] },
  ],
  copy_revision: [
    { to: 'copy_for_review', allowedRoles: ['copy_assignee'], roleField: 'copy_assignee_id' },
  ],
  for_creatives: [
    { to: 'creatives_for_review', allowedRoles: ['creatives_assignee'], roleField: 'creatives_assignee_id' },
  ],
  creatives_for_review: [
    { to: 'creatives_revision', allowedRoles: ['manager'] },
    { to: 'for_scheduling', allowedRoles: ['manager'] },
  ],
  creatives_revision: [
    { to: 'creatives_for_review', allowedRoles: ['creatives_assignee'], roleField: 'creatives_assignee_id' },
  ],
  for_scheduling: [
    { to: 'scheduled', allowedRoles: ['manager'] },
  ],
  scheduled: [],
};

/** Button labels for the status action bar */
export const TRANSITION_LABELS: Record<string, { label: string; variant: 'default' | 'destructive' }> = {
  'idea->copy_for_review': { label: 'Submit for Review', variant: 'default' },
  'copy_for_review->copy_revision': { label: 'Request Revision', variant: 'destructive' },
  'copy_for_review->for_creatives': { label: 'Approve Copy', variant: 'default' },
  'copy_revision->copy_for_review': { label: 'Resubmit Copy', variant: 'default' },
  'for_creatives->creatives_for_review': { label: 'Submit Creatives', variant: 'default' },
  'creatives_for_review->creatives_revision': { label: 'Request Revision', variant: 'destructive' },
  'creatives_for_review->for_scheduling': { label: 'Approve Creatives', variant: 'default' },
  'creatives_revision->creatives_for_review': { label: 'Resubmit Creatives', variant: 'default' },
  'for_scheduling->scheduled': { label: 'Schedule', variant: 'default' },
};

export function getValidTransitions(
  currentStatus: ContentStatus,
  userRole: UserRole,
  userId: string,
  draft: ContentDraft
): ContentStatus[] {
  const rules = VALID_TRANSITIONS[currentStatus] || [];
  return rules
    .filter((rule) => {
      if (!rule.allowedRoles.includes(userRole)) return false;
      if (rule.roleField && draft[rule.roleField] !== userId) return false;
      return true;
    })
    .map((rule) => rule.to);
}

export function canTransition(
  currentStatus: ContentStatus,
  newStatus: ContentStatus,
  userRole: UserRole,
  userId: string,
  draft: ContentDraft
): boolean {
  return getValidTransitions(currentStatus, userRole, userId, draft).includes(newStatus);
}

export const ALL_STATUSES: ContentStatus[] = [
  'idea',
  'copy_for_review',
  'copy_revision',
  'for_creatives',
  'creatives_for_review',
  'creatives_revision',
  'for_scheduling',
  'scheduled',
];
