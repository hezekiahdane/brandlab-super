'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2, Plus, Hash } from 'lucide-react';
import { PLATFORM_LABELS } from '@/utils/platform';
import type { Hashtag, SocialPlatform } from '@/types';

const ALL_PLATFORMS: SocialPlatform[] = [
  'instagram', 'facebook', 'x', 'tiktok', 'linkedin', 'threads', 'youtube',
];

export default function HashtagsPage() {
  const { workspace, membership } = useWorkspace();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newTag, setNewTag] = useState('');
  const [newConcept, setNewConcept] = useState('');
  const [newPlatforms, setNewPlatforms] = useState<string[]>([]);

  const isManager = membership.role === 'manager';

  const fetchHashtags = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspace.id}/hashtags`);
    const json = await res.json();
    if (json.data) setHashtags(json.data);
    setLoading(false);
  }, [workspace.id]);

  useEffect(() => {
    fetchHashtags();
  }, [fetchHashtags]);

  async function createHashtag() {
    if (!newTag.trim()) return;

    const res = await fetch(`/api/workspaces/${workspace.id}/hashtags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hashtag: newTag,
        concept: newConcept || undefined,
        platforms: newPlatforms,
      }),
    });

    if (res.ok) {
      setNewTag('');
      setNewConcept('');
      setNewPlatforms([]);
      setDialogOpen(false);
      fetchHashtags();
    } else {
      const json = await res.json();
      alert(json.error || 'Failed to create hashtag');
    }
  }

  async function deleteHashtag(id: string) {
    if (!confirm('Delete this hashtag?')) return;

    await fetch(`/api/workspaces/${workspace.id}/hashtags/${id}`, {
      method: 'DELETE',
    });
    setHashtags((prev) => prev.filter((h) => h.id !== id));
  }

  function togglePlatform(platform: string) {
    setNewPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  // Group hashtags by concept
  const grouped = hashtags.reduce<Record<string, Hashtag[]>>((acc, h) => {
    const key = h.concept || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hashtag Bank</h1>
          <p className="mt-1 text-muted-foreground">
            Saved hashtags organized by concept for quick insertion into captions.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Hashtag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Hashtag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Hashtag</Label>
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. BrandName"
                />
                <p className="text-xs text-muted-foreground">
                  The # symbol will be added automatically.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Concept / Campaign</Label>
                <Input
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  placeholder="e.g. Summer Campaign"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Platforms (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => (
                    <Badge
                      key={p}
                      variant={newPlatforms.includes(p) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePlatform(p)}
                    >
                      {PLATFORM_LABELS[p]}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={createHashtag} className="w-full" disabled={!newTag.trim()}>
                Add Hashtag
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grouped hashtag list */}
      {loading ? (
        <p className="text-muted-foreground">Loading hashtags...</p>
      ) : hashtags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Hash className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            No hashtags saved yet. Add your first hashtag to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((concept) => (
            <div key={concept} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {concept}
              </h2>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Hashtag</th>
                      <th className="px-4 py-2 font-medium">Platforms</th>
                      <th className="px-4 py-2 font-medium">Added</th>
                      {isManager && <th className="px-4 py-2 font-medium w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[concept].map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-sm font-medium">
                          #{h.hashtag}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {h.platforms.length > 0 ? (
                              h.platforms.map((p) => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {PLATFORM_LABELS[p as SocialPlatform] || p}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">All</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString()}
                        </td>
                        {isManager && (
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => deleteHashtag(h.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
