"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { roleLabel, userStatusClasses, userStatusLabels } from "@/domain/crm/user-labels";

type RoleCode = "OWNER" | "ADMIN" | "SPECIALIST";
type UserStatus = "ACTIVE" | "INVITED" | "BLOCKED" | "DELETED";

type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: UserStatus;
  roles: { role: { code: string } }[];
};

type UserManagerProps = {
  users: User[];
};

const roleOptions: RoleCode[] = ["OWNER", "ADMIN", "SPECIALIST"];
const statusOptions: UserStatus[] = ["ACTIVE", "INVITED", "BLOCKED", "DELETED"];

function selectedRoles(form: FormData) {
  return form.getAll("roleCodes").map(String) as RoleCode[];
}

function userPayload(form: FormData, existing = false) {
  const password = String(form.get("password") ?? "");
  return {
    email: String(form.get("email") ?? ""),
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? "") || null,
    status: String(form.get("status") ?? "ACTIVE"),
    roleCodes: selectedRoles(form),
    // On create the password is required; on edit it is only sent when changed.
    ...(existing ? (password ? { password } : {}) : { password })
  };
}

async function send(endpoint: string, method: "POST" | "PATCH", payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить");
}

function UserFields({ user }: { user?: User }) {
  const currentRoles = new Set(user?.roles.map((item) => item.role.code) ?? ["ADMIN"]);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Input name="name" required defaultValue={user?.name ?? ""} placeholder="Имя" aria-label="Имя" />
        <Input name="email" type="email" required defaultValue={user?.email ?? ""} placeholder="Email" aria-label="Email" />
        <Input name="phone" defaultValue={user?.phone ?? ""} placeholder="Телефон" aria-label="Телефон" />
        <Select name="status" defaultValue={user?.status ?? "ACTIVE"} aria-label="Статус">
          {statusOptions
            .filter((status) => user || status !== "DELETED")
            .map((status) => (
              <option key={status} value={status}>
                {userStatusLabels[status]}
              </option>
            ))}
        </Select>
      </div>
      <Input
        name="password"
        type="password"
        required={!user}
        minLength={8}
        placeholder={user ? "Новый пароль, если нужно" : "Пароль"}
        aria-label="Пароль"
      />
      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Роли</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {roleOptions.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input name="roleCodes" type="checkbox" value={role} defaultChecked={currentRoles.has(role)} />
              {roleLabel(role)}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function UserManager({ users }: UserManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, userId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(userId ?? "new");
    setMessage(null);

    try {
      await send(userId ? `/api/admin/users/${userId}` : "/api/admin/users", userId ? "PATCH" : "POST", userPayload(new FormData(form), Boolean(userId)));
      setMessage(userId ? "Пользователь обновлен" : "Пользователь создан");
      if (!userId) form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-5">
      {message && <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">{message}</p>}
      <Card className="p-5">
        <h2 className="text-xl font-semibold">Новый пользователь</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Для роли «Специалист» после создания привяжите учётную запись к карточке специалиста в разделе{" "}
          <a href="/admin/specialists" className="text-primary hover:underline">
            «Врачи»
          </a>{" "}
          — тогда сотрудник будет видеть свои записи в календаре.
        </p>
        <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event)}>
          <UserFields />
          <Button type="submit" disabled={pending === "new"} className="w-fit">
            <Plus className="h-4 w-4" />
            Добавить пользователя
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id} className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={userStatusClasses[user.status]}>{userStatusLabels[user.status]}</Badge>
                {user.roles.map((role) => (
                  <Badge key={role.role.code}>{roleLabel(role.role.code)}</Badge>
                ))}
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">Редактировать</summary>
              <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event, user.id)}>
                <UserFields user={user} />
                <Button type="submit" disabled={pending === user.id} className="w-fit">
                  <Save className="h-4 w-4" />
                  Сохранить
                </Button>
              </form>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
