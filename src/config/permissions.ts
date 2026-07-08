export const permissions = {
  dashboardRead: "dashboard.read",
  clientsRead: "clients.read",
  clientsWrite: "clients.write",
  clientsExport: "clients.export",
  leadsRead: "leads.read",
  leadsWrite: "leads.write",
  appointmentsRead: "appointments.read",
  appointmentsWrite: "appointments.write",
  scheduleRead: "schedule.read",
  scheduleWrite: "schedule.write",
  contentRead: "content.read",
  contentWrite: "content.write",
  notificationsRead: "notifications.read",
  notificationsWrite: "notifications.write",
  analyticsRead: "analytics.read",
  usersManage: "users.manage",
  rolesManage: "roles.manage",
  auditRead: "audit.read",
  settingsWrite: "settings.write"
} as const;

export type PermissionCode = (typeof permissions)[keyof typeof permissions];

export const roleDefaults: Record<string, PermissionCode[]> = {
  OWNER: Object.values(permissions),
  ADMIN: [
    permissions.dashboardRead,
    permissions.clientsRead,
    permissions.clientsWrite,
    permissions.clientsExport,
    permissions.leadsRead,
    permissions.leadsWrite,
    permissions.appointmentsRead,
    permissions.appointmentsWrite,
    permissions.scheduleRead,
    permissions.scheduleWrite,
    permissions.contentRead,
    permissions.contentWrite,
    permissions.notificationsRead,
    permissions.notificationsWrite,
    permissions.analyticsRead,
    permissions.auditRead,
    permissions.settingsWrite
  ],
  SPECIALIST: [
    permissions.dashboardRead,
    permissions.clientsRead,
    permissions.appointmentsRead,
    permissions.scheduleRead
  ]
};
