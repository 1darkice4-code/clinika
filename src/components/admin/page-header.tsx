import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Small uppercase label rendered above the title. */
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  /** Buttons / links rendered on the right (desktop) or below (mobile). */
  actions?: ReactNode;
  className?: string;
};

/**
 * Standard page header used across the admin. Keeps title, supporting copy and
 * primary actions aligned and responsive on every screen.
 */
export function PageHeader({ title, description, eyebrow, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:inline-flex">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
          )}
          <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description && (
            <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
