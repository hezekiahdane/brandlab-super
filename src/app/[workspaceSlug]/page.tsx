import { redirect } from 'next/navigation';

export default async function WorkspaceIndexPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  redirect(`/${workspaceSlug}/calendar`);
}
