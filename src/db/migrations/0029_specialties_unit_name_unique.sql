ALTER TABLE "specialties" DROP CONSTRAINT IF EXISTS "specialties_name_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "specialties_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "specialties_unit_id_name_unique" ON "specialties" USING btree ("unit_id", "name");
