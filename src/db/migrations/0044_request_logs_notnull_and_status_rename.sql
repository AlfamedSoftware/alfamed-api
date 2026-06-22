ALTER TABLE "request_logs" ALTER COLUMN "new_status_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "requests_status" RENAME COLUMN "name" TO "code";
