ALTER TABLE "users" ALTER COLUMN "cpf" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "social_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthdate" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text NOT NULL;