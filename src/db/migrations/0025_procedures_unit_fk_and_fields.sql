ALTER TABLE "procedures" ADD COLUMN "unit_id" text;--> statement-breakpoint
ALTER TABLE "procedures" RENAME COLUMN "description" TO "observation";--> statement-breakpoint
ALTER TABLE "procedures" RENAME COLUMN "name" TO "description";--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;