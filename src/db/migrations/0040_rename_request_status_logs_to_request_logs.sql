ALTER TABLE "request_status_logs" RENAME TO "request_logs";
--> statement-breakpoint
ALTER TABLE "request_logs" DROP CONSTRAINT IF EXISTS "request_status_logs_request_id_requests_id_fk";
--> statement-breakpoint
ALTER TABLE "request_logs" DROP CONSTRAINT IF EXISTS "request_status_logs_changed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "old_status";
--> statement-breakpoint
ALTER TABLE "request_logs" DROP COLUMN IF EXISTS "new_status";
--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "old_status_id" text;
--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "new_status_id" text;
--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_request_id_requests_id_fk"
    FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_old_status_id_requests_status_id_fk"
    FOREIGN KEY ("old_status_id") REFERENCES "public"."requests_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_new_status_id_requests_status_id_fk"
    FOREIGN KEY ("new_status_id") REFERENCES "public"."requests_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_changed_by_users_id_fk"
    FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
