import { z } from "zod";

export const attributionSchema = z.object({
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(180).optional(),
  utmContent: z.string().max(180).optional(),
  utmTerm: z.string().max(180).optional(),
  referrer: z.string().max(500).optional(),
  landingPage: z.string().max(500).optional(),
  source: z.string().max(120).optional()
});

export type AttributionInput = z.infer<typeof attributionSchema>;

export function inferSource(input: AttributionInput): string {
  if (input.utmSource) return input.utmSource;
  if (input.referrer) {
    try {
      return new URL(input.referrer).hostname;
    } catch {
      return "referrer";
    }
  }
  return input.source ?? "direct";
}
