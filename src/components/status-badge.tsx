'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/utils/status';
import type { ContentStatus } from '@/types';

export function StatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  const colors = STATUS_COLORS[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
