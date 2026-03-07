/**
 * Run the initial migration against Supabase.
 * Usage: npx tsx scripts/run-migration.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const safeUrl: string = url;
const safeKey: string = key;

const supabase = createClient(safeUrl, safeKey);

async function runMigration() {
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '00001_initial_schema.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('Running migration...');
  const { error } = await supabase.rpc('', {} as never).throwOnError();

  // Use the REST endpoint to execute raw SQL
  const res = await fetch(`${safeUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      apikey: safeKey,
      Authorization: `Bearer ${safeKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Actually, we need to use the SQL editor approach.
  // The simplest way is to use the Supabase Management API or the SQL editor in the dashboard.
  console.log('');
  console.log('=== MIGRATION SQL READY ===');
  console.log('The migration file is at: supabase/migrations/00001_initial_schema.sql');
  console.log('');
  console.log('To apply it, go to your Supabase dashboard:');
  console.log(`  ${safeUrl.replace('.supabase.co', '.supabase.co')}`);
  console.log('  → SQL Editor → New query → Paste the migration SQL → Run');
  console.log('');
  console.log('Or install the Supabase CLI and run:');
  console.log('  npx supabase db push');
}

runMigration().catch(console.error);
