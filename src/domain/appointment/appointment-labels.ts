/** Minimal shape needed to label who performs/handles an appointment. */
export type PerformerShape = {
  specialist: { firstName: string; lastName: string } | null;
  resource?: { name: string } | null;
};

/**
 * Human label for the performer of an appointment. `specialistId` is nullable:
 * for doctor services it is the specialist, for resource (laser) services it is
 * the assigned operator, which stays null until an operator is assigned in the
 * admin panel. Falls back to the resource name so laser rows stay identifiable.
 */
export function performerLabel(appointment: PerformerShape): string {
  if (appointment.specialist) {
    return `${appointment.specialist.firstName} ${appointment.specialist.lastName}`;
  }
  if (appointment.resource) {
    return `${appointment.resource.name} · оператор не назначен`;
  }
  return "—";
}
