'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon, Film, Loader2 } from 'lucide-react';
import type { DraftAsset } from '@/types';

interface AssetPanelProps {
  workspaceId: string;
  draftId: string;
}

export function AssetPanel({ workspaceId, draftId }: AssetPanelProps) {
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<DraftAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/drafts/${draftId}/assets`
    );
    const json = await res.json();
    if (json.data) setAssets(json.data);
    setLoading(false);
  }, [workspaceId, draftId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `/api/workspaces/${workspaceId}/drafts/${draftId}/assets`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Upload failed');
      }
    }

    await fetchAssets();
    setUploading(false);
  }

  async function deleteAsset(assetId: string) {
    if (!confirm('Delete this asset?')) return;

    await fetch(
      `/api/workspaces/${workspaceId}/drafts/${draftId}/assets/${assetId}`,
      { method: 'DELETE' }
    );
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    setPreviewAsset(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {uploading ? 'Uploading...' : 'Drop files or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground/60">
          Images up to 20MB, videos up to 500MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Asset grid */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading assets...</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No assets yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border bg-muted"
              onClick={() => setPreviewAsset(asset)}
            >
              {asset.file_type === 'video' ? (
                <div className="flex h-full items-center justify-center">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.cdn_url}
                  alt="Asset"
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAsset(asset.id);
                }}
                className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80 group-hover:block"
              >
                <X className="h-3 w-3" />
              </button>
              {asset.file_type === 'video' && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  Video
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewAsset?.file_type === 'video' ? (
                <Film className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              Asset Preview
            </DialogTitle>
          </DialogHeader>
          {previewAsset && (
            <div className="space-y-3">
              <div className="flex items-center justify-center rounded-md bg-muted">
                {previewAsset.file_type === 'video' ? (
                  <video
                    src={previewAsset.cdn_url}
                    controls
                    className="max-h-96 rounded-md"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewAsset.cdn_url}
                    alt="Preview"
                    className="max-h-96 rounded-md object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {previewAsset.file_type} &middot;{' '}
                  {new Date(previewAsset.uploaded_at).toLocaleDateString()}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAsset(previewAsset.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
