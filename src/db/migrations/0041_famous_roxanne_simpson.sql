CREATE TABLE "request_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"old_status_id" text,
	"new_status_id" text NOT NULL,
	"changed_by" text,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"observation" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "professional_availability_blocks" CASCADE;--> statement-breakpoint
DROP TABLE "request_status_logs" CASCADE;--> statement-breakpoint
DROP TABLE "requests_procedures" CASCADE;--> statement-breakpoint
DROP TABLE "requests_procedures_outcomes" CASCADE;--> statement-breakpoint
DROP TABLE "verifications" CASCADE;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_old_status_id_requests_status_id_fk" FOREIGN KEY ("old_status_id") REFERENCES "public"."requests_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_new_status_id_requests_status_id_fk" FOREIGN KEY ("new_status_id") REFERENCES "public"."requests_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;