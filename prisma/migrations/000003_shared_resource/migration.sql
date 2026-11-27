-- Shared physical resource (laser machine, capacity 1) with a single unified
-- booking queue shared by several interchangeable operators.

-- New tables
CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceOperator" (
  "resourceId" TEXT NOT NULL,
  "specialistId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ResourceOperator_pkey" PRIMARY KEY ("resourceId", "specialistId")
);

CREATE TABLE "ResourceWorkSchedule" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startsAtLocalTime" TEXT NOT NULL,
  "endsAtLocalTime" TEXT NOT NULL,
  "breaksJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceWorkSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceTimeBlock" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "startsAtUtc" TIMESTAMP(3) NOT NULL,
  "endsAtUtc" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourceTimeBlock_pkey" PRIMARY KEY ("id")
);

-- New columns on existing tables
ALTER TABLE "Service" ADD COLUMN "requiresResourceId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "Appointment" ALTER COLUMN "specialistId" DROP NOT NULL;

-- Indexes
CREATE UNIQUE INDEX "Resource_slug_key" ON "Resource"("slug");
CREATE INDEX "ResourceWorkSchedule_resourceId_weekday_isActive_idx" ON "ResourceWorkSchedule"("resourceId", "weekday", "isActive");
CREATE INDEX "ResourceTimeBlock_resourceId_startsAtUtc_endsAtUtc_idx" ON "ResourceTimeBlock"("resourceId", "startsAtUtc", "endsAtUtc");
CREATE INDEX "Service_requiresResourceId_idx" ON "Service"("requiresResourceId");
CREATE INDEX "Appointment_resourceId_startsAtUtc_idx" ON "Appointment"("resourceId", "startsAtUtc");

-- Foreign keys
ALTER TABLE "ResourceOperator" ADD CONSTRAINT "ResourceOperator_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceOperator" ADD CONSTRAINT "ResourceOperator_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceWorkSchedule" ADD CONSTRAINT "ResourceWorkSchedule_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceTimeBlock" ADD CONSTRAINT "ResourceTimeBlock_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_requiresResourceId_fkey" FOREIGN KEY ("requiresResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Check constraints
ALTER TABLE "ResourceWorkSchedule" ADD CONSTRAINT "ResourceWorkSchedule_weekday_check" CHECK ("weekday" >= 1 AND "weekday" <= 7);
ALTER TABLE "ResourceTimeBlock" ADD CONSTRAINT "ResourceTimeBlock_period_check" CHECK ("startsAtUtc" < "endsAtUtc");

-- Capacity guard for the shared resource: at most one active appointment on a
-- resource at any instant, regardless of which operator (or none) is assigned.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_resource_no_overlap_active"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startsAtUtc", "endsAtUtc", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "resourceId" IS NOT NULL AND "status" IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ARRIVED'));

-- Recreate the per-specialist guard with an explicit NOT NULL predicate: laser
-- appointments have a null specialist until an operator is assigned, and they are
-- already protected by the resource guard above.
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_no_overlap_active";
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_overlap_active"
  EXCLUDE USING gist (
    "specialistId" WITH =,
    tsrange("startsAtUtc", "endsAtUtc", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "specialistId" IS NOT NULL AND "status" IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'ARRIVED'));
