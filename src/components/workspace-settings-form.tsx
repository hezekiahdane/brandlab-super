'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Workspace } from '@/types';

export function WorkspaceSettingsForm({
  workspace,
  isManager,
}: {
  workspace: Workspace;
  isManager: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [brandColor, setBrandColor] = useState(workspace.brand_color || '#6366f1');
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), brand_color: brandColor }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Failed to update');
      return;
    }

    setSuccess('Settings saved');
    router.refresh();
  }

  async function handleArchive() {
    setArchiving(true);

    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived_at: new Date().toISOString() }),
    });

    if (!res.ok) {
      setArchiving(false);
      setError('Failed to archive workspace');
      return;
    }

    router.push('/workspaces');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isManager}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-color">Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="ws-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={!isManager}
                className="h-10 w-10 cursor-pointer rounded border border-input disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={!isManager}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <p className="text-sm text-muted-foreground">/{workspace.slug} (cannot be changed)</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          {isManager && (
            <div className="flex items-center justify-between pt-2">
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    Archive Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Archive Workspace</DialogTitle>
                    <DialogDescription>
                      This will hide the workspace from all members. This action can be undone later.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
                      {archiving ? 'Archiving...' : 'Confirm Archive'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
