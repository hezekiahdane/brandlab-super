import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { workspaceId, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use admin client to bypass RLS for accepting invites
  const admin = createAdminClient();

  // Fetch the membership row
  const { data: member, error: fetchError } = await admin
    .from('workspace_members')
    .select('*')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single();

  if (fetchError || !member) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  // Verify the authenticated user matches the invited user
  if (member.user_id !== user.id) {
    return NextResponse.json({ error: 'This invitation is not for you' }, { status: 403 });
  }

  if (member.accepted_at) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 400 });
  }

  // Accept the invite
  const { error: updateError } = await admin
    .from('workspace_members')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', memberId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fetch workspace for redirect info
  const { data: workspace } = await admin
    .from('workspaces')
    .select('slug')
    .eq('id', workspaceId)
    .single();

  return NextResponse.json({ data: { accepted: true, slug: workspace?.slug } });
}
