import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { CreateHashtagRequest } from '@/types';

export async function GET(
  _request: Request,
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

  const { data: hashtags, error } = await admin
    .from('hashtag_bank')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('concept', { ascending: true, nullsFirst: false })
    .order('hashtag', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: hashtags });
}

export async function POST(
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

  const body: CreateHashtagRequest = await request.json();

  if (!body.hashtag?.trim()) {
    return NextResponse.json({ error: 'Hashtag is required' }, { status: 400 });
  }

  // Normalize: strip leading # if present
  const tag = body.hashtag.trim().replace(/^#/, '');

  const { data: hashtag, error } = await admin
    .from('hashtag_bank')
    .insert({
      workspace_id: workspaceId,
      hashtag: tag,
      concept: body.concept?.trim() || null,
      platforms: body.platforms || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: hashtag }, { status: 201 });
}
