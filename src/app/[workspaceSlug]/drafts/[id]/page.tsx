'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/status-badge';
import { StatusActionBar } from '@/components/status-action-bar';
import { CharacterCounter } from '@/components/character-counter';
import { PlatformCheckboxGroup } from '@/components/platform-checkbox-group';
import { CommentsPanel } from '@/components/comments-panel';
import { AssetPanel } from '@/components/asset-panel';
import { HashtagInsertPanel } from '@/components/hashtag-insert-panel';
import { PLATFORM_LABELS, PLATFORM_CHAR_LIMITS } from '@/utils/platform';
import { ArrowLeft } from 'lucide-react';
import type {
  ContentDraft,
  ContentStatus,
  SocialPlatform,
  WorkspaceMemberWithEmail,
} from '@/types';

const NONE_VALUE = '__none__';

export default function ComposerPage() {
  const params = useParams<{ workspaceSlug: string; id: string }>();
  const { workspace, membership } = useWorkspace();

  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDraft = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspace.id}/drafts/${params.id}`);
    const json = await res.json();
    if (json.data) setDraft(json.data);
    setLoading(false);
  }, [workspace.id, params.id]);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspace.id}/members`);
    const json = await res.json();
    if (json.data) setMembers(json.data);
  }, [workspace.id]);

  useEffect(() => {
    fetchDraft();
    fetchMembers();
  }, [fetchDraft, fetchMembers]);

  function saveDraft(updates: Record<string, unknown>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');

    debounceRef.current = setTimeout(async () => {
      await fetch(`/api/workspaces/${workspace.id}/drafts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }

  function saveImmediate(updates: Record<string, unknown>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus('saving');

    (async () => {
      const res = await fetch(`/api/workspaces/${workspace.id}/drafts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.data) setDraft(json.data);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    })();
  }

  function updateField<K extends keyof ContentDraft>(field: K, value: ContentDraft[K]) {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
    saveDraft({ [field]: value });
  }

  function updateOverride(platform: string, value: string) {
    if (!draft) return;
    const overrides = { ...(draft.platform_overrides || {}), [platform]: value };
    if (!value) delete overrides[platform];
    setDraft({ ...draft, platform_overrides: overrides });
    saveDraft({ platform_overrides: overrides });
  }

  if (loading || !draft) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading draft...</p>
      </div>
    );
  }

  const isManager = membership.role === 'manager';
  const effectiveCaption = (platform: SocialPlatform) =>
    draft.platform_overrides?.[platform] || draft.master_caption || '';

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href={`/${workspace.slug}/drafts`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Input
            value={draft.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="border-none text-lg font-semibold shadow-none focus-visible:ring-0 px-0 h-auto"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : ''}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Master Caption */}
          <div className="space-y-2">
            <Label>Master Caption</Label>
            <Textarea
              value={draft.master_caption || ''}
              onChange={(e) => updateField('master_caption', e.target.value)}
              placeholder="Write your caption here..."
              className="min-h-[160px] resize-y"
            />
            {draft.target_platforms.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {draft.target_platforms.map((p) => (
                  <div key={p} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {PLATFORM_LABELS[p as SocialPlatform]}:
                    </span>
                    <CharacterCounter
                      current={(draft.master_caption || '').length}
                      max={PLATFORM_CHAR_LIMITS[p as SocialPlatform]}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Selector */}
          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <PlatformCheckboxGroup
              value={draft.target_platforms as SocialPlatform[]}
              onChange={(platforms) => {
                setDraft({ ...draft, target_platforms: platforms });
                // Clean overrides for removed platforms
                const overrides = { ...(draft.platform_overrides || {}) };
                Object.keys(overrides).forEach((key) => {
                  if (!platforms.includes(key as SocialPlatform)) delete overrides[key];
                });
                saveDraft({ target_platforms: platforms, platform_overrides: overrides });
              }}
            />
          </div>

          {/* Platform Override Tabs */}
          {draft.target_platforms.length > 0 ? (
            <div className="space-y-2">
              <Label>Platform-Specific Captions</Label>
              <Tabs defaultValue={draft.target_platforms[0]}>
                <TabsList className="flex-wrap h-auto">
                  {draft.target_platforms.map((p) => (
                    <TabsTrigger key={p} value={p}>
                      {PLATFORM_LABELS[p as SocialPlatform]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {draft.target_platforms.map((p) => (
                  <TabsContent key={p} value={p} className="space-y-2">
                    <Textarea
                      value={draft.platform_overrides?.[p] || ''}
                      onChange={(e) => updateOverride(p, e.target.value)}
                      placeholder="Leave empty to use master caption"
                      className="min-h-[120px] resize-y"
                    />
                    <CharacterCounter
                      current={effectiveCaption(p as SocialPlatform).length}
                      max={PLATFORM_CHAR_LIMITS[p as SocialPlatform]}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select target platforms above to customize per-platform captions.
            </p>
          )}

          {/* Media Assets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Media Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetPanel workspaceId={workspace.id} draftId={params.id} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="w-80 shrink-0 border-l overflow-auto p-6 space-y-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge status={draft.status as ContentStatus} />
              <StatusActionBar
                draft={draft}
                userRole={membership.role}
                userId={membership.user_id}
                workspaceId={workspace.id}
                onStatusChange={(updated) => setDraft(updated)}
              />
            </CardContent>
          </Card>

          {/* Assignees */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Assignees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Copy Assignee</Label>
                {isManager ? (
                  <Select
                    value={draft.copy_assignee_id || NONE_VALUE}
                    onValueChange={(v) =>
                      saveImmediate({
                        copy_assignee_id: v === NONE_VALUE ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.user_id}>
                          {m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {members.find((m) => m.user_id === draft.copy_assignee_id)?.email || 'None'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Creatives Assignee</Label>
                {isManager ? (
                  <Select
                    value={draft.creatives_assignee_id || NONE_VALUE}
                    onValueChange={(v) =>
                      saveImmediate({
                        creatives_assignee_id: v === NONE_VALUE ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.user_id}>
                          {m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {members.find((m) => m.user_id === draft.creatives_assignee_id)?.email || 'None'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Publish Date */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Publish Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <input
                type="datetime-local"
                value={
                  draft.publish_at
                    ? new Date(draft.publish_at).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null;
                  setDraft({ ...draft, publish_at: val });
                  saveImmediate({ publish_at: val });
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Hashtags</CardTitle>
            </CardHeader>
            <CardContent>
              <HashtagInsertPanel
                workspaceId={workspace.id}
                onInsert={(text) => {
                  if (!draft) return;
                  const current = draft.master_caption || '';
                  const separator = current && !current.endsWith(' ') ? ' ' : '';
                  updateField('master_caption', current + separator + text);
                }}
              />
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentsPanel workspaceId={workspace.id} draftId={params.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
