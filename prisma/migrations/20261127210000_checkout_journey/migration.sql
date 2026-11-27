CREATE TABLE "checkout_journey_events" (
 "id" UUID PRIMARY KEY,
 "session" UUID NOT NULL,
 "event" TEXT NOT NULL,
 "method" TEXT,
 "stage" TEXT,
 "code" TEXT,
 "source" TEXT,
 "device" TEXT,
 "orderId" UUID,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "checkout_journey_events_session_createdAt_idx" ON "checkout_journey_events"("session","createdAt");
CREATE INDEX "checkout_journey_events_createdAt_idx" ON "checkout_journey_events"("createdAt");
