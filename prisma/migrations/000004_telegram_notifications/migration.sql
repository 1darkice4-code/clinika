ALTER TABLE "ClinicSettings"
ADD COLUMN "telegramBotTokenEncrypted" TEXT,
ADD COLUMN "telegramAdminChatId" TEXT,
ADD COLUMN "telegramNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
