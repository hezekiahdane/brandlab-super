import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { UpdateMemberRequest } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { workspaceId, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: UpdateMemberRequest = await request.json();
  if (!['manager', 'copy_assignee', 'creatives_assignee'].includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify caller is a manager
  const { data: callerMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || callerMembership.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can update member roles' }, { status: 403 });
  }

  // Get the target member
  const { data: member } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  if (member.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('workspace_members')
    .update({ role: body.role })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
  const { workspaceId, memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify caller is a manager
  const { data: callerMembership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || callerMembership.role !== 'manager') {
    return NextResponse.json({ error: 'Only managers can remove members' }, { status: 403 });
  }

  // Get the member being removed
  const { data: member } = await admin
    .from('workspace_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  // Cannot remove yourself
  if (member.user_id === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself from the workspace' }, { status: 400 });
  }

  // If removing a manager, ensure at least one other manager remains
  if (member.role === 'manager') {
    const { count } = await admin
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('role', 'manager');

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot remove the last manager' }, { status: 400 });
    }
  }

  const { error } = await admin
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}
