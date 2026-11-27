import { describe, expect, it } from "vitest";
import { buildTelegramAppointmentMessage } from "@/domain/notification/telegram.service";

describe("Telegram appointment message", () => {
  it("contains the information needed to process a booking", () => {
    const message = buildTelegramAppointmentMessage({
      publicNumber: "A-TEST1234",
      clientName: "Анна Иванова",
      phone: "+7 999 111-22-33",
      email: "anna@example.test",
      serviceName: "Лазерная эпиляция — голени",
      performer: "Лазерный аппарат, специалист будет назначен",
      startsAtUtc: new Date("2026-07-21T02:00:00.000Z"),
      timezone: "Asia/Chita",
      comment: "Позвонить перед визитом"
    });

    expect(message).toContain("A-TEST1234");
    expect(message).toContain("21.07.2026, 11:00");
    expect(message).toContain("Анна Иванова");
    expect(message).toContain("+7 999 111-22-33");
    expect(message).toContain("Лазерная эпиляция — голени");
    expect(message).toContain("Позвонить перед визитом");
  });
});
