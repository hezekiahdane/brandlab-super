import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GlobalSidebar } from '@/components/global-sidebar';

export default async function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen">
      <GlobalSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
