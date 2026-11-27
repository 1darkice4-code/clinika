import { afterAll, describe, expect, it } from "vitest";
import { createAppointment } from "@/domain/booking/booking.service";
import { LEGAL_DOCUMENT_VERSION } from "@/domain/legal/legal-documents";
import { getSlotGrid } from "@/domain/schedule/schedule.service";
import { prisma } from "@/lib/prisma";
import { nextDateInTimezone } from "@/lib/date-time";

// Verifies the core invariant: two bookings for the SAME laser slot — which two
// different operators could take — cannot both succeed. The machine is capacity 1.
describe.skipIf(!process.env.DATABASE_URL)("shared resource booking", () => {
  const createdAppointmentIds: string[] = [];
  const phone = "+7 (999) 700-00-77";

  afterAll(async () => {
    if (createdAppointmentIds.length > 0) {
      await prisma.notification.deleteMany({
        where: { appointmentId: { in: createdAppointmentIds } }
      });
      await prisma.appointmentStatusHistory.deleteMany({
        where: { appointmentId: { in: createdAppointmentIds } }
      });
      await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } });
    }
  });

  it("rejects a second booking for an already taken laser slot", async () => {
    const laserService = await prisma.service.findFirstOrThrow({
      where: { requiresResourceId: { not: null }, isActive: true, deletedAt: null }
    });

    const settings = await prisma.clinicSettings.findFirstOrThrow({ select: { timezone: true } });
    const dateFrom = nextDateInTimezone(new Date(), settings.timezone);
    const dateTo = dateFrom;
    const { slots } = await getSlotGrid({ serviceId: laserService.id, dateFrom, dateTo });
    const freeSlot = slots.find((slot) => slot.available);
    expect(freeSlot, "expected at least one free laser slot").toBeTruthy();

    const baseInput = {
      serviceId: laserService.id,
      startsAtUtc: freeSlot!.startsAtUtc.toISOString(),
      name: "Тест Очередь",
      phone,
      email: undefined,
      comment: undefined,
      personalDataConsentAccepted: true,
      marketingConsentAccepted: false,
      legalDocumentVersion: LEGAL_DOCUMENT_VERSION
    } as const;

    const first = await createAppointment({
      ...baseInput,
      idempotencyKey: `test-shared-first-${freeSlot!.startsAtUtc.getTime()}`
    });
    createdAppointmentIds.push(first.id);
    // First booking occupies the machine and has no operator assigned yet.
    expect(first.resourceId).toBe(laserService.requiresResourceId);
    expect(first.specialistId).toBeNull();

    // A different client, same slot — must be rejected (single queue, capacity 1).
    await expect(
      createAppointment({
        ...baseInput,
        name: "Тест Второй",
        phone: "+7 (999) 700-00-88",
        idempotencyKey: `test-shared-second-${freeSlot!.startsAtUtc.getTime()}`
      })
    ).rejects.toThrow();

    // Make sure the rejected attempt created nothing on the resource for that slot.
    const onSlot = await prisma.appointment.count({
      where: {
        resourceId: laserService.requiresResourceId,
        startsAtUtc: freeSlot!.startsAtUtc,
        deletedAt: null,
        status: { in: ["PENDING_CONFIRMATION", "CONFIRMED", "ARRIVED"] }
      }
    });
    expect(onSlot).toBe(1);
  });
});
