import { CLINIC_SITE_URL } from "@/config/clinic";

// robots.txt отдаём текстом, а не через robots.ts: директива Clean-param (для Яндекса)
// в генераторе Next.js не поддерживается. Она убирает дубли страниц с UTM-метками и
// параметрами записи, чтобы в индекс попадали только чистые адреса.
const CLEAN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "yclid",
  "gclid",
  "promo",
  "booking",
  "service",
  "request",
  "o"
].join("&");

const DISALLOW = ["/admin", "/api", "/login"];

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    "User-agent: Yandex",
    "Allow: /",
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    `Clean-param: ${CLEAN_PARAMS}`,
    "",
    `Sitemap: ${CLINIC_SITE_URL}/sitemap.xml`,
    ""
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
