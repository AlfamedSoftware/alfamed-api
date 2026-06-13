ALTER TABLE "specialties" DROP CONSTRAINT "specialties_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_unit_id_name_unique" ON "specialties" USING btree ("unit_id","name");