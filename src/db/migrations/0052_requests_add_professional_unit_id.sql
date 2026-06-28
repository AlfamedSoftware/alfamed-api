ALTER TABLE "requests" ADD COLUMN "professional_unit_id" text REFERENCES "professional_units"("id") ON DELETE restrict;
