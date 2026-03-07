import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: Record<string, string> = {
    supabase_url: url ? 'set' : 'MISSING',
    anon_key: anonKey?.startsWith('eyJ') ? 'valid JWT' : 'INVALID FORMAT',
    service_role_key: serviceKey?.startsWith('eyJ') ? 'valid JWT' : 'INVALID FORMAT',
  };

  // Test actual connection with anon key
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      const { error } = await supabase.auth.getSession();
      checks.anon_connection = error ? `error: ${error.message}` : 'connected';
    } catch (e) {
      checks.anon_connection = `failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  const allGood =
    checks.supabase_url === 'set' &&
    checks.anon_key === 'valid JWT' &&
    checks.service_role_key === 'valid JWT' &&
    checks.anon_connection === 'connected';

  return NextResponse.json({ status: allGood ? 'ok' : 'issues', checks });
}
