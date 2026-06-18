DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'schedules'
          AND column_name = 'specialty_id'
    ) THEN
        ALTER TABLE "schedules" ADD COLUMN "specialty_id" text;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'schedules_specialty_id_specialties_id_fk'
    ) THEN
        ALTER TABLE "schedules" ADD CONSTRAINT "schedules_specialty_id_specialties_id_fk"
            FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE set null ON UPDATE no action;
    END IF;
END $$;
