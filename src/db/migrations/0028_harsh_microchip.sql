ALTER TABLE "specialties" ADD COLUMN IF NOT EXISTS "unit_id" text;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'specialties_unit_id_units_id_fk'
	) THEN
		ALTER TABLE "specialties" ADD CONSTRAINT "specialties_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;