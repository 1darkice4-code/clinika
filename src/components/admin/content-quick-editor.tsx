"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

type Section = {
  id: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  isVisible: boolean;
};

type Service = {
  id: string;
  name: string;
  priceFrom: number | null;
  priceExact: number | null;
  durationMinutes: number;
  isActive: boolean;
};

type Review = {
  id: string;
  clientDisplayName: string;
  status: "PENDING" | "PUBLISHED" | "REJECTED";
};

export function ContentQuickEditor({
  sections,
  services,
  reviews
}: {
  sections: Section[];
  services: Service[];
  reviews: Review[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    id: string,
    endpoint: string,
    build: (form: FormData) => Record<string, unknown>
  ) {
    event.preventDefault();
    const payload = build(new FormData(event.currentTarget));
    setPending(id);
    setFeedback(null);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить изменения");
      setFeedback({ id, text: "Изменения сохранены", ok: true });
      router.refresh();
    } catch (error) {
      setFeedback({ id, text: error instanceof Error ? error.message : "Не удалось сохранить", ok: false });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6">

      <section>
        <h2 className="text-xl font-semibold">Секции главной</h2>
        <div className="mt-4 grid gap-4">
          {sections.map((section) => (
            <form
              key={section.id}
              className="grid gap-3 rounded-md border bg-card p-4"
              onSubmit={(event) =>
                submit(event, section.id, `/api/admin/content/sections/${section.id}`, (form) => ({
                  title: String(form.get("title") ?? "").trim() || null,
                  subtitle: String(form.get("subtitle") ?? "").trim() || null,
                  isVisible: form.get("isVisible") === "on"
                }))
              }
            >
              <p className="text-sm font-medium text-muted-foreground">{section.type}</p>
              <Input name="title" defaultValue={section.title ?? ""} aria-label="Заголовок секции" />
              <Textarea name="subtitle" defaultValue={section.subtitle ?? ""} aria-label="Подзаголовок секции" />
              <label className="flex items-center gap-2 text-sm">
                <input name="isVisible" type="checkbox" defaultChecked={section.isVisible} />
                Показывать секцию
              </label>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending === section.id}>
                  <Save className="h-4 w-4" />
                  Сохранить
                </Button>
                {feedback?.id === section.id && (
                  <span className={feedback.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
                    {feedback.text}
                  </span>
                )}
              </div>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Цены и длительность</h2>
        <div className="mt-4 grid gap-4">
          {services.map((service) => (
            <form
              key={service.id}
              className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-5"
              onSubmit={(event) =>
                submit(event, service.id, `/api/admin/services/${service.id}`, (form) => {
                  const priceFrom = Number(form.get("priceFrom") || 0);
                  const priceExact = Number(form.get("priceExact") || 0);
                  const duration = Number(form.get("durationMinutes"));
                  return {
                    name: String(form.get("name") ?? ""),
                    priceFrom: priceFrom > 0 ? priceFrom : null,
                    priceExact: priceExact > 0 ? priceExact : null,
                    durationMinutes: duration > 0 ? duration : undefined,
                    isActive: form.get("isActive") === "on"
                  };
                })
              }
            >
              <Input name="name" defaultValue={service.name} aria-label="Название услуги" />
              <Input name="priceFrom" type="number" defaultValue={service.priceFrom ?? ""} aria-label="Цена от" />
              <Input name="priceExact" type="number" defaultValue={service.priceExact ?? ""} aria-label="Точная цена" />
              <Input
                name="durationMinutes"
                type="number"
                min={1}
                required
                defaultValue={service.durationMinutes}
                aria-label="Длительность"
              />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input name="isActive" type="checkbox" defaultChecked={service.isActive} />
                  Активна
                </label>
                <Button type="submit" disabled={pending === service.id} aria-label="Сохранить услугу">
                  <Save className="h-4 w-4" />
                </Button>
                {feedback?.id === service.id && (
                  <span className={feedback.ok ? "text-xs text-emerald-600" : "text-xs text-destructive"}>
                    {feedback.text}
                  </span>
                )}
              </div>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Модерация отзывов</h2>
        <div className="mt-4 grid gap-3">
          {reviews.map((review) => (
            <form
              key={review.id}
              className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_180px_auto]"
              onSubmit={(event) =>
                submit(event, review.id, `/api/admin/reviews/${review.id}`, (form) => ({
                  status: String(form.get("status"))
                }))
              }
            >
              <p className="font-medium">{review.clientDisplayName}</p>
              <Select name="status" defaultValue={review.status} aria-label="Статус отзыва">
                <option value="PENDING">На модерации</option>
                <option value="PUBLISHED">Опубликован</option>
                <option value="REJECTED">Отклонен</option>
              </Select>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={pending === review.id}>
                  <Save className="h-4 w-4" />
                  Сохранить
                </Button>
                {feedback?.id === review.id && (
                  <span className={feedback.ok ? "text-xs text-emerald-600" : "text-xs text-destructive"}>
                    {feedback.text}
                  </span>
                )}
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
