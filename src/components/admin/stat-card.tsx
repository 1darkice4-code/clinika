import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "primary" | "success" | "warning" | "danger";

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
  tone?: StatTone;
};

const toneRing: Record<StatTone, string> = {
  default: "",
  primary: "before:bg-primary",
  success: "before:bg-emerald-500",
  warning: "before:bg-amber-500",
  danger: "before:bg-destructive"
};

const iconTone: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/12 text-primary",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  danger: "bg-destructive/12 text-destructive"
};

export function StatCard({ label, value, hint, icon: Icon, href, tone = "default" }: StatCardProps) {
  const body = (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-lg border bg-card p-5 shadow-sm transition",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        toneRing[tone],
        href && "hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", iconTone[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {hint}
          {href && <ArrowUpRight className="h-3 w-3" />}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full focus-visible:outline-none">
        {body}
      </Link>
    );
  }
  return body;
}
