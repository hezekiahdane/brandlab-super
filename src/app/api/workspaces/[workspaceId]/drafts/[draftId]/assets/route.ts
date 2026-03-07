import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import type { AssetFileType } from '@/types';

const ALLOWED_MIME: Record<string, AssetFileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
};

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  };
  return map[mime] || 'bin';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
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

  const { data: assets, error } = await admin
    .from('draft_assets')
    .select('*')
    .eq('draft_id', draftId)
    .eq('workspace_id', workspaceId)
    .order('uploaded_at', { ascending: true });

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; draftId: string }> }
) {
  const { workspaceId, draftId } = await params;
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

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const platformTarget = formData.get('platform_target') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // MIME validation
  const fileType = ALLOWED_MIME[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: `File type ${file.type} is not allowed. Accepted: ${Object.keys(ALLOWED_MIME).join(', ')}` },
      { status: 400 }
    );
  }

  // Size validation
  const maxSize = fileType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const limitMB = maxSize / (1024 * 1024);
    return NextResponse.json(
      { error: `File size exceeds ${limitMB}MB limit` },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const ext = getExtension(file.type);
  const fileId = crypto.randomUUID();
  const storagePath = `${workspaceId}/${draftId}/${fileId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('assets')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Generate signed URL
  const { data: signedData } = await admin.storage
    .from('assets')
    .createSignedUrl(storagePath, 3600);

  const cdnUrl = signedData?.signedUrl || '';

  // Insert asset record
  const { data: asset, error: insertError } = await admin
    .from('draft_assets')
    .insert({
      draft_id: draftId,
      workspace_id: workspaceId,
      storage_path: storagePath,
      cdn_url: cdnUrl,
      file_type: fileType,
      source: 'upload',
      platform_target: platformTarget,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded file on DB insert failure
    await admin.storage.from('assets').remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: asset }, { status: 201 });
}
