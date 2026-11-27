import Link from "next/link";
import type { getPublicLaserPricing } from "@/domain/booking/public-catalog";
import { LASER_PRICE_GROUPS } from "@/domain/service/current-price-list";
import { formatPrice } from "@/lib/utils";

function zonesLabel(count: number) {
  if (count === 1) return "зона";
  if (count >= 2 && count <= 4) return "зоны";
  return "зон";
}

type BookableZones = Awaited<ReturnType<typeof getPublicLaserPricing>>["bookableZones"];

export function LaserPriceList({ bookableZones }: { bookableZones: BookableZones }) {
  const available = new Map(bookableZones.map((zone) => [zone.slug, zone]));

  function singlePrice(slug: string, listPrice: number) {
    const zone = available.get(slug);
    return zone ? formatPrice(zone.priceFrom, zone.priceExact) : formatPrice(null, listPrice);
  }

  function zoneLabel(slug: string, name: string) {
    return available.has(slug) ? (
      <Link
        href={`/booking?booking=laser&service=${slug}`}
        className="text-metal-strong underline underline-offset-4"
      >
        {name}
      </Link>
    ) : name;
  }

  return (
    <>
      <div className="grid gap-3 p-3 sm:hidden" data-testid="mobile-laser-price">
        {LASER_PRICE_GROUPS.map((group, index) => (
          <details
            key={group.name}
            open={index === 0}
            className="group overflow-hidden rounded-xl border border-border bg-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 marker:content-none">
              <span className="font-semibold text-foreground">{group.name}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {group.items.length} {zonesLabel(group.items.length)}
                <span className="text-lg leading-none transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <div className="divide-y divide-border border-t border-border">
              {group.items.map((item) => (
                <article key={item.slug} className="px-3 py-4">
                  <h3 className="text-sm font-semibold leading-5 text-foreground">
                    {zoneLabel(item.slug, item.zone)}
                  </h3>
                  <dl className="mt-3 grid grid-cols-4 overflow-hidden rounded-lg border border-border bg-muted/25">
                    {[
                      ["1 сеанс", singlePrice(item.slug, item.prices.one)],
                      ["4", formatPrice(null, item.prices.four)],
                      ["6", formatPrice(null, item.prices.six)],
                      ["10", formatPrice(null, item.prices.ten)]
                    ].map(([label, price], priceIndex) => (
                      <div
                        key={label}
                        className={`min-w-0 px-1 py-2.5 text-center ${priceIndex > 0 ? "border-l border-border" : ""}`}
                      >
                        <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="mt-1 text-[0.72rem] font-semibold tabular-nums text-metal-strong">
                          {price}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block" data-testid="desktop-laser-price">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Стоимость лазерной эпиляции по зонам и количеству сеансов
          </caption>
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="sticky left-0 z-10 bg-card px-5 py-4 font-medium sm:px-6">Зона</th>
              <th className="px-4 py-4 text-right font-medium">1 сеанс</th>
              <th className="px-4 py-4 text-right font-medium">4 сеанса</th>
              <th className="px-4 py-4 text-right font-medium">6 сеансов</th>
              <th className="px-5 py-4 text-right font-medium sm:px-6">10 сеансов</th>
            </tr>
          </thead>
          <tbody>
            {LASER_PRICE_GROUPS.flatMap((group) => [
              <tr key={`${group.name}-heading`} className="border-b border-border bg-muted/45">
                <th colSpan={5} className="px-5 py-3 font-semibold text-foreground sm:px-6">
                  {group.name}
                </th>
              </tr>,
              ...group.items.map((item) => (
                <tr key={item.slug} className="border-b border-border/70 last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-card px-5 py-3.5 font-medium text-foreground sm:px-6"
                  >
                    {zoneLabel(item.slug, item.zone)}
                  </th>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-metal-strong">
                      {singlePrice(item.slug, item.prices.one)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    {formatPrice(null, item.prices.four)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    {formatPrice(null, item.prices.six)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right sm:px-6">
                    {formatPrice(null, item.prices.ten)}
                  </td>
                </tr>
              ))
            ])}
          </tbody>
        </table>
      </div>
    </>
  );
}
