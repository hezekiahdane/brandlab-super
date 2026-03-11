'use client';

import { useWorkspace } from '@/hooks/use-workspace';
import { WorkspaceSettingsForm } from '@/components/workspace-settings-form';
import { MemberManagement } from '@/components/member-management';
import { SocialConnections } from '@/components/social-connections';
import { Separator } from '@/components/ui/separator';

export default function WorkspaceSettingsPage() {
  const { workspace, membership } = useWorkspace();
  const isManager = membership.role === 'manager';

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-8">
      <h1 className="text-2xl font-bold">Workspace Settings</h1>
      <WorkspaceSettingsForm workspace={workspace} isManager={isManager} />
      <Separator />
      <MemberManagement workspaceId={workspace.id} isManager={isManager} />
      <Separator />
      <SocialConnections workspaceId={workspace.id} isManager={isManager} />
    </div>
  );
}
