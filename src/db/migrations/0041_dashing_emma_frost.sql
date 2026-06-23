ALTER TABLE "appointment_logs" ALTER COLUMN "changed_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "request_logs" ALTER COLUMN "changed_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "requests_status" ALTER COLUMN "description" SET NOT NULL;