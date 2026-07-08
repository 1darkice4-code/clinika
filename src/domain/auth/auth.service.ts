import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { addMinutes } from "@/lib/date-time";
import { createOpaqueToken, hashNullable, sha256 } from "@/lib/crypto";
import { UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/domain/auth/rbac";

export const sessionCookieName = "clinic_session";

type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export async function signIn(email: string, password: string, meta: RequestMeta = {}) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const ipHash = hashNullable(meta.ip);
  const userAgentHash = hashNullable(meta.userAgent);

  if (!user || user.status !== "ACTIVE") {
    await prisma.loginAttempt.create({
      data: { email: normalizedEmail, success: false, ipHash, userAgentHash }
    });
    throw new UnauthorizedError("Неверный email или пароль");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await prisma.loginAttempt.create({
      data: { userId: user.id, email: normalizedEmail, success: false, ipHash, userAgentHash }
    });
    throw new UnauthorizedError("Вход временно ограничен. Попробуйте позже");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedLoginCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil: failedLoginCount >= 5 ? addMinutes(new Date(), 15) : null
      }
    });
    await prisma.loginAttempt.create({
      data: { userId: user.id, email: normalizedEmail, success: false, ipHash, userAgentHash }
    });
    throw new UnauthorizedError("Неверный email или пароль");
  }

  const token = createOpaqueToken();
  const expiresAt = addMinutes(new Date(), 60 * 24 * 14);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
    }),
    prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt,
        ipHash,
        userAgentHash
      }
    }),
    prisma.loginAttempt.create({
      data: { userId: user.id, email: normalizedEmail, success: true, ipHash, userAgentHash }
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.login",
        entityType: "User",
        entityId: user.id,
        description: "Пользователь вошел в систему",
        ipHash,
        userAgentHash
      }
    })
  ]);

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await prisma.userSession.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const session = await prisma.userSession.findFirst({
    where: {
      tokenHash: sha256(token),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        include: {
          specialist: { select: { id: true } },
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!session || session.user.status !== "ACTIVE") return null;

  const roles = session.user.roles.map((item) => item.role.code);
  const permissions = [
    ...new Set(
      session.user.roles.flatMap((item) =>
        item.role.permissions.map((rolePermission) => rolePermission.permission.code)
      )
    )
  ];

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roles,
    permissions,
    specialistId: session.user.specialist?.id
  };
}
