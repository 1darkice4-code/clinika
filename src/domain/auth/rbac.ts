import { ForbiddenError } from "@/lib/errors";
import type { PermissionCode } from "@/config/permissions";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  specialistId?: string | null;
};

export function hasPermission(user: AuthUser | null, permission: PermissionCode): boolean {
  return Boolean(user?.permissions.includes(permission));
}

export function assertPermission(user: AuthUser | null, permission: PermissionCode) {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenError();
  }
}

export function canAccessSpecialistScopedResource(user: AuthUser, specialistId: string): boolean {
  if (user.permissions.includes("appointments.write")) return true;
  return Boolean(user.specialistId && user.specialistId === specialistId);
}
