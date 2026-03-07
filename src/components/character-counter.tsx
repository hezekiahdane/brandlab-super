'use client';

import { cn } from '@/lib/utils';

export function CharacterCounter({
  current,
  max,
  className,
}: {
  current: number;
  max: number;
  className?: string;
}) {
  const remaining = max - current;
  const isOver = remaining < 0;
  const isWarning = remaining >= 0 && remaining <= Math.floor(max * 0.1);

  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        isOver
          ? 'text-red-600 font-semibold'
          : isWarning
            ? 'text-amber-600'
            : 'text-muted-foreground',
        className
      )}
    >
      {current}/{max}
      {isOver && ` (${Math.abs(remaining)} over limit)`}
    </span>
  );
}
