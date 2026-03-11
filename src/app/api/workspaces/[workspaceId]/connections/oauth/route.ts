import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * OAuth initiation stub.
 * In M13 (Ayrshare integration), this will:
 * 1. Create an Ayrshare profile for the workspace (if none)
 * 2. Generate the OAuth URL for the requested platform
 * 3. Redirect the user to the platform's OAuth consent screen
 *
 * For now, it returns a placeholder success response.
 */
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
  const { platform } = body;

  if (!platform) {
    return NextResponse.json(
      { error: 'platform is required' },
      { status: 400 }
    );
  }

  // TODO (M13): Implement real Ayrshare OAuth flow
  // 1. Call Ayrshare API to create/get profile
  // 2. Generate OAuth URL for the platform
  // 3. Store state param for CSRF protection
  // 4. Return { oauth_url } for client redirect

  return NextResponse.json({
    message: `OAuth flow for ${platform} is not yet implemented. This will be available in a future update.`,
    stub: true,
  });
}
