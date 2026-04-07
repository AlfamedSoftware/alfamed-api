CREATE TABLE "requests_procedures_outcomes" (
    "id" text PRIMARY KEY NOT NULL,
    "request_procedure_id" text NOT NULL REFERENCES "requests_procedures"("id") ON DELETE CASCADE,
    "professional_id" text NOT NULL REFERENCES "professionals"("id") ON DELETE CASCADE,
    "description" text,
    "outcome_date" timestamp DEFAULT now() NOT NULL,
    "is_active" boolean NOT NULL DEFAULT TRUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
