import type { UserStatus } from "@prisma/client/index";

export const userStatusLabels = {
  ACTIVE: "Активен",
  INVITED: "Приглашен",
  BLOCKED: "Заблокирован",
  DELETED: "Удален"
} satisfies Record<UserStatus, string>;

export const userStatusClasses = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  INVITED: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  BLOCKED: "border-rose-500/30 bg-rose-500/10 text-rose-600",
  DELETED: "border-muted-foreground/30 bg-muted text-muted-foreground"
} satisfies Record<UserStatus, string>;

export const roleLabels: Record<string, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  SPECIALIST: "Специалист"
};

export function roleLabel(code: string): string {
  return roleLabels[code] ?? code;
}
