"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/week";

export type CalendarDay = {
  key: string;
  heading: string;
  isToday: boolean;
  /** Work intervals (minutes since midnight) to shade as available time. */
  workRanges: { start: number; end: number }[];
};

export type CalendarEvent = {
  id: string;
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
  title: string;
  subtitle: string;
  meta?: string;
  statusLabel: string;
  statusClass: string;
  kind: "appointment" | "block";
  href?: string;
};

type WeekCalendarProps = {
  days: CalendarDay[];
  events: CalendarEvent[];
  dayStartMinutes: number;
  dayEndMinutes: number;
};

const HOUR_HEIGHT = 56; // px per hour
const MIN_EVENT_HEIGHT = 24;

type PositionedEvent = CalendarEvent & { colIndex: number; colCount: number };

/**
 * Assign overlapping events to side-by-side columns so they don't cover each
 * other. Events that transitively overlap form a cluster sharing a column count.
 */
function layoutDayEvents(dayEvents: CalendarEvent[]): PositionedEvent[] {
  const sorted = [...dayEvents].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  const result: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const colCount = cluster.reduce((max, event) => Math.max(max, event.colIndex + 1), 0);
    for (const event of cluster) event.colCount = colCount;
    result.push(...cluster);
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const event of sorted) {
    if (event.startMinutes >= clusterEnd && cluster.length > 0) flush();
    // First column whose last event ends at or before this event's start.
    let colIndex = 0;
    while (cluster.some((item) => item.colIndex === colIndex && item.endMinutes > event.startMinutes)) {
      colIndex += 1;
    }
    cluster.push({ ...event, colIndex, colCount: 1 });
    clusterEnd = Math.max(clusterEnd, event.endMinutes);
  }
  if (cluster.length > 0) flush();
  return result;
}

export function WeekCalendar({ days, events, dayStartMinutes, dayEndMinutes }: WeekCalendarProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const startHour = Math.floor(dayStartMinutes / 60);
  const endHour = Math.ceil(dayEndMinutes / 60);
  const totalMinutes = (endHour - startHour) * 60;
  const gridHeight = (totalMinutes / 60) * HOUR_HEIGHT;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const offsetTop = (minutes: number) => ((minutes - startHour * 60) / 60) * HOUR_HEIGHT;
  const selected = events.find((event) => event.id === selectedId) ?? null;

  return (
    <div>
      {selected && (
        <div className="mb-3 flex flex-col justify-between gap-3 rounded-md border bg-card p-4 text-sm shadow-sm md:flex-row md:items-center">
          <div>
            <p className="font-semibold">{selected.title}</p>
            <p className="mt-1 text-muted-foreground">{selected.subtitle}</p>
            {selected.meta && <p className="mt-1 text-muted-foreground">{selected.meta}</p>}
            <p className="mt-1 text-muted-foreground">
              {formatMinutes(selected.startMinutes)}–{formatMinutes(selected.endMinutes)} · {selected.statusLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.href && (
              <Link href={selected.href} className="rounded-md border bg-card px-3 py-2 font-medium hover:bg-muted">
                Открыть
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-md border px-3 py-2 font-medium hover:bg-muted"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border bg-card">
        <div className="min-w-[820px]">
          {/* Header row */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
            <div className="border-r" />
            {days.map((day) => (
              <div
                key={day.key}
                className={cn(
                  "border-r px-2 py-2 text-center text-xs font-medium last:border-r-0",
                  day.isToday ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="capitalize">{day.heading}</span>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="grid grid-cols-[56px_repeat(7,1fr)]">
            {/* Time gutter */}
            <div className="relative border-r" style={{ height: gridHeight }}>
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute -translate-y-1/2 pr-2 text-right text-[11px] text-muted-foreground"
                  style={{ top: index * HOUR_HEIGHT, right: 0, left: 0 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dayEvents = layoutDayEvents(events.filter((event) => event.dayKey === day.key));
              return (
                <div
                  key={day.key}
                  className={cn("relative border-r last:border-r-0", day.isToday && "bg-primary/5")}
                  style={{ height: gridHeight }}
                >
                  {/* Work-hours shading */}
                  {day.workRanges.map((range, index) => (
                    <div
                      key={`work-${index}`}
                      className="absolute inset-x-0 bg-emerald-500/5"
                      style={{
                        top: offsetTop(range.start),
                        height: Math.max(0, ((range.end - range.start) / 60) * HOUR_HEIGHT)
                      }}
                    />
                  ))}

                  {/* Hour lines */}
                  {hours.map((hour, index) => (
                    <div
                      key={`line-${hour}`}
                      className="absolute inset-x-0 border-t border-dashed border-muted"
                      style={{ top: index * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    // Clamp to the visible grid so out-of-range events don't overflow.
                    const rawTop = offsetTop(event.startMinutes);
                    const rawBottom = offsetTop(event.endMinutes);
                    const top = Math.max(0, rawTop);
                    const bottom = Math.min(gridHeight, rawBottom);
                    const height = Math.max(MIN_EVENT_HEIGHT, bottom - top);
                    const widthPct = 100 / event.colCount;
                    const isBlock = event.kind === "block";
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedId(event.id)}
                        style={{
                          top,
                          height,
                          left: `calc(${event.colIndex * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`
                        }}
                        className={cn(
                          "absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow",
                          isBlock
                            ? "border-dashed border-muted-foreground/40 bg-muted text-muted-foreground"
                            : event.statusClass,
                          selectedId === event.id && "ring-2 ring-primary"
                        )}
                      >
                        <span className="block font-medium">
                          {formatMinutes(event.startMinutes)} {event.title}
                        </span>
                        {height > 34 && event.colCount === 1 && (
                          <span className="block truncate opacity-80">{event.subtitle}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
