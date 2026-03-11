'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { ContentCalendar } from '@/components/content-calendar';
import { PlatformHeatmapToggle } from '@/components/platform-heatmap-toggle';
import { heatmapKey } from '@/utils/heatmap';
import type { SocialPlatform } from '@/types';

export default function CalendarPage() {
  const { workspace } = useWorkspace();
  const [heatmapPlatform, setHeatmapPlatform] = useState<
    SocialPlatform | 'none'
  >('none');
  const [heatmapData, setHeatmapData] = useState<Map<string, number>>(
    new Map()
  );

  const fetchHeatmap = useCallback(
    async (platform: SocialPlatform) => {
      const res = await fetch(
        `/api/workspaces/${workspace.id}/heatmap?platform=${platform}`
      );
      const json = await res.json();
      if (json.data) {
        const map = new Map<string, number>();
        for (const row of json.data) {
          map.set(heatmapKey(row.day_of_week, row.hour_utc), row.score);
        }
        setHeatmapData(map);
      }
    },
    [workspace.id]
  );

  useEffect(() => {
    if (heatmapPlatform === 'none') {
      setHeatmapData(new Map());
    } else {
      fetchHeatmap(heatmapPlatform);
    }
  }, [heatmapPlatform, fetchHeatmap]);

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="mt-1 text-muted-foreground">
            Scheduled content for {workspace.name}. Click an empty slot to
            create a draft.
          </p>
        </div>
        <PlatformHeatmapToggle
          value={heatmapPlatform}
          onChange={setHeatmapPlatform}
        />
      </div>
      <ContentCalendar
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        heatmapData={heatmapData}
      />
    </div>
  );
}
