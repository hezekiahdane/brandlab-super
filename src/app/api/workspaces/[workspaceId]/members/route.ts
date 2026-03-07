import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { InviteMemberRequest } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use admin client for all DB operations (auth verified above)
  const admin = createAdminClient();

  // Verify user is a member
  const { data: myMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!myMembership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  const { data: members, error } = await admin
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('invited_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const userIds = members.map((m) => m.user_id);

  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data?.user?.email) {
      emailMap.set(uid, data.user.email);
    }
  }

  const membersWithEmails = members.map((m) => ({
    ...m,
    email: emailMap.get(m.user_id) || 'unknown',
  }));

  return NextResponse.json({ data: membersWithEmails });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: InviteMemberRequest = await request.json();
  if (!body.email?.trim()) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  if (!['manager', 'copy_assignee', 'creatives_assignee'].includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Verify caller is a manager
  const admin = createAdminClient();
  const { data: callerMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || callerMembership.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can invite members' }, { status: 403 });
  }

  // Look up user by email
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const targetUser = users.find((u) => u.email === body.email.trim().toLowerCase());

  if (!targetUser) {
    return NextResponse.json(
      { error: 'No account found for that email. The user must sign up first.' },
      { status: 404 }
    );
  }

  // Check if already a member
  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUser.id)
    .single();

  if (existingMember) {
    return NextResponse.json(
      { error: 'User is already a member of this workspace' },
      { status: 409 }
    );
  }

  // Insert member
  const { data: member, error } = await admin
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: targetUser.id,
      role: body.role,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...member, email: targetUser.email } }, { status: 201 });
}
