CREATE TABLE "request_results" (
    "id" text PRIMARY KEY NOT NULL,
    "request_id" text NOT NULL UNIQUE,
    "professional_unit_id" text,
    "complementary_info" text,
    "attachment_url" text,
    "released_at" timestamp,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_results" ADD CONSTRAINT "request_results_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "request_results" ADD CONSTRAINT "request_results_professional_unit_id_professional_units_id_fk" FOREIGN KEY ("professional_unit_id") REFERENCES "public"."professional_units"("id") ON DELETE restrict ON UPDATE no action;
