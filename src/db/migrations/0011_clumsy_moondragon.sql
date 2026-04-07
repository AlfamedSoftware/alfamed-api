ALTER TABLE "users" ALTER COLUMN "cpf" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "social_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthdate" timestamp;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "birthdate" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;