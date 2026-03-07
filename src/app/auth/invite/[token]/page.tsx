import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AcceptInviteClient } from '@/components/accept-invite-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in — show sign-in prompt
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Workspace Invitation</CardTitle>
            <CardDescription>Please sign in to accept this invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/auth/login?next=/auth/invite/${memberId}`}>Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the membership via admin client
  const admin = createAdminClient();
  const { data: member } = await admin
    .from('workspace_members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (!member || member.user_id !== user.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>This invitation is not valid or is not for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/workspaces">Go to Workspaces</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already accepted
  if (member.accepted_at) {
    const { data: workspace } = await admin
      .from('workspaces')
      .select('slug')
      .eq('id', member.workspace_id)
      .single();
    redirect(`/${workspace?.slug || 'workspaces'}/calendar`);
  }

  // Fetch workspace name
  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, name, slug')
    .eq('id', member.workspace_id)
    .single();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AcceptInviteClient
        workspaceId={member.workspace_id}
        workspaceName={workspace?.name || 'Unknown'}
        workspaceSlug={workspace?.slug || ''}
        memberId={member.id}
        role={member.role}
      />
    </div>
  );
}
