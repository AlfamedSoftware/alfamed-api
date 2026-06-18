CREATE TABLE "schedule_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_status_logs" RENAME TO "appointment_logs";--> statement-breakpoint
ALTER TABLE "appointments" RENAME COLUMN "reason" TO "diagnostics";--> statement-breakpoint
ALTER TABLE "appointment_logs" DROP CONSTRAINT "appointment_status_logs_appointment_id_appointments_id_fk";
--> statement-breakpoint
ALTER TABLE "appointment_logs" DROP CONSTRAINT "appointment_status_logs_old_status_id_appointments_status_id_fk";
--> statement-breakpoint
ALTER TABLE "appointment_logs" DROP CONSTRAINT "appointment_status_logs_new_status_id_appointments_status_id_fk";
--> statement-breakpoint
ALTER TABLE "appointment_logs" DROP CONSTRAINT "appointment_status_logs_changed_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "schedules_professional_unit_id_day_of_week_start_time_end_time_uq";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "schedule_slot_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "evolution" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "specialty_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "slots" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "empty_slots" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "allocated_slots" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "duration_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_old_status_id_appointments_status_id_fk" FOREIGN KEY ("old_status_id") REFERENCES "public"."appointments_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_new_status_id_appointments_status_id_fk" FOREIGN KEY ("new_status_id") REFERENCES "public"."appointments_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_slot_id_schedule_slots_id_fk" FOREIGN KEY ("schedule_slot_id") REFERENCES "public"."schedule_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "day_of_week";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "appointment_duration_minutes";