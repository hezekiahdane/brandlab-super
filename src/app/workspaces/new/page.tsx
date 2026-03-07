import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreateWorkspaceForm } from '@/components/create-workspace-form';
import { Button } from '@/components/ui/button';

export default async function NewWorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 border-b px-6 py-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workspaces">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Create Workspace</h1>
      </header>
      <main className="mx-auto max-w-lg p-8">
        <CreateWorkspaceForm />
      </main>
    </div>
  );
}
