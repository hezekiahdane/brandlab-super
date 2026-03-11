'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, dateFnsLocalizer, type View, type SlotInfo } from 'react-big-calendar';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addDays, subDays, getHours } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { StatusBadge } from '@/components/status-badge';
import { PLATFORM_LABELS } from '@/utils/platform';
import { STATUS_EVENT_COLORS } from '@/utils/calendar';
import { scoreToColor, heatmapKey } from '@/utils/heatmap';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ContentDraft, ContentStatus, SocialPlatform } from '@/types';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ContentDraft;
}

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

interface ContentCalendarProps {
  workspaceId: string;
  workspaceSlug: string;
  allWorkspaces?: boolean;
  workspaceNames?: Record<string, string>;
  workspaceSlugs?: Record<string, string>;
  /** Heatmap scores keyed by "dayOfWeek_hourUtc" (e.g. "3_14" = Wednesday 2pm) */
  heatmapData?: Map<string, number>;
}

export function ContentCalendar({
  workspaceId,
  workspaceSlug,
  allWorkspaces,
  workspaceNames,
  workspaceSlugs,
  heatmapData,
}: ContentCalendarProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('month');

  const fetchDrafts = useCallback(async () => {
    const rangeStart = subDays(startOfMonth(currentDate), 7);
    const rangeEnd = addDays(endOfMonth(currentDate), 7);
    const from = rangeStart.toISOString();
    const to = rangeEnd.toISOString();

    if (allWorkspaces) {
      const wsRes = await fetch('/api/workspaces');
      const wsJson = await wsRes.json();
      if (!wsJson.data) return;

      const allDrafts: ContentDraft[] = [];
      await Promise.all(
        wsJson.data.map(async (ws: { id: string }) => {
          const res = await fetch(
            `/api/workspaces/${ws.id}/drafts?from=${from}&to=${to}`
          );
          const json = await res.json();
          if (json.data) allDrafts.push(...json.data);
        })
      );
      setDrafts(allDrafts);
    } else {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/drafts?from=${from}&to=${to}`
      );
      const json = await res.json();
      if (json.data) setDrafts(json.data);
    }
    setLoading(false);
  }, [workspaceId, currentDate, allWorkspaces]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const events: CalendarEvent[] = useMemo(
    () =>
      drafts
        .filter((d) => d.publish_at)
        .map((d) => {
          const start = new Date(d.publish_at!);
          return {
            id: d.id,
            title: d.title,
            start,
            end: start,
            resource: d,
          };
        }),
    [drafts]
  );

  function handleSelectSlot(slotInfo: SlotInfo) {
    if (allWorkspaces) return;
    const publishAt = slotInfo.start.toISOString();
    createDraftAtDate(publishAt);
  }

  async function createDraftAtDate(publishAt: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Untitled Draft',
        publish_at: publishAt,
      }),
    });
    const json = await res.json();
    if (json.data) {
      router.push(`/${workspaceSlug}/drafts/${json.data.id}`);
    }
  }

  function handleEventDrop(args: EventInteractionArgs<CalendarEvent>) {
    const { event, start } = args;
    const newPublishAt = (start as Date).toISOString();

    setDrafts((prev) =>
      prev.map((d) =>
        d.id === event.id ? { ...d, publish_at: newPublishAt } : d
      )
    );

    fetch(
      `/api/workspaces/${event.resource.workspace_id}/drafts/${event.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_at: newPublishAt }),
      }
    );
  }

  function handleSelectEvent(event: CalendarEvent) {
    const slug = allWorkspaces && workspaceSlugs
      ? workspaceSlugs[event.resource.workspace_id]
      : workspaceSlug;
    if (slug) {
      router.push(`/${slug}/drafts/${event.id}`);
    }
  }

  function eventStyleGetter(event: CalendarEvent) {
    const colors = STATUS_EVENT_COLORS[event.resource.status as ContentStatus] || STATUS_EVENT_COLORS.idea;
    return {
      style: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderRadius: '4px',
        fontSize: '12px',
        padding: '2px 6px',
        border: 'none',
        borderLeft: `3px solid ${colors.border}`,
      },
    };
  }

  function EventComponent({ event }: { event: CalendarEvent }) {
    const draft = event.resource;
    const wsName = allWorkspaces && workspaceNames ? workspaceNames[draft.workspace_id] : null;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="truncate cursor-pointer text-xs leading-tight py-0.5">
            {wsName && (
              <span className="font-semibold opacity-60">{wsName} · </span>
            )}
            {event.title}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-2" side="right" align="start">
          <p className="font-semibold text-sm">{draft.title}</p>
          {wsName && (
            <p className="text-xs text-muted-foreground">{wsName}</p>
          )}
          <StatusBadge status={draft.status as ContentStatus} />
          {draft.target_platforms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {draft.target_platforms.map((p) => (
                <span
                  key={p}
                  className="inline-block text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                >
                  {PLATFORM_LABELS[p as SocialPlatform] || p}
                </span>
              ))}
            </div>
          )}
          {draft.publish_at && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(draft.publish_at), 'MMM d, yyyy h:mm a')}
            </p>
          )}
          {draft.master_caption && (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {draft.master_caption}
            </p>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  /** Heatmap background for week/day view time slots */
  function slotPropGetter(date: Date) {
    if (!heatmapData || heatmapData.size === 0) return {};
    const day = date.getDay(); // 0-6
    const hour = getHours(date); // 0-23
    const score = heatmapData.get(heatmapKey(day, hour));
    if (!score) return {};
    return { style: { backgroundColor: scoreToColor(score) } };
  }

  /** Heatmap background for month view day cells (average of all hours) */
  function dayPropGetter(date: Date) {
    if (!heatmapData || heatmapData.size === 0) return {};
    const day = date.getDay();
    let total = 0;
    let count = 0;
    for (let h = 0; h < 24; h++) {
      const score = heatmapData.get(heatmapKey(day, h));
      if (score !== undefined) {
        total += score;
        count++;
      }
    }
    if (count === 0) return {};
    return { style: { backgroundColor: scoreToColor(total / count) } };
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading calendar...</p>;
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={currentDate}
        onNavigate={setCurrentDate}
        view={currentView}
        onView={setCurrentView}
        views={['month', 'week', 'day']}
        selectable={!allWorkspaces}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        draggableAccessor={() => !allWorkspaces}
        eventPropGetter={eventStyleGetter}
        slotPropGetter={slotPropGetter}
        dayPropGetter={dayPropGetter}
        components={{
          event: EventComponent,
        }}
        style={{ height: '100%' }}
        popup
      />
    </div>
  );
}
