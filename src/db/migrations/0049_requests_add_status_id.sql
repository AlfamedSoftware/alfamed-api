ALTER TABLE "requests" ADD COLUMN "status_id" text NOT NULL REFERENCES "requests_status"("id") ON DELETE restrict;
