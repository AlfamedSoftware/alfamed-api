ALTER TABLE "requests" ADD COLUMN "procedure_id" text NOT NULL REFERENCES "procedures"("id") ON DELETE restrict;
