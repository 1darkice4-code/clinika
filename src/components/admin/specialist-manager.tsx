"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";

type Service = {
  id: string;
  name: string;
};

type User = {
  id: string;
  email: string;
  name: string;
};

type Specialist = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  slug: string;
  position: string;
  specialization: string;
  experienceYears: number;
  education: string;
  certificates: string | null;
  description: string;
  isActive: boolean;
  sortOrder: number;
  services: { service: Service }[];
  user: User | null;
};

type SpecialistManagerProps = {
  services: Service[];
  specialists: Specialist[];
  users: User[];
};

function specialistPayload(form: FormData) {
  return {
    firstName: String(form.get("firstName") ?? ""),
    lastName: String(form.get("lastName") ?? ""),
    slug: String(form.get("slug") ?? "") || undefined,
    position: String(form.get("position") ?? ""),
    specialization: String(form.get("specialization") ?? ""),
    experienceYears: Number(form.get("experienceYears") || 0),
    education: String(form.get("education") ?? ""),
    certificates: String(form.get("certificates") ?? "") || null,
    description: String(form.get("description") ?? ""),
    isActive: form.get("isActive") === "on",
    sortOrder: Number(form.get("sortOrder") || 0),
    userId: String(form.get("userId") ?? "") || null,
    serviceIds: form.getAll("serviceIds").map(String)
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

function SpecialistFields({
  services,
  specialist,
  users
}: {
  services: Service[];
  specialist?: Specialist;
  users: User[];
}) {
  const selectedServices = new Set(specialist?.services.map((item) => item.service.id) ?? []);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Input name="firstName" required defaultValue={specialist?.firstName ?? ""} placeholder="Имя" aria-label="Имя" />
        <Input name="lastName" required defaultValue={specialist?.lastName ?? ""} placeholder="Фамилия" aria-label="Фамилия" />
        <Input name="slug" defaultValue={specialist?.slug ?? ""} placeholder="slug" aria-label="Slug" />
        <Input name="sortOrder" type="number" defaultValue={specialist?.sortOrder ?? 0} placeholder="Сортировка" aria-label="Сортировка" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="position" required defaultValue={specialist?.position ?? ""} placeholder="Должность" aria-label="Должность" />
        <Input
          name="specialization"
          required
          defaultValue={specialist?.specialization ?? ""}
          placeholder="Специализация"
          aria-label="Специализация"
        />
        <Input
          name="experienceYears"
          type="number"
          min={0}
          required
          defaultValue={specialist?.experienceYears ?? 0}
          placeholder="Стаж"
          aria-label="Стаж"
        />
      </div>
      <Textarea
        name="education"
        required
        defaultValue={specialist?.education ?? ""}
        placeholder="Образование"
        aria-label="Образование"
      />
      <Textarea
        name="certificates"
        defaultValue={specialist?.certificates ?? ""}
        placeholder="Сертификаты и курсы"
        aria-label="Сертификаты и курсы"
      />
      <Textarea
        name="description"
        required
        defaultValue={specialist?.description ?? ""}
        placeholder="Описание"
        aria-label="Описание"
      />
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <Select name="userId" aria-label="Учётная запись" defaultValue={specialist?.userId ?? ""}>
          <option value="">Без учетной записи</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} · {user.email}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={specialist?.isActive ?? true} />
          Активен
        </label>
      </div>
      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Услуги специалиста</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <label key={service.id} className="flex items-center gap-2 text-sm">
              <input name="serviceIds" type="checkbox" value={service.id} defaultChecked={selectedServices.has(service.id)} />
              {service.name}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function SpecialistManager({ services, specialists, users }: SpecialistManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, specialistId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(specialistId ?? "new");
    setMessage(null);

    try {
      await send(
        specialistId ? `/api/admin/specialists/${specialistId}` : "/api/admin/specialists",
        specialistId ? "PATCH" : "POST",
        specialistPayload(new FormData(form))
      );
      setMessage(specialistId ? "Специалист обновлен" : "Специалист создан");
      if (!specialistId) form.reset();
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
        <h2 className="text-xl font-semibold">Новый врач или специалист</h2>
        <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event)}>
          <SpecialistFields services={services} users={users} />
          <Button type="submit" disabled={pending === "new"} className="w-fit">
            <Plus className="h-4 w-4" />
            Добавить специалиста
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {specialists.map((specialist) => (
          <Card key={specialist.id} className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {specialist.firstName} {specialist.lastName}
                  </h2>
                  <Badge tone={specialist.isActive ? "success" : "neutral"}>
                    {specialist.isActive ? "Активен" : "Скрыт"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-primary">{specialist.position}</p>
                <p className="mt-2 text-sm text-muted-foreground">{specialist.description}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Услуги: {specialist.services.map((item) => item.service.name).join(", ") || "не выбраны"}
                </p>
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">Редактировать</summary>
              <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event, specialist.id)}>
                <SpecialistFields services={services} specialist={specialist} users={users} />
                <Button type="submit" disabled={pending === specialist.id} className="w-fit">
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
