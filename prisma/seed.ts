import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client/index";
import { publishLegalDocuments } from "../src/domain/legal/publish-legal-documents";
import { publishFeaturedReviews } from "../src/domain/review/publish-featured-reviews";
import { CONSULTATION_SERVICE } from "../src/domain/service/current-price-list";
import { publishCurrentPriceList } from "../src/domain/service/publish-current-price-list";
import { publishFeaturedSpecialist } from "../src/domain/specialist/publish-featured-specialist";

const prisma = new PrismaClient();

function requiredSeedPassword(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 12) {
    throw new Error(
      `${name} must be set and contain at least 12 characters before running the seed.`
    );
  }
  return value;
}

const seedPasswords = {
  owner: requiredSeedPassword("SEED_OWNER_PASSWORD"),
  admin: requiredSeedPassword("SEED_ADMIN_PASSWORD"),
  specialist: requiredSeedPassword("SEED_SPECIALIST_PASSWORD")
};

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
      permissions: permissions.filter(
        (permission) => !["users.manage", "roles.manage"].includes(permission)
      )
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
  const [ownerPasswordHash, adminPasswordHash, specialistPasswordHash] = await Promise.all([
    bcrypt.hash(seedPasswords.owner, 12),
    bcrypt.hash(seedPasswords.admin, 12),
    bcrypt.hash(seedPasswords.specialist, 12)
  ]);
  const owner = await prisma.user.upsert({
    where: { email: "owner@clinika.test" },
    update: { name: "Владелец Сияние", passwordHash: ownerPasswordHash },
    create: {
      email: "owner@clinika.test",
      passwordHash: ownerPasswordHash,
      name: "Владелец Сияние",
      phone: "+79990000001"
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@clinika.test" },
    update: { name: "Администратор Сияние", passwordHash: adminPasswordHash },
    create: {
      email: "admin@clinika.test",
      passwordHash: adminPasswordHash,
      name: "Администратор Сияние",
      phone: "+79990000002"
    }
  });

  const specialistUser = await prisma.user.upsert({
    where: { email: "specialist@clinika.test" },
    update: { name: "Светлана Арутюновна Нерсисян", passwordHash: specialistPasswordHash },
    create: {
      email: "specialist@clinika.test",
      passwordHash: specialistPasswordHash,
      name: "Светлана Арутюновна Нерсисян",
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

/** Creates the shared laser machine + its weekly hours, returns the resource. */
async function seedResources() {
  const resource = await prisma.resource.upsert({
    where: { slug: "laser-machine" },
    update: { name: "Лазерный аппарат", isActive: true, sortOrder: 1 },
    create: { name: "Лазерный аппарат", slug: "laser-machine", isActive: true, sortOrder: 1 }
  });

  // Аппарат работает Пн–Сб 10:00–20:00 — единая очередь на всех операторов.
  await prisma.resourceWorkSchedule.deleteMany({ where: { resourceId: resource.id } });
  for (const weekday of [1, 2, 3, 4, 5, 6]) {
    await prisma.resourceWorkSchedule.create({
      data: {
        resourceId: resource.id,
        weekday,
        startsAtLocalTime: "10:00",
        endsAtLocalTime: "20:00"
      }
    });
  }

  return resource;
}

async function seedServices(laserResourceId: string) {
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
    },
    {
      name: "Лазерная эпиляция",
      slug: "laser-hair-removal",
      description: "Единая очередь на общий лазерный аппарат"
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
  const laser = await prisma.serviceCategory.findUniqueOrThrow({
    where: { slug: "laser-hair-removal" }
  });

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
    },
    {
      categoryId: laser.id,
      requiresResourceId: laserResourceId,
      name: "Лазерная эпиляция — подмышки",
      slug: "laser-underarms",
      shortDescription: "Быстрая процедура на общем аппарате. Запись в единую очередь.",
      fullDescription:
        "Процедура выполняется на общем лазерном аппарате одним из мастеров. Время выбирается из единой очереди аппарата — конкретного мастера подбирает администратор.",
      priceExact: 1500,
      durationMinutes: 30,
      bufferAfterMinutes: 0,
      contraindications: "Загар, повреждения кожи, беременность и индивидуальные противопоказания.",
      isFeatured: true,
      sortOrder: 4
    },
    {
      categoryId: laser.id,
      requiresResourceId: laserResourceId,
      name: "Лазерная эпиляция — голени",
      slug: "laser-shins",
      shortDescription: "Процедура на общем аппарате. Запись в единую очередь.",
      fullDescription:
        "Процедура выполняется на общем лазерном аппарате одним из мастеров. Время выбирается из единой очереди аппарата.",
      priceExact: 3000,
      durationMinutes: 60,
      bufferAfterMinutes: 0,
      contraindications: "Загар, повреждения кожи, беременность и индивидуальные противопоказания.",
      sortOrder: 5
    }
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service
    });
  }

  // Keep fresh installs aligned with the public price list used in production.
  await publishCurrentPriceList(prisma);
}

async function seedSpecialists(specialistUserId: string, laserResourceId: string) {
  const specialist = await publishFeaturedSpecialist(prisma, { userId: specialistUserId });
  const allSpecialists = [specialist];
  const allServices = await prisma.service.findMany({
    where: { slug: CONSULTATION_SERVICE.slug, isActive: true, deletedAt: null }
  });

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

  // Все мастера — операторы общего лазерного аппарата (единая очередь, назначение в админке).
  for (const specialist of allSpecialists) {
    await prisma.resourceOperator.upsert({
      where: {
        resourceId_specialistId: { resourceId: laserResourceId, specialistId: specialist.id }
      },
      update: { isActive: true },
      create: { resourceId: laserResourceId, specialistId: specialist.id, isActive: true }
    });
  }
}

async function seedLegalDocuments() {
  await publishLegalDocuments(prisma);
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
    where: { slug: "svetlana-nersisyan" }
  });

  await publishFeaturedReviews(prisma);

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
    where: { slug: "svetlana-nersisyan" }
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
  const laserResource = await seedResources();
  await seedServices(laserResource.id);
  await seedSpecialists(users.specialistUser.id, laserResource.id);
  await seedLegalDocuments();
  await seedContent();
  await seedReviewsAndGallery();
  await seedCrm(users.admin.id);
  await seedNotifications();

  console.info("Seed completed.");
  console.info("Seed users created. Passwords were read from the environment and are not logged.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
