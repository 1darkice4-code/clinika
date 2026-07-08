import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/domain/auth/auth.service";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminNav permissions={user.permissions} userName={user.name} roles={user.roles} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-[1400px] space-y-8 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
