DROP TABLE IF EXISTS "appointments_status" CASCADE;--> statement-breakpoint

ALTER TABLE "appointments" ALTER COLUMN "start_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "end_at" DROP NOT NULL;--> statement-breakpoint

CREATE TABLE "appointments_status" (
    "id" text PRIMARY KEY,
    "code" integer NOT NULL,
    "description" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint