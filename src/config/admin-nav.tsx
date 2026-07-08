import type { ComponentType } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  WandSparkles
} from "lucide-react";
import { permissions, type PermissionCode } from "@/config/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: PermissionCode;
};

export type AdminNavGroup = {
  /** Section caption shown above the group; empty string renders no caption. */
  label: string;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "",
    items: [{ href: "/admin", label: "Обзор", icon: LayoutDashboard, permission: permissions.dashboardRead }]
  },
  {
    label: "Работа",
    items: [
      { href: "/admin/calendar", label: "Календарь", icon: CalendarDays, permission: permissions.scheduleRead },
      { href: "/admin/leads", label: "Заявки", icon: ClipboardList, permission: permissions.leadsRead },
      { href: "/admin/appointments", label: "Записи", icon: CalendarClock, permission: permissions.appointmentsRead },
      { href: "/admin/clients", label: "Клиенты", icon: Users, permission: permissions.clientsRead }
    ]
  },
  {
    label: "Каталог",
    items: [
      { href: "/admin/services", label: "Услуги", icon: Sparkles, permission: permissions.contentRead },
      { href: "/admin/specialists", label: "Специалисты", icon: Stethoscope, permission: permissions.contentRead },
      { href: "/admin/schedule", label: "Расписание", icon: CalendarClock, permission: permissions.scheduleRead },
      { href: "/admin/content", label: "Контент", icon: WandSparkles, permission: permissions.contentRead }
    ]
  },
  {
    label: "Система",
    items: [
      { href: "/admin/notifications", label: "Уведомления", icon: Bell, permission: permissions.notificationsRead },
      { href: "/admin/analytics", label: "Аналитика", icon: BarChart3, permission: permissions.analyticsRead },
      { href: "/admin/users", label: "Пользователи", icon: ShieldCheck, permission: permissions.usersManage },
      { href: "/admin/audit", label: "Аудит", icon: ScrollText, permission: permissions.auditRead },
      { href: "/admin/settings", label: "Настройки", icon: Settings, permission: permissions.dashboardRead }
    ]
  }
];

/** Flat list of every nav item, kept for lookups and back-compat. */
export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => group.items);

export function isActiveNavHref(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
