'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getValidTransitions, TRANSITION_LABELS, STATUS_LABELS } from '@/utils/status';
import { PLATFORM_CHAR_LIMITS } from '@/utils/platform';
import type { ContentDraft, ContentStatus, UserRole, SocialPlatform } from '@/types';

interface StatusActionBarProps {
  draft: ContentDraft;
  userRole: UserRole;
  userId: string;
  workspaceId: string;
  onStatusChange: (newDraft: ContentDraft) => void;
}

export function StatusActionBar({
  draft,
  userRole,
  userId,
  workspaceId,
  onStatusChange,
}: StatusActionBarProps) {
  const [loading, setLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ContentStatus | null>(null);
  const [error, setError] = useState('');

  const validTargets = getValidTransitions(draft.status, userRole, userId, draft);

  if (validTargets.length === 0) return null;

  function getWarnings(targetStatus: ContentStatus): string[] {
    const warnings: string[] = [];

    if (targetStatus === 'scheduled' && !draft.publish_at) {
      warnings.push('No publish date set. Set a publish date before scheduling.');
    }

    if (targetStatus === 'scheduled' && draft.target_platforms.length > 0) {
      for (const platform of draft.target_platforms) {
        const caption =
          draft.platform_overrides?.[platform] ||
          draft.master_caption ||
          '';
        const limit = PLATFORM_CHAR_LIMITS[platform as SocialPlatform];
        if (limit && caption.length > limit) {
          warnings.push(`${platform} caption exceeds ${limit} character limit (${caption.length} chars)`);
        }
      }
    }

    return warnings;
  }

  async function handleTransition(targetStatus: ContentStatus) {
    setLoading(true);
    setError('');

    const res = await fetch(
      `/api/workspaces/${workspaceId}/drafts/${draft.id}/status`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: targetStatus }),
      }
    );

    const json = await res.json();
    setLoading(false);
    setConfirmTarget(null);

    if (!res.ok) {
      setError(json.error || 'Failed to transition status');
      return;
    }

    onStatusChange(json.data);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {validTargets.map((target) => {
          const key = `${draft.status}->${target}`;
          const meta = TRANSITION_LABELS[key] || {
            label: STATUS_LABELS[target],
            variant: 'default' as const,
          };
          return (
            <Button
              key={target}
              variant={meta.variant}
              size="sm"
              disabled={loading}
              onClick={() => setConfirmTarget(target)}
            >
              {meta.label}
            </Button>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Transition from &quot;{STATUS_LABELS[draft.status]}&quot; to &quot;
              {confirmTarget ? STATUS_LABELS[confirmTarget] : ''}&quot;?
            </DialogDescription>
          </DialogHeader>

          {confirmTarget && getWarnings(confirmTarget).length > 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Warnings:</p>
              <ul className="mt-1 list-disc pl-4">
                {getWarnings(confirmTarget).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => confirmTarget && handleTransition(confirmTarget)}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
