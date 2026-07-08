import { CalendarClock } from "lucide-react";
import { permissions } from "@/config/permissions";
import { ScheduleManager } from "@/components/admin/schedule-manager";
import { PageHeader } from "@/components/admin/page-header";
import { weekdayShortLabels } from "@/domain/crm/content-labels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/domain/auth/auth.service";
import { assertPermission } from "@/domain/auth/rbac";
import { prisma } from "@/lib/prisma";

function normalizeBreaks(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) =>
    item &&
    typeof item === "object" &&
    "startsAtLocalTime" in item &&
    "endsAtLocalTime" in item &&
    typeof item.startsAtLocalTime === "string" &&
    typeof item.endsAtLocalTime === "string"
      ? [{ startsAtLocalTime: item.startsAtLocalTime, endsAtLocalTime: item.endsAtLocalTime }]
      : []
  );
}

export default async function SchedulePage() {
  const user = await getCurrentUser();
  assertPermission(user, permissions.scheduleRead);
  const canWrite = Boolean(user?.permissions.includes(permissions.scheduleWrite));

  const [settings, specialists] = await Promise.all([
    prisma.clinicSettings.findFirst(),
    prisma.specialist.findMany({
      include: { workSchedules: { orderBy: [{ weekday: "asc" }, { startsAtLocalTime: "asc" }] } },
      orderBy: { sortOrder: "asc" }
    })
  ]);

  const managerData = specialists.map((specialist) => ({
    id: specialist.id,
    firstName: specialist.firstName,
    lastName: specialist.lastName,
    workSchedules: specialist.workSchedules.map((schedule) => ({
      weekday: schedule.weekday,
      startsAtLocalTime: schedule.startsAtLocalTime,
      endsAtLocalTime: schedule.endsAtLocalTime,
      breaksJson: normalizeBreaks(schedule.breaksJson)
    }))
  }));

  return (
    <div>
      <PageHeader
        icon={CalendarClock}
        title="Расписание"
        description="Рабочие дни, часы приема и ручные блокировки времени специалистов."
      />

      {canWrite ? (
        <div className="mt-6">
          <ScheduleManager specialists={managerData} timezone={settings?.timezone ?? "Asia/Chita"} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {specialists.map((specialist) => (
            <Card key={specialist.id} className="p-5">
              <h2 className="text-xl font-semibold">
                {specialist.firstName} {specialist.lastName}
              </h2>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                {specialist.workSchedules.map((schedule) => (
                  <div key={schedule.id} className="rounded-md border p-3 text-sm">
                    <Badge>{weekdayShortLabels[schedule.weekday] ?? `День ${schedule.weekday}`}</Badge>
                    <p className="mt-2">
                      {schedule.startsAtLocalTime} - {schedule.endsAtLocalTime}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
