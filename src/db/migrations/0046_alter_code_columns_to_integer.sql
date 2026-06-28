ALTER TABLE "appointments_status" ALTER COLUMN "code" TYPE integer USING code::integer;--> statement-breakpoint
ALTER TABLE "requests_status" ALTER COLUMN "code" TYPE integer USING code::integer;
