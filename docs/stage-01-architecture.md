# Этап 1. Архитектура

## 1. Цель этапа

Сформировать проверяемую архитектурную основу для MVP веб-сервиса клиники эстетической медицины:

- выбрать стек;
- определить структуру проекта;
- описать компоненты системы;
- спроектировать ER-модель;
- описать безопасность, роли и права;
- подготовить контракты серверных операций;
- зафиксировать стратегию тестирования, деплоя, логирования и резервного копирования;
- учесть, что публичный лендинг будет регулярно редактироваться через административную панель.

На этом этапе код приложения не создается. Документ является техническим контрактом для следующих этапов.

## 2. Принятые настройки по умолчанию

- Юрисдикция и язык MVP: Россия, русский язык.
- Часовой пояс клиники: `Europe/Moscow`.
- Основной сценарий: полноценная онлайн-запись.
- Альтернативный сценарий: заявка на обратный звонок.
- Название в seed-данных: `Clinika Aesthetics`.
- Реальные уведомления в MVP: не подключаются.
- Локальный режим уведомлений: запись уведомлений в БД и структурированные логи.
- Количество специалистов в seed: 3.
- Онлайн-оплата: вне MVP.
- Дата рождения клиента: опционально, не собирается в публичной форме по умолчанию.
- Лендинг: CMS-first, весь редактируемый контент хранится в БД.

## 3. Стек

### 3.1 Основной стек

- Next.js с App Router.
- React.
- TypeScript в строгом режиме.
- Tailwind CSS.
- shadcn/ui как набор доступных UI-компонентов.
- React Hook Form для клиентских форм.
- Zod для общей валидации входных данных.
- PostgreSQL.
- Prisma ORM.
- Собственная серверная аутентификация MVP: bcrypt, серверные сессии в БД, HTTP-only cookie, RBAC и аудит.
- Vitest для unit/integration-тестов доменной логики.
- Playwright для E2E.
- Docker и Docker Compose.
- GitHub Actions или совместимый CI для lint, typecheck, test и build.

### 3.2 Почему этот стек

- Next.js App Router подходит для SSR, SEO, server actions, route handlers и разделения публичных и административных зон.
- Prisma дает типизированный доступ к PostgreSQL, миграции и удобный seed.
- PostgreSQL позволяет надежно защищаться от конфликтов расписания через транзакции, индексы и database-level constraints.
- Zod позволяет использовать единые схемы валидации для публичных форм, CRM и API.
- shadcn/ui не тянет тяжелую runtime-библиотеку компонентов и хорошо подходит для кастомной админки.
- Собственная auth-схема MVP дает полный контроль над сессиями, аудитом входа, блокировками и RBAC без лишней магии. При росте проекта ее можно заменить на специализированный auth-провайдер, сохранив доменную модель permissions.

### 3.3 Принцип CMS-first для лендинга

Лендинг будет постоянно изменяться, поэтому его нельзя зашивать статично в React-компоненты.

Решение:

- данные клиники, контакты, документы, SEO, услуги, цены, отзывы, фотографии, специалисты и блоки страниц хранятся в БД;
- публичные React-компоненты являются рендерерами данных;
- админ-панель управляет содержимым, порядком, видимостью и SEO;
- seed создает стартовый контент, который можно заменить без изменения кода;
- для сложных секций используется типизированная JSON-структура `PageSection.config`, валидируемая Zod-схемами;
- общие сущности вроде `Service`, `Specialist`, `Review`, `BeforeAfterCase`, `LegalDocument` не дублируются в JSON-блоках страницы, а связываются через отдельные таблицы;
- публикация изменений поддерживается статусами `DRAFT`, `PUBLISHED`, `ARCHIVED`;
- публичный сайт читает только опубликованный контент.

## 4. Компонентная схема

```text
Browser
  |
  | HTTPS
  v
Reverse Proxy
  |
  v
Next.js App
  |
  |-- Public Site
  |     |-- Home
  |     |-- Services
  |     |-- Specialists
  |     |-- Prices
  |     |-- Reviews
  |     |-- Before/After
  |     |-- Contacts
  |     |-- Legal Pages
  |
  |-- Booking Flow
  |     |-- Availability API
  |     |-- Appointment creation
  |     |-- Callback lead creation
  |     |-- Consent capture
  |     |-- UTM attribution
  |
  |-- Admin Panel
  |     |-- Dashboard
  |     |-- Calendar
  |     |-- Leads
  |     |-- Appointments
  |     |-- Clients
  |     |-- Services
  |     |-- Specialists
  |     |-- Schedule
  |     |-- Content
  |     |-- Notifications
  |     |-- Analytics
  |     |-- Users/Roles
  |     |-- Audit
  |
  |-- Server Services
        |-- Auth service
        |-- RBAC service
        |-- Booking service
        |-- Schedule service
        |-- CRM service
        |-- Notification service
        |-- Analytics service
        |-- Audit service
        |-- Media service
        |-- Content service
        |
        v
      Prisma
        |
        v
      PostgreSQL
```

## 5. Структура проекта

```text
clinika/
  .github/
    workflows/
      ci.yml
  docs/
    stage-01-architecture.md
    deployment.md
    backup.md
    operations.md
  prisma/
    schema.prisma
    seed.ts
    migrations/
  public/
    images/
  src/
    app/
      (public)/
        page.tsx
        services/
          page.tsx
          [slug]/
            page.tsx
        specialists/
          page.tsx
          [slug]/
            page.tsx
        prices/
          page.tsx
        contacts/
          page.tsx
        legal/
          [slug]/
            page.tsx
        not-found.tsx
      (auth)/
        login/
          page.tsx
        forgot-password/
          page.tsx
        reset-password/
          page.tsx
      admin/
        layout.tsx
        page.tsx
        calendar/
          page.tsx
        appointments/
          page.tsx
        leads/
          page.tsx
        clients/
          page.tsx
        services/
          page.tsx
        specialists/
          page.tsx
        schedule/
          page.tsx
        content/
          page.tsx
        analytics/
          page.tsx
        audit/
          page.tsx
      api/
        health/
          route.ts
        public/
          services/
            route.ts
          specialists/
            route.ts
          slots/
            route.ts
          leads/
            route.ts
          appointments/
            route.ts
        admin/
          clients/
            route.ts
          leads/
            route.ts
          appointments/
            route.ts
          schedule/
            route.ts
          content/
            route.ts
    components/
      ui/
      public/
      booking/
      admin/
      forms/
      layout/
    config/
      env.ts
      site.ts
      permissions.ts
    domain/
      appointment/
        appointment-status.ts
        appointment.schemas.ts
        appointment.service.ts
      auth/
        auth.schemas.ts
        password-policy.ts
        rbac.ts
      booking/
        booking.schemas.ts
        booking.service.ts
        idempotency.ts
      client/
        client.schemas.ts
        client.service.ts
        phone.ts
      content/
        content.schemas.ts
        content.service.ts
      legal/
        consent.service.ts
      notification/
        notification-provider.ts
        notification.service.ts
        template-renderer.ts
      schedule/
        availability.ts
        schedule.schemas.ts
        schedule.service.ts
      analytics/
        attribution.ts
      audit/
        audit.service.ts
    lib/
      prisma.ts
      logger.ts
      errors.ts
      rate-limit.ts
      security-headers.ts
      date-time.ts
      csv.ts
    repositories/
      appointment.repository.ts
      client.repository.ts
      lead.repository.ts
      schedule.repository.ts
      content.repository.ts
      user.repository.ts
    tests/
      unit/
      integration/
      e2e/
    types/
      global.ts
```

Правило: React-компоненты не содержат бизнес-логику записи, расписания, прав доступа, уведомлений и дедупликации. Эта логика живет в `src/domain` и вызывается из route handlers/server actions.

## 6. ER-модель

### 6.1 Пользователи, роли и доступ

#### User

Сотрудник или системный пользователь.

Поля:

- `id`
- `email`
- `emailVerifiedAt`
- `passwordHash`
- `name`
- `phone`
- `status`: `ACTIVE`, `INVITED`, `BLOCKED`, `DELETED`
- `lastLoginAt`
- `failedLoginCount`
- `lockedUntil`
- `createdAt`
- `updatedAt`
- `deletedAt`

Индексы:

- unique `email`
- index `status`

#### Role

Поля:

- `id`
- `code`: `OWNER`, `ADMIN`, `SPECIALIST`
- `name`
- `description`
- `createdAt`
- `updatedAt`

Ограничения:

- unique `code`

#### Permission

Поля:

- `id`
- `code`
- `description`

Ограничения:

- unique `code`

Примеры permission-кодов:

- `dashboard.read`
- `clients.read`
- `clients.write`
- `clients.export`
- `leads.read`
- `leads.write`
- `appointments.read`
- `appointments.write`
- `schedule.write`
- `content.write`
- `users.manage`
- `roles.manage`
- `audit.read`
- `settings.write`

#### UserRole

Поля:

- `userId`
- `roleId`
- `createdAt`

Ограничения:

- primary key `userId, roleId`

#### RolePermission

Поля:

- `roleId`
- `permissionId`

Ограничения:

- primary key `roleId, permissionId`

### 6.2 Клиенты и CRM

#### Client

Поля:

- `id`
- `firstName`
- `lastName`
- `phone`
- `normalizedPhone`
- `email`
- `birthDate`
- `preferredContactMethod`: `PHONE`, `EMAIL`, `TELEGRAM`, `WHATSAPP`
- `personalDataConsentAt`
- `marketingConsentAt`
- `firstAttributionId`
- `assignedUserId`
- `internalComment`
- `createdAt`
- `updatedAt`
- `deletedAt`

Ограничения и индексы:

- unique `normalizedPhone` where `deletedAt IS NULL`
- index `email`
- index `assignedUserId`
- index `createdAt`

Комментарий:

- `normalizedPhone` хранится в формате E.164, например `+79991234567`.
- Дедупликация по телефону является основной.

#### Tag

Поля:

- `id`
- `name`
- `color`
- `createdAt`

Ограничения:

- unique `name`

#### ClientTag

Поля:

- `clientId`
- `tagId`

Ограничения:

- primary key `clientId, tagId`

#### ClientNote

Поля:

- `id`
- `clientId`
- `authorUserId`
- `body`
- `createdAt`
- `updatedAt`
- `deletedAt`

Индексы:

- index `clientId, createdAt`

#### Task

Поля:

- `id`
- `clientId`
- `leadId`
- `appointmentId`
- `assignedUserId`
- `createdByUserId`
- `title`
- `description`
- `dueAt`
- `status`: `OPEN`, `DONE`, `CANCELLED`
- `createdAt`
- `updatedAt`

Индексы:

- index `assignedUserId, status, dueAt`
- index `clientId`

### 6.3 Услуги, специалисты и контент

#### ServiceCategory

Поля:

- `id`
- `name`
- `slug`
- `description`
- `sortOrder`
- `isActive`
- `seoMetadataId`
- `createdAt`
- `updatedAt`
- `deletedAt`

Ограничения:

- unique `slug`

#### Service

Поля:

- `id`
- `categoryId`
- `name`
- `slug`
- `shortDescription`
- `fullDescription`
- `priceFrom`
- `priceExact`
- `currency`
- `durationMinutes`
- `bufferBeforeMinutes`
- `bufferAfterMinutes`
- `contraindications`
- `disclaimer`
- `isActive`
- `isFeatured`
- `sortOrder`
- `seoMetadataId`
- `createdAt`
- `updatedAt`
- `deletedAt`

Ограничения и индексы:

- unique `slug`
- index `categoryId, isActive`
- index `isFeatured, sortOrder`

Комментарий:

- Стоимость на момент записи копируется в `Appointment.priceAtBooking`.
- Цена услуги в справочнике может изменяться без влияния на старые записи.

#### Specialist

Поля:

- `id`
- `userId`
- `firstName`
- `lastName`
- `slug`
- `photoMediaId`
- `position`
- `specialization`
- `experienceYears`
- `education`
- `certificates`
- `description`
- `isActive`
- `sortOrder`
- `seoMetadataId`
- `createdAt`
- `updatedAt`
- `deletedAt`

Ограничения:

- unique `slug`
- unique nullable `userId`

#### SpecialistService

Поля:

- `specialistId`
- `serviceId`
- `customDurationMinutes`
- `customPriceFrom`
- `isActive`

Ограничения:

- primary key `specialistId, serviceId`

Комментарий:

- Если `customDurationMinutes` задан, расчет слотов использует его.
- Если услуга отключена для специалиста, запись к нему невозможна.

### 6.4 Расписание

#### WorkSchedule

Поля:

- `id`
- `specialistId`
- `weekday`: `1..7`, где 1 = понедельник
- `startsAtLocalTime`
- `endsAtLocalTime`
- `breaksJson`
- `isActive`
- `validFrom`
- `validTo`
- `createdAt`
- `updatedAt`

Индексы:

- index `specialistId, weekday, isActive`

Комментарий:

- Рабочие часы задаются в локальном времени клиники.
- При расчете слотов интервалы конвертируются в UTC.
- `breaksJson` хранит типизированный массив перерывов, валидируемый Zod.

#### ScheduleException

Поля:

- `id`
- `specialistId`
- `date`
- `type`: `DAY_OFF`, `VACATION`, `SICK_LEAVE`, `CUSTOM_WORKDAY`
- `startsAtLocalTime`
- `endsAtLocalTime`
- `reason`
- `createdAt`
- `updatedAt`

Индексы:

- index `specialistId, date`

#### TimeBlock

Поля:

- `id`
- `specialistId`
- `startsAtUtc`
- `endsAtUtc`
- `reason`
- `createdByUserId`
- `createdAt`
- `updatedAt`

Ограничения:

- `startsAtUtc < endsAtUtc`

Индексы:

- index `specialistId, startsAtUtc, endsAtUtc`

Комментарий:

- Используется для ручных блокировок, совещаний, внеплановых перерывов.

### 6.5 Заявки и записи

#### Lead

Поля:

- `id`
- `publicNumber`
- `clientId`
- `serviceId`
- `preferredSpecialistId`
- `status`: `NEW`, `IN_PROGRESS`, `NO_CONTACT`, `WAITING_FOR_CLIENT`, `BOOKED`, `DECLINED`, `SPAM`, `CLOSED`
- `comment`
- `preferredContactTime`
- `source`
- `attributionId`
- `assignedUserId`
- `nextContactAt`
- `declineReason`
- `idempotencyKeyHash`
- `createdAt`
- `updatedAt`
- `closedAt`

Ограничения и индексы:

- unique `publicNumber`
- unique `idempotencyKeyHash` where not null
- index `clientId`
- index `status, createdAt`
- index `assignedUserId, status`
- index `serviceId`
- index `attributionId`

#### LeadStatusHistory

Поля:

- `id`
- `leadId`
- `fromStatus`
- `toStatus`
- `changedByUserId`
- `reason`
- `createdAt`

Индексы:

- index `leadId, createdAt`

#### Appointment

Поля:

- `id`
- `publicNumber`
- `clientId`
- `serviceId`
- `specialistId`
- `leadId`
- `startsAtUtc`
- `endsAtUtc`
- `clinicTimezone`
- `priceAtBooking`
- `currency`
- `source`
- `attributionId`
- `clientComment`
- `internalComment`
- `status`: `PENDING_CONFIRMATION`, `CONFIRMED`, `ARRIVED`, `COMPLETED`, `NO_SHOW`, `CANCELLED_BY_CLIENT`, `CANCELLED_BY_CLINIC`, `RESCHEDULED`
- `cancelReason`
- `createdByUserId`
- `creationMethod`: `SITE`, `ADMIN`, `IMPORT`, `INTEGRATION`
- `idempotencyKeyHash`
- `createdAt`
- `updatedAt`
- `cancelledAt`
- `deletedAt`

Ограничения и индексы:

- unique `publicNumber`
- unique `idempotencyKeyHash` where not null
- `startsAtUtc < endsAtUtc`
- index `clientId`
- index `specialistId, startsAtUtc`
- index `status, startsAtUtc`
- index `serviceId`
- index `attributionId`

Защита от двойного бронирования:

- операции создания и переноса записи выполняются в транзакции;
- перед записью берется advisory lock по `specialistId + date`;
- сервер повторно считает доступность внутри транзакции;
- активными считаются статусы `PENDING_CONFIRMATION`, `CONFIRMED`, `ARRIVED`;
- интервал новой записи не должен пересекаться с активными записями и `TimeBlock`;
- на этапе реализации миграций будет добавлен database-level механизм защиты от пересечений. В PostgreSQL предпочтителен `EXCLUDE USING gist` по `specialistId` и `tstzrange(startsAtUtc, endsAtUtc)`, если выбранная Prisma-миграция позволит выразить это через raw SQL.

#### AppointmentStatusHistory

Поля:

- `id`
- `appointmentId`
- `fromStatus`
- `toStatus`
- `changedByUserId`
- `reason`
- `createdAt`

Индексы:

- index `appointmentId, createdAt`

### 6.6 Атрибуция, аналитика и согласия

#### UTMAttribution

Поля:

- `id`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmContent`
- `utmTerm`
- `referrer`
- `landingPage`
- `source`
- `conversionType`: `LEAD`, `APPOINTMENT`
- `clientIpHash`
- `userAgentHash`
- `createdAt`

Индексы:

- index `utmSource, createdAt`
- index `source, createdAt`
- index `conversionType, createdAt`

Комментарий:

- IP и user agent не пишутся в открытом виде, только при необходимости в хешированном или маскированном виде.

#### LegalDocument

Поля:

- `id`
- `type`: `PRIVACY_POLICY`, `PERSONAL_DATA_CONSENT`, `MARKETING_CONSENT`, `USER_AGREEMENT`, `COOKIE_POLICY`, `IMAGE_PUBLICATION_CONSENT`, `LICENSE`
- `slug`
- `title`
- `content`
- `version`
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- `publishedAt`
- `createdAt`
- `updatedAt`

Ограничения:

- unique `type, version`
- unique `slug`

#### Consent

Поля:

- `id`
- `clientId`
- `legalDocumentId`
- `type`
- `acceptedAt`
- `revokedAt`
- `source`: `PUBLIC_BOOKING`, `CALLBACK_FORM`, `ADMIN`, `IMPORT`
- `ipHash`
- `userAgentHash`
- `createdAt`

Индексы:

- index `clientId, type, acceptedAt`
- index `legalDocumentId`

Комментарий:

- Согласия версионируются через связь с конкретной версией `LegalDocument`.

### 6.7 Уведомления

#### NotificationTemplate

Поля:

- `id`
- `eventType`
- `channel`: `EMAIL`, `SMS`, `TELEGRAM`, `WHATSAPP`, `IN_APP`
- `name`
- `subject`
- `body`
- `variablesJson`
- `isActive`
- `createdAt`
- `updatedAt`

Ограничения:

- unique `eventType, channel`

#### Notification

Поля:

- `id`
- `templateId`
- `channel`
- `recipient`
- `recipientUserId`
- `clientId`
- `appointmentId`
- `leadId`
- `eventType`
- `payloadJson`
- `status`: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`
- `attempts`
- `nextRetryAt`
- `providerMessageId`
- `lastError`
- `createdAt`
- `updatedAt`
- `sentAt`

Индексы:

- index `status, nextRetryAt`
- index `clientId, createdAt`
- index `appointmentId`
- index `leadId`

Комментарий:

- Ошибка уведомления не откатывает создание заявки или записи.
- В MVP провайдер `local` сохраняет уведомления в БД и лог.

### 6.8 Контент, SEO и медиа

#### Page

Поля:

- `id`
- `slug`
- `title`
- `type`: `HOME`, `LANDING`, `LEGAL`, `SYSTEM`
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- `seoMetadataId`
- `createdAt`
- `updatedAt`
- `publishedAt`

Ограничения:

- unique `slug`

#### PageSection

Поля:

- `id`
- `pageId`
- `type`: `HERO`, `ABOUT`, `SERVICES`, `SPECIALISTS`, `PRICES`, `BEFORE_AFTER`, `REVIEWS`, `LICENSES`, `CONTACTS`, `CUSTOM_HTML_SAFE`, `FAQ`, `CTA`
- `title`
- `subtitle`
- `configJson`
- `sortOrder`
- `isVisible`
- `createdAt`
- `updatedAt`

Индексы:

- index `pageId, sortOrder`

Комментарий:

- Это ключевая сущность для редактируемого лендинга.
- Для `CUSTOM_HTML_SAFE` будет использоваться whitelist/sanitizer, но на MVP лучше ограничить набором типизированных секций.

#### SeoMetadata

Поля:

- `id`
- `title`
- `description`
- `canonicalPath`
- `ogTitle`
- `ogDescription`
- `ogImageMediaId`
- `twitterTitle`
- `twitterDescription`
- `noIndex`
- `structuredDataJson`
- `createdAt`
- `updatedAt`

#### MediaFile

Поля:

- `id`
- `storageKey`
- `publicUrl`
- `originalName`
- `mimeType`
- `sizeBytes`
- `width`
- `height`
- `alt`
- `visibility`: `PUBLIC`, `PRIVATE`
- `uploadedByUserId`
- `createdAt`
- `deletedAt`

Ограничения и индексы:

- unique `storageKey`
- index `visibility`
- index `mimeType`

#### Review

Поля:

- `id`
- `clientDisplayName`
- `text`
- `rating`
- `source`
- `reviewDate`
- `status`: `PENDING`, `PUBLISHED`, `REJECTED`
- `serviceId`
- `specialistId`
- `createdAt`
- `updatedAt`

Индексы:

- index `status, reviewDate`
- index `serviceId`
- index `specialistId`

#### BeforeAfterCase

Поля:

- `id`
- `title`
- `description`
- `serviceId`
- `specialistId`
- `beforeMediaId`
- `afterMediaId`
- `consentConfirmedAt`
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- `sortOrder`
- `createdAt`
- `updatedAt`

Индексы:

- index `status, sortOrder`
- index `serviceId`
- index `specialistId`

Комментарий:

- Публикация невозможна без `consentConfirmedAt`.
- На публичной странице всегда показывается предупреждение: результат индивидуален.

### 6.9 Настройки и аудит

#### ClinicSettings

Поля:

- `id`
- `clinicName`
- `legalName`
- `taxId`
- `address`
- `phone`
- `email`
- `messengersJson`
- `socialLinksJson`
- `workingHoursJson`
- `timezone`
- `mapEmbedUrl`
- `notificationMode`: `LOCAL`, `PROVIDER`
- `bookingMinLeadMinutes`
- `bookingMaxHorizonDays`
- `createdAt`
- `updatedAt`

Ограничение:

- в MVP одна активная запись настроек.

#### AuditLog

Поля:

- `id`
- `userId`
- `action`
- `entityType`
- `entityId`
- `description`
- `beforeJson`
- `afterJson`
- `ipHash`
- `userAgentHash`
- `requestId`
- `createdAt`

Индексы:

- index `userId, createdAt`
- index `entityType, entityId`
- index `action, createdAt`
- index `requestId`

Комментарий:

- В `beforeJson` и `afterJson` не пишутся пароли, токены, полные cookies, сырые IP, лишние медицинские сведения.
- Телефон и email маскируются при логировании.

## 7. Статусы и переходы

### 7.1 Lead

Разрешенные переходы:

- `NEW -> IN_PROGRESS`
- `NEW -> SPAM`
- `IN_PROGRESS -> NO_CONTACT`
- `IN_PROGRESS -> WAITING_FOR_CLIENT`
- `IN_PROGRESS -> BOOKED`
- `IN_PROGRESS -> DECLINED`
- `WAITING_FOR_CLIENT -> IN_PROGRESS`
- `NO_CONTACT -> IN_PROGRESS`
- `BOOKED -> CLOSED`
- `DECLINED -> CLOSED`
- `SPAM -> CLOSED`

Каждый переход пишет `LeadStatusHistory` и `AuditLog`.

### 7.2 Appointment

Разрешенные переходы:

- `PENDING_CONFIRMATION -> CONFIRMED`
- `PENDING_CONFIRMATION -> CANCELLED_BY_CLIENT`
- `PENDING_CONFIRMATION -> CANCELLED_BY_CLINIC`
- `CONFIRMED -> ARRIVED`
- `CONFIRMED -> NO_SHOW`
- `CONFIRMED -> CANCELLED_BY_CLIENT`
- `CONFIRMED -> CANCELLED_BY_CLINIC`
- `CONFIRMED -> RESCHEDULED`
- `ARRIVED -> COMPLETED`
- `RESCHEDULED -> CONFIRMED`

Перенос:

- старую запись можно пометить `RESCHEDULED` и связать с новой через отдельное поле `rescheduledFromAppointmentId` на этапе схемы;
- либо обновлять время одной записи с сохранением истории. Для MVP предпочтительно обновление одной записи с полной историей, чтобы не плодить дубли.

## 8. Безопасность

### 8.1 Аутентификация

- Сессии хранятся серверно в таблице `UserSession`.
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` в production.
- Пароли хешируются безопасным алгоритмом: Argon2id или bcrypt с актуальной стоимостью.
- Неудачные входы логируются.
- После нескольких неудачных попыток применяется задержка или временная блокировка.
- Восстановление пароля работает через одноразовый токен с TTL и аудитом.

### 8.2 Авторизация

Проверка прав выполняется:

- на сервере в route handlers/server actions;
- в доменных сервисах для критичных операций;
- в UI только для удобства, но не как источник безопасности.

Модель:

- роли состоят из permissions;
- владелец имеет все permissions;
- специалист ограничивается собственными записями и расписанием;
- контент-менеджер не имеет доступа к экспорту клиентов и системным настройкам.

### 8.3 Защита публичных форм

- Zod-валидация на сервере.
- Honeypot field.
- Rate limiting по IP hash и fingerprint без хранения лишних персональных данных.
- Idempotency key для повторной отправки формы.
- Ограничение длины строк.
- Нормализация телефона.
- Запрет доверия цене, длительности и доступности, переданным клиентом.

### 8.4 Заголовки и web security

Будут настроены:

- `Content-Security-Policy`;
- `X-Frame-Options` или `frame-ancestors`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- ограниченный CORS;
- безопасная обработка upload;
- запрет исполнения загруженных файлов.

### 8.5 Логи

- Структурированные JSON-логи.
- `requestId` на каждый запрос.
- Маскирование телефона и email.
- Stack trace не показывается публичным пользователям.
- Внешние ошибки уведомлений не ломают основную транзакцию записи.

## 9. API и серверные операции

API может быть реализован через route handlers и server actions. Публичные операции предпочтительно делать через route handlers с явными JSON-контрактами. Админские формы могут использовать server actions, если это не ухудшает тестирование.

### 9.1 Публичное получение услуг

Операция: `GET /api/public/services`

Назначение:

- получить опубликованные категории и активные услуги.

Вход:

- `categorySlug?: string`
- `featured?: boolean`

Выход:

- список услуг с категорией, ценой, длительностью, slug и SEO-минимумом.

Роли:

- public.

Ошибки:

- `400` при некорректных фильтрах.

Авторизация:

- не требуется.

Аудит:

- не пишется.

### 9.2 Публичное получение специалистов

Операция: `GET /api/public/specialists`

Вход:

- `serviceSlug?: string`

Выход:

- список активных специалистов с услугами и публичным профилем.

Роли:

- public.

### 9.3 Получение свободных слотов

Операция: `GET /api/public/slots`

Вход:

- `serviceId`
- `specialistId`
- `dateFrom`
- `dateTo`

Выход:

- массив слотов `{ startsAtUtc, endsAtUtc, startsAtLocal, endsAtLocal }`.

Правила:

- сервер проверяет, что услуга активна;
- сервер проверяет, что специалист оказывает услугу;
- сервер учитывает график, исключения, блокировки, активные записи, буферы, минимальное время до записи и максимальный горизонт.

Ошибки:

- `400` некорректные даты;
- `404` услуга или специалист не найдены;
- `409` услуга недоступна у специалиста.

### 9.4 Создание заявки на обратный звонок

Операция: `POST /api/public/leads`

Вход:

- `name`
- `phone`
- `serviceId?`
- `preferredContactTime?`
- `comment?`
- `personalDataConsentAccepted`
- `marketingConsentAccepted?`
- `legalDocumentVersion`
- `utm`
- `referrer`
- `landingPage`
- `idempotencyKey`
- `honeypot`

Выход:

- `leadId`
- `publicNumber`
- `status`

Роли:

- public.

Ошибки:

- `400` валидация;
- `409` повторная отправка с тем же idempotency key возвращает ранее созданную заявку;
- `429` rate limit.

Транзакционность:

- создать/обновить клиента;
- создать атрибуцию;
- зафиксировать согласия;
- создать заявку;
- создать уведомление администратору;
- записать аудит системного события без персональных данных.

### 9.5 Создание записи

Операция: `POST /api/public/appointments`

Вход:

- `serviceId`
- `specialistId`
- `startsAtUtc`
- `name`
- `phone`
- `email?`
- `comment?`
- `personalDataConsentAccepted`
- `marketingConsentAccepted?`
- `legalDocumentVersion`
- `utm`
- `referrer`
- `landingPage`
- `idempotencyKey`
- `honeypot`

Выход:

- `appointmentId`
- `publicNumber`
- `status`
- `startsAtUtc`
- `endsAtUtc`

Роли:

- public.

Ошибки:

- `400` валидация;
- `404` услуга или специалист не найдены;
- `409` слот занят или повторная отправка;
- `429` rate limit.

Транзакционность:

- advisory lock по специалисту и дню;
- повторный расчет длительности и буферов;
- проверка пересечения;
- upsert клиента;
- фиксация согласий;
- создание записи;
- создание уведомлений;
- запись аудита.

Идемпотентность:

- `idempotencyKeyHash` уникален.

### 9.6 Auth

Операции:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Правила:

- rate limiting;
- аудит успешных и неуспешных попыток;
- безопасные generic-ответы для восстановления пароля;
- токены сброса не хранятся в открытом виде.

### 9.7 Управление клиентами

Операции:

- `GET /api/admin/clients`
- `GET /api/admin/clients/:id`
- `PATCH /api/admin/clients/:id`
- `POST /api/admin/clients/:id/notes`
- `GET /api/admin/clients/export`

Роли:

- owner, admin.
- specialist имеет ограниченный доступ только к клиентам своих записей.

Аудит:

- изменение клиента;
- добавление заметки;
- экспорт.

### 9.8 Управление заявками

Операции:

- `GET /api/admin/leads`
- `GET /api/admin/leads/:id`
- `PATCH /api/admin/leads/:id`
- `POST /api/admin/leads/:id/status`
- `POST /api/admin/leads/:id/assign`
- `POST /api/admin/leads/:id/tasks`

Аудит:

- смена статуса;
- назначение ответственного;
- закрытие заявки.

### 9.9 Управление записями

Операции:

- `GET /api/admin/appointments`
- `GET /api/admin/appointments/:id`
- `POST /api/admin/appointments`
- `PATCH /api/admin/appointments/:id`
- `POST /api/admin/appointments/:id/reschedule`
- `POST /api/admin/appointments/:id/cancel`
- `POST /api/admin/appointments/:id/status`

Правила:

- стоимость и длительность проверяются на сервере;
- перенос выполняется как критичная транзакция;
- специалист видит только свои записи.

### 9.10 Управление расписанием

Операции:

- `GET /api/admin/schedule/specialists/:id`
- `PUT /api/admin/schedule/specialists/:id/work-schedules`
- `POST /api/admin/schedule/exceptions`
- `POST /api/admin/schedule/time-blocks`
- `DELETE /api/admin/schedule/time-blocks/:id`

Роли:

- owner, admin.
- specialist может видеть свое расписание и, если разрешено, создавать ограниченные блокировки.

### 9.11 Управление контентом

Операции:

- `GET /api/admin/content/pages`
- `POST /api/admin/content/pages`
- `PATCH /api/admin/content/pages/:id`
- `POST /api/admin/content/pages/:id/publish`
- `PATCH /api/admin/content/sections/:id`
- `POST /api/admin/media`
- `PATCH /api/admin/services/:id`
- `PATCH /api/admin/specialists/:id`
- `PATCH /api/admin/reviews/:id`
- `PATCH /api/admin/before-after/:id`

Правила:

- только опубликованный контент доступен публично;
- SEO-поля редактируются через админку;
- опасный HTML не разрешается без sanitizer и отдельного permission.

### 9.12 Аналитика

Операции:

- `GET /api/admin/analytics/summary`
- `GET /api/admin/analytics/sources`
- `GET /api/admin/analytics/services`
- `GET /api/admin/analytics/specialists`

Правила:

- агрегированные данные;
- персональные данные в аналитике не раскрываются без необходимости.

### 9.13 Экспорт

Операции:

- `GET /api/admin/export/clients`
- `GET /api/admin/export/leads`
- `GET /api/admin/export/appointments`

Правила:

- доступ только по permission;
- обязательный аудит;
- фильтры перед экспортом;
- потоковая отдача для больших объемов на следующих этапах.

### 9.14 Аудит

Операция: `GET /api/admin/audit`

Роли:

- owner.

Фильтры:

- `userId`
- `entityType`
- `entityId`
- `action`
- `dateFrom`
- `dateTo`

## 10. Расчет свободных слотов

Алгоритм:

1. Получить clinic timezone из `ClinicSettings`.
2. Проверить активность услуги и специалиста.
3. Проверить связь `SpecialistService`.
4. Определить длительность: `customDurationMinutes` или `Service.durationMinutes`.
5. Добавить `bufferBeforeMinutes` и `bufferAfterMinutes`.
6. Получить рабочие интервалы из `WorkSchedule`.
7. Применить `ScheduleException`.
8. Вычесть перерывы.
9. Вычесть `TimeBlock`.
10. Вычесть активные записи.
11. Учесть `bookingMinLeadMinutes`.
12. Учесть `bookingMaxHorizonDays`.
13. Нарезать оставшиеся интервалы на слоты.
14. Вернуть только слоты, где помещается услуга с буферами.

Тестируемые случаи:

- обычный рабочий день;
- день без расписания;
- перерыв внутри дня;
- отпуск;
- ручная блокировка;
- существующая запись;
- буфер до и после;
- минимальное время до записи;
- горизонт записи;
- смена часового пояса не ломает UTC-хранение.

## 11. UX-модель

### 11.1 Публичный сайт

- Mobile-first.
- Главная страница является реальным лендингом, а не маркетинговой заставкой.
- Первый экран содержит название клиники, ценность, CTA записи, CTA связи и доверительные элементы.
- Контент редактируется через админку.
- Услуги, специалисты и SEO-страницы генерируются из БД.
- Формы показывают ошибки рядом с полями.
- После успешной отправки показывается понятный экран успеха.

### 11.2 Админка

- Плотная CRM, без декоративной перегрузки.
- Главный экран: заявки, записи сегодня/завтра, отмены, неявки, задачи.
- Таблицы с фильтрами и поиском.
- Календарь день/неделя по специалистам.
- Опасные действия требуют подтверждения.
- Нет доступа: отдельное состояние `403`.

## 12. Тестирование

### 12.1 Unit

Покрыть:

- нормализацию телефона;
- Zod-схемы;
- расчет слотов;
- буферы;
- переходы статусов;
- RBAC;
- UTM-атрибуцию;
- шаблоны уведомлений;
- дедупликацию клиентов.

### 12.2 Integration

Покрыть:

- Prisma + PostgreSQL;
- создание клиента;
- создание заявки;
- создание записи;
- конфликт двойной записи;
- перенос;
- отмену;
- фиксацию согласий;
- аудит;
- отказ уведомления без отката записи.

### 12.3 E2E

Минимум:

- клиент записывается с лендинга;
- администратор видит запись;
- администратор переносит запись;
- уведомление появляется в локальном журнале;
- администратор отменяет запись;
- специалист видит только свои записи;
- контент-менеджер редактирует услугу;
- пользователь без прав получает отказ;
- две параллельные попытки занять слот дают одну успешную запись;
- повторная отправка формы не создает дубль.

## 13. Деплой и инфраструктура

### 13.1 Локальная разработка

Сервисы:

- `app`: Next.js;
- `postgres`: PostgreSQL;
- `mailpit` или аналог позже для локальной проверки email;
- `minio` опционально после этапа upload.

### 13.2 Production

Компоненты:

- VPS или cloud VM;
- Docker Compose или container platform;
- reverse proxy Caddy/Nginx/Traefik;
- HTTPS;
- PostgreSQL с регулярными backup;
- volume/object storage для медиа;
- healthcheck endpoint;
- миграции перед запуском новой версии.

### 13.3 CI

Pipeline:

- install;
- lint;
- typecheck;
- unit tests;
- integration tests с PostgreSQL;
- production build;
- Playwright smoke optional.

## 14. Резервное копирование

Документация будет включать:

- `pg_dump` для PostgreSQL;
- backup media storage;
- расписание backup;
- retention policy;
- шифрование архивов;
- тест восстановления;
- порядок rollback;
- ответственных за backup.

## 15. MVP-ограничения

- Реальные SMS/email/Telegram/WhatsApp не подключаются до настройки провайдеров.
- Тексты юридических документов являются техническими шаблонами и должны быть проверены профильным юристом.
- Медицинские карты, диагнозы и назначения не реализуются.
- Онлайн-оплата не реализуется.
- Импорт клиентов переносится после MVP.
- Продвинутая BI-аналитика не реализуется, только операционные отчеты.

## 16. Definition of Done этапа 1

Этап считается завершенным, если:

- выбран стек;
- описана структура проекта;
- описана ER-модель;
- зафиксированы сущности, индексы и ограничения;
- описана CMS-first архитектура лендинга;
- описана модель безопасности и RBAC;
- описаны серверные операции и правила авторизации;
- описан алгоритм расчета слотов;
- описана стратегия тестирования;
- описан план деплоя и backup;
- следующий этап может начинаться с инициализации проекта.
