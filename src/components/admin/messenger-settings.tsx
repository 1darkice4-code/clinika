"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  messengerLabels,
  messengerLink,
  platformSchema,
  type MessengerPlatform
} from "@/domain/messenger/platform";

type BotSetting = { platform: string; username: string; showOnSite: boolean };

export function MessengerSettings({ settings }: { settings: BotSetting[] }) {
  const [bots, setBots] = useState(settings);
  const [pending, setPending] = useState<MessengerPlatform>();
  const [feedback, setFeedback] = useState<{
    platform: MessengerPlatform;
    message: string;
    error: boolean;
  }>();

  async function update(platform: MessengerPlatform, fields: object) {
    setPending(platform);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/admin/settings/messengers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, ...fields })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить настройки.");
      setBots(result as BotSetting[]);
      setFeedback({ platform, message: "Настройки сохранены.", error: false });
      return true;
    } catch (error) {
      setFeedback({
        platform,
        message: error instanceof Error ? error.message : "Не удалось сохранить настройки.",
        error: true
      });
      return false;
    } finally {
      setPending(undefined);
    }
  }

  async function connect(event: FormEvent<HTMLFormElement>, platform: MessengerPlatform) {
    event.preventDefault();
    const form = event.currentTarget;
    const token = new FormData(form).get("token");
    if (await update(platform, { action: "connect", token })) form.reset();
  }

  return (
    <section className="mt-8 space-y-4" aria-labelledby="messenger-settings">
      <div>
        <h2 id="messenger-settings" className="text-2xl">
          Боты для записи
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Записи и заявки из мессенджеров попадают в CRM клиники.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {platformSchema.options.map((platform) => {
          const bot = bots.find((item) => item.platform === platform);
          const status = feedback?.platform === platform ? feedback : undefined;
          return (
            <Card key={platform}>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <h3 className="text-lg font-semibold">{messengerLabels[platform]}</h3>
                  {bot ? (
                    <a
                      href={messengerLink(platform, bot.username)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-metal-strong underline"
                    >
                      @{bot.username}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ожидает подключения</p>
                  )}
                </div>
                <form onSubmit={(event) => void connect(event, platform)} className="space-y-2">
                  <label className="grid gap-2 text-sm">
                    Токен бота
                    <Input
                      name="token"
                      type="password"
                      required
                      maxLength={256}
                      autoComplete="new-password"
                    />
                  </label>
                  <Button type="submit" variant="secondary" disabled={Boolean(pending)}>
                    {bot ? "Переподключить" : "Подключить бота"}
                  </Button>
                </form>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bot?.showOnSite ?? false}
                    disabled={!bot || Boolean(pending)}
                    onChange={(event) =>
                      void update(platform, {
                        action: "visibility",
                        showOnSite: event.target.checked
                      })
                    }
                  />
                  Показывать значок на сайте
                </label>
                {status && (
                  <p
                    role={status.error ? "alert" : "status"}
                    className={
                      status.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                    }
                  >
                    {status.message}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
