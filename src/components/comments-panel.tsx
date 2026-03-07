'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Comment } from '@/types';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Render comment body with @email mentions highlighted */
function renderBody(body: string) {
  const parts = body.split(/(@[\w.+-]+@[\w.-]+\.\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') && part.includes('.') ? (
      <span key={i} className="font-semibold text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function CommentsPanel({
  workspaceId,
  draftId,
}: {
  workspaceId: string;
  draftId: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchComments = useCallback(async () => {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/drafts/${draftId}/comments`
    );
    const json = await res.json();
    if (json.data) setComments(json.data);
    setLoading(false);
  }, [workspaceId, draftId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handlePost() {
    if (!body.trim()) return;
    setPosting(true);

    const res = await fetch(
      `/api/workspaces/${workspaceId}/drafts/${draftId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      }
    );

    if (res.ok) {
      setBody('');
      await fetchComments();
    }
    setPosting(false);
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading comments...</p>;
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-md border bg-muted/50 p-2.5 text-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium truncate">
                  {c.author_email || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(c.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">
                {renderBody(c.body)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          placeholder="Add a note... Use @email to mention"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[72px] resize-none text-sm"
        />
        <Button
          size="sm"
          disabled={!body.trim() || posting}
          onClick={handlePost}
          className="w-full"
        >
          {posting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
