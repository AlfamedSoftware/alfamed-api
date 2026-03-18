CREATE TABLE "requests_procedures" (
    "id" text PRIMARY KEY NOT NULL,
    "request_id" text NOT NULL REFERENCES "requests"("id") ON DELETE CASCADE,
    "procedure_id" text NOT NULL REFERENCES "procedures"("id") ON DELETE CASCADE,
    "status" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT TRUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
