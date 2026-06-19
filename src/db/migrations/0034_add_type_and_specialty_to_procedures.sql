ALTER TABLE "procedures" ADD COLUMN "type" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "procedures" ADD COLUMN "specialty_id" text;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_specialty_id_specialties_id_fk" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE set null ON UPDATE no action;
