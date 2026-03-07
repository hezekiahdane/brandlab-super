import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { CreateCommentRequest } from '@/types';
import { extractMentions } from '@/utils/mentions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  // Fetch internal comments
  const { data: comments, error } = await admin
    .from('comments')
    .select('*')
    .eq('draft_id', draftId)
    .eq('workspace_id', workspaceId)
    .eq('type', 'internal')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve author emails
  const authorIds = [...new Set(comments.map((c) => c.author_user_id).filter(Boolean))];
  const emailMap = new Map<string, string>();

  for (const uid of authorIds) {
    const { data } = await admin.auth.admin.getUserById(uid as string);
    if (data?.user?.email) {
      emailMap.set(uid as string, data.user.email);
    }
  }

  const commentsWithEmails = comments.map((c) => ({
    ...c,
    author_email: c.author_user_id ? emailMap.get(c.author_user_id) || 'unknown' : null,
  }));

  return NextResponse.json({ data: commentsWithEmails });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateCommentRequest = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify membership
  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 });
  }

  // Insert comment
  const { data: comment, error: insertError } = await admin
    .from('comments')
    .insert({
      draft_id: draftId,
      workspace_id: workspaceId,
      type: 'internal',
      author_user_id: user.id,
      body: body.body.trim(),
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Resolve @mentions and create notifications
  const { data: members } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId);

  if (members && members.length > 0) {
    // Get emails for all members
    const membersWithEmails: { user_id: string; email: string }[] = [];
    for (const m of members) {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      if (data?.user?.email) {
        membersWithEmails.push({ user_id: m.user_id, email: data.user.email });
      }
    }

    const mentioned = extractMentions(body.body, membersWithEmails, user.id);

    if (mentioned.length > 0) {
      // Get draft title and author email for notification message
      const { data: draft } = await admin
        .from('content_drafts')
        .select('title')
        .eq('id', draftId)
        .single();

      const authorMember = membersWithEmails.find((m) => m.user_id === user.id);
      const authorLabel = authorMember?.email || 'Someone';
      const draftTitle = draft?.title || 'Untitled';

      const notifications = mentioned.map((m) => ({
        user_id: m.userId,
        workspace_id: workspaceId,
        draft_id: draftId,
        type: 'mention' as const,
        message: `${authorLabel} mentioned you in "${draftTitle}"`,
      }));

      await admin.from('notifications').insert(notifications);
    }
  }

  // Return comment with author email
  const { data: authorData } = await admin.auth.admin.getUserById(user.id);

  return NextResponse.json(
    { data: { ...comment, author_email: authorData?.user?.email || 'unknown' } },
    { status: 201 }
  );
}
