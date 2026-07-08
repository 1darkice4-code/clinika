import { Settings } from "lucide-react";
import { permissions } from "@/config/permissions";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.dashboardRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.settingsWrite));

  const settings = await prisma.clinicSettings.findFirst();

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Настройки"
        description="Контакты клиники, юридические данные и правила онлайн-записи."
      />

      {canWrite ? (
        <div className="mt-6">
          <SettingsForm settings={settings} />
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Клиника</dt>
              <dd className="mt-1 font-medium">{settings?.clinicName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Часовой пояс</dt>
              <dd className="mt-1 font-medium">{settings?.timezone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Телефон</dt>
              <dd className="mt-1 font-medium">{settings?.phone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 font-medium">{settings?.email}</dd>
            </div>
          </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
