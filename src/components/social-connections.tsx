'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Unplug } from 'lucide-react';
import { PLATFORM_LABELS, PLATFORM_ORDER } from '@/utils/platform';
import type { SocialConnection, SocialPlatform } from '@/types';

interface SocialConnectionsProps {
  workspaceId: string;
  isManager: boolean;
}

type HealthStatus = 'active' | 'expiring' | 'expired';

function getHealthStatus(connection: SocialConnection): HealthStatus {
  if (connection.revoked_at) return 'expired';
  if (!connection.token_expires_at) return 'active';

  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const daysUntilExpiry =
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiry < 7) return 'expired';
  if (daysUntilExpiry < 30) return 'expiring';
  return 'active';
}

function HealthBadge({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
          Active
        </Badge>
      );
    case 'expiring':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
          Expiring
        </Badge>
      );
    case 'expired':
      return (
        <Badge variant="destructive">Expired</Badge>
      );
  }
}

export function SocialConnections({
  workspaceId,
  isManager,
}: SocialConnectionsProps) {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | ''>('');
  const [connecting, setConnecting] = useState(false);

  const fetchConnections = useCallback(async () => {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/connections`
    );
    const json = await res.json();
    if (json.data) setConnections(json.data);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  async function handleConnect() {
    if (!selectedPlatform) return;
    setConnecting(true);

    const res = await fetch(
      `/api/workspaces/${workspaceId}/connections/oauth`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform }),
      }
    );

    const json = await res.json();

    if (json.oauth_url) {
      // In M13, this will redirect to the OAuth URL
      window.location.href = json.oauth_url;
    } else {
      // Stub response — show message
      alert(json.message || 'OAuth integration coming soon.');
    }

    setConnecting(false);
    setConnectDialogOpen(false);
    setSelectedPlatform('');
  }

  async function handleDisconnect(connectionId: string) {
    await fetch(
      `/api/workspaces/${workspaceId}/connections/${connectionId}`,
      { method: 'DELETE' }
    );
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }

  async function handleToggleDefault(
    connectionId: string,
    newValue: boolean
  ) {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/connections/${connectionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: newValue }),
      }
    );
    const json = await res.json();
    if (json.data) {
      // Refetch to get updated defaults across all connections
      fetchConnections();
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Social Connections</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Social Connections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your social media accounts to publish content directly.
          </p>
        </div>

        {isManager && (
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Social Account</DialogTitle>
                <DialogDescription>
                  Select a platform to connect. You&apos;ll be redirected to
                  authorize access.
                </DialogDescription>
              </DialogHeader>

              <Select
                value={selectedPlatform}
                onValueChange={(v) =>
                  setSelectedPlatform(v as SocialPlatform)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DialogFooter>
                <Button
                  onClick={handleConnect}
                  disabled={!selectedPlatform || connecting}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No social accounts connected yet.
              {isManager
                ? ' Click "Connect Account" to get started.'
                : ' Ask a manager to connect social accounts.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {connections.map((connection) => {
            const health = getHealthStatus(connection);
            return (
              <Card key={connection.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {PLATFORM_LABELS[connection.platform] || connection.platform}
                      </CardTitle>
                      <HealthBadge status={health} />
                    </div>
                    {isManager && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Unplug className="mr-1 h-3.5 w-3.5" />
                            Disconnect
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Disconnect {PLATFORM_LABELS[connection.platform]}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revoke access to{' '}
                              {connection.account_name}. You can reconnect
                              later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleDisconnect(connection.id)
                              }
                            >
                              Disconnect
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {connection.account_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Connected{' '}
                        {new Date(connection.connected_at).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </p>
                    </div>
                    {isManager && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`default-${connection.id}`}
                          checked={connection.is_default}
                          onCheckedChange={(checked) =>
                            handleToggleDefault(connection.id, checked)
                          }
                        />
                        <Label
                          htmlFor={`default-${connection.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Default
                        </Label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
