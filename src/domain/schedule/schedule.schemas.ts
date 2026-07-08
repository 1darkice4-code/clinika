import { z } from "zod";

export const slotQuerySchema = z.object({
  serviceId: z.string().min(1),
  specialistId: z.string().min(1),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export type SlotQuery = z.infer<typeof slotQuerySchema>;
