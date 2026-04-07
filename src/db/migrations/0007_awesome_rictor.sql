CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_specialty_id" text NOT NULL,
	"professional_unit_id" text NOT NULL,
	"date" date NOT NULL,
	"time" time NOT NULL,
	"slots" integer NOT NULL,
	"slots_used" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_professional_specialty_id_professional_specialties_id_fk" FOREIGN KEY ("professional_specialty_id") REFERENCES "public"."professional_specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;