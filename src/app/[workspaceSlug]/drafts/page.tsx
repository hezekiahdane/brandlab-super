'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { StatusBadge } from '@/components/status-badge';
import { CreateDraftDialog } from '@/components/create-draft-dialog';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { ALL_STATUSES, STATUS_LABELS } from '@/utils/status';
import { PLATFORM_LABELS } from '@/utils/platform';
import type { ContentDraft, ContentStatus, SocialPlatform } from '@/types';

export default function DraftsPage() {
  const { workspace, membership } = useWorkspace();
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchDrafts = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);

    const res = await fetch(
      `/api/workspaces/${workspace.id}/drafts?${params.toString()}`
    );
    const json = await res.json();
    if (json.data) setDrafts(json.data);
    setLoading(false);
  }, [workspace.id, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchDrafts();
  }, [fetchDrafts]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function handleArchive(draftId: string) {
    const res = await fetch(`/api/workspaces/${workspace.id}/drafts/${draftId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    }
  }

  function canDeleteDraft(draft: ContentDraft) {
    if (membership.role === 'manager') return true;
    if (draft.status !== 'idea') return false;
    return (
      draft.copy_assignee_id === membership.user_id ||
      draft.creatives_assignee_id === membership.user_id
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Drafts</h1>
        <CreateDraftDialog />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No drafts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first content draft to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Platforms</th>
                <th className="px-4 py-3 text-left font-medium">Publish Date</th>
                <th className="px-4 py-3 text-left font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr key={draft.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${workspace.slug}/drafts/${draft.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {draft.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={draft.status as ContentStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {draft.target_platforms.length > 0
                      ? draft.target_platforms
                          .map((p: SocialPlatform) => PLATFORM_LABELS[p] || p)
                          .join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(draft.publish_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(draft.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDeleteDraft(draft) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive this draft?</AlertDialogTitle>
                            <AlertDialogDescription>
                              &ldquo;{draft.title}&rdquo; will be hidden from all views. A manager
                              can permanently delete it later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleArchive(draft.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Archive
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
