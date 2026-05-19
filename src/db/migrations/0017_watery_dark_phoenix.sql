ALTER TABLE "schedules" DROP CONSTRAINT "schedules_professional_specialty_id_professional_unit_specialties_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "professional_unit_specialty_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_professional_unit_specialty_id_professional_unit_specialties_id_fk" FOREIGN KEY ("professional_unit_specialty_id") REFERENCES "public"."professional_unit_specialties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "professional_specialty_id";