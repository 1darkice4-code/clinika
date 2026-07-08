import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client/index";

const prisma = new PrismaClient();

const devPassword = "DevPassword123!";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

function nextDateAt(daysFromNow: number, hours: number, minutes = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function seedRoles() {
  const permissions = [
    "dashboard.read",
    "clients.read",
    "clients.write",
    "clients.export",
    "leads.read",
    "leads.write",
    "appointments.read",
    "appointments.write",
    "schedule.read",
    "schedule.write",
    "content.read",
    "content.write",
    "notifications.read",
    "notifications.write",
    "analytics.read",
    "users.manage",
    "roles.manage",
    "audit.read",
    "settings.write"
  ];

  await prisma.permission.createMany({
    data: permissions.map((code) => ({ code, description: code })),
    skipDuplicates: true
  });

  const roleDefinitions = [
    {
      code: "OWNER",
      name: "Владелец",
      permissions
    },
    {
      code: "ADMIN",
      name: "Администратор клиники",
      permissions: permissions.filter((permission) => !["users.manage", "roles.manage"].includes(permission))
    },
    {
      code: "SPECIALIST",
      name: "Специалист",
      permissions: ["dashboard.read", "appointments.read", "schedule.read", "clients.read"]
    }
  ];

  await prisma.role.deleteMany({ where: { code: "CONTENT_MANAGER" } });

  for (const roleDefinition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code: roleDefinition.code },
      update: { name: roleDefinition.name },
      create: {
        code: roleDefinition.code,
        name: roleDefinition.name,
        description: roleDefinition.name
      }
    });

    const rolePermissions = await prisma.permission.findMany({
      where: { code: { in: roleDefinition.permissions } }
    });

    await prisma.rolePermission.createMany({
      data: rolePermissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });
  }
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(devPassword, 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@clinika.test" },
    update: { name: "Владелец Сияние" },
    create: {
      email: "owner@clinika.test",
      passwordHash,
      name: "Владелец Сияние",
      phone: "+79990000001"
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@clinika.test" },
    update: { name: "Администратор Сияние" },
    create: {
      email: "admin@clinika.test",
      passwordHash,
      name: "Администратор Сияние",
      phone: "+79990000002"
    }
  });

  const specialistUser = await prisma.user.upsert({
    where: { email: "specialist@clinika.test" },
    update: { name: "Д-р Анна Смирнова" },
    create: {
      email: "specialist@clinika.test",
      passwordHash,
      name: "Д-р Анна Смирнова",
      phone: "+79990000003"
    }
  });

  await prisma.user.updateMany({
    where: { email: "content@clinika.test" },
    data: { status: "DELETED", deletedAt: new Date() }
  });

  const assignments = [
    { userId: owner.id, roleCode: "OWNER" },
    { userId: admin.id, roleCode: "ADMIN" },
    { userId: specialistUser.id, roleCode: "SPECIALIST" }
  ];

  for (const assignment of assignments) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: assignment.roleCode } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: assignment.userId, roleId: role.id } },
      update: {},
      create: { userId: assignment.userId, roleId: role.id }
    });
  }

  return { owner, admin, specialistUser };
}

async function seedSettings() {
  const existing = await prisma.clinicSettings.findFirst();
  const data = {
    clinicName: "Сияние",
    legalName: "ООО «Сияние Клиник»",
    taxId: "0000000000",
    address: "Чита, ул. Суглинная, 2Б",
    phone: "+7 (999) 000-00-00",
    email: "hello@siyanie.test",
    timezone: "Asia/Chita",
    messengersJson: {
      telegram: "https://t.me/siyanie_example",
      whatsapp: "https://wa.me/79990000000"
    } satisfies Prisma.JsonObject,
    socialLinksJson: {
      vk: "https://vk.com/siyanie_example"
    } satisfies Prisma.JsonObject,
    workingHoursJson: {
      weekdays: "09:00-21:00",
      weekend: "10:00-18:00"
    } satisfies Prisma.JsonObject,
    mapEmbedUrl: "https://yandex.ru/maps/",
    bookingMinLeadMinutes: 120,
    bookingMaxHorizonDays: 45
  };

  if (existing) {
    await prisma.clinicSettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.clinicSettings.create({ data });
  }
}

async function seedServices() {
  const categories = [
    {
      name: "Косметология",
      slug: "cosmetology",
      description: "Консультации, чистки и уход для кожи"
    },
    {
      name: "Инъекционные процедуры",
      slug: "injections",
      description: "Процедуры после консультации и оценки противопоказаний"
    },
    {
      name: "Аппаратная косметология",
      slug: "hardware",
      description: "Аппаратные методики для лица и тела"
    }
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });
  }

  const cosmetology = await prisma.serviceCategory.findUniqueOrThrow({
    where: { slug: "cosmetology" }
  });
  const injections = await prisma.serviceCategory.findUniqueOrThrow({
    where: { slug: "injections" }
  });
  const hardware = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: "hardware" } });

  const services = [
    {
      categoryId: cosmetology.id,
      name: "Консультация косметолога",
      slug: "cosmetologist-consultation",
      shortDescription: "Разберем, что беспокоит, посмотрим кожу и подберем понятный план.",
      fullDescription:
        "На консультации специалист уточняет запрос, смотрит состояние кожи, спрашивает про ограничения и предлагает процедуры без навязывания лишнего.",
      priceExact: 2500,
      durationMinutes: 45,
      isFeatured: true,
      sortOrder: 1
    },
    {
      categoryId: injections.id,
      name: "Биоревитализация",
      slug: "biorevitalization",
      shortDescription: "Инъекционная процедура для увлажненности, тонуса и качества кожи.",
      fullDescription:
        "Процедура проводится только после консультации. Специалист подбирает препарат и зону, объясняет подготовку, ограничения и уход после визита.",
      priceFrom: 12000,
      durationMinutes: 60,
      bufferAfterMinutes: 15,
      contraindications:
        "Беременность, лактация, острые воспалительные процессы и индивидуальные противопоказания.",
      disclaimer: "Результат индивидуален и определяется после консультации.",
      isFeatured: true,
      sortOrder: 2
    },
    {
      categoryId: hardware.id,
      name: "SMAS-лифтинг",
      slug: "smas-lifting",
      shortDescription: "Аппаратная процедура, когда хочется более четкий овал без операции.",
      fullDescription:
        "SMAS-лифтинг подходит не всем, поэтому перед процедурой нужна консультация. Специалист оценит показания, противопоказания и ожидаемый эффект.",
      priceFrom: 28000,
      durationMinutes: 90,
      bufferAfterMinutes: 20,
      contraindications: "Требуется консультация для исключения противопоказаний.",
      disclaimer: "Не является гарантией конкретного результата.",
      isFeatured: true,
      sortOrder: 3
    }
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service
    });
  }
}

async function seedSpecialists(specialistUserId: string) {
  const photos = await Promise.all(
    [
      {
        storageKey: "seed/smirnova.jpg",
        publicUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2",
        originalName: "smirnova.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 120000,
        alt: "Врач косметолог Анна Смирнова"
      },
      {
        storageKey: "seed/orlova.jpg",
        publicUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f",
        originalName: "orlova.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 130000,
        alt: "Специалист Мария Орлова"
      },
      {
        storageKey: "seed/volkova.jpg",
        publicUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d",
        originalName: "volkova.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 125000,
        alt: "Врач дерматолог Елена Волкова"
      }
    ].map((media) =>
      prisma.mediaFile.upsert({
        where: { storageKey: media.storageKey },
        update: media,
        create: media
      })
    )
  );

  const specialists = [
    {
      userId: specialistUserId,
      firstName: "Анна",
      lastName: "Смирнова",
      slug: "anna-smirnova",
      photoMediaId: photos[0].id,
      position: "Врач-косметолог",
      specialization: "Инъекционные и уходовые процедуры",
      experienceYears: 9,
      education: "Первый МГМУ им. И.М. Сеченова, дерматовенерология",
      certificates: "Курсы по биоревитализации, контурной коррекции и аппаратным методикам.",
      description:
        "Спокойно ведет консультации, подробно объясняет этапы процедуры и не торопит с решением.",
      sortOrder: 1
    },
    {
      firstName: "Мария",
      lastName: "Орлова",
      slug: "maria-orlova",
      photoMediaId: photos[1].id,
      position: "Косметолог-эстетист",
      specialization: "Уходовые процедуры и диагностика кожи",
      experienceYears: 6,
      education: "Медицинский колледж, сестринское дело в косметологии",
      certificates: "Протоколы профессионального ухода и атравматичных чисток.",
      description:
        "Помогает подобрать регулярный уход, чистки и процедуры, после которых коже легче восстановиться.",
      sortOrder: 2
    },
    {
      firstName: "Елена",
      lastName: "Волкова",
      slug: "elena-volkova",
      photoMediaId: photos[2].id,
      position: "Дерматолог",
      specialization: "Аппаратная косметология",
      experienceYears: 12,
      education: "РНИМУ им. Н.И. Пирогова, лечебное дело, дерматовенерология",
      certificates: "Аппаратные технологии, лазерные методики, SMAS-протоколы.",
      description:
        "Работает с аппаратными методиками и честно проговаривает, какого результата стоит ждать.",
      sortOrder: 3
    }
  ];

  for (const specialist of specialists) {
    await prisma.specialist.upsert({
      where: { slug: specialist.slug },
      update: specialist,
      create: specialist
    });
  }

  const allSpecialists = await prisma.specialist.findMany();
  const allServices = await prisma.service.findMany();

  for (const specialist of allSpecialists) {
    for (const service of allServices) {
      await prisma.specialistService.upsert({
        where: {
          specialistId_serviceId: {
            specialistId: specialist.id,
            serviceId: service.id
          }
        },
        update: { isActive: true },
        create: {
          specialistId: specialist.id,
          serviceId: service.id,
          isActive: true
        }
      });
    }

    await prisma.workSchedule.deleteMany({ where: { specialistId: specialist.id } });
    for (const weekday of [1, 2, 3, 4, 5]) {
      await prisma.workSchedule.create({
        data: {
          specialistId: specialist.id,
          weekday,
          startsAtLocalTime: "09:00",
          endsAtLocalTime: "18:00",
          breaksJson: [{ startsAtLocalTime: "13:00", endsAtLocalTime: "14:00" }]
        }
      });
    }
  }
}

async function seedLegalDocuments() {
  const docs = [
    {
      type: "PRIVACY_POLICY" as const,
      slug: "privacy-policy",
      title: "Политика конфиденциальности",
      content: "Технический шаблон политики. Финальный текст должен быть проверен юристом.",
      version: "2026-01",
      status: "PUBLISHED" as const,
      publishedAt: new Date()
    },
    {
      type: "PERSONAL_DATA_CONSENT" as const,
      slug: "personal-data-consent",
      title: "Согласие на обработку персональных данных",
      content: "Технический шаблон согласия. Финальный текст должен быть проверен юристом.",
      version: "2026-01",
      status: "PUBLISHED" as const,
      publishedAt: new Date()
    },
    {
      type: "MARKETING_CONSENT" as const,
      slug: "marketing-consent",
      title: "Согласие на рекламные сообщения",
      content: "Технический шаблон отдельного согласия на коммуникации.",
      version: "2026-01",
      status: "PUBLISHED" as const,
      publishedAt: new Date()
    }
  ];

  for (const doc of docs) {
    await prisma.legalDocument.upsert({
      where: { type_version: { type: doc.type, version: doc.version } },
      update: doc,
      create: doc
    });
  }
}

async function seedContent() {
  const seo = await prisma.seoMetadata.create({
    data: {
      title: "Сияние - клиника эстетической медицины",
      description:
        "Клиника эстетической медицины Сияние в Чите: консультации, уходовые, инъекционные и аппаратные процедуры.",
      canonicalPath: "/"
    }
  });

  const page = await prisma.page.upsert({
    where: { slug: "home" },
    update: {
      title: "Сияние",
      type: "HOME",
      status: "PUBLISHED",
      publishedAt: new Date()
    },
    create: {
      slug: "home",
      title: "Сияние",
      type: "HOME",
      status: "PUBLISHED",
      publishedAt: new Date(),
      seoMetadataId: seo.id
    }
  });

  await prisma.pageSection.deleteMany({ where: { pageId: page.id } });
  await prisma.pageSection.createMany({
    data: [
      {
        pageId: page.id,
        type: "HERO",
        title: "Сияние",
        subtitle: "Небольшая эстетическая клиника в Чите на Суглинной, 2Б.",
        sortOrder: 1,
        configJson: {
          primaryCta: "Записаться",
          secondaryCta: "Позвонить",
          imageUrl: "",
          trustItems: [
            "Консультация перед процедурой",
            "2-3 специалиста в смене",
            "Запись онлайн или по телефону"
          ]
        }
      },
      {
        pageId: page.id,
        type: "ABOUT",
        title: "О клинике",
        subtitle: "Работаем по записи, без потока и обещаний невозможного.",
        sortOrder: 2,
        configJson: {
          text: "Сначала разбираем запрос и противопоказания, потом предлагаем процедуру или план ухода.",
          stats: [
            { label: "специалиста в смене", value: "2-3" },
            { label: "адрес", value: "Суглинная, 2Б" },
            { label: "формат", value: "по записи" }
          ]
        }
      },
      {
        pageId: page.id,
        type: "SERVICES",
        title: "Услуги",
        subtitle: "Цены указаны для ориентира и уточняются после консультации.",
        sortOrder: 3,
        configJson: {}
      },
      {
        pageId: page.id,
        type: "SPECIALISTS",
        title: "Специалисты",
        subtitle: "Небольшая команда, к которой удобно вернуться повторно.",
        sortOrder: 4,
        configJson: {}
      },
      {
        pageId: page.id,
        type: "REVIEWS",
        title: "Отзывы",
        subtitle: "Публикуем только отзывы, которые прошли модерацию.",
        sortOrder: 5,
        configJson: {}
      },
      {
        pageId: page.id,
        type: "CONTACTS",
        title: "Контакты",
        subtitle: "Чита, ул. Суглинная, 2Б",
        sortOrder: 6,
        configJson: {}
      }
    ]
  });
}

async function seedReviewsAndGallery() {
  const service = await prisma.service.findUniqueOrThrow({ where: { slug: "biorevitalization" } });
  const specialist = await prisma.specialist.findUniqueOrThrow({
    where: { slug: "anna-smirnova" }
  });

  if ((await prisma.review.count()) === 0) {
    await prisma.review.createMany({
      data: [
        {
          clientDisplayName: "Елена К.",
          text: "Пришла без понимания, какая процедура нужна. Все спокойно объяснили, ничего не навязывали.",
          rating: 5,
          source: "Сайт",
          reviewDate: new Date("2026-02-12"),
          status: "PUBLISHED",
          serviceId: service.id,
          specialistId: specialist.id
        },
        {
          clientDisplayName: "Мария",
          text: "Записалась через сайт, администратор быстро перезвонил и помог выбрать удобное время.",
          rating: 5,
          source: "CRM",
          reviewDate: new Date("2026-03-04"),
          status: "PUBLISHED",
          serviceId: service.id,
          specialistId: specialist.id
        }
      ]
    });
  }

  const before = await prisma.mediaFile.upsert({
    where: { storageKey: "seed/before.jpg" },
    update: {},
    create: {
      storageKey: "seed/before.jpg",
      publicUrl: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99",
      originalName: "before.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 90000,
      alt: "Пример до процедуры"
    }
  });
  const after = await prisma.mediaFile.upsert({
    where: { storageKey: "seed/after.jpg" },
    update: {},
    create: {
      storageKey: "seed/after.jpg",
      publicUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881",
      originalName: "after.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 90000,
      alt: "Пример после процедуры"
    }
  });

  if ((await prisma.beforeAfterCase.count()) === 0) {
    await prisma.beforeAfterCase.create({
      data: {
        title: "Индивидуальный пример ухода",
        description: "Демонстрационный кейс seed-данных. Результат индивидуален.",
        serviceId: service.id,
        specialistId: specialist.id,
        beforeMediaId: before.id,
        afterMediaId: after.id,
        consentConfirmedAt: new Date(),
        status: "PUBLISHED"
      }
    });
  }
}

async function seedCrm(adminUserId: string) {
  const attribution = await prisma.uTMAttribution.create({
    data: {
      utmSource: "seed",
      utmMedium: "demo",
      utmCampaign: "launch",
      landingPage: "/",
      source: "seed",
      conversionType: "APPOINTMENT"
    }
  });

  const client = await prisma.client.upsert({
    where: { normalizedPhone: normalizePhone("+7 (999) 111-22-33") },
    update: {
      firstName: "Алина",
      phone: "+7 (999) 111-22-33"
    },
    create: {
      firstName: "Алина",
      lastName: "М.",
      phone: "+7 (999) 111-22-33",
      normalizedPhone: normalizePhone("+7 (999) 111-22-33"),
      email: "alina@example.test",
      personalDataConsentAt: new Date(),
      marketingConsentAt: new Date(),
      firstAttributionId: attribution.id,
      assignedUserId: adminUserId
    }
  });

  const service = await prisma.service.findUniqueOrThrow({
    where: { slug: "cosmetologist-consultation" }
  });
  const specialist = await prisma.specialist.findUniqueOrThrow({
    where: { slug: "anna-smirnova" }
  });

  const lead = await prisma.lead.upsert({
    where: { publicNumber: "L-000001" },
    update: {
      clientId: client.id,
      serviceId: service.id,
      preferredSpecialistId: specialist.id,
      assignedUserId: adminUserId
    },
    create: {
      publicNumber: "L-000001",
      clientId: client.id,
      serviceId: service.id,
      preferredSpecialistId: specialist.id,
      assignedUserId: adminUserId,
      attributionId: attribution.id,
      comment: "Интересуется консультацией и уходом.",
      source: "seed"
    }
  });

  await prisma.leadStatusHistory.create({
    data: {
      leadId: lead.id,
      toStatus: "NEW",
      changedByUserId: adminUserId,
      reason: "Seed"
    }
  });

  await prisma.appointment.upsert({
    where: { publicNumber: "A-000001" },
    update: {
      clientId: client.id,
      serviceId: service.id,
      specialistId: specialist.id,
      leadId: lead.id
    },
    create: {
      publicNumber: "A-000001",
      clientId: client.id,
      serviceId: service.id,
      specialistId: specialist.id,
      leadId: lead.id,
      startsAtUtc: nextDateAt(2, 10),
      endsAtUtc: nextDateAt(2, 10, 45),
      clinicTimezone: "Asia/Chita",
      priceAtBooking: service.priceExact,
      source: "seed",
      attributionId: attribution.id,
      createdByUserId: adminUserId,
      creationMethod: "ADMIN",
      status: "CONFIRMED"
    }
  });
}

async function seedNotifications() {
  const templates = [
    {
      eventType: "lead.created",
      channel: "IN_APP" as const,
      name: "Новая заявка",
      subject: "Новая заявка",
      body: "Новая заявка от {{clientName}}: {{serviceName}}"
    },
    {
      eventType: "appointment.created",
      channel: "IN_APP" as const,
      name: "Новая запись",
      subject: "Новая запись",
      body: "Новая запись: {{clientName}}, {{serviceName}}, {{startsAt}}"
    }
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        eventType_channel: {
          eventType: template.eventType,
          channel: template.channel
        }
      },
      update: template,
      create: template
    });
  }
}

async function main() {
  await seedRoles();
  const users = await seedUsers();
  await seedSettings();
  await seedServices();
  await seedSpecialists(users.specialistUser.id);
  await seedLegalDocuments();
  await seedContent();
  await seedReviewsAndGallery();
  await seedCrm(users.admin.id);
  await seedNotifications();

  console.info("Seed completed.");
  console.info("Development users:");
  console.info(`owner@clinika.test / ${devPassword}`);
  console.info(`admin@clinika.test / ${devPassword}`);
  console.info(`specialist@clinika.test / ${devPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
