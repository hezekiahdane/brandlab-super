import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { CreateDraftRequest, ContentStatus } from '@/types';
import { ALL_STATUSES } from '@/utils/status';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  // Parse query params
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const assignee = url.searchParams.get('assignee');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = admin
    .from('content_drafts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);

  if (status && ALL_STATUSES.includes(status as ContentStatus)) {
    query = query.eq('status', status);
  }
  if (assignee) {
    query = query.or(
      `copy_assignee_id.eq.${assignee},creatives_assignee_id.eq.${assignee},manager_id.eq.${assignee}`
    );
  }
  if (from) {
    query = query.gte('publish_at', from);
  }
  if (to) {
    query = query.lte('publish_at', to);
  }

  const { data: drafts, error } = await query.order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: drafts });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateDraftRequest = await request.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  // Set manager_id: if user is manager, use their id; otherwise find a manager
  let managerId = user.id;
  if (membership.role !== 'manager') {
    const { data: manager } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'manager')
      .limit(1)
      .single();
    if (manager) managerId = manager.user_id;
  }

  const { data: draft, error } = await admin
    .from('content_drafts')
    .insert({
      workspace_id: workspaceId,
      title: body.title.trim(),
      status: 'idea',
      target_platforms: body.target_platforms || [],
      publish_at: body.publish_at || null,
      copy_assignee_id: body.copy_assignee_id || null,
      creatives_assignee_id: body.creatives_assignee_id || null,
      manager_id: managerId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: draft }, { status: 201 });
}
