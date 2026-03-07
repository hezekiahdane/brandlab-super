'use client';

import { useEffect, useState } from 'react';
import { ContentCalendar } from '@/components/content-calendar';
import type { Workspace } from '@/types';

export default function MasterCalendarPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setWorkspaces(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const firstWorkspace = workspaces[0];
  if (!firstWorkspace) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Master Calendar</h1>
        <p className="mt-2 text-muted-foreground">No workspaces found.</p>
      </div>
    );
  }

  const workspaceNames = workspaces.reduce<Record<string, string>>((acc, ws) => {
    acc[ws.id] = ws.name;
    return acc;
  }, {});

  const workspaceSlugs = workspaces.reduce<Record<string, string>>((acc, ws) => {
    acc[ws.id] = ws.slug;
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Master Calendar</h1>
        <p className="mt-1 text-muted-foreground">
          All scheduled content across {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}.
        </p>
      </div>
      <ContentCalendar
        workspaceId={firstWorkspace.id}
        workspaceSlug={firstWorkspace.slug}
        allWorkspaces
        workspaceNames={workspaceNames}
        workspaceSlugs={workspaceSlugs}
      />
    </div>
  );
}
