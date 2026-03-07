'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InviteMemberForm } from '@/components/invite-member-form';
import { Trash2 } from 'lucide-react';
import type { WorkspaceMemberWithEmail, UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
  manager: 'Manager',
  copy_assignee: 'Copy Assignee',
  creatives_assignee: 'Creatives Assignee',
};

export function MemberManagement({
  workspaceId,
  isManager,
}: {
  workspaceId: string;
  isManager: boolean;
}) {
  const [members, setMembers] = useState<WorkspaceMemberWithEmail[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`);
    const json = await res.json();
    if (json.data) setMembers(json.data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleRoleChange(memberId: string, role: string) {
    await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    fetchMembers();
  }

  async function handleRemove(memberId: string) {
    await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });
    fetchMembers();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isManager && <InviteMemberForm workspaceId={workspaceId} onInvited={fetchMembers} />}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading members...</p>
        ) : (
          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={m.accepted_at ? 'default' : 'secondary'} className="text-xs">
                        {m.accepted_at ? roleLabels[m.role] : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isManager && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={m.role}
                      onValueChange={(value) => handleRoleChange(m.id, value)}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="copy_assignee">Copy Assignee</SelectItem>
                        <SelectItem value="creatives_assignee">Creatives Assignee</SelectItem>
                      </SelectContent>
                    </Select>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove Member</DialogTitle>
                          <DialogDescription>
                            Remove {m.email} from this workspace? They will lose access to all workspace content.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="destructive" onClick={() => handleRemove(m.id)}>
                            Remove
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
