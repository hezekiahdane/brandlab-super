import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { UpdateDraftRequest } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
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

  const { data: draft, error } = await admin
    .from('content_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  return NextResponse.json({ data: draft });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: UpdateDraftRequest = await request.json();

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

  // Build updates from non-undefined fields (status NOT allowed via PATCH)
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.master_caption !== undefined) updates.master_caption = body.master_caption;
  if (body.platform_overrides !== undefined) updates.platform_overrides = body.platform_overrides;
  if (body.target_platforms !== undefined) updates.target_platforms = body.target_platforms;
  if (body.publish_at !== undefined) updates.publish_at = body.publish_at;
  if (body.copy_assignee_id !== undefined) updates.copy_assignee_id = body.copy_assignee_id;
  if (body.creatives_assignee_id !== undefined) updates.creatives_assignee_id = body.creatives_assignee_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Only managers can change assignees
  if (
    (body.copy_assignee_id !== undefined || body.creatives_assignee_id !== undefined) &&
    membership.role !== 'manager'
  ) {
    return NextResponse.json({ error: 'Only managers can change assignees' }, { status: 403 });
  }

  const { data: draft, error } = await admin
    .from('content_drafts')
    .update(updates)
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  return NextResponse.json({ data: draft });
}
