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

const campaignFields = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm"
} as const;

export function readCampaignQuery(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  const attribution: AttributionInput = {};
  for (const [param, field] of Object.entries(campaignFields)) {
    const value = query[param];
    const parsed = attributionSchema.shape[field].safeParse(
      typeof value === "string" ? value.trim() : undefined
    );
    if (parsed.success && parsed.data) {
      params.set(param, parsed.data);
      attribution[field] = parsed.data;
    }
  }
  return { attribution, params };
}

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
