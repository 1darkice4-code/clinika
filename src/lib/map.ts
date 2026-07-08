/**
 * Builds a Yandex Maps embed (iframe) URL and an external "directions" URL from
 * the clinic address. If an admin stores a real widget URL in settings
 * (`mapEmbedUrl`), that is honored as-is; otherwise a search widget is derived
 * from the address. The clinic's CSP already allows framing yandex.ru.
 */

function isEmbeddableYandexUrl(url: string): boolean {
  return /(?:^https:\/\/)(?:[\w-]+\.)*yandex\.[a-z]+\/map-widget\//i.test(url);
}

export function buildMapEmbedUrl(address: string, storedUrl?: string | null): string {
  if (storedUrl && isEmbeddableYandexUrl(storedUrl)) return storedUrl;
  const query = encodeURIComponent(address);
  return `https://yandex.ru/map-widget/v1/?mode=search&text=${query}&z=16`;
}

export function buildDirectionsUrl(address: string): string {
  return `https://yandex.ru/maps/?rtext=~${encodeURIComponent(address)}&rtt=auto`;
}
