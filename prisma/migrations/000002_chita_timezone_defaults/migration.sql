ALTER TABLE "ClinicSettings" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Chita';

UPDATE "ClinicSettings"
SET "timezone" = 'Asia/Chita'
WHERE "timezone" = 'Europe/Moscow'
  AND ("address" ILIKE '%Чита%' OR "address" ILIKE '%Суглинная%');

UPDATE "Appointment"
SET "clinicTimezone" = 'Asia/Chita'
WHERE "clinicTimezone" = 'Europe/Moscow'
  AND EXISTS (
    SELECT 1
    FROM "ClinicSettings"
    WHERE "timezone" = 'Asia/Chita'
      AND ("address" ILIKE '%Чита%' OR "address" ILIKE '%Суглинная%')
  );
