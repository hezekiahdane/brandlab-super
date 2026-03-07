import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { UpdateAssetRequest } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; assetId: string }> }
) {
  const { workspaceId, assetId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  const body: UpdateAssetRequest = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.tags !== undefined) updates.tags = body.tags;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: asset, error } = await admin
    .from('draft_assets')
    .update(updates)
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  return NextResponse.json({ data: asset });
}
