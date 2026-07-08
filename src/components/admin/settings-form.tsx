"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Settings = {
  clinicName: string;
  legalName: string;
  taxId: string | null;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  mapEmbedUrl: string | null;
  bookingMinLeadMinutes: number;
  bookingMaxHorizonDays: number;
};

type SettingsFormProps = {
  settings: Settings | null;
};

type Field = {
  name: keyof Settings;
  label: string;
  required?: boolean;
  type?: string;
  min?: number;
  fallback?: string | number;
};

const fields: Field[] = [
  { name: "clinicName", label: "Название клиники", required: true },
  { name: "legalName", label: "Юридическое название", required: true },
  { name: "taxId", label: "ИНН" },
  { name: "address", label: "Адрес", required: true },
  { name: "phone", label: "Телефон", required: true },
  { name: "email", label: "Email", required: true, type: "email" },
  { name: "timezone", label: "Часовой пояс", required: true, fallback: "Asia/Chita" },
  { name: "mapEmbedUrl", label: "Ссылка на карту" },
  { name: "bookingMinLeadMinutes", label: "Мин. минут до записи", required: true, type: "number", min: 0, fallback: 120 },
  { name: "bookingMaxHorizonDays", label: "Горизонт записи, дней", required: true, type: "number", min: 1, fallback: 45 }
];

function payload(form: FormData) {
  return {
    clinicName: String(form.get("clinicName") ?? ""),
    legalName: String(form.get("legalName") ?? ""),
    taxId: String(form.get("taxId") ?? ""),
    address: String(form.get("address") ?? ""),
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
    timezone: String(form.get("timezone") ?? ""),
    mapEmbedUrl: String(form.get("mapEmbedUrl") ?? ""),
    bookingMinLeadMinutes: Number(form.get("bookingMinLeadMinutes") || 0),
    bookingMaxHorizonDays: Number(form.get("bookingMaxHorizonDays") || 45)
  };
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(new FormData(event.currentTarget)))
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить настройки");
      setStatus({ text: "Настройки обновлены", ok: true });
      router.refresh();
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Не удалось сохранить настройки", ok: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const value = settings?.[field.name];
            return (
              <label key={field.name} className="grid gap-1 text-sm">
                <span className="font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </span>
                <Input
                  name={field.name}
                  type={field.type}
                  min={field.min}
                  required={field.required}
                  defaultValue={(value ?? field.fallback ?? "") as string | number}
                  placeholder={field.label}
                />
              </label>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            Сохранить настройки
          </Button>
          {status && (
            <p className={cn("text-sm", status.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {status.text}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
