ALTER TABLE "appointments_status" RENAME COLUMN "name" TO "code";--> statement-breakpoint
ALTER TABLE "appointments_status" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "start_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "end_at" DROP NOT NULL;