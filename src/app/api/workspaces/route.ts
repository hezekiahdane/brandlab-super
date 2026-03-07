import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { slugify, RESERVED_SLUGS } from '@/utils/slugify';
import type { CreateWorkspaceRequest } from '@/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: CreateWorkspaceRequest = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let slug = slugify(body.name);

  if (!slug) {
    return NextResponse.json({ error: 'Name must contain valid characters' }, { status: 400 });
  }

  if (RESERVED_SLUGS.includes(slug)) {
    slug = `${slug}-workspace`;
  }

  // Use admin client for write operations (bypasses RLS; auth already verified above)
  const admin = createAdminClient();

  // Check slug uniqueness
  const { data: existing } = await admin
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // Insert workspace
  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({
      name: body.name.trim(),
      slug,
      logo_url: body.logo_url || null,
      brand_color: body.brand_color || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (wsError) return NextResponse.json({ error: wsError.message }, { status: 500 });

  // Auto-add creator as manager
  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'manager',
      accepted_at: new Date().toISOString(),
    });

  if (memberError) {
    // Rollback workspace
    await admin.from('workspaces').delete().eq('id', workspace.id);
    return NextResponse.json({ error: 'Failed to create workspace membership' }, { status: 500 });
  }

  return NextResponse.json({ data: workspace }, { status: 201 });
}
