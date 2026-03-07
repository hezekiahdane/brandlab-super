'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';
import type { Hashtag } from '@/types';

interface HashtagInsertPanelProps {
  workspaceId: string;
  onInsert: (text: string) => void;
}

export function HashtagInsertPanel({ workspaceId, onInsert }: HashtagInsertPanelProps) {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHashtags = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/hashtags`);
    const json = await res.json();
    if (json.data) setHashtags(json.data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchHashtags();
  }, [fetchHashtags]);

  // Group by concept
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

  function insertGroup(concept: string) {
    const tags = grouped[concept].map((h) => `#${h.hashtag}`).join(' ');
    onInsert(tags);
  }

  function insertSingle(hashtag: string) {
    onInsert(`#${hashtag}`);
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading hashtags...</p>;
  }

  if (hashtags.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No saved hashtags. Add them from the Hashtags page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sortedGroups.map((concept) => (
        <div key={concept} className="space-y-1">
          <button
            type="button"
            onClick={() => insertGroup(concept)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            title={`Insert all ${concept} hashtags`}
          >
            <Hash className="h-3 w-3" />
            {concept}
          </button>
          <div className="flex flex-wrap gap-1">
            {grouped[concept].map((h) => (
              <Badge
                key={h.id}
                variant="outline"
                className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => insertSingle(h.hashtag)}
              >
                #{h.hashtag}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
