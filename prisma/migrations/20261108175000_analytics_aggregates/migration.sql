-- Consent-gated, anonymous counts only; no IP/email/user tokens or session IDs.
CREATE TABLE "analytics_aggregates" (
  "id" UUID NOT NULL,
  "day" DATE NOT NULL,
  "path" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "device" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "analytics_aggregates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "analytics_aggregates_day_path_event_source_device_key" ON "analytics_aggregates"("day", "path", "event", "source", "device");
CREATE INDEX "analytics_aggregates_day_event_idx" ON "analytics_aggregates"("day", "event");
