import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify membership — must be manager
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role !== 'manager') {
    return NextResponse.json(
      { error: 'Only managers can permanently delete drafts' },
      { status: 403 }
    );
  }

  // Fetch draft — must already be archived
  const { data: draft } = await admin
    .from('content_drafts')
    .select('id, workspace_id, archived_at')
    .eq('id', draftId)
    .eq('workspace_id', workspaceId)
    .not('archived_at', 'is', null)
    .single();

  if (!draft) {
    return NextResponse.json(
      { error: 'Archived draft not found. Only archived drafts can be permanently deleted.' },
      { status: 404 }
    );
  }

  // Delete associated assets from Storage
  const { data: assets } = await admin
    .from('draft_assets')
    .select('storage_path')
    .eq('draft_id', draftId);

  if (assets && assets.length > 0) {
    const paths = assets.map((a: { storage_path: string }) => a.storage_path);
    await admin.storage.from('assets').remove(paths);
  }

  // Hard delete the draft row (cascades to draft_assets, comments, notifications via FK)
  const { error } = await admin
    .from('content_drafts')
    .delete()
    .eq('id', draftId)
    .eq('workspace_id', workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { deleted: true } });
}
