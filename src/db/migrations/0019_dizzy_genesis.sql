ALTER TABLE "roles" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "internal" boolean DEFAULT false NOT NULL;