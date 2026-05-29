CREATE TABLE "professional_availability_blocks" (
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
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_schedule_id_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_professional_unit_specialty_id_professional_unit_specialties_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "professional_unit_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "start_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "end_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "day_of_week" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "start_time" time NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "end_time" time NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "appointment_duration_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_availability_blocks" ADD CONSTRAINT "professional_availability_blocks_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_professional_unit_id_day_of_week_start_time_end_time_uq" ON "schedules" USING btree ("professional_unit_id","day_of_week","start_time","end_time");--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "schedule_id";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "professional_unit_specialty_id";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "date";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "time";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "slots";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "slots_used";