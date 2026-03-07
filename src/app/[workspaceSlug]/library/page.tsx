'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Film, Image as ImageIcon, X, Plus } from 'lucide-react';
import type { DraftAsset } from '@/types';

export default function LibraryPage() {
  const { workspace } = useWorkspace();
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<DraftAsset | null>(null);
  const [tagInput, setTagInput] = useState('');

  const fetchAssets = useCallback(async () => {
    const url = selectedTag
      ? `/api/workspaces/${workspace.id}/assets?tag=${encodeURIComponent(selectedTag)}`
      : `/api/workspaces/${workspace.id}/assets`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.data) setAssets(json.data);
    setLoading(false);
  }, [workspace.id, selectedTag]);

  useEffect(() => {
    setLoading(true);
    fetchAssets();
  }, [fetchAssets]);

  // Collect all unique tags across assets
  const allTags = Array.from(
    new Set(assets.flatMap((a) => a.tags || []))
  ).sort();

  async function updateAssetTags(assetId: string, tags: string[]) {
    await fetch(`/api/workspaces/${workspace.id}/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, tags } : a))
    );
    if (previewAsset?.id === assetId) {
      setPreviewAsset({ ...previewAsset, tags });
    }
  }

  function addTag(asset: DraftAsset, tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    const current = asset.tags || [];
    if (current.includes(trimmed)) return;
    updateAssetTags(asset.id, [...current, trimmed]);
  }

  function removeTag(asset: DraftAsset, tag: string) {
    const current = asset.tags || [];
    updateAssetTags(asset.id, current.filter((t) => t !== tag));
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Media Library</h1>
        <p className="mt-1 text-muted-foreground">
          All media assets across your workspace drafts.
        </p>
      </div>

      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by tag:</span>
          <Badge
            variant={selectedTag === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedTag(null)}
          >
            All
          </Badge>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Asset grid */}
      {loading ? (
        <p className="text-muted-foreground">Loading assets...</p>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">
            {selectedTag
              ? `No assets with tag "${selectedTag}".`
              : 'No assets yet. Upload media from a draft to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group cursor-pointer overflow-hidden rounded-lg border bg-muted transition-shadow hover:shadow-md"
              onClick={() => setPreviewAsset(asset)}
            >
              <div className="relative aspect-square">
                {asset.file_type === 'video' ? (
                  <div className="flex h-full items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.cdn_url}
                    alt="Asset"
                    className="h-full w-full object-cover"
                  />
                )}
                <Badge
                  variant="secondary"
                  className="absolute left-1.5 top-1.5 text-[10px] px-1.5 py-0"
                >
                  {asset.file_type}
                </Badge>
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(asset.uploaded_at).toLocaleDateString()}
                </p>
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] px-1 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview / Detail dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewAsset?.file_type === 'video' ? (
                <Film className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Asset Details
            </DialogTitle>
          </DialogHeader>
          {previewAsset && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex items-center justify-center rounded-md bg-muted">
                {previewAsset.file_type === 'video' ? (
                  <video
                    src={previewAsset.cdn_url}
                    controls
                    className="max-h-80 rounded-md"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewAsset.cdn_url}
                    alt="Preview"
                    className="max-h-80 rounded-md object-contain"
                  />
                )}
              </div>

              {/* Info */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Type: {previewAsset.file_type}</p>
                <p>Uploaded: {new Date(previewAsset.uploaded_at).toLocaleString()}</p>
                <p>Draft ID: {previewAsset.draft_id}</p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {(previewAsset.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(previewAsset, tag)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTag(previewAsset, tagInput);
                    setTagInput('');
                  }}
                >
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="sm" variant="outline" className="h-8">
                    <Plus className="h-3 w-3" />
                  </Button>
                </form>
              </div>

              {/* Download link */}
              <div>
                <a
                  href={previewAsset.cdn_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
