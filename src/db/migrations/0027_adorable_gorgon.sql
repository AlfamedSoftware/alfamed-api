CREATE TABLE IF NOT EXISTS "professional_availability_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_unit_id" text NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE
	"appointments" DROP CONSTRAINT IF EXISTS "appointments_schedule_id_schedules_id_fk";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP CONSTRAINT IF EXISTS "schedules_professional_unit_specialty_id_professional_unit_specialties_id_fk";

--> statement-breakpoint
ALTER TABLE
	"appointments"
ADD
	COLUMN IF NOT EXISTS "professional_unit_id" text;

--> statement-breakpoint
ALTER TABLE
	"appointments"
ALTER COLUMN "professional_unit_id" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"appointments"
ADD
	COLUMN IF NOT EXISTS "start_at" timestamp;

--> statement-breakpoint
ALTER TABLE
	"appointments"
ALTER COLUMN "start_at" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"appointments"
ADD
	COLUMN IF NOT EXISTS "end_at" timestamp;

--> statement-breakpoint
ALTER TABLE
	"appointments"
ALTER COLUMN "end_at" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	COLUMN IF NOT EXISTS "day_of_week" integer;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ALTER COLUMN "day_of_week" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	COLUMN IF NOT EXISTS "start_time" time;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ALTER COLUMN "start_time" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	COLUMN IF NOT EXISTS "end_time" time;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ALTER COLUMN "end_time" SET NOT NULL;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ADD
	COLUMN IF NOT EXISTS "appointment_duration_minutes" integer;

--> statement-breakpoint
ALTER TABLE
	"schedules"
ALTER COLUMN "appointment_duration_minutes" SET NOT NULL;

--> statement-breakpoint
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'professional_availability_blocks_professional_unit_id_professional_units_id_fk'
	) THEN
		ALTER TABLE "professional_availability_blocks" ADD CONSTRAINT "professional_availability_blocks_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;

--> statement-breakpoint
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'appointments_professional_unit_id_professional_units_id_fk'
	) THEN
		ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "schedules_professional_unit_id_day_of_week_start_time_end_time_uq" ON "schedules" USING btree (
	"professional_unit_id",
	"day_of_week",
	"start_time",
	"end_time"
);

--> statement-breakpoint
ALTER TABLE
	"appointments" DROP COLUMN IF EXISTS "schedule_id";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP COLUMN IF EXISTS "professional_unit_specialty_id";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP COLUMN IF EXISTS "date";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP COLUMN IF EXISTS "time";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP COLUMN IF EXISTS "slots";

--> statement-breakpoint
ALTER TABLE
	"schedules" DROP COLUMN IF EXISTS "slots_used";