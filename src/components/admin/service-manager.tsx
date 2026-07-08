"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  priceFrom: number | null;
  priceExact: number | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  contraindications: string | null;
  disclaimer: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  category: Category;
  specialistServices: unknown[];
};

type ServiceManagerProps = {
  categories: Category[];
  services: Service[];
};

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? Number(raw) : null;
}

function servicePayload(form: FormData) {
  return {
    categoryId: String(form.get("categoryId") ?? ""),
    name: String(form.get("name") ?? ""),
    slug: String(form.get("slug") ?? "") || undefined,
    shortDescription: String(form.get("shortDescription") ?? ""),
    fullDescription: String(form.get("fullDescription") ?? ""),
    priceFrom: optionalNumber(form.get("priceFrom")),
    priceExact: optionalNumber(form.get("priceExact")),
    durationMinutes: Number(form.get("durationMinutes")),
    bufferBeforeMinutes: Number(form.get("bufferBeforeMinutes") || 0),
    bufferAfterMinutes: Number(form.get("bufferAfterMinutes") || 0),
    contraindications: String(form.get("contraindications") ?? "") || null,
    disclaimer: String(form.get("disclaimer") ?? "") || null,
    isActive: form.get("isActive") === "on",
    isFeatured: form.get("isFeatured") === "on",
    sortOrder: Number(form.get("sortOrder") || 0)
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

function ServiceFields({ categories, service }: { categories: Category[]; service?: Service }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="name" required defaultValue={service?.name ?? ""} placeholder="Название" aria-label="Название" />
        <Input name="slug" defaultValue={service?.slug ?? ""} placeholder="slug" aria-label="Slug" />
        <Select
          name="categoryId"
          required
          aria-label="Категория"
          defaultValue={service?.categoryId ?? categories[0]?.id ?? ""}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        name="shortDescription"
        required
        defaultValue={service?.shortDescription ?? ""}
        placeholder="Короткое описание"
        aria-label="Короткое описание"
      />
      <Textarea
        name="fullDescription"
        required
        defaultValue={service?.fullDescription ?? ""}
        placeholder="Полное описание"
        aria-label="Полное описание"
      />
      <div className="grid gap-3 md:grid-cols-5">
        <Input
          name="priceFrom"
          type="number"
          min={0}
          defaultValue={service?.priceFrom ?? ""}
          placeholder="Цена от"
          aria-label="Цена от, ₽"
        />
        <Input
          name="priceExact"
          type="number"
          min={0}
          defaultValue={service?.priceExact ?? ""}
          placeholder="Точная цена"
          aria-label="Точная цена, ₽"
        />
        <Input
          name="durationMinutes"
          type="number"
          min={1}
          required
          defaultValue={service?.durationMinutes ?? 45}
          placeholder="Минут"
          aria-label="Длительность, мин"
        />
        <Input
          name="bufferBeforeMinutes"
          type="number"
          min={0}
          defaultValue={service?.bufferBeforeMinutes ?? 0}
          placeholder="Буфер до"
          aria-label="Буфер до, мин"
        />
        <Input
          name="bufferAfterMinutes"
          type="number"
          min={0}
          defaultValue={service?.bufferAfterMinutes ?? 10}
          placeholder="Буфер после"
          aria-label="Буфер после, мин"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Textarea
          name="contraindications"
          defaultValue={service?.contraindications ?? ""}
          placeholder="Противопоказания"
          aria-label="Противопоказания"
        />
        <Textarea
          name="disclaimer"
          defaultValue={service?.disclaimer ?? ""}
          placeholder="Дисклеймер"
          aria-label="Дисклеймер"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Input
          name="sortOrder"
          type="number"
          className="w-32"
          defaultValue={service?.sortOrder ?? 0}
          aria-label="Порядок сортировки"
        />
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={service?.isActive ?? true} />
          Активна
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="isFeatured" type="checkbox" defaultChecked={service?.isFeatured ?? false} />
          На главной
        </label>
      </div>
    </div>
  );
}

export function ServiceManager({ categories, services }: ServiceManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>, serviceId?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(serviceId ?? "new");
    setMessage(null);

    try {
      await send(serviceId ? `/api/admin/services/${serviceId}` : "/api/admin/services", serviceId ? "PATCH" : "POST", servicePayload(new FormData(form)));
      setMessage(serviceId ? "Услуга обновлена" : "Услуга создана");
      if (!serviceId) form.reset();
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
        <h2 className="text-xl font-semibold">Новая услуга</h2>
        <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event)}>
          <ServiceFields categories={categories} />
          <Button type="submit" disabled={pending === "new"} className="w-fit">
            <Plus className="h-4 w-4" />
            Добавить услугу
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {services.map((service) => (
          <Card key={service.id} className="p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{service.name}</h2>
                  <Badge tone={service.isActive ? "success" : "neutral"}>
                    {service.isActive ? "Активна" : "Скрыта"}
                  </Badge>
                  {service.isFeatured && <Badge tone="primary">Главная</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {service.category.name} · {formatPrice(service.priceFrom, service.priceExact)} ·{" "}
                  {service.durationMinutes} мин · {service.specialistServices.length} специалистов
                </p>
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-primary">Редактировать</summary>
              <form className="mt-4 grid gap-4" onSubmit={(event) => submit(event, service.id)}>
                <ServiceFields categories={categories} service={service} />
                <Button type="submit" disabled={pending === service.id} className="w-fit">
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
