ALTER TABLE "requests" RENAME COLUMN "type" TO "complementary_info";--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "complementary_info" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "justification" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "performed_at" timestamp;
