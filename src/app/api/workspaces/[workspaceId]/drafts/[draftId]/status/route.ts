import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { StatusTransitionRequest, ContentStatus } from '@/types';
import { canTransition, ALL_STATUSES } from '@/utils/status';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: StatusTransitionRequest = await request.json();
  if (!body.new_status || !ALL_STATUSES.includes(body.new_status as ContentStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  // Fetch draft
  const { data: draft } = await admin
    .from('content_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  // Validate transition
  if (!canTransition(draft.status, body.new_status, membership.role, user.id, draft)) {
    return NextResponse.json(
      { error: `Cannot transition from "${draft.status}" to "${body.new_status}" with your current role` },
      { status: 403 }
    );
  }

  // Build update payload
  const updates: Record<string, unknown> = { status: body.new_status };

  // When unscheduling, clear the publish date and Ayrshare post ID
  if (draft.status === 'scheduled' && body.new_status === 'for_scheduling') {
    updates.publish_at = null;
    updates.ayrshare_post_id = null;
  }

  // Perform transition
  const { data: updated, error } = await admin
    .from('content_drafts')
    .update(updates)
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: updated });
}
