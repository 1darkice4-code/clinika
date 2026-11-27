export type CosmetologyPriceItem = {
  name: string;
  slug: string;
  priceExact: number | null;
  durationMinutes: number;
};

export const CONSULTATION_CATEGORY = {
  slug: "cosmetology-consultations",
  name: "Консультации",
  description: "Приём, осмотр и консультация врача-косметолога"
} as const;

export const CONSULTATION_SERVICES: readonly CosmetologyPriceItem[] = [
  {
    name: "Первичный приём главного врача-косметолога",
    slug: "cosmetologist-consultation",
    priceExact: 2000,
    durationMinutes: 30
  },
  {
    name: "Первичный приём врача-косметолога",
    slug: "cosmetologist-initial-consultation",
    priceExact: 1000,
    durationMinutes: 30
  },
  {
    name: "Повторный приём врача-косметолога",
    slug: "cosmetologist-follow-up-consultation",
    priceExact: 0,
    durationMinutes: 30
  }
] as const;

// Kept as a compatibility alias for the specialist publishing script.
export const CONSULTATION_SERVICE = {
  categorySlug: CONSULTATION_CATEGORY.slug,
  categoryName: CONSULTATION_CATEGORY.name,
  categoryDescription: CONSULTATION_CATEGORY.description,
  name: CONSULTATION_SERVICES[0].name,
  slug: "cosmetologist-consultation",
  shortDescription:
    "Личный приём врача-дерматолога: разбор жалоб, осмотр кожи и понятный план дальнейших действий.",
  fullDescription:
    "Светлана Арутюновна уточнит ваш запрос, проведёт осмотр, разберёт ограничения и предложит индивидуальный план ухода или лечения.",
  priceExact: 2000,
  durationMinutes: 30,
  bufferAfterMinutes: 0
} as const;

export const BOTULINUM_CATEGORY = {
  slug: "botulinum-therapy",
  name: "Ботулинотерапия",
  description: "Коррекция гипергидроза и мимических морщин"
} as const;

export const BOTULINUM_SERVICES: readonly CosmetologyPriceItem[] = [
  {
    name: "Коррекция гипергидроза препаратом Релатокс (60 ед.)",
    slug: "hyperhidrosis-relatox-60",
    priceExact: 15000,
    durationMinutes: 60
  },
  {
    name: "Коррекция гипергидроза препаратом Релатокс (80 ед.)",
    slug: "hyperhidrosis-relatox-80",
    priceExact: 20000,
    durationMinutes: 60
  },
  {
    name: "Коррекция гипергидроза препаратом Релатокс (100 ед.)",
    slug: "hyperhidrosis-relatox-100",
    priceExact: 25000,
    durationMinutes: 60
  },
  {
    name: "Коррекция гипергидроза препаратом Диспорт (300 ед.)",
    slug: "hyperhidrosis-dysport-300",
    priceExact: 25000,
    durationMinutes: 60
  },
  {
    name: "Коррекция гипергидроза препаратом Диспорт (500 ед.)",
    slug: "hyperhidrosis-dysport-500",
    priceExact: 40000,
    durationMinutes: 60
  },
  {
    name: "Коррекция мимических морщин препаратом Диспорт (1 ед.)",
    slug: "wrinkles-dysport-1",
    priceExact: 150,
    durationMinutes: 60
  },
  {
    name: "Коррекция мимических морщин препаратом Релатокс (1 ед.)",
    slug: "wrinkles-relatox-1",
    priceExact: 290,
    durationMinutes: 60
  },
  {
    name: "Коррекция мимических морщин препаратом Ксеомин (1 ед.)",
    slug: "wrinkles-xeomin-1",
    priceExact: 330,
    durationMinutes: 60
  },
  {
    name: "Коррекция мимических морщин препаратом Миотокс (1 ед.)",
    slug: "wrinkles-myotox-1",
    priceExact: 280,
    durationMinutes: 60
  },
  {
    name: "Коррекция мимических морщин препаратом Новокутан БТА (1 ед.)",
    slug: "wrinkles-novocutan-bta-1",
    priceExact: 280,
    durationMinutes: 60
  }
] as const;

export const CONTOUR_CATEGORY = {
  slug: "contour-plastic",
  name: "Контурная пластика",
  description:
    "Коррекция инволюционных и атрофических изменений с использованием внутридермальных имплантатов"
} as const;

export const CONTOUR_SERVICES: readonly CosmetologyPriceItem[] = [
  {
    name: "Контурная пластика препаратом Эстэфил, 10 мл",
    slug: "contour-aesthefill-10",
    priceExact: null,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Кьютфил Файн, 1 мл",
    slug: "contour-cutefill-fine-1",
    priceExact: 14500,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Кьютфил Саб, 1 мл",
    slug: "contour-cutefill-sub-1",
    priceExact: 15800,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Кьютфил Дип, 1 мл",
    slug: "contour-cutefill-deep-1",
    priceExact: 14900,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Баланс, 1 мл",
    slug: "contour-belotero-balance-1",
    priceExact: 17500,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Баланс с лидокаином, 1 мл",
    slug: "contour-belotero-balance-lidocaine-1",
    priceExact: 18600,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Софт, 1 мл",
    slug: "contour-belotero-soft-1",
    priceExact: 15000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Софт с лидокаином, 1 мл",
    slug: "contour-belotero-soft-lidocaine-1",
    priceExact: 16000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Интенс, 1 мл",
    slug: "contour-belotero-intense-1",
    priceExact: 20000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Интенс с лидокаином, 1 мл",
    slug: "contour-belotero-intense-lidocaine-1",
    priceExact: 20500,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Вольюм, 1 мл",
    slug: "contour-belotero-volume-1",
    priceExact: 20700,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белотеро Липс с лидокаином, 0,6 мл",
    slug: "contour-belotero-lips-lidocaine-06",
    priceExact: 15200,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Алиаксин LV Липс, 1 мл",
    slug: "contour-aliaxin-lv-lips-1",
    priceExact: 17000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Алиаксин SV Волюм, 1 мл",
    slug: "contour-aliaxin-sv-volume-1",
    priceExact: 18600,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Алиаксин SR, 1 мл",
    slug: "contour-aliaxin-sr-1",
    priceExact: 17500,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Алиаксин FL Липс, 1 мл",
    slug: "contour-aliaxin-fl-lips-1",
    priceExact: 17500,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Алиаксин GP, 1 мл",
    slug: "contour-aliaxin-gp-1",
    priceExact: 17000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Алиаксин EV, 1 мл",
    slug: "contour-aliaxin-ev-1",
    priceExact: 18600,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж S, 0,8 мл",
    slug: "contour-stylage-s-08",
    priceExact: 17500,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж XL, 1 мл",
    slug: "contour-stylage-xl-1",
    priceExact: 21300,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж Гидро, 1 мл",
    slug: "contour-stylage-hydro-1",
    priceExact: 16000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж SL с лидокаином, 1 мл",
    slug: "contour-stylage-sl-lidocaine-1",
    priceExact: 21000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж L, 1 мл",
    slug: "contour-stylage-l-1",
    priceExact: 20400,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж M, 1 мл",
    slug: "contour-stylage-m-1",
    priceExact: 20400,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Стилаж M с лидокаином, 1 мл",
    slug: "contour-stylage-m-lidocaine-1",
    priceExact: 20900,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом GANA (полимолочная кислота), 5 мл",
    slug: "contour-gana-5",
    priceExact: 13600,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом GANA (полимолочная кислота), 10 мл",
    slug: "contour-gana-10",
    priceExact: 25200,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом GANA (полимолочная кислота), 15 мл",
    slug: "contour-gana-15",
    priceExact: 38000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Миралайн PLLA 28, 10 мл",
    slug: "contour-miraline-plla-28-10",
    priceExact: 35000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Радиес, 1,5 мл",
    slug: "contour-radiesse-15",
    priceExact: 29000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Радиес, 3 мл",
    slug: "contour-radiesse-3",
    priceExact: 55000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Белларти Эстилла, 3 мл",
    slug: "contour-bellarti-estilla-3",
    priceExact: 14000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Art Filler Volume, 1,2 мл",
    slug: "contour-art-filler-volume-12",
    priceExact: 22000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Art Filler Lips, 1 мл",
    slug: "contour-art-filler-lips-1",
    priceExact: 19000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Art Filler Universal, 1,2 мл",
    slug: "contour-art-filler-universal-12",
    priceExact: 21300,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Art Filler Fine Lines, 1 мл",
    slug: "contour-art-filler-fine-lines-1",
    priceExact: 19000,
    durationMinutes: 60
  },
  {
    name: "Контурная пластика препаратом Эллаген, 10 мл",
    slug: "contour-ellagen-10",
    priceExact: 35000,
    durationMinutes: 60
  }
] as const;

export const COSMETOLOGY_PRICE_GROUPS = [
  { ...CONSULTATION_CATEGORY, items: CONSULTATION_SERVICES },
  { ...BOTULINUM_CATEGORY, items: BOTULINUM_SERVICES },
  { ...CONTOUR_CATEGORY, items: CONTOUR_SERVICES }
] as const;

export const COSMETOLOGY_SERVICES = COSMETOLOGY_PRICE_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, categorySlug: group.slug }))
);

export type LaserPrices = {
  one: number;
  four: number;
  six: number;
  ten: number;
};

export type LaserPriceItem = {
  zone: string;
  slug: string;
  durationMinutes: number;
  prices: LaserPrices;
};

export type LaserPriceGroup = {
  name: string;
  items: readonly LaserPriceItem[];
};

export const LASER_CATEGORY = {
  slug: "laser-hair-removal",
  name: "Лазерная эпиляция",
  description: "Лазерная эпиляция по зонам и выгодные курсы на 4, 6 или 10 сеансов"
} as const;

export const LASER_PRICE_GROUPS: readonly LaserPriceGroup[] = [
  {
    name: "Лицо",
    items: [
      {
        zone: "Верхняя губа",
        slug: "laser-upper-lip",
        durationMinutes: 15,
        prices: { one: 890, four: 3400, six: 4800, ten: 7500 }
      },
      {
        zone: "Подбородок",
        slug: "laser-chin",
        durationMinutes: 15,
        prices: { one: 890, four: 3400, six: 4800, ten: 7500 }
      },
      {
        zone: "Шея (перед/зад)",
        slug: "laser-neck",
        durationMinutes: 30,
        prices: { one: 990, four: 3700, six: 5300, ten: 8400 }
      },
      {
        zone: "Лицо полностью",
        slug: "laser-full-face",
        durationMinutes: 45,
        prices: { one: 2190, four: 8300, six: 11800, ten: 19000 }
      }
    ]
  },
  {
    name: "Руки",
    items: [
      {
        zone: "Подмышечные впадины",
        slug: "laser-underarms",
        durationMinutes: 30,
        prices: { one: 1490, four: 5600, six: 8000, ten: 12000 }
      },
      {
        zone: "Плечи",
        slug: "laser-shoulders",
        durationMinutes: 30,
        prices: { one: 1590, four: 6000, six: 8400, ten: 13000 }
      },
      {
        zone: "Предплечья",
        slug: "laser-forearms",
        durationMinutes: 30,
        prices: { one: 1590, four: 6000, six: 8400, ten: 13000 }
      },
      {
        zone: "Руки полностью",
        slug: "laser-full-arms",
        durationMinutes: 60,
        prices: { one: 2990, four: 11300, six: 16200, ten: 25000 }
      }
    ]
  },
  {
    name: "Ноги",
    items: [
      {
        zone: "Бёдра",
        slug: "laser-thighs",
        durationMinutes: 60,
        prices: { one: 2690, four: 10000, six: 13800, ten: 22000 }
      },
      {
        zone: "Голени",
        slug: "laser-shins",
        durationMinutes: 60,
        prices: { one: 2690, four: 10000, six: 13800, ten: 22000 }
      },
      {
        zone: "Ноги полностью",
        slug: "laser-full-legs",
        durationMinutes: 90,
        prices: { one: 4290, four: 16000, six: 23100, ten: 36000 }
      }
    ]
  },
  {
    name: "Бикини",
    items: [
      {
        zone: "Классическое",
        slug: "laser-classic-bikini",
        durationMinutes: 30,
        prices: { one: 1590, four: 6000, six: 8400, ten: 13000 }
      },
      {
        zone: "Глубокое",
        slug: "laser-deep-bikini",
        durationMinutes: 45,
        prices: { one: 2690, four: 10000, six: 13800, ten: 22000 }
      }
    ]
  },
  {
    name: "Тело",
    items: [
      {
        zone: "Спина",
        slug: "laser-back",
        durationMinutes: 60,
        prices: { one: 2390, four: 9000, six: 12900, ten: 20000 }
      },
      {
        zone: "Поясница",
        slug: "laser-lower-back",
        durationMinutes: 30,
        prices: { one: 1590, four: 6000, six: 8400, ten: 13000 }
      },
      {
        zone: "Живот",
        slug: "laser-abdomen",
        durationMinutes: 30,
        prices: { one: 1590, four: 6000, six: 8400, ten: 13000 }
      }
    ]
  }
] as const;

export const LASER_SERVICES = LASER_PRICE_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.name }))
);

export const LASER_SHAVING_PRICE = 500;
