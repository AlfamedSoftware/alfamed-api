-- Re-add FK constraints from appointment_logs to appointments_status
-- These were removed when appointments_status was dropped/recreated with CASCADE in migration 0036
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointment_logs_old_status_id_appointments_status_id_fk'
    ) THEN
        ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_old_status_id_appointments_status_id_fk"
            FOREIGN KEY ("old_status_id") REFERENCES "public"."appointments_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointment_logs_new_status_id_appointments_status_id_fk'
    ) THEN
        ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_new_status_id_appointments_status_id_fk"
            FOREIGN KEY ("new_status_id") REFERENCES "public"."appointments_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "requests_procedures_outcomes";
--> statement-breakpoint
DROP TABLE IF EXISTS "requests_procedures";
--> statement-breakpoint
DROP TABLE IF EXISTS "professional_availability_blocks";
