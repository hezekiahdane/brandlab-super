'use client';

import { useWorkspace } from '@/hooks/use-workspace';
import { ContentCalendar } from '@/components/content-calendar';

export default function CalendarPage() {
  const { workspace } = useWorkspace();

  return (
    <div className="p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="mt-1 text-muted-foreground">
          Scheduled content for {workspace.name}. Click an empty slot to create a draft.
        </p>
      </div>
      <ContentCalendar workspaceId={workspace.id} workspaceSlug={workspace.slug} />
    </div>
  );
}
