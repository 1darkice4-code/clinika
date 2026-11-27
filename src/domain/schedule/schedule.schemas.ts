import { z } from "zod";

export const slotQuerySchema = z.object({
  serviceId: z.string().min(1),
  // Optional: resource-bound services (e.g. laser) form a single queue and are
  // queried without a specialist; the owner is derived from the service.
  specialistId: z.string().min(1).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export type SlotQuery = z.infer<typeof slotQuerySchema>;
