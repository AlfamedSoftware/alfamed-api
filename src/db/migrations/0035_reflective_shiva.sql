ALTER TABLE "schedules" DROP CONSTRAINT "schedules_procedure_id_procedures_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "procedure_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE restrict ON UPDATE no action;