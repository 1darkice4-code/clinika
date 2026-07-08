"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

type Note = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
};

async function send(clientId: string, method: "POST" | "PATCH", payload: Record<string, unknown>) {
  const response = await fetch(`/api/admin/clients/${clientId}/notes`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Не удалось сохранить");
}

export function ClientNotes({
  clientId,
  notes,
  canWrite
}: {
  clientId: string;
  notes: Note[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (!body) return;

    setPending("new");
    setError(null);
    try {
      await send(clientId, "POST", { body });
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setPending(null);
    }
  }

  async function archive(noteId: string) {
    setPending(noteId);
    setError(null);
    try {
      await send(clientId, "PATCH", { noteId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-4">
      {error && <p className="rounded-md border bg-card p-3 text-sm text-destructive">{error}</p>}

      {canWrite && (
        <form className="grid gap-3" onSubmit={add}>
          <Textarea
            name="body"
            required
            maxLength={4000}
            aria-label="Текст заметки"
            placeholder="Добавить заметку о клиенте"
          />
          <Button type="submit" disabled={pending === "new"} className="w-fit">
            <Plus className="h-4 w-4" />
            Добавить заметку
          </Button>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Заметок пока нет.</p>
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.authorName} · {note.createdAt}
                  </p>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => archive(note.id)}
                    disabled={pending === note.id}
                    aria-label="Удалить заметку"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
