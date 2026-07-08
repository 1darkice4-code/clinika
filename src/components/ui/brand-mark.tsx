"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * "Сияние" brand mark — a gold four-point star with a small companion twinkle,
 * filled with a soft gold gradient. Frameless. Scales cleanly from ~20px up.
 * The gradient id is instance-unique (via useId) so multiple marks on a page
 * don't collide, and server/client markup stays hydration-stable.
 */

// Concave four-point star centered at (cx,cy): outer radius R, waist k.
function starPath(cx: number, cy: number, R: number, k: number) {
  return `M${cx} ${cy - R} C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + R} ${cy} C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + R} C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - R} ${cy} C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - R} Z`;
}

export function BrandMark({ className }: { className?: string }) {
  const gradId = `brandGold-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 48 48" className={cn("h-6 w-6", className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6c78d" />
          <stop offset="0.5" stopColor="#c49a5f" />
          <stop offset="1" stopColor="#8a6535" />
        </linearGradient>
      </defs>
      <path d={starPath(21, 26, 16, 5)} fill={`url(#${gradId})`} />
      <path d={starPath(37, 12, 6, 2)} fill={`url(#${gradId})`} />
    </svg>
  );
}
