"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { leadStatusLabels } from "@/domain/crm/status-labels";

type LeadStatus = keyof typeof leadStatusLabels;

const leadTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["IN_PROGRESS", "SPAM"],
  IN_PROGRESS: ["NO_CONTACT", "WAITING_FOR_CLIENT", "BOOKED", "DECLINED"],
  NO_CONTACT: ["IN_PROGRESS"],
  WAITING_FOR_CLIENT: ["IN_PROGRESS"],
  BOOKED: ["CLOSED"],
  DECLINED: ["CLOSED"],
  SPAM: ["CLOSED"],
  CLOSED: []
};

type LeadStatusControlProps = {
  currentStatus: LeadStatus;
  leadId: string;
};

export function LeadStatusControl({ currentStatus, leadId }: LeadStatusControlProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nextStatuses = leadTransitions[currentStatus];

  if (nextStatuses.length === 0) {
    return <span className="text-xs text-muted-foreground">Нет доступных действий</span>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: String(form.get("status")),
          reason: String(form.get("reason") ?? "") || undefined
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось обновить статус");
      setMessage("Статус обновлен");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось обновить статус");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid w-56 gap-2" onSubmit={submit}>
      <Select name="status" aria-label="Новый статус заявки" defaultValue={nextStatuses[0]}>
        {nextStatuses.map((status) => (
          <option key={status} value={status}>
            {leadStatusLabels[status]}
          </option>
        ))}
      </Select>
      <div className="flex gap-2">
        <Input
          name="reason"
          placeholder="Комментарий"
          aria-label="Комментарий к статусу"
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending}
          aria-label="Сохранить статус заявки"
          data-testid="lead-status-save"
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </form>
  );
}
