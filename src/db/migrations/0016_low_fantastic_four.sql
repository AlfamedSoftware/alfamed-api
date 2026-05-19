CREATE TABLE "professional_unit_specialties" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_unit_id" text NOT NULL,
	"specialty_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE IF EXISTS "professional_specialties" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "professional_specialties" CASCADE;--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_professional_specialty_id_professional_specialties_id_fk";--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT IF EXISTS "schedules_professional_specialty_id_professional_specialties_id";--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "professional_unit_specialties" ADD CONSTRAINT "professional_unit_specialties_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_unit_specialties" ADD CONSTRAINT "professional_unit_specialties_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_unit_specialties_professional_unit_id_specialty_id_uq" ON "professional_unit_specialties" USING btree ("professional_unit_id","specialty_id");--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_professional_specialty_id_professional_unit_specialties_id_fk" FOREIGN KEY ("professional_specialty_id") REFERENCES "public"."professional_unit_specialties"("id") ON DELETE cascade ON UPDATE no action;