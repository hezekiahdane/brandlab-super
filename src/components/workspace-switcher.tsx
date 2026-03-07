'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Workspace } from '@/types';

export function WorkspaceSwitcher({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setWorkspaces(json.data);
      })
      .catch(() => {});
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between gap-2 px-2">
          <div className="flex items-center gap-2 truncate">
            {currentWorkspace.brand_color && (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: currentWorkspace.brand_color }}
              />
            )}
            <span className="truncate text-sm font-semibold">{currentWorkspace.name}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            className="cursor-pointer"
            onClick={() => {
              if (ws.slug !== currentWorkspace.slug) {
                router.push(`/${ws.slug}/calendar`);
              }
            }}
          >
            <div className="flex items-center gap-2 truncate">
              {ws.brand_color && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ws.brand_color }}
                />
              )}
              <span className="truncate">{ws.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => router.push('/workspaces/new')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
