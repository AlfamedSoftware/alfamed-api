ALTER TABLE "schedules" ADD COLUMN "procedure_id" text;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE set null ON UPDATE no action;
