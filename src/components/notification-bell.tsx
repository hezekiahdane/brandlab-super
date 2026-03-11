'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/hooks/use-user';
import { useNotifications } from '@/hooks/use-notifications';
import type { Notification } from '@/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationBell() {
  const router = useRouter();
  const { user } = useUser();
  const { notifications, unreadCount, markAsRead, markAllRead } =
    useNotifications(user?.id);
  const [open, setOpen] = useState(false);
  const [workspaceSlugs, setWorkspaceSlugs] = useState<Record<string, string>>(
    {}
  );

  // Fetch workspace slugs for navigation
  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await fetch('/api/workspaces');
      const json = await res.json();
      if (json.data) {
        const slugMap: Record<string, string> = {};
        for (const ws of json.data) {
          slugMap[ws.id] = ws.slug;
        }
        setWorkspaceSlugs(slugMap);
      }
    })();
  }, [user]);

  function handleNotificationClick(notification: Notification) {
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    const slug = workspaceSlugs[notification.workspace_id];
    if (slug && notification.draft_id) {
      router.push(`/${slug}/drafts/${notification.draft_id}`);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" side="top">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.slice(0, 20).map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                {/* Unread indicator */}
                <div className="mt-1.5 shrink-0">
                  {!notification.read_at ? (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <div className="h-2 w-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(notification.created_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
