import type { ContentStatus, ReviewStatus } from "@prisma/client/index";

export const contentStatusLabels = {
  DRAFT: "Черновик",
  PUBLISHED: "Опубликовано",
  ARCHIVED: "В архиве"
} satisfies Record<ContentStatus, string>;

export const contentStatusClasses = {
  DRAFT: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  PUBLISHED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  ARCHIVED: "border-muted-foreground/30 bg-muted text-muted-foreground"
} satisfies Record<ContentStatus, string>;

export const reviewStatusLabels = {
  PENDING: "На модерации",
  PUBLISHED: "Опубликован",
  REJECTED: "Отклонен"
} satisfies Record<ReviewStatus, string>;

export const reviewStatusClasses = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  PUBLISHED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-600"
} satisfies Record<ReviewStatus, string>;

/** Русские подписи дней недели (Пн=1 … Вс=7). */
export const weekdayShortLabels: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс"
};

export const weekdayLongLabels: Record<number, string> = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье"
};
