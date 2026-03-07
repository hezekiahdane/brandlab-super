'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, FileText, Image, Hash, Settings, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { UserMenu } from '@/components/user-menu';
import { Separator } from '@/components/ui/separator';
import type { Workspace, WorkspaceMember } from '@/types';

const navItems = [
  { label: 'Calendar', icon: Calendar, path: 'calendar' },
  { label: 'Drafts', icon: FileText, path: 'drafts' },
  { label: 'Library', icon: Image, path: 'library' },
  { label: 'Hashtags', icon: Hash, path: 'hashtags' },
  { label: 'Settings', icon: Settings, path: 'settings' },
];

export function Sidebar({
  workspace,
}: {
  workspace: Workspace;
  membership: WorkspaceMember;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Workspace switcher */}
      <div className="p-4">
        <WorkspaceSwitcher currentWorkspace={workspace} />
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const href = `/${workspace.slug}/${item.path}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Global links */}
      <nav className="space-y-1 p-3">
        {[
          { label: 'Master View', icon: LayoutDashboard, href: '/master/calendar' },
          { label: 'My Work', icon: User, href: '/my-work' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <Separator />

      {/* User menu */}
      <div className="flex items-center gap-2 p-4">
        <UserMenu />
      </div>
    </aside>
  );
}
