import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string; assetId: string }> }
) {
  const { workspaceId, draftId, assetId } = await params;
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

  // Fetch asset to get storage path
  const { data: asset } = await admin
    .from('draft_assets')
    .select('*')
    .eq('id', assetId)
    .eq('draft_id', draftId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Delete from storage
  await admin.storage.from('assets').remove([asset.storage_path]);

  // Delete DB record
  const { error } = await admin
    .from('draft_assets')
    .delete()
    .eq('id', assetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
