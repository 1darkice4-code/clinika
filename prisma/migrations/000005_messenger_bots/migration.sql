CREATE TABLE "MessengerBot" (
    "platform" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "tokenEncrypted" TEXT NOT NULL,
    "webhookSecretHash" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3),
    "showOnSite" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MessengerBot_pkey" PRIMARY KEY ("platform")
);

CREATE TABLE "MessengerBookingSession" (
    "id" TEXT NOT NULL,
    "stateEncrypted" TEXT,
    "pendingEncrypted" TEXT,
    "processedEvents" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "leaseUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MessengerBookingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessengerBookingSession_updatedAt_idx" ON "MessengerBookingSession"("updatedAt");
