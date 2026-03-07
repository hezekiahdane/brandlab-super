'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlatformCheckboxGroup } from '@/components/platform-checkbox-group';
import { Plus } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import type { SocialPlatform } from '@/types';

export function CreateDraftDialog() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch(`/api/workspaces/${workspace.id}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        target_platforms: platforms,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Failed to create draft');
      return;
    }

    setOpen(false);
    setTitle('');
    setPlatforms([]);
    router.push(`/${workspace.slug}/drafts/${json.data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Draft
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Draft</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="draft-title">Title</Label>
            <Input
              id="draft-title"
              placeholder="e.g. Monday motivation post"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Target Platforms (optional)</Label>
            <PlatformCheckboxGroup value={platforms} onChange={setPlatforms} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading || !title.trim()} className="w-full">
            {loading ? 'Creating...' : 'Create Draft'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
