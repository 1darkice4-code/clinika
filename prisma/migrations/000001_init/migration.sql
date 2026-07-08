CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'BLOCKED', 'DELETED');
CREATE TYPE "PreferredContactMethod" AS ENUM ('PHONE', 'EMAIL', 'TELEGRAM', 'WHATSAPP');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'NO_CONTACT', 'WAITING_FOR_CLIENT', 'BOOKED', 'DECLINED', 'SPAM', 'CLOSED');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'NO_SHOW', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_CLINIC', 'RESCHEDULED');
CREATE TYPE "AppointmentCreationMethod" AS ENUM ('SITE', 'ADMIN', 'IMPORT', 'INTEGRATION');
CREATE TYPE "ScheduleExceptionType" AS ENUM ('DAY_OFF', 'VACATION', 'SICK_LEAVE', 'CUSTOM_WORKDAY');
CREATE TYPE "LegalDocumentType" AS ENUM ('PRIVACY_POLICY', 'PERSONAL_DATA_CONSENT', 'MARKETING_CONSENT', 'USER_AGREEMENT', 'COOKIE_POLICY', 'IMAGE_PUBLICATION_CONSENT', 'LICENSE');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ConsentSource" AS ENUM ('PUBLIC_BOOKING', 'CALLBACK_FORM', 'ADMIN', 'IMPORT');
CREATE TYPE "ConversionType" AS ENUM ('LEAD', 'APPOINTMENT');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'TELEGRAM', 'WHATSAPP', 'IN_APP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "PageType" AS ENUM ('HOME', 'LANDING', 'LEGAL', 'SYSTEM');
CREATE TYPE "PageSectionType" AS ENUM ('HERO', 'ABOUT', 'SERVICES', 'SPECIALISTS', 'PRICES', 'BEFORE_AFTER', 'REVIEWS', 'LICENSES', 'CONTACTS', 'FAQ', 'CTA');
CREATE TYPE "MediaVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');
CREATE TYPE "NotificationMode" AS ENUM ('LOCAL', 'PROVIDER');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerifiedAt" TIMESTAMP(3),
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt" TIMESTAMP(3),
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRole" (
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "RolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UTMAttribution" (
  "id" TEXT NOT NULL,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmContent" TEXT,
  "utmTerm" TEXT,
  "referrer" TEXT,
  "landingPage" TEXT,
  "source" TEXT,
  "conversionType" "ConversionType" NOT NULL,
  "clientIpHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UTMAttribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "phone" TEXT NOT NULL,
  "normalizedPhone" TEXT NOT NULL,
  "email" TEXT,
  "birthDate" TIMESTAMP(3),
  "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'PHONE',
  "personalDataConsentAt" TIMESTAMP(3),
  "marketingConsentAt" TIMESTAMP(3),
  "firstAttributionId" TEXT,
  "assignedUserId" TEXT,
  "internalComment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientTag" (
  "clientId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "ClientTag_pkey" PRIMARY KEY ("clientId", "tagId")
);

CREATE TABLE "ClientNote" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoMetadata" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "canonicalPath" TEXT,
  "ogTitle" TEXT,
  "ogDescription" TEXT,
  "ogImageMediaId" TEXT,
  "twitterTitle" TEXT,
  "twitterDescription" TEXT,
  "noIndex" BOOLEAN NOT NULL DEFAULT false,
  "structuredDataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "seoMetadataId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Service" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "fullDescription" TEXT NOT NULL,
  "priceFrom" INTEGER,
  "priceExact" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "durationMinutes" INTEGER NOT NULL,
  "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 10,
  "contraindications" TEXT,
  "disclaimer" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seoMetadataId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaFile" (
  "id" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "publicUrl" TEXT,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "alt" TEXT,
  "visibility" "MediaVisibility" NOT NULL DEFAULT 'PUBLIC',
  "uploadedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Specialist" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "photoMediaId" TEXT,
  "position" TEXT NOT NULL,
  "specialization" TEXT NOT NULL,
  "experienceYears" INTEGER NOT NULL,
  "education" TEXT NOT NULL,
  "certificates" TEXT,
  "description" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "seoMetadataId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Specialist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpecialistService" (
  "specialistId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "customDurationMinutes" INTEGER,
  "customPriceFrom" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "SpecialistService_pkey" PRIMARY KEY ("specialistId", "serviceId")
);

CREATE TABLE "WorkSchedule" (
  "id" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startsAtLocalTime" TEXT NOT NULL,
  "endsAtLocalTime" TEXT NOT NULL,
  "breaksJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleException" (
  "id" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "ScheduleExceptionType" NOT NULL,
  "startsAtLocalTime" TEXT,
  "endsAtLocalTime" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimeBlock" (
  "id" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "startsAtUtc" TIMESTAMP(3) NOT NULL,
  "endsAtUtc" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "publicNumber" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "serviceId" TEXT,
  "preferredSpecialistId" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "comment" TEXT,
  "preferredContactTime" TEXT,
  "source" TEXT,
  "attributionId" TEXT,
  "assignedUserId" TEXT,
  "nextContactAt" TIMESTAMP(3),
  "declineReason" TEXT,
  "idempotencyKeyHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadStatusHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fromStatus" "LeadStatus",
  "toStatus" "LeadStatus" NOT NULL,
  "changedByUserId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "publicNumber" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "leadId" TEXT,
  "startsAtUtc" TIMESTAMP(3) NOT NULL,
  "endsAtUtc" TIMESTAMP(3) NOT NULL,
  "clinicTimezone" TEXT NOT NULL,
  "priceAtBooking" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "source" TEXT,
  "attributionId" TEXT,
  "clientComment" TEXT,
  "internalComment" TEXT,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "cancelReason" TEXT,
  "createdByUserId" TEXT,
  "creationMethod" "AppointmentCreationMethod" NOT NULL DEFAULT 'SITE',
  "idempotencyKeyHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentStatusHistory" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "fromStatus" "AppointmentStatus",
  "toStatus" "AppointmentStatus" NOT NULL,
  "changedByUserId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalDocument" (
  "id" TEXT NOT NULL,
  "type" "LegalDocumentType" NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Consent" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "legalDocumentId" TEXT NOT NULL,
  "type" "LegalDocumentType" NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "source" "ConsentSource" NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "variablesJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "templateId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "recipient" TEXT,
  "recipientUserId" TEXT,
  "clientId" TEXT,
  "appointmentId" TEXT,
  "leadId" TEXT,
  "eventType" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Page" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "PageType" NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "seoMetadataId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageSection" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "type" "PageSectionType" NOT NULL,
  "title" TEXT,
  "subtitle" TEXT,
  "configJson" JSONB NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "clientDisplayName" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "source" TEXT,
  "reviewDate" TIMESTAMP(3) NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "serviceId" TEXT,
  "specialistId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BeforeAfterCase" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "serviceId" TEXT,
  "specialistId" TEXT,
  "beforeMediaId" TEXT NOT NULL,
  "afterMediaId" TEXT NOT NULL,
  "consentConfirmedAt" TIMESTAMP(3),
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BeforeAfterCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicSettings" (
  "id" TEXT NOT NULL,
  "clinicName" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "taxId" TEXT,
  "address" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "messengersJson" JSONB,
  "socialLinksJson" JSONB,
  "workingHoursJson" JSONB,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
  "mapEmbedUrl" TEXT,
  "notificationMode" "NotificationMode" NOT NULL DEFAULT 'LOCAL',
  "bookingMinLeadMinutes" INTEGER NOT NULL DEFAULT 120,
  "bookingMaxHorizonDays" INTEGER NOT NULL DEFAULT 45,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "leadId" TEXT,
  "appointmentId" TEXT,
  "assignedUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "description" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");
CREATE INDEX "UserSession_tokenHash_idx" ON "UserSession"("tokenHash");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");
CREATE INDEX "LoginAttempt_userId_createdAt_idx" ON "LoginAttempt"("userId", "createdAt");
CREATE INDEX "UTMAttribution_utmSource_createdAt_idx" ON "UTMAttribution"("utmSource", "createdAt");
CREATE INDEX "UTMAttribution_source_createdAt_idx" ON "UTMAttribution"("source", "createdAt");
CREATE INDEX "UTMAttribution_conversionType_createdAt_idx" ON "UTMAttribution"("conversionType", "createdAt");
CREATE UNIQUE INDEX "Client_normalizedPhone_key" ON "Client"("normalizedPhone");
CREATE INDEX "Client_email_idx" ON "Client"("email");
CREATE INDEX "Client_assignedUserId_idx" ON "Client"("assignedUserId");
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE INDEX "ClientNote_clientId_createdAt_idx" ON "ClientNote"("clientId", "createdAt");
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");
CREATE UNIQUE INDEX "ServiceCategory_seoMetadataId_key" ON "ServiceCategory"("seoMetadataId");
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");
CREATE UNIQUE INDEX "Service_seoMetadataId_key" ON "Service"("seoMetadataId");
CREATE INDEX "Service_categoryId_isActive_idx" ON "Service"("categoryId", "isActive");
CREATE INDEX "Service_isFeatured_sortOrder_idx" ON "Service"("isFeatured", "sortOrder");
CREATE UNIQUE INDEX "MediaFile_storageKey_key" ON "MediaFile"("storageKey");
CREATE INDEX "MediaFile_visibility_idx" ON "MediaFile"("visibility");
CREATE INDEX "MediaFile_mimeType_idx" ON "MediaFile"("mimeType");
CREATE UNIQUE INDEX "Specialist_userId_key" ON "Specialist"("userId");
CREATE UNIQUE INDEX "Specialist_slug_key" ON "Specialist"("slug");
CREATE UNIQUE INDEX "Specialist_seoMetadataId_key" ON "Specialist"("seoMetadataId");
CREATE INDEX "WorkSchedule_specialistId_weekday_isActive_idx" ON "WorkSchedule"("specialistId", "weekday", "isActive");
CREATE INDEX "ScheduleException_specialistId_date_idx" ON "ScheduleException"("specialistId", "date");
CREATE INDEX "TimeBlock_specialistId_startsAtUtc_endsAtUtc_idx" ON "TimeBlock"("specialistId", "startsAtUtc", "endsAtUtc");
CREATE UNIQUE INDEX "Lead_publicNumber_key" ON "Lead"("publicNumber");
CREATE UNIQUE INDEX "Lead_idempotencyKeyHash_key" ON "Lead"("idempotencyKeyHash");
CREATE INDEX "Lead_clientId_idx" ON "Lead"("clientId");
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_assignedUserId_status_idx" ON "Lead"("assignedUserId", "status");
CREATE INDEX "Lead_serviceId_idx" ON "Lead"("serviceId");
CREATE INDEX "Lead_attributionId_idx" ON "Lead"("attributionId");
CREATE INDEX "LeadStatusHistory_leadId_createdAt_idx" ON "LeadStatusHistory"("leadId", "createdAt");
CREATE UNIQUE INDEX "Appointment_publicNumber_key" ON "Appointment"("publicNumber");
CREATE UNIQUE INDEX "Appointment_idempotencyKeyHash_key" ON "Appointment"("idempotencyKeyHash");
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");
CREATE INDEX "Appointment_specialistId_startsAtUtc_idx" ON "Appointment"("specialistId", "startsAtUtc");
CREATE INDEX "Appointment_status_startsAtUtc_idx" ON "Appointment"("status", "startsAtUtc");
CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");
CREATE INDEX "Appointment_attributionId_idx" ON "Appointment"("attributionId");
CREATE INDEX "AppointmentStatusHistory_appointmentId_createdAt_idx" ON "AppointmentStatusHistory"("appointmentId", "createdAt");
CREATE UNIQUE INDEX "LegalDocument_slug_key" ON "LegalDocument"("slug");
CREATE UNIQUE INDEX "LegalDocument_type_version_key" ON "LegalDocument"("type", "version");
CREATE INDEX "Consent_clientId_type_acceptedAt_idx" ON "Consent"("clientId", "type", "acceptedAt");
CREATE INDEX "Consent_legalDocumentId_idx" ON "Consent"("legalDocumentId");
CREATE UNIQUE INDEX "NotificationTemplate_eventType_channel_key" ON "NotificationTemplate"("eventType", "channel");
CREATE INDEX "Notification_status_nextRetryAt_idx" ON "Notification"("status", "nextRetryAt");
CREATE INDEX "Notification_clientId_createdAt_idx" ON "Notification"("clientId", "createdAt");
CREATE INDEX "Notification_appointmentId_idx" ON "Notification"("appointmentId");
CREATE INDEX "Notification_leadId_idx" ON "Notification"("leadId");
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE UNIQUE INDEX "Page_seoMetadataId_key" ON "Page"("seoMetadataId");
CREATE INDEX "PageSection_pageId_sortOrder_idx" ON "PageSection"("pageId", "sortOrder");
CREATE INDEX "Review_status_reviewDate_idx" ON "Review"("status", "reviewDate");
CREATE INDEX "Review_serviceId_idx" ON "Review"("serviceId");
CREATE INDEX "Review_specialistId_idx" ON "Review"("specialistId");
CREATE INDEX "BeforeAfterCase_status_sortOrder_idx" ON "BeforeAfterCase"("status", "sortOrder");
CREATE INDEX "BeforeAfterCase_serviceId_idx" ON "BeforeAfterCase"("serviceId");
CREATE INDEX "BeforeAfterCase_specialistId_idx" ON "BeforeAfterCase"("specialistId");
CREATE INDEX "Task_assignedUserId_status_dueAt_idx" ON "Task"("assignedUserId", "status", "dueAt");
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_firstAttributionId_fkey" FOREIGN KEY ("firstAttributionId") REFERENCES "UTMAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientTag" ADD CONSTRAINT "ClientTag_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientTag" ADD CONSTRAINT "ClientTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_seoMetadataId_fkey" FOREIGN KEY ("seoMetadataId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_seoMetadataId_fkey" FOREIGN KEY ("seoMetadataId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Specialist" ADD CONSTRAINT "Specialist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Specialist" ADD CONSTRAINT "Specialist_photoMediaId_fkey" FOREIGN KEY ("photoMediaId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Specialist" ADD CONSTRAINT "Specialist_seoMetadataId_fkey" FOREIGN KEY ("seoMetadataId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpecialistService" ADD CONSTRAINT "SpecialistService_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpecialistService" ADD CONSTRAINT "SpecialistService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_preferredSpecialistId_fkey" FOREIGN KEY ("preferredSpecialistId") REFERENCES "Specialist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "UTMAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "UTMAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Page" ADD CONSTRAINT "Page_seoMetadataId_fkey" FOREIGN KEY ("seoMetadataId") REFERENCES "SeoMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BeforeAfterCase" ADD CONSTRAINT "BeforeAfterCase_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BeforeAfterCase" ADD CONSTRAINT "BeforeAfterCase_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BeforeAfterCase" ADD CONSTRAINT "BeforeAfterCase_beforeMediaId_fkey" FOREIGN KEY ("beforeMediaId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BeforeAfterCase" ADD CONSTRAINT "BeforeAfterCase_afterMediaId_fkey" FOREIGN KEY ("afterMediaId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_weekday_check" CHECK ("weekday" >= 1 AND "weekday" <= 7);
ALTER TABLE "Service" ADD CONSTRAINT "Service_duration_positive_check" CHECK ("durationMinutes" > 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_buffers_non_negative_check" CHECK ("bufferBeforeMinutes" >= 0 AND "bufferAfterMinutes" >= 0);
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_period_check" CHECK ("startsAtUtc" < "endsAtUtc");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_period_check" CHECK ("startsAtUtc" < "endsAtUtc");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_overlap_active"
  EXCLUDE USING gist (
    "specialistId" WITH =,
    tsrange("startsAtUtc", "endsAtUtc", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "status" IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ARRIVED'));
