import { describe, expect, it } from "vitest";
import {
  assertAppointmentReschedulable,
  assertAppointmentTransition,
  assertLeadTransition
} from "@/domain/appointment/appointment-status";

describe("status transitions", () => {
  it("allows valid appointment transition", () => {
    expect(() => assertAppointmentTransition("PENDING_CONFIRMATION", "CONFIRMED")).not.toThrow();
  });

  it("rejects invalid appointment transition", () => {
    expect(() => assertAppointmentTransition("COMPLETED", "CONFIRMED")).toThrow();
  });

  it("allows valid lead transition", () => {
    expect(() => assertLeadTransition("NEW", "IN_PROGRESS")).not.toThrow();
  });

  it("allows rescheduling an active appointment", () => {
    expect(() => assertAppointmentReschedulable("CONFIRMED")).not.toThrow();
    expect(() => assertAppointmentReschedulable("PENDING_CONFIRMATION")).not.toThrow();
    expect(() => assertAppointmentReschedulable("RESCHEDULED")).not.toThrow();
  });

  it("rejects rescheduling a terminal appointment", () => {
    expect(() => assertAppointmentReschedulable("COMPLETED")).toThrow();
    expect(() => assertAppointmentReschedulable("NO_SHOW")).toThrow();
    expect(() => assertAppointmentReschedulable("CANCELLED_BY_CLIENT")).toThrow();
  });
});
