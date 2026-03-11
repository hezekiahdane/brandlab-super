import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM_EMAIL } from '@/lib/resend';
import { StatusChangeEmail } from '@/emails/status-change';
import { MentionEmail } from '@/emails/mention';
import type { NotificationType } from '@/types';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const { record } = payload;

    if (!record) {
      return NextResponse.json({ error: 'No record in payload' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the user's email
    const { data: userData, error: userError } =
      await admin.auth.admin.getUserById(record.user_id);

    if (userError || !userData?.user?.email) {
      console.error('Could not fetch user email:', userError?.message);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userEmail = userData.user.email;

    // Fetch workspace slug for building the link
    const { data: workspace } = await admin
      .from('workspaces')
      .select('slug')
      .eq('id', record.workspace_id)
      .single();

    const draftLink = workspace
      ? `${APP_URL}/${workspace.slug}/drafts/${record.draft_id}`
      : `${APP_URL}`;

    // Fetch draft title for email context
    const { data: draft } = await admin
      .from('content_drafts')
      .select('title')
      .eq('id', record.draft_id)
      .single();

    const draftTitle = draft?.title || 'Untitled Draft';
    const notificationType: NotificationType = record.type;

    // Choose email template based on notification type
    let emailSubject: string;
    let emailComponent: React.ReactElement;

    switch (notificationType) {
      case 'mention':
        emailSubject = `You were mentioned in "${draftTitle}"`;
        emailComponent = MentionEmail({
          draftTitle,
          message: record.message,
          link: draftLink,
        });
        break;

      case 'status_change':
      default:
        emailSubject = `Draft status updated: ${draftTitle}`;
        emailComponent = StatusChangeEmail({
          draftTitle,
          message: record.message,
          link: draftLink,
        });
        break;
    }

    // Send email via Resend
    const { error: emailError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: emailSubject,
      react: emailComponent,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json(
        { error: 'Email send failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
