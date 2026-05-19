ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "key" text;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "internal" boolean DEFAULT false NOT NULL;