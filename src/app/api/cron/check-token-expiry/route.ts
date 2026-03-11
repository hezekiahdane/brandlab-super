import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find connections expiring within 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data: expiringConnections, error } = await admin
    .from('social_connections')
    .select('id, workspace_id, platform, account_name, token_expires_at')
    .is('revoked_at', null)
    .not('token_expires_at', 'is', null)
    .lte('token_expires_at', sevenDaysFromNow.toISOString())
    .gt('token_expires_at', new Date().toISOString());

  if (error) {
    console.error('[cron] check-token-expiry error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiringConnections || expiringConnections.length === 0) {
    return NextResponse.json({ success: true, notified: 0 });
  }

  let notified = 0;

  for (const conn of expiringConnections) {
    // Find managers in this workspace to notify
    const { data: managers } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', conn.workspace_id)
      .eq('role', 'manager')
      .is('removed_at', null);

    if (!managers) continue;

    for (const manager of managers) {
      // Check if we already sent a token_expiry notification recently for this connection
      const { data: existing } = await admin
        .from('notifications')
        .select('id')
        .eq('user_id', manager.user_id)
        .eq('workspace_id', conn.workspace_id)
        .eq('type', 'token_expiry')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        )
        .limit(1);

      if (existing && existing.length > 0) continue; // Already notified recently

      const daysLeft = Math.ceil(
        (new Date(conn.token_expires_at!).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      await admin.from('notifications').insert({
        user_id: manager.user_id,
        workspace_id: conn.workspace_id,
        draft_id: conn.id, // Using connection ID as reference
        type: 'token_expiry',
        message: `${conn.account_name} (${conn.platform}) token expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please reconnect.`,
      });

      notified++;
    }
  }

  console.log(
    `[cron] check-token-expiry: notified ${notified} managers about ${expiringConnections.length} expiring connections`
  );

  return NextResponse.json({ success: true, notified });
}
