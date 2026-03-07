'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { StatusBadge } from '@/components/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_STATUSES, STATUS_LABELS } from '@/utils/status';
import type { ContentDraft, ContentStatus, Workspace } from '@/types';

interface DraftWithWorkspace extends ContentDraft {
  workspace_name?: string;
  workspace_slug?: string;
}

export default function MyWorkPage() {
  const { user } = useUser();
  const [drafts, setDrafts] = useState<DraftWithWorkspace[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setWorkspaces(json.data);
      })
      .catch(() => {});
  }, []);

  const fetchDrafts = useCallback(async () => {
    if (workspaces.length === 0 || !user) return;
    setLoading(true);

    const allDrafts: DraftWithWorkspace[] = [];
    await Promise.all(
      workspaces.map(async (ws) => {
        const params = new URLSearchParams();
        params.set('assignee', user.id);
        if (statusFilter !== 'all') params.set('status', statusFilter);

        const res = await fetch(
          `/api/workspaces/${ws.id}/drafts?${params.toString()}`
        );
        const json = await res.json();
        if (json.data) {
          json.data.forEach((d: ContentDraft) => {
            allDrafts.push({
              ...d,
              workspace_name: ws.name,
              workspace_slug: ws.slug,
            });
          });
        }
      })
    );

    // Sort by updated_at descending
    allDrafts.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    setDrafts(allDrafts);
    setLoading(false);
  }, [workspaces, statusFilter, user]);

  useEffect(() => {
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Work</h1>
        <p className="mt-1 text-muted-foreground">
          Drafts assigned to you across all workspaces.
        </p>
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
        <p className="text-sm text-muted-foreground">Loading your drafts...</p>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No drafts assigned to you</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts where you are a copy assignee, creatives assignee, or manager will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Workspace</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Publish Date</th>
                <th className="px-4 py-3 text-left font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => {
                const roles: string[] = [];
                if (user && draft.manager_id === user.id) roles.push('Manager');
                if (user && draft.copy_assignee_id === user.id) roles.push('Copy');
                if (user && draft.creatives_assignee_id === user.id) roles.push('Creatives');

                return (
                  <tr key={draft.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/${draft.workspace_slug}/drafts/${draft.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {draft.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {draft.workspace_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={draft.status as ContentStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {roles.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(draft.publish_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(draft.updated_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
