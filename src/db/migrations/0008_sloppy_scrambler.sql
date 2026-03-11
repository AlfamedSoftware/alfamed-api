CREATE TABLE "appointment_status_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"old_status_id" text,
	"new_status_id" text NOT NULL,
	"changed_by" text,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"observation" text
);
--> statement-breakpoint
CREATE TABLE "appointments_status" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"schedule_id" text NOT NULL,
	"status_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointment_status_logs" ADD CONSTRAINT "appointment_status_logs_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_status_logs" ADD CONSTRAINT "appointment_status_logs_old_status_id_appointments_status_id_fk" FOREIGN KEY ("old_status_id") REFERENCES "public"."appointments_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_status_logs" ADD CONSTRAINT "appointment_status_logs_new_status_id_appointments_status_id_fk" FOREIGN KEY ("new_status_id") REFERENCES "public"."appointments_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_status_logs" ADD CONSTRAINT "appointment_status_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_status_id_appointments_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."appointments_status"("id") ON DELETE restrict ON UPDATE no action;