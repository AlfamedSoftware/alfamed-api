CREATE TABLE "anamnesis" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"main_complaint" text,
	"pain_level" integer,
	"taking_medication" text,
	"known_allergy" text,
	"had_surgery" boolean,
	"surgery_details" text,
	"family_history" boolean,
	"family_history_details" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anamnesis" ADD CONSTRAINT "anamnesis_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
