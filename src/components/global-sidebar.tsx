'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, FileText, User, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/user-menu';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Master Calendar', icon: Calendar, path: '/master/calendar' },
  { label: 'All Drafts', icon: FileText, path: '/master/drafts' },
  { label: 'My Work', icon: User, path: '/my-work' },
];

export function GlobalSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-2 text-sm font-semibold"
          onClick={() => router.push('/workspaces')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workspaces
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              href={item.path}
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

      {/* User menu */}
      <div className="flex items-center gap-2 p-4">
        <UserMenu />
      </div>
    </aside>
  );
}
