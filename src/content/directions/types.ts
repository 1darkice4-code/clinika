export type DirectionTextSection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  note?: string;
};

/** Строка таблицы цен: одна цена (`price`) или несколько колонок (`cells`). */
export type DirectionPriceRow = { name: string; price?: string; cells?: readonly string[]; href?: string };

export type DirectionPerformer = {
  name: string;
  /** Подпись в заголовке блока, например «Кто проводит процедуру». */
  heading?: string;
  photo: string;
  alt: string;
  text: string;
  href: string;
  linkLabel: string;
};

export type DirectionContent = {
  /** Путь страницы, например "/botulinoterapiya". */
  path: string;
  /** H1 страницы. */
  title: string;
  /** <title> для поисковой выдачи, если должен отличаться от H1 (например, с «цены»). */
  seoTitle?: string;
  metaDescription: string;
  /** Короткое название для хлебных крошек и перекрёстных ссылок. */
  shortName: string;
  serviceType: string;
  lead: string;
  /** Плашка в шапке, например «от 150 ₽ за 1 ед.». */
  priceBadge: string;
  /**
   * Фото в шапке; position — точка кадрирования (CSS object-position), например "center 22%".
   * cutout — PNG/WebP с прозрачным фоном: модель без рамки на тёмной шапке со свечением;
   * focusX — где по горизонтали центр кольца за моделью, в процентах (по умолчанию 53).
   */
  image: { src: string; alt: string; position?: string; cutout?: boolean; width?: number; height?: number; focusX?: number };
  /** Картинка для превью ссылок и разметки, если в шапке модель без фона (прозрачный WebP для превью не годится). */
  shareImage?: { src: string; alt: string };
  bookingHref: string;
  bookingLabel: string;
  prices: {
    title: string;
    /** Заголовки колонок; по умолчанию «Услуга» и «Цена». */
    head?: readonly string[];
    rows: readonly DirectionPriceRow[];
    note: string;
  };
  performer: DirectionPerformer;
  /** Родительская страница для хлебных крошек, например лазерная эпиляция для страниц зон. */
  parent?: { name: string; path: string };
  /** Разделы; соседние элементы массива-пары выводятся в две колонки. */
  sections: readonly (DirectionTextSection | readonly [DirectionTextSection, DirectionTextSection])[];
  /** Для страниц процедур; у консультации блока противопоказаний нет. */
  contraindications?: { readonly intro: string; readonly items: readonly string[]; readonly note: string };
  questions: readonly { question: string; answer: string }[];
};
