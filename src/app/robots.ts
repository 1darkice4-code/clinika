import type { MetadataRoute } from "next";
import { CLINIC_SITE_URL } from "@/config/clinic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"]
    },
    sitemap: `${CLINIC_SITE_URL}/sitemap.xml`
  };
}
