"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationActions({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}/resend`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Не удалось отправить");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={resend} disabled={pending} className="h-9">
        <RefreshCw className="h-4 w-4" />
        Отправить повторно
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
