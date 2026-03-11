'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLATFORM_LABELS, PLATFORM_ORDER } from '@/utils/platform';
import type { SocialPlatform } from '@/types';

interface PlatformHeatmapToggleProps {
  value: SocialPlatform | 'none';
  onChange: (value: SocialPlatform | 'none') => void;
}

export function PlatformHeatmapToggle({
  value,
  onChange,
}: PlatformHeatmapToggleProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as SocialPlatform | 'none')}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Heatmap overlay" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No heatmap</SelectItem>
        {PLATFORM_ORDER.map((platform) => (
          <SelectItem key={platform} value={platform}>
            {PLATFORM_LABELS[platform]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
