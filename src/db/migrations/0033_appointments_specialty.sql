DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'appointments'
          AND column_name = 'specialty_id'
    ) THEN
        ALTER TABLE "appointments" ADD COLUMN "specialty_id" text;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'appointments_specialty_id_specialties_id_fk'
    ) THEN
        ALTER TABLE "appointments" ADD CONSTRAINT "appointments_specialty_id_specialties_id_fk"
            FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
