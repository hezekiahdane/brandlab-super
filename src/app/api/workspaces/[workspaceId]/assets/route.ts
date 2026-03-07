import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
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

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');

  let query = admin
    .from('draft_assets')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('uploaded_at', { ascending: false });

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data: assets, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Refresh signed URLs
  const refreshed = await Promise.all(
    (assets || []).map(async (asset) => {
      const { data } = await admin.storage
        .from('assets')
        .createSignedUrl(asset.storage_path, 3600);
      return { ...asset, cdn_url: data?.signedUrl || asset.cdn_url };
    })
  );

  return NextResponse.json({ data: refreshed });
}
