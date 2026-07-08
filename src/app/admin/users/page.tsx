import { ShieldCheck } from "lucide-react";
import { permissions } from "@/config/permissions";
import { UserManager } from "@/components/admin/user-manager";
import { PageHeader } from "@/components/admin/page-header";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.usersManage);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      status: true,
      roles: { select: { role: { select: { code: true } } } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }]
  });

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Пользователи"
        description="Создавайте учетные записи, меняйте роли, статус доступа и пароль."
      />
      <div className="mt-6">
        <UserManager users={users} />
      </div>
    </div>
  );
}
