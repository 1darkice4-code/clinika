import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Base path without query string, e.g. "/admin/clients". */
  basePath: string;
  /** Current query params to preserve (excluding `page`). */
  params?: Record<string, string | undefined>;
};

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function Pagination({ page, pageSize, total, basePath, params = {} }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(1, page), totalPages);
  const hasPrev = current > 1;
  const hasNext = current < totalPages;

  const linkClass = "inline-flex h-10 items-center gap-1 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted";
  const disabledClass = "pointer-events-none opacity-50";

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Link
        href={buildHref(basePath, params, current - 1)}
        aria-disabled={!hasPrev}
        className={cn(linkClass, !hasPrev && disabledClass)}
      >
        <ChevronLeft className="h-4 w-4" />
        Назад
      </Link>
      <span className="text-sm text-muted-foreground">
        Стр. {current} из {totalPages}
      </span>
      <Link
        href={buildHref(basePath, params, current + 1)}
        aria-disabled={!hasNext}
        className={cn(linkClass, !hasNext && disabledClass)}
      >
        Вперёд
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
