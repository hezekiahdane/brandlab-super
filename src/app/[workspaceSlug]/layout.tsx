import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { Sidebar } from '@/components/sidebar';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Resolve workspace from slug
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', workspaceSlug)
    .is('archived_at', null)
    .single();

  if (!workspace) redirect('/workspaces');

  // Verify membership
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/workspaces');

  return (
    <WorkspaceProvider workspace={workspace} membership={membership}>
      <div className="flex h-screen">
        <Sidebar workspace={workspace} membership={membership} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
