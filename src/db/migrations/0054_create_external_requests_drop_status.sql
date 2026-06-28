ALTER TABLE "requests" DROP CONSTRAINT IF EXISTS "requests_status_requests_status_id_fk";--> statement-breakpoint
ALTER TABLE "requests" DROP COLUMN "status";--> statement-breakpoint
CREATE TABLE "external_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"procedure_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_requests" ADD CONSTRAINT "external_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_requests" ADD CONSTRAINT "external_requests_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE restrict ON UPDATE no action;
