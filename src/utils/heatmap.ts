/**
 * Convert a heatmap engagement score (0.0–1.0) to a background colour string.
 * Transparent at 0, warm amber at 1, for overlaying on calendar slots.
 */
export function scoreToColor(score: number): string {
  // Clamp
  const s = Math.max(0, Math.min(1, score));
  if (s === 0) return 'transparent';

  // Amber-ish gradient:  from almost invisible amber to a saturated amber
  // rgb(245, 158, 11) = Tailwind amber-500
  const alpha = 0.08 + s * 0.32; // range 0.08 → 0.40
  return `rgba(245, 158, 11, ${alpha.toFixed(2)})`;
}

/**
 * Build a lookup key for heatmap data: "dayOfWeek_hourUtc"
 * dayOfWeek: 0 = Sunday … 6 = Saturday
 * hourUtc: 0–23
 */
export function heatmapKey(day: number, hour: number): string {
  return `${day}_${hour}`;
}
