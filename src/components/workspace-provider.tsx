'use client';

import { createContext } from 'react';
import type { Workspace, WorkspaceMember } from '@/types';

export interface WorkspaceContextValue {
  workspace: Workspace;
  membership: WorkspaceMember;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  workspace,
  membership,
  children,
}: {
  workspace: Workspace;
  membership: WorkspaceMember;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={{ workspace, membership }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
