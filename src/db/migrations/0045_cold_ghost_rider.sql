DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'requests_status' AND column_name = 'name'
    ) THEN
        ALTER TABLE "requests_status" RENAME COLUMN "name" TO "code";
    END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "request_logs" ALTER COLUMN "new_status_id" SET NOT NULL;
--> statement-breakpoint
DROP TABLE IF EXISTS "verifications";
