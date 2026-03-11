import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ workspaceId: string; connectionId: string }> }
) {
  const { workspaceId, connectionId } = await params;
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
  const updates: Record<string, unknown> = {};

  if (body.is_default !== undefined) {
    // If setting as default, unset others for this platform first
    if (body.is_default) {
      const { data: connection } = await admin
        .from('social_connections')
        .select('platform')
        .eq('id', connectionId)
        .single();

      if (connection) {
        await admin
          .from('social_connections')
          .update({ is_default: false })
          .eq('workspace_id', workspaceId)
          .eq('platform', connection.platform)
          .is('revoked_at', null);
      }
    }
    updates.is_default = body.is_default;
  }

  if (body.access_token_enc) updates.access_token_enc = body.access_token_enc;
  if (body.refresh_token_enc !== undefined)
    updates.refresh_token_enc = body.refresh_token_enc;
  if (body.token_expires_at !== undefined)
    updates.token_expires_at = body.token_expires_at;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from('social_connections')
    .update(updates)
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  {
    params,
  }: { params: Promise<{ workspaceId: string; connectionId: string }> }
) {
  const { workspaceId, connectionId } = await params;
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

  // Soft-revoke
  const { error } = await admin
    .from('social_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
