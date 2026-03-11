import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify membership
  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .is('removed_at', null)
    .single();

  if (!member)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await admin
    .from('social_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('revoked_at', null)
    .order('connected_at', { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify manager role
  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .is('removed_at', null)
    .single();

  if (!member || member.role !== 'manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const {
    platform,
    account_name,
    account_id,
    access_token_enc,
    ayrshare_profile_key,
    is_default,
  } = body;

  if (!platform || !account_name || !account_id || !access_token_enc) {
    return NextResponse.json(
      { error: 'platform, account_name, account_id, and access_token_enc are required' },
      { status: 400 }
    );
  }

  // If this is being set as default, unset other defaults for this platform
  if (is_default) {
    await admin
      .from('social_connections')
      .update({ is_default: false })
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .is('revoked_at', null);
  }

  const { data, error } = await admin
    .from('social_connections')
    .insert({
      workspace_id: workspaceId,
      platform,
      account_name,
      account_id,
      access_token_enc,
      ayrshare_profile_key: ayrshare_profile_key || '',
      is_default: is_default ?? false,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
