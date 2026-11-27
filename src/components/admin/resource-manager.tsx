"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Operator = {
  id: string;
  firstName: string;
  lastName: string;
};

type Resource = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  operators: { specialistId: string }[];
};

type ResourceManagerProps = {
  resources: Resource[];
  operators: Operator[];
};

function resourcePayload(form: FormData) {
  return {
    name: String(form.get("name") ?? ""),
    slug: String(form.get("slug") ?? "") || undefined,
    isActive: form.get("isActive") === "on",
    sortOrder: Number(form.get("sortOrder") || 0),
    operatorIds: form.getAll("operatorIds").map(String)
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

function ResourceFields({ operators, resource }: { operators: Operator[]; resource?: Resource }) {
  const selectedOperators = new Set(resource?.operators.map((item) => item.specialistId) ?? []);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
        <Input name="name" required defaultValue={resource?.name ?? ""} placeholder="Название аппарата" aria-label="Название" />
        <Input name="slug" defaultValue={resource?.slug ?? ""} placeholder="slug" aria-label="Slug" />
        <Input
          name="sortOrder"
          type="number"
          defaultValue={resource?.sortOrder ?? 0}
          placeholder="Сортировка"
          aria-label="Сортировка"
          className="md:w-28"
        />
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={resource?.isActive ?? true} />
          Активен
        </label>
      </div>
      <fieldset className="rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Операторы аппарата</legend>
        <p className="px-1 text-xs text-muted-foreground">
          Кого можно назначать исполнителем записей на этот аппарат.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {operators.length === 0 && <p className="text-sm text-muted-foreground">Нет специалистов.</p>}
          {operators.map((operator) => (
            <label key={operator.id} className="flex items-center gap-2 text-sm">
              <input
                name="operatorIds"
                type="checkbox"
                value={operator.id}
                defaultChecked={selectedOperators.has(operator.id)}
              />
              {operator.firstName} {operator.lastName}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function ResourceManager({ resources, operators }: ResourceManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, resourceId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(resourceId ?? "new");
    setMessage(null);

    try {
      await send(
        resourceId ? `/api/admin/resources/${resourceId}` : "/api/admin/resources",
        resourceId ? "PATCH" : "POST",
        resourcePayload(new FormData(form))
      );
      setMessage(resourceId ? "Ресурс обновлен" : "Ресурс создан");
      if (!resourceId) form.reset();
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
        <h2 className="text-xl font-semibold">Новый аппарат</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Аппарат — общий ресурс с единой очередью (ёмкость 1). Часы работы задаются в разделе «Расписание».
        </p>
        <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event)}>
          <ResourceFields operators={operators} />
          <Button type="submit" disabled={pending === "new"} className="w-fit">
            <Plus className="h-4 w-4" />
            Добавить аппарат
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {resources.map((resource) => (
          <Card key={resource.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{resource.name}</h2>
              <Badge tone={resource.isActive ? "success" : "neutral"}>
                {resource.isActive ? "Активен" : "Скрыт"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Операторов: {resource.operators.length}
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">Редактировать</summary>
              <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event, resource.id)}>
                <ResourceFields operators={operators} resource={resource} />
                <Button type="submit" disabled={pending === resource.id} className="w-fit">
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
