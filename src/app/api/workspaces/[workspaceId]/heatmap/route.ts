import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = params;
  const platform = req.nextUrl.searchParams.get('platform');

  if (!platform) {
    return NextResponse.json(
      { error: 'platform query parameter is required' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verify membership
  const { data: member } = await admin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .is('removed_at', null)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Try workspace-specific heatmap data first
  let { data } = await admin
    .from('heatmap_cache')
    .select('day_of_week, hour_utc, score')
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)
    .order('day_of_week')
    .order('hour_utc');

  // Fall back to global defaults (workspace_id IS NULL)
  if (!data || data.length === 0) {
    const { data: globalData } = await admin
      .from('heatmap_cache')
      .select('day_of_week, hour_utc, score')
      .is('workspace_id', null)
      .eq('platform', platform)
      .order('day_of_week')
      .order('hour_utc');

    data = globalData;
  }

  return NextResponse.json({ data: data || [] });
}
