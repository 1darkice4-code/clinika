"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { adminNavGroups, isActiveNavHref, type AdminNavGroup } from "@/config/admin-nav";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  SPECIALIST: "Специалист"
};

const rolePriority = ["OWNER", "ADMIN", "SPECIALIST"];

function primaryRoleLabel(roles: string[]): string {
  const primary = rolePriority.find((role) => roles.includes(role)) ?? roles[0];
  return primary ? (roleLabels[primary] ?? primary) : "Сотрудник";
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="font-semibold leading-none">
        <span className="brand-word-tight text-lg">Сияние</span>{" "}
        <span className="text-muted-foreground">CRM</span>
      </span>
    </div>
  );
}

function NavGroups({
  groups,
  pathname,
  onNavigate
}: {
  groups: AdminNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-5 px-3 py-2">
      {groups.map((group, index) => (
        <div key={group.label || `group-${index}`}>
          {group.label && (
            <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
          )}
          <div className="grid gap-0.5">
            {group.items.map((item) => {
              const active = isActiveNavHref(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <item.icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ userName, roles }: { userName: string; roles: string[] }) {
  const initials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
        {initials || "?"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="truncate text-xs text-muted-foreground">{primaryRoleLabel(roles)}</p>
      </div>
    </div>
  );
}

export function AdminNav({
  permissions: userPermissions,
  userName,
  roles
}: {
  permissions: string[];
  userName: string;
  roles: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => userPermissions.includes(item.permission))
    }))
    .filter((group) => group.items.length > 0);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card/80 backdrop-blur lg:flex">
        <div className="flex items-center justify-between px-5 py-4">
          <Brand />
        </div>
        <div className="border-y py-3">
          <UserBlock userName={userName} roles={roles} />
        </div>
        <div className="scrollbar-hidden flex-1 overflow-y-auto">
          <NavGroups groups={visibleGroups} pathname={pathname} />
        </div>
        <div className="flex items-center gap-2 border-t p-3">
          <ThemeToggle />
          <div className="flex-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Открыть меню"
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="scrollbar-hidden absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r bg-card shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-y py-3">
              <UserBlock userName={userName} roles={roles} />
            </div>
            <div className="scrollbar-hidden flex-1 overflow-y-auto">
              <NavGroups groups={visibleGroups} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t p-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
