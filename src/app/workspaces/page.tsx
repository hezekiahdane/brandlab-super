import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { UserMenu } from '@/components/user-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Workspace } from '@/types';

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  const items: Workspace[] = workspaces ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Brandlab Super</h1>
        <UserMenu />
      </header>
      <main className="mx-auto max-w-4xl p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Workspaces</h2>
          <Button asChild>
            <Link href="/workspaces/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have any workspaces yet. Create one to get started.
            </p>
            <Button asChild className="mt-4">
              <Link href="/workspaces/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Workspace
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((ws) => (
              <Link key={ws.id} href={`/${ws.slug}/calendar`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                    {ws.brand_color && (
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: ws.brand_color }}
                      />
                    )}
                    <CardTitle className="truncate text-base">{ws.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">/{ws.slug}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
