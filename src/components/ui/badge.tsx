import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  /**
   * Preset colour. Status badges pass their own colours via `className`, which
   * wins over the tone thanks to tailwind-merge ordering.
   */
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "outline";
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-transparent bg-muted text-muted-foreground",
  primary: "border-transparent bg-primary/15 text-primary",
  success: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "border-transparent bg-destructive/15 text-destructive",
  outline: "border-border bg-transparent text-muted-foreground"
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
