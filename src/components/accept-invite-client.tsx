'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
  manager: 'Manager',
  copy_assignee: 'Copy Assignee',
  creatives_assignee: 'Creatives Assignee',
};

export function AcceptInviteClient({
  workspaceId,
  workspaceName,
  workspaceSlug,
  memberId,
  role,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  memberId: string;
  role: UserRole;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    const res = await fetch(
      `/api/workspaces/${workspaceId}/members/${memberId}/accept`,
      { method: 'POST' }
    );

    if (res.ok) {
      router.push(`/${workspaceSlug}/calendar`);
    } else {
      setLoading(false);
    }
  }

  async function handleDecline() {
    setLoading(true);
    await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });
    router.push('/workspaces');
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Workspace Invitation</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join <strong>{workspaceName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Your role:</p>
          <Badge className="mt-1">{roleLabels[role]}</Badge>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleAccept} disabled={loading} className="flex-1">
            {loading ? 'Accepting...' : 'Accept'}
          </Button>
          <Button variant="outline" onClick={handleDecline} disabled={loading} className="flex-1">
            Decline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
