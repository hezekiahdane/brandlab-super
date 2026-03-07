'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PLATFORM_ORDER, PLATFORM_LABELS } from '@/utils/platform';
import type { SocialPlatform } from '@/types';

export function PlatformCheckboxGroup({
  value,
  onChange,
  disabled,
}: {
  value: SocialPlatform[];
  onChange: (platforms: SocialPlatform[]) => void;
  disabled?: boolean;
}) {
  function toggle(platform: SocialPlatform) {
    if (value.includes(platform)) {
      onChange(value.filter((p) => p !== platform));
    } else {
      onChange([...value, platform]);
    }
  }

  return (
    <div className="flex flex-wrap gap-4">
      {PLATFORM_ORDER.map((platform) => (
        <div key={platform} className="flex items-center gap-2">
          <Checkbox
            id={`platform-${platform}`}
            checked={value.includes(platform)}
            onCheckedChange={() => toggle(platform)}
            disabled={disabled}
          />
          <Label
            htmlFor={`platform-${platform}`}
            className="text-sm font-normal cursor-pointer"
          >
            {PLATFORM_LABELS[platform]}
          </Label>
        </div>
      ))}
    </div>
  );
}
